FROM python:3.11-slim

# Install system dependencies for OpenCV and FFmpeg
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download YOLOv8n weights to avoid runtime delay
RUN python -c "from ultralytics import YOLO; YOLO('yolov8n.pt')"

COPY vision_worker.py .

EXPOSE 8765

ENV RTSP_URL="rtsp://mediamtx-pbt-a:8554/cam_inno_lab"
ENV WS_PORT=8765
ENV MODEL_NAME="yolov8n.pt"
ENV IMGSZ=480

CMD ["python", "vision_worker.py"]

