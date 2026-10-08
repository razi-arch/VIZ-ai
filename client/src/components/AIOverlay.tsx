import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  ShieldAlert, 
  RotateCcw, 
  Sliders, 
  Activity, 
  Pencil, 
  Trash2, 
  X
} from 'lucide-react';

interface Detection {
  box: [number, number, number, number]; // [x1, y1, x2, y2] normalized 0.0 - 1.0
  class_id: number;
  label: string;
  confidence: number;
  track_id?: number | null;
  in_zone: boolean;
  crossed?: 'entry' | 'exit' | null;
  trail?: [number, number][];
}

interface SecurityConfig {
  door_zone: [number, number, number, number];
  tripwire: [[number, number], [number, number]];
  door_focus_only?: boolean;
  person_only?: boolean;
  in_zone_count?: number;
  entry_count?: number;
  exit_count?: number;
  status?: 'secure' | 'breached';
  events?: Array<{
    id: number;
    timestamp: string;
    type: string;
    message: string;
    track_id?: number;
    label?: string;
    confidence?: number;
  }>;
}

interface TelemetryData {
  type: string;
  timestamp?: number;
  inference_ms?: number;
  fps?: number;
  frame_size?: [number, number];
  counts?: Record<string, number>;
  total_objects?: number;
  detections?: Detection[];
  security?: SecurityConfig;
  status?: string;
}

interface AIOverlayProps {
  wsUrl?: string;
  isVisible: boolean;
  onToggleVisibility?: () => void;
  streamName?: string;
  /** Called whenever drawing mode turns on/off — lets StreamTile suppress its hover overlay */
  onDrawingModeChange?: (active: boolean) => void;
}

