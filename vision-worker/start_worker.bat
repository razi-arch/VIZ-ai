@echo off
echo ========================================================
echo   Telekom Malaysia - VizAI YOLOv8 Vision Worker
echo ========================================================
echo Connecting to live camera stream...
python vision_worker.py --rtsp "rtsp://admin:Hik24680!@175.140.166.217:1056/Streaming/Channels/101" --port 8765
pause

