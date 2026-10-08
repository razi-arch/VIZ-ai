"""
TM Vision AI YOLOv8 Worker
Decoupled Telemetry Engine for Telekom Malaysia VizAI Video Engine
Reference Architecture: vision-worker.md
"""

import asyncio
from collections import defaultdict, deque
import datetime
import json
import logging
import os
import sys
import threading
import time
import argparse
import cv2
from ultralytics import YOLO
import websockets

# 1. Logging setup
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S"
)
logger = logging.getLogger("VisionWorker")

# 2. Minimize OpenCV FFmpeg RTSP latency and buffering
os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp|fflags;nobuffer|max_delay;0"


# 3. Spatial Math Utilities
def ccw(A, B, C):
    """Counter-clockwise test for 3 points A, B, C."""
    return (C[1] - A[1]) * (B[0] - A[0]) > (B[1] - A[1]) * (C[0] - A[0])


def check_line_intersect(A, B, C, D):
    """Returns True if line segment AB intersects line segment CD."""
    return (ccw(A, C, D) != ccw(B, C, D)) and (ccw(A, B, C) != ccw(A, B, D))


def line_side(P1, P2, pt):
    """
    Returns signed value indicating which side of vector P1 -> P2 the point pt lies.
    Positive: Left side of vector
    Negative: Right side of vector
    """
    return (P2[0] - P1[0]) * (pt[1] - P1[1]) - (P2[1] - P1[1]) * (pt[0] - P1[0])


def point_in_zone(pt, zone):
    """Check if point pt (x, y) is inside normalized rectangular zone [x1, y1, x2, y2]."""
    if not zone or len(zone) < 4:
        return False
    x1, y1, x2, y2 = zone
    min_x, max_x = min(x1, x2), max(x1, x2)
    min_y, max_y = min(y1, y2), max(y1, y2)
    if (max_x - min_x < 0.01) or (max_y - min_y < 0.01):
        return False
    return min_x <= pt[0] <= max_x and min_y <= pt[1] <= max_y


# 4. Zero-Latency Threaded RTSP Capture
class RTSPCaptureThread:
    def __init__(self, rtsp_url):
        self.rtsp_url = rtsp_url
        self.latest_frame = None
        self.running = False
        self.lock = threading.Lock()
        self.thread = None
        self.is_connected = False

    def start(self):
        self.running = True
        self.thread = threading.Thread(target=self._update, daemon=True)
        self.thread.start()
        return self

    def _update(self):
        logger.info(f"Connecting background RTSP capture to: {self.rtsp_url}")
        cap = None
        while self.running:
            if cap is None or not cap.isOpened():
                cap = cv2.VideoCapture(self.rtsp_url, cv2.CAP_FFMPEG)
                cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                if not cap.isOpened():
                    self.is_connected = False
                    time.sleep(1.5)
                    continue
                else:
                    self.is_connected = True
                    logger.info("RTSP stream connected successfully!")

            ret, frame = cap.read()
            if not ret:
                self.is_connected = False
                if cap is not None:
                    cap.release()
                cap = None
                time.sleep(1.0)
                continue

            with self.lock:
                self.latest_frame = frame
                self.is_connected = True

        if cap is not None:
            cap.release()

    def get_latest_frame(self):
        with self.lock:
            if self.latest_frame is not None:
                return self.latest_frame.copy(), self.is_connected
            return None, self.is_connected

    def stop(self):
        self.running = False
        if self.thread and self.thread.is_alive():
            self.thread.join(timeout=2.0)