export const AIOverlay: React.FC<AIOverlayProps> = ({
  wsUrl = 'ws://localhost:8765',
  isVisible,
  streamName = 'Camera',
  onDrawingModeChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const telemetryRef = useRef<TelemetryData | null>(null);

  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [personOnly, setPersonOnly] = useState<boolean>(false);
  const [latestAlert, setLatestAlert] = useState<string | null>(null);

  // Custom Zone Drawing States
  const [isDrawingMode, setIsDrawingMode] = useState<boolean>(false);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [drawCurrent, setDrawCurrent] = useState<{ x: number; y: number } | null>(null);
  const [customZone, setCustomZone] = useState<[number, number, number, number] | null>(null);

  const drawingStateRef = useRef({
    isDrawingMode: false,
    isDrawing: false,
    drawStart: null as { x: number; y: number } | null,
    drawCurrent: null as { x: number; y: number } | null,
    customZone: null as [number, number, number, number] | null,
  });

  // Keep drawingStateRef synced with state for requestAnimationFrame loop
  useEffect(() => {
    drawingStateRef.current = {
      isDrawingMode,
      isDrawing,
      drawStart,
      drawCurrent,
      customZone,
    };
  }, [isDrawingMode, isDrawing, drawStart, drawCurrent, customZone]);

  // Aspect ratio dimension calculation matching vision-worker.md Section 4.2
  const getRenderDimensions = useCallback((canvasW: number, canvasH: number, frameSize?: [number, number]) => {
    let renderW = canvasW;
    let renderH = canvasH;
    let offsetX = 0;
    let offsetY = 0;

    if (frameSize && frameSize[0] > 0 && frameSize[1] > 0) {
      const frameAspect = frameSize[0] / frameSize[1];
      const canvasAspect = canvasW / canvasH;

      if (canvasAspect > frameAspect) {
        renderH = canvasH;
        renderW = canvasH * frameAspect;
        offsetX = (canvasW - renderW) / 2;
        offsetY = 0;
      } else {
        renderW = canvasW;
        renderH = canvasW / frameAspect;
        offsetX = 0;
        offsetY = (canvasH - renderH) / 2;
      }
    }
    return { canvasW, canvasH, renderW, renderH, offsetX, offsetY };
  }, []);

  // Normalized to Canvas Pixel Coordinates
  const normToCanvas = useCallback((nx: number, ny: number, renderInfo: ReturnType<typeof getRenderDimensions>) => {
    return {
      x: renderInfo.offsetX + nx * renderInfo.renderW,
      y: renderInfo.offsetY + ny * renderInfo.renderH,
    };
  }, []);

  // Canvas Pixels back to Normalized (0.0 - 1.0)
  const canvasToNorm = useCallback((cx: number, cy: number, renderInfo: ReturnType<typeof getRenderDimensions>) => {
    const nx = Math.max(0, Math.min(1, (cx - renderInfo.offsetX) / renderInfo.renderW));
    const ny = Math.max(0, Math.min(1, (cy - renderInfo.offsetY) / renderInfo.renderH));
    return { x: nx, y: ny };
  }, []);

  // Connect to Vision Worker WebSocket
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;

    const connect = () => {
      try {
        ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          setIsConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const data: TelemetryData = JSON.parse(event.data);
            telemetryRef.current = data;
            setTelemetry(data);

            // Sync initial server door_zone if no custom zone drawn yet
            if (data.type === 'system' && data.security?.door_zone && !customZone) {
              const dz = data.security.door_zone;
              if (dz && dz.length === 4 && (dz[2] - dz[0] > 0.02)) {
                setCustomZone(dz);
              }
            }

            // Pop latest event alert
            if (data.security?.events && data.security.events.length > 0) {
              const lastEvt = data.security.events[data.security.events.length - 1];
              setLatestAlert(lastEvt.message);
            }
          } catch {
            // ignore JSON parse error
          }
        };

        ws.onclose = () => {
          setIsConnected(false);
          reconnectTimeout = setTimeout(connect, 2000);
        };

        ws.onerror = () => {
          ws?.close();
        };
      } catch {
        reconnectTimeout = setTimeout(connect, 3000);
      }
    };

    connect();

    return () => {
      clearTimeout(reconnectTimeout);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [wsUrl]);

  // Handle Reset Counts command
  const handleResetCounts = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'reset_counts' }));
    }
  };

  // Handle Toggle Person Only Filter
  const handleTogglePersonOnly = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextVal = !personOnly;
    setPersonOnly(nextVal);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'update_config',
        person_only: nextVal,
      }));
    }
  };

  // Clear Zone Handler
  const handleClearZone = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCustomZone(null);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'update_config',
        door_zone: [0, 0, 0, 0], // Invalidate zone
      }));
    }
  };

  // Mouse Handlers for Drawing Custom Zone
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingMode) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    const frameSize = telemetryRef.current?.frame_size || [1280, 720];
    const renderInfo = getRenderDimensions(canvas.width, canvas.height, frameSize);
    const norm = canvasToNorm(cx, cy, renderInfo);

    setDrawStart(norm);
    setDrawCurrent(norm);
    setIsDrawing(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingMode || !isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    const frameSize = telemetryRef.current?.frame_size || [1280, 720];
    const renderInfo = getRenderDimensions(canvas.width, canvas.height, frameSize);
    const norm = canvasToNorm(cx, cy, renderInfo);

    setDrawCurrent(norm);
  };

  const handleMouseUp = () => {
    if (!isDrawingMode || !isDrawing || !drawStart || !drawCurrent) {
      setIsDrawing(false);
      return;
    }

    const x1 = Math.min(drawStart.x, drawCurrent.x);
    const y1 = Math.min(drawStart.y, drawCurrent.y);
    const x2 = Math.max(drawStart.x, drawCurrent.x);
    const y2 = Math.max(drawStart.y, drawCurrent.y);

    // Ensure drawn zone has a minimum size
    if (x2 - x1 > 0.02 && y2 - y1 > 0.02) {
      const newZone: [number, number, number, number] = [
        parseFloat(x1.toFixed(4)),
        parseFloat(y1.toFixed(4)),
        parseFloat(x2.toFixed(4)),
        parseFloat(y2.toFixed(4)),
      ];
      setCustomZone(newZone);

      // Instantly transmit new zone to YOLOv8 Vision Worker
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'update_config',
          door_zone: newZone,
        }));
      }
    }

    setIsDrawing(false);
    setDrawStart(null);
    setDrawCurrent(null);
    setDrawingMode(false); // finish drawing mode
  };

  // Wrapped setter that also notifies parent (StreamTile) to suppress hover gradient
  const setDrawingMode = (active: boolean) => {
    setIsDrawingMode(active);
    onDrawingModeChange?.(active);
  };

  // Auto-dismiss alert banner after 4 seconds
  useEffect(() => {
    if (!latestAlert) return;
    const t = setTimeout(() => setLatestAlert(null), 4000);
    return () => clearTimeout(t);
  }, [latestAlert]);

  // Canvas Render Loop
  useEffect(() => {
    if (!isVisible) return;

    let animId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        animId = requestAnimationFrame(render);
        return;
      }

      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== Math.floor(rect.width) || canvas.height !== Math.floor(rect.height)) {
        canvas.width = Math.floor(rect.width);
        canvas.height = Math.floor(rect.height);
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animId = requestAnimationFrame(render);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const data = telemetryRef.current;
      const frameSize = data?.frame_size || [1280, 720];
      const renderInfo = getRenderDimensions(canvas.width, canvas.height, frameSize);
      const sec = data?.security;
      const dState = drawingStateRef.current;

      // 1. Draw Active Detection Zone (CLEAN THIN OUTER LINE, ZERO HEAVY FILL)
      const activeZone = dState.customZone || (sec?.door_zone && (sec.door_zone[2] - sec.door_zone[0] > 0.02) ? sec.door_zone : null);

      if (activeZone && activeZone.length === 4) {
        const [zx1, zy1, zx2, zy2] = activeZone;
        const p1 = normToCanvas(Math.min(zx1, zx2), Math.min(zy1, zy2), renderInfo);
        const p2 = normToCanvas(Math.max(zx1, zx2), Math.max(zy1, zy2), renderInfo);
        const zoneW = p2.x - p1.x;
        const zoneH = p2.y - p1.y;

        const isBreached = sec?.status === 'breached' || (sec?.in_zone_count && sec.in_zone_count > 0);

        ctx.save();
        // NO OPAQUE FILL! The video stays 100% visible and clear
        if (isBreached) {
          ctx.strokeStyle = '#EF4444'; // Crisp red
          ctx.lineWidth = 2.0;         // Clean thin outer line
          ctx.setLineDash([6, 3]);     // High-tech security dash
          ctx.shadowColor = '#EF4444';
          ctx.shadowBlur = 6;
        } else {
          ctx.strokeStyle = '#00E5FF'; // Crisp high-tech cyan
          ctx.lineWidth = 1.5;         // Clean thin outer line
          ctx.setLineDash([]);
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
        }

        // Draw thin wireframe outer rectangle
        ctx.strokeRect(p1.x, p1.y, zoneW, zoneH);

        // Sleek High-Tech Corner Brackets
        const cornerLen = Math.min(12, zoneW / 3, zoneH / 3);
        ctx.lineWidth = isBreached ? 3 : 2.5;
        ctx.strokeStyle = isBreached ? '#EF4444' : '#00E5FF';
        ctx.setLineDash([]);

        // Top-Left corner
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y + cornerLen);
        ctx.lineTo(p1.x, p1.y);
        ctx.lineTo(p1.x + cornerLen, p1.y);
        ctx.stroke();

        // Top-Right corner
        ctx.beginPath();
        ctx.moveTo(p2.x - cornerLen, p1.y);
        ctx.lineTo(p2.x, p1.y);
        ctx.lineTo(p2.x, p1.y + cornerLen);
        ctx.stroke();

        // Bottom-Left corner
        ctx.beginPath();
        ctx.moveTo(p1.x, p2.y - cornerLen);
        ctx.lineTo(p1.x, p2.y);
        ctx.lineTo(p1.x + cornerLen, p2.y);
        ctx.stroke();

        // Bottom-Right corner
        ctx.beginPath();
        ctx.moveTo(p2.x - cornerLen, p2.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p2.x, p2.y - cornerLen);
        ctx.stroke();

        // Sleek Minimalist Badge Tag
        const badgeText = isBreached ? '● BREACH DETECTED' : 'DETECTION ZONE';
        ctx.font = 'bold 9px monospace';
        const textW = ctx.measureText(badgeText).width;
        ctx.fillStyle = isBreached ? '#EF4444' : '#00E5FF';
        const badgeY = Math.max(0, p1.y - 15);
        ctx.fillRect(p1.x, badgeY, textW + 10, 15);
        ctx.fillStyle = isBreached ? '#FFFFFF' : '#0B132B';
        ctx.fillText(badgeText, p1.x + 5, badgeY + 11);

        ctx.restore();
      }

      // 2. Draw Interactive Prospective Zone while Dragging
      if (dState.isDrawing && dState.drawStart && dState.drawCurrent) {
        const p1 = normToCanvas(Math.min(dState.drawStart.x, dState.drawCurrent.x), Math.min(dState.drawStart.y, dState.drawCurrent.y), renderInfo);
        const p2 = normToCanvas(Math.max(dState.drawStart.x, dState.drawCurrent.x), Math.max(dState.drawStart.y, dState.drawCurrent.y), renderInfo);
        const dw = p2.x - p1.x;
        const dh = p2.y - p1.y;

        ctx.save();
        ctx.strokeStyle = '#FF5100'; // TM Orange outline while drawing
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(p1.x, p1.y, dw, dh);

        ctx.setLineDash([]);
        ctx.fillStyle = '#FF5100';
        ctx.font = 'bold 9px monospace';
        const drawBadge = 'RELEASE TO SET ZONE';
        const bw = ctx.measureText(drawBadge).width + 8;
        ctx.fillRect(p1.x, Math.max(0, p1.y - 15), bw, 15);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(drawBadge, p1.x + 4, Math.max(11, p1.y - 4));
        ctx.restore();
      }

      // 3. Draw Directional Tripwire (Clean Line)
      if (sec && sec.tripwire && sec.tripwire.length === 2) {
        const tp1 = normToCanvas(sec.tripwire[0][0], sec.tripwire[0][1], renderInfo);
        const tp2 = normToCanvas(sec.tripwire[1][0], sec.tripwire[1][1], renderInfo);

        ctx.save();
        ctx.strokeStyle = '#10B981';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#10B981';
        ctx.shadowBlur = 6;

        ctx.beginPath();
        ctx.moveTo(tp1.x, tp1.y);
        ctx.lineTo(tp2.x, tp2.y);
        ctx.stroke();

        // Terminal dots
        ctx.fillStyle = '#10B981';
        ctx.beginPath();
        ctx.arc(tp1.x, tp1.y, 3.5, 0, Math.PI * 2);
        ctx.arc(tp2.x, tp2.y, 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Direction arrow at midpoint
        const midX = (tp1.x + tp2.x) / 2;
        const midY = (tp1.y + tp2.y) / 2;
        const angle = Math.atan2(tp2.y - tp1.y, tp2.x - tp1.x);
        const normalAngle = angle - Math.PI / 2;
        const arrowLen = 12;

        ctx.strokeStyle = '#34D399';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(midX, midY);
        ctx.lineTo(midX + Math.cos(normalAngle) * arrowLen, midY + Math.sin(normalAngle) * arrowLen);
        ctx.stroke();
        ctx.restore();
      }

      // 4. Draw YOLOv8 Bounding Boxes & Trails
      if (data?.detections && Array.isArray(data.detections)) {
        for (const det of data.detections) {
          const [bx1, by1, bx2, by2] = det.box;
          const bp1 = normToCanvas(bx1, by1, renderInfo);
          const bp2 = normToCanvas(bx2, by2, renderInfo);
          const boxW = bp2.x - bp1.x;
          const boxH = bp2.y - bp1.y;

          const isPerson = det.label.toLowerCase() === 'person';
          const isBreached = det.in_zone;

          let boxColor = '#FF5100'; // TM Orange default
          if (isBreached) {
            boxColor = '#EF4444'; // Red alert
          } else if (!isPerson) {
            boxColor = '#38BDF8'; // Sky blue for objects
          }

          // Motion trail
          if (det.trail && det.trail.length > 1) {
            ctx.save();
            ctx.strokeStyle = boxColor;
            ctx.lineWidth = 1.5;
            ctx.globalAlpha = 0.6;
            ctx.beginPath();
            const firstPt = normToCanvas(det.trail[0][0], det.trail[0][1], renderInfo);
            ctx.moveTo(firstPt.x, firstPt.y);
            for (let i = 1; i < det.trail.length; i++) {
              const pt = normToCanvas(det.trail[i][0], det.trail[i][1], renderInfo);
              ctx.lineTo(pt.x, pt.y);
            }
            ctx.stroke();

            // Foot contact point
            const footPt = normToCanvas((bx1 + bx2) / 2, by2, renderInfo);
            ctx.fillStyle = boxColor;
            ctx.globalAlpha = 0.9;
            ctx.beginPath();
            ctx.arc(footPt.x, footPt.y, 3.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }

          // Bounding Box (Clean thin outline, no thick fill)
          ctx.save();
          ctx.strokeStyle = boxColor;
          ctx.lineWidth = 2.0;
          ctx.shadowColor = boxColor;
          ctx.shadowBlur = 6;
          ctx.strokeRect(bp1.x, bp1.y, boxW, boxH);

          // Sleek Label Pill
          const trackLabel = det.track_id ? `#${det.track_id} ` : '';
          const confText = `${Math.round(det.confidence * 100)}%`;
          const pillText = `${trackLabel}${det.label.toUpperCase()} ${confText}`;

          ctx.font = 'bold 9px Inter, sans-serif';
          const pillW = ctx.measureText(pillText).width + 8;
          const pillH = 16;
          const pillY = Math.max(0, bp1.y - pillH);

          ctx.fillStyle = boxColor;
          ctx.fillRect(bp1.x, pillY, pillW, pillH);

          ctx.fillStyle = '#FFFFFF';
          ctx.fillText(pillText, bp1.x + 4, pillY + 11);
          ctx.restore();
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isVisible, getRenderDimensions, normToCanvas]);

  if (!isVisible) return null;

  const fps = telemetry?.fps ? Math.round(telemetry.fps) : 0;
  const ms = telemetry?.inference_ms ? Math.round(telemetry.inference_ms) : 0;
  const inZoneCount = telemetry?.security?.in_zone_count || 0;
  const entryCount = telemetry?.security?.entry_count || 0;
  const exitCount = telemetry?.security?.exit_count || 0;

  return (
    <div className={`absolute inset-0 z-20 overflow-hidden ${isDrawingMode ? 'pointer-events-auto cursor-crosshair' : 'pointer-events-none'}`}>
      {/* HTML5 Canvas overlay for real-time bounding boxes & drawing */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className="absolute inset-0 w-full h-full"
      />

      {/* ── Drawing Mode Guide Banner — centered, won't clash with top hover bar ── */}
      {isDrawingMode && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto px-4 py-2 rounded-full bg-tm-orange/95 border border-white/20 shadow-2xl backdrop-blur-md text-white text-xs font-bold flex items-center space-x-2 animate-pulse whitespace-nowrap">
          <Pencil className="w-3.5 h-3.5 shrink-0" />
          <span>Click &amp; drag to define detection zone</span>
          <button
            onClick={() => setDrawingMode(false)}
            className="ml-2 p-0.5 rounded-full hover:bg-black/20 text-white/80 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── Breach Alert Banner — bottom-center, well above the bottom HUD row ── */}
      {latestAlert && !isDrawingMode && (
        <div className="absolute bottom-14 left-1/2 -translate-x-1/2 pointer-events-auto px-3.5 py-1.5 rounded-lg bg-red-950/90 border border-red-500 shadow-xl backdrop-blur-md text-red-200 text-xs font-bold flex items-center space-x-2 animate-bounce whitespace-nowrap">
          <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
          <span>{latestAlert}</span>
        </div>
      )}

      {/* ── AI Telemetry HUD — bottom-right column (above server tag, below hover bar) ── */}
      <div className="absolute bottom-8 right-2.5 pointer-events-auto flex flex-col items-end space-y-1">
        {/* Row 1: YOLOv8 Counters + FPS/ms */}
        <div className="flex items-center space-x-1.5">
          {/* Security Counters Badge */}
          <div className="px-2.5 py-1 rounded-md bg-black/80 backdrop-blur-md border border-white/10 text-[11px] font-mono flex items-center space-x-2 text-white shadow-md">
            <span className="text-tm-orange font-bold">YOLOv8</span>
            <span className="text-white/20">|</span>
            <span className="text-emerald-400 font-semibold">IN: {entryCount}</span>
            <span className="text-sky-400 font-semibold">OUT: {exitCount}</span>
            {inZoneCount > 0 && (
              <>
                <span className="text-white/20">|</span>
                <span className="text-red-400 font-bold animate-pulse">ZONE: {inZoneCount}</span>
              </>
            )}
          </div>

          {/* FPS & Latency Badge */}
          <div className="px-2 py-1 rounded-md bg-black/80 backdrop-blur-md border border-white/10 text-[10px] font-mono text-slate-300 flex items-center space-x-1.5 shadow-md">
            <Activity className="w-3 h-3 text-tm-orange" />
            <span>{fps} FPS</span>
            <span className="text-white/20">/</span>
            <span>{ms}ms</span>
          </div>
        </div>

        {/* Row 2: Action Controls */}
        <div className="flex items-center space-x-1 bg-black/80 backdrop-blur-md border border-white/10 p-0.5 rounded-md shadow-md">
          {/* Draw Custom Zone Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDrawingMode(!isDrawingMode);
            }}
            title={isDrawingMode ? 'Cancel Drawing' : 'Draw Custom Detection Zone'}
            className={`px-2 py-1 rounded text-xs font-semibold flex items-center space-x-1 transition-all ${
              isDrawingMode
                ? 'bg-tm-orange text-white shadow-md shadow-tm-orange/30'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Pencil className="w-3 h-3" />
            <span className="text-[11px]">{isDrawingMode ? 'Drawing...' : 'Draw Zone'}</span>
          </button>

          {/* Clear Custom Zone Button */}
          {customZone && (
            <button
              onClick={handleClearZone}
              title="Clear Custom Detection Zone"
              className="p-1 rounded text-xs text-slate-300 hover:text-red-400 hover:bg-white/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Filter Person Only */}
          <button
            onClick={handleTogglePersonOnly}
            title={personOnly ? 'Filter: Person Only (Active)' : 'Filter: All Objects'}
            className={`p-1 rounded text-xs transition-colors ${
              personOnly ? 'bg-tm-orange text-white' : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>

          {/* Reset Security Counters */}
          <button
            onClick={handleResetCounts}
            title="Reset Security Counters"
            className="p-1 rounded text-xs text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Vision Worker Offline Ribbon — bottom-right, below HUD ── */}
      {!isConnected && (
        <div className="absolute bottom-2.5 right-2.5 pointer-events-auto px-2 py-0.5 rounded bg-amber-950/80 border border-amber-500/50 text-amber-300 text-[10px] font-medium flex items-center space-x-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
          <span>Vision Worker Offline ({wsUrl})</span>
        </div>
      )}
    </div>
  );
};