# 5. Vision AI Telemetry Server
class VisionAIServer:
    def __init__(self, rtsp_url, ws_port=8765, model_name="yolov8n.pt", imgsz=480, conf=0.35):
        self.rtsp_url = rtsp_url
        self.ws_port = ws_port
        self.imgsz = imgsz
        self.conf = conf
        self.connected_clients = set()
        self.clients_lock = threading.Lock()
        self.capture_thread = RTSPCaptureThread(self.rtsp_url)
        self.running = True

        # Normalized coordinates (0.0 - 1.0)
        self.door_zone = [0.25, 0.20, 0.75, 0.85]
        self.tripwire = [[0.20, 0.65], [0.80, 0.65]]
        self.door_focus_only = False
        self.person_only = False

        # Analytics State
        self.entry_count = 0
        self.exit_count = 0
        self.event_counter = 0
        self.recent_events = deque(maxlen=25)

        # Track histories
        self.track_history = defaultdict(lambda: deque(maxlen=20))
        self.track_last_seen = {}
        self.track_last_cross = {}
        self.track_zone_state = {}

        logger.info(f"Loading YOLO model: {model_name}...")
        self.model = YOLO(model_name)
        logger.info("YOLO model initialized with tracking capability.")

    def add_security_event(self, event_type, message, track_id=None, label="person", confidence=0.0):
        self.event_counter += 1
        now_str = datetime.datetime.now().strftime("%H:%M:%S")
        evt = {
            "id": self.event_counter,
            "timestamp": now_str,
            "type": event_type,
            "message": message,
            "track_id": track_id,
            "label": label,
            "confidence": round(confidence, 2)
        }
        self.recent_events.append(evt)
        logger.info(f"[SECURITY EVENT] {message}")
        return evt

    async def register_client(self, websocket):
        with self.clients_lock:
            self.connected_clients.add(websocket)
        logger.info(f"Dashboard client connected: {websocket.remote_address} (Active clients: {len(self.connected_clients)})")
        try:
            # Send initial sync payload
            await websocket.send(json.dumps({
                "type": "system",
                "status": "connected",
                "message": "Connected to TM Vision AI Telemetry Engine",
                "config": {
                    "door_zone": self.door_zone,
                    "tripwire": self.tripwire,
                    "door_focus_only": self.door_focus_only,
                    "person_only": self.person_only,
                    "entry_count": self.entry_count,
                    "exit_count": self.exit_count,
                    "events": list(self.recent_events)
                }
            }))

            async for message in websocket:
                try:
                    data = json.loads(message)
                    mtype = data.get("type")

                    if mtype == "update_config":
                        if "door_zone" in data:
                            self.door_zone = data["door_zone"]
                        if "tripwire" in data:
                            self.tripwire = data["tripwire"]
                        if "door_focus_only" in data:
                            self.door_focus_only = bool(data["door_focus_only"])
                        if "person_only" in data:
                            self.person_only = bool(data["person_only"])
                        logger.info(f"Updated security config: zone={self.door_zone}, tripwire={self.tripwire}")

                    elif mtype == "reset_counts":
                        self.entry_count = 0
                        self.exit_count = 0
                        self.recent_events.clear()
                        logger.info("Security counters and audit events reset by operator.")

                except Exception as parse_err:
                    logger.error(f"Error handling message from dashboard: {parse_err}")

        except websockets.exceptions.ConnectionClosed:
            pass
        finally:
            with self.clients_lock:
                self.connected_clients.discard(websocket)
            logger.info(f"Dashboard client disconnected (Remaining clients: {len(self.connected_clients)})")

    async def broadcast_detections(self, payload):
        with self.clients_lock:
            clients = list(self.connected_clients)

        if not clients:
            return

        message = json.dumps(payload)
        dead_clients = []
        for client in clients:
            try:
                await client.send(message)
            except Exception:
                dead_clients.append(client)

        if dead_clients:
            with self.clients_lock:
                for dead in dead_clients:
                    self.connected_clients.discard(dead)

    async def inference_loop(self):
        fps_counter = 0
        fps_start_time = time.time()
        current_fps = 0.0

        while self.running:
            try:
                frame, is_connected = self.capture_thread.get_latest_frame()

                if frame is None or not is_connected:
                    if self.connected_clients:
                        await self.broadcast_detections({
                            "type": "ai_status",
                            "status": "waiting_for_stream",
                            "rtsp_url": self.rtsp_url,
                            "fps": 0,
                            "counts": {},
                            "detections": [],
                            "security": {
                                "door_zone": self.door_zone,
                                "tripwire": self.tripwire,
                                "entry_count": self.entry_count,
                                "exit_count": self.exit_count,
                                "in_zone_count": 0,
                                "events": list(self.recent_events)
                            }
                        })
                    await asyncio.sleep(0.5)
                    continue

                t_start = time.perf_counter()
                height, width = frame.shape[:2]

                # Run YOLOv8 inference with ByteTrack enabled
                results = self.model.track(
                    frame,
                    imgsz=self.imgsz,
                    verbose=False,
                    conf=self.conf,
                    persist=True
                )
                t_end = time.perf_counter()
                inference_ms = (t_end - t_start) * 1000.0

                fps_counter += 1
                now = time.time()
                if now - fps_start_time >= 1.0:
                    current_fps = fps_counter / (now - fps_start_time)
                    fps_counter = 0
                    fps_start_time = now

                detections = []
                counts = {}
                in_zone_count = 0
                now_ts = time.time()

                # Clean up tracks unseen for > 8 seconds
                stale_ids = [tid for tid, last_seen in self.track_last_seen.items() if now_ts - last_seen > 8.0]
                for tid in stale_ids:
                    self.track_history.pop(tid, None)
                    self.track_last_seen.pop(tid, None)
                    self.track_last_cross.pop(tid, None)
                    self.track_zone_state.pop(tid, None)

                if len(results) > 0 and results[0].boxes is not None:
                    boxes = results[0].boxes
                    for box in boxes:
                        xyxy = box.xyxy[0].tolist()
                        conf = float(box.conf[0].item())
                        cls_id = int(box.cls[0].item())
                        label = self.model.names.get(cls_id, f"cls_{cls_id}")

                        if self.person_only and label != "person":
                            continue

                        track_id = int(box.id[0].item()) if box.id is not None else None

                        # Normalized bounding box coordinates (0.0 - 1.0)
                        norm_box = [
                            round(xyxy[0] / width, 4),
                            round(xyxy[1] / height, 4),
                            round(xyxy[2] / width, 4),
                            round(xyxy[3] / height, 4),
                        ]

                        # Ground contact anchor (foot position)
                        foot_x = round((norm_box[0] + norm_box[2]) / 2.0, 4)
                        foot_y = round(norm_box[3], 4)
                        curr_point = (foot_x, foot_y)

                        # Check Door Zone
                        in_zone = point_in_zone(curr_point, self.door_zone)
                        if in_zone:
                            in_zone_count += 1

                        crossed_direction = None
                        trail = []

                        if track_id is not None:
                            self.track_last_seen[track_id] = now_ts
                            history = self.track_history[track_id]

                            # Zone breach transition check
                            prev_in_zone = self.track_zone_state.get(track_id, False)
                            if in_zone and not prev_in_zone:
                                self.add_security_event(
                                    "zone_breach",
                                    f"{label.capitalize()} #{track_id} entered Door Zone",
                                    track_id=track_id,
                                    label=label,
                                    confidence=conf
                                )
                            self.track_zone_state[track_id] = in_zone

                            # Directional Tripwire crossing check
                            if len(history) >= 2 and self.tripwire and len(self.tripwire) == 2:
                                p1, p2 = self.tripwire[0], self.tripwire[1]
                                prev_point = history[-1]

                                if check_line_intersect(prev_point, curr_point, p1, p2):
                                    last_cross = self.track_last_cross.get(track_id, 0)
                                    # 2.0s cooldown per track ID
                                    if now_ts - last_cross > 2.0:
                                        side_prev = line_side(p1, p2, prev_point)
                                        side_curr = line_side(p1, p2, curr_point)

                                        if side_prev < 0 and side_curr >= 0:
                                            self.entry_count += 1
                                            crossed_direction = "entry"
                                            self.track_last_cross[track_id] = now_ts
                                            self.add_security_event(
                                                "entry",
                                                f"ENTRY DETECTED: {label.capitalize()} #{track_id} crossed inward",
                                                track_id=track_id,
                                                label=label,
                                                confidence=conf
                                            )
                                        elif side_prev > 0 and side_curr <= 0:
                                            self.exit_count += 1
                                            crossed_direction = "exit"
                                            self.track_last_cross[track_id] = now_ts
                                            self.add_security_event(
                                                "exit",
                                                f"EXIT DETECTED: {label.capitalize()} #{track_id} crossed outward",
                                                track_id=track_id,
                                                label=label,
                                                confidence=conf
                                            )

                            history.append(curr_point)
                            trail = list(history)[-10:]

                        if self.door_focus_only and not in_zone:
                            continue

                        detections.append({
                            "box": norm_box,
                            "class_id": cls_id,
                            "label": label,
                            "confidence": round(conf, 2),
                            "track_id": track_id,
                            "in_zone": in_zone,
                            "crossed": crossed_direction,
                            "trail": trail
                        })

                        counts[label] = counts.get(label, 0) + 1

                payload = {
                    "type": "ai_detection",
                    "timestamp": time.time(),
                    "inference_ms": round(inference_ms, 1),
                    "fps": round(current_fps, 1),
                    "frame_size": [width, height],
                    "counts": counts,
                    "total_objects": len(detections),
                    "detections": detections,
                    "security": {
                        "door_zone": self.door_zone,
                        "tripwire": self.tripwire,
                        "door_focus_only": self.door_focus_only,
                        "person_only": self.person_only,
                        "in_zone_count": in_zone_count,
                        "entry_count": self.entry_count,
                        "exit_count": self.exit_count,
                        "status": "breached" if in_zone_count > 0 else "secure",
                        "events": list(self.recent_events)[-10:]
                    }
                }

                await self.broadcast_detections(payload)
                await asyncio.sleep(0.002)

            except Exception as loop_err:
                logger.error(f"Inference loop error: {loop_err}")
                await asyncio.sleep(0.1)

    async def run(self):
        self.capture_thread.start()
        logger.info(f"Starting WebSocket server on ws://0.0.0.0:{self.ws_port}...")

        async with websockets.serve(self.register_client, "0.0.0.0", self.ws_port):
            logger.info("TM Vision AI Worker is active and broadcasting security telemetry!")
            await self.inference_loop()


def main():
    parser = argparse.ArgumentParser(description="TM Vision AI YOLOv8 Worker")
    parser.add_argument(
        "--rtsp",
        default=os.environ.get(
            "RTSP_URL",
            "rtsp://admin:Hik24680!@175.140.166.217:1056/Streaming/Channels/101"
        ),
        help="RTSP camera stream URL (default: Hikvision camera or MediaMTX egress)"
    )
    parser.add_argument(
        "--port",
        type=int,
        default=int(os.environ.get("WS_PORT", 8765)),
        help="WebSocket telemetry broadcasting port (default: 8765)"
    )
    parser.add_argument(
        "--model",
        default=os.environ.get("MODEL_NAME", "yolov8n.pt"),
        help="YOLO model weights (default: yolov8n.pt)"
    )
    parser.add_argument(
        "--imgsz",
        type=int,
        default=int(os.environ.get("IMGSZ", 480)),
        help="Inference frame size (default: 480)"
    )
    parser.add_argument(
        "--conf",
        type=float,
        default=float(os.environ.get("CONF_THRESH", 0.35)),
        help="Detection confidence threshold (default: 0.35)"
    )

    args = parser.parse_args()

    server = VisionAIServer(
        rtsp_url=args.rtsp,
        ws_port=args.port,
        model_name=args.model,
        imgsz=args.imgsz,
        conf=args.conf
    )

    try:
        asyncio.run(server.run())
    except KeyboardInterrupt:
        logger.info("Stopping Vision AI Worker...")
        server.running = False
        server.capture_thread.stop()
        sys.exit(0)


if __name__ == "__main__":
    main()

