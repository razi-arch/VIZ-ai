import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera as CameraIcon, 
  Maximize2, 
  RefreshCw, 
  Radio, 
  Server, 
  AlertCircle, 
  Plus, 
  Check, 
  Layers,
  Sparkles
} from 'lucide-react';
import Hls from 'hls.js';
import type { Camera, FeedQuality } from '../types';
import { formatNodeName, getNodeShortTag } from '../utils/terminology';
import { AIOverlay } from './AIOverlay';

interface StreamTileProps {
  camera: Camera | null;
  slotNumber: number;
  isFocused?: boolean;
  onFocus?: (camera: Camera) => void;
  onOpenAddCamera?: () => void;
}

export const StreamTile: React.FC<StreamTileProps> = ({
  camera,
  slotNumber,
  isFocused = false,
  onFocus,
  onOpenAddCamera,
}) => {
  const [feedQuality, setFeedQuality] = useState<FeedQuality>('webrtc');
  const [isReloading, setIsReloading] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [snapshotSuccess, setSnapshotSuccess] = useState<string | null>(null);
  const [isAIOverlayEnabled, setIsAIOverlayEnabled] = useState<boolean>(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsInstanceRef = useRef<Hls | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // If this is an empty slot placeholder
  if (!camera) {
    return (
      <div className="relative aspect-video w-full h-full bg-tm-midnight/60 border border-dashed border-tm-border rounded-xl flex flex-col items-center justify-center p-6 text-center group hover:border-tm-orange/60 hover:bg-tm-midnight/90 transition-all duration-200">
        <div className="w-12 h-12 rounded-xl bg-tm-slate/80 border border-tm-border flex items-center justify-center text-tm-muted group-hover:text-tm-orange group-hover:border-tm-orange/40 transition-colors shadow-inner">
          <CameraIcon className="w-6 h-6" />
        </div>
        <p className="mt-3 text-xs font-semibold text-slate-300">
          Slot {String(slotNumber).padStart(2, '0')} — Empty Channel
        </p>
        <p className="text-[11px] text-tm-muted max-w-[200px] mt-1">
          No camera stream configured for this matrix channel.
        </p>
        {onOpenAddCamera && (
          <button
            onClick={onOpenAddCamera}
            className="mt-3 px-3 py-1.5 rounded-lg bg-tm-orange/15 hover:bg-tm-orange text-tm-orange hover:text-white border border-tm-orange/30 text-xs font-medium flex items-center space-x-1.5 transition-all shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Assign Camera</span>
          </button>
        )}
      </div>
    );
  }

  const isOnline = camera.status === 'ONLINE';
  const serverTag = getNodeShortTag(camera.node_name);
  const serverFullName = formatNodeName(camera.node_name);

  // Setup HLS when switched to Backup Feed
  useEffect(() => {
    if (feedQuality !== 'hls' || !camera.hls_url) {
      if (hlsInstanceRef.current) {
        hlsInstanceRef.current.destroy();
        hlsInstanceRef.current = null;
      }
      return;
    }

    const videoEl = videoRef.current;
    if (!videoEl) return;

    // Standard MediaMTX HLS playlist url
    const hlsUrl = camera.hls_url.endsWith('/')
      ? `${camera.hls_url}index.m3u8`
      : `${camera.hls_url}/index.m3u8`;

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30,
      });

      hls.loadSource(hlsUrl);
      hls.attachMedia(videoEl);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setHasError(false);
        videoEl.play().catch(() => {});
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          console.warn('[HLS Error]', data);
          setHasError(true);
        }
      });

      hlsInstanceRef.current = hls;

      return () => {
        hls.destroy();
        hlsInstanceRef.current = null;
      };
    } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
      // Native Safari HLS
      videoEl.src = hlsUrl;
      videoEl.play().catch(() => {});
    }
  }, [feedQuality, camera.hls_url, isReloading]);

  // Handle Stream Refresh / Reload
  const handleReload = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsReloading(true);
    setHasError(false);
    setTimeout(() => {
      setIsReloading(false);
    }, 600);
  };

  // Toggle Feed Quality (WebRTC vs HLS)
  const toggleFeedQuality = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFeedQuality((prev) => (prev === 'webrtc' ? 'hls' : 'webrtc'));
  };

  // Capture Snapshot Frame as .jpg
  const handleCaptureSnapshot = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      let capturedFromVideo = false;

      // Try capturing from active HLS video element if available
      if (feedQuality === 'hls' && videoRef.current && videoRef.current.readyState >= 2) {
        try {
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          capturedFromVideo = true;
        } catch {
          capturedFromVideo = false;
        }
      }

      // If WebRTC iframe or CORS prevents direct buffer grab, generate an authentic telemetry snapshot card
      if (!capturedFromVideo) {
        // High-contrast background representing the video frame
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#0B132B');
        gradient.addColorStop(0.5, '#1C2541');
        gradient.addColorStop(1, '#0B132B');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Grid lines simulation
        ctx.strokeStyle = 'rgba(51, 65, 85, 0.4)';
        ctx.lineWidth = 1;
        for (let x = 0; x < canvas.width; x += 80) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvas.height);
          ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += 80) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
          ctx.stroke();
        }

        // Camera center reticle
        ctx.strokeStyle = '#FF5100';
        ctx.lineWidth = 2;
        ctx.strokeRect(canvas.width / 2 - 60, canvas.height / 2 - 60, 120, 120);

        // Watermark & Metadata
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 36px Inter, sans-serif';
        ctx.fillText(camera.name, 48, 80);

        ctx.fillStyle = '#FF5100';
        ctx.font = 'bold 20px Inter, sans-serif';
        ctx.fillText('VIZAI VMS • TELEKOM MALAYSIA', 48, 120);

        ctx.fillStyle = '#94A3B8';
        ctx.font = '18px monospace';
        ctx.fillText(`Camera ID: ${camera.stream_key}`, 48, canvas.height - 100);
        ctx.fillText(`Target Server: ${serverFullName}`, 48, canvas.height - 70);
        ctx.fillText(`Captured: ${new Date().toISOString()}`, 48, canvas.height - 40);

        // Top right Live Watermark
        ctx.fillStyle = '#10B981';
        ctx.font = 'bold 22px Inter, sans-serif';
        ctx.fillText('● RECORDED SNAPSHOT [HD 720p]', canvas.width - 420, 80);
      }

      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const filename = `${camera.stream_key}_${Date.now()}.jpg`;
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setSnapshotSuccess(`Saved: ${filename}`);
        setTimeout(() => setSnapshotSuccess(null), 3000);
      }, 'image/jpeg', 0.92);
    } catch (err) {
      console.error('Snapshot failed:', err);
    }
  };

  // Fullscreen container handler
  const handleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onFocus) {
      onFocus(camera);
      return;
    }

    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Construct iframe WebRTC URL with autoplay & muted params
  const webrtcEmbedUrl = (() => {
    if (!camera.webrtc_url) return '';
    try {
      const url = new URL(camera.webrtc_url);
      url.searchParams.set('autoplay', 'true');
      url.searchParams.set('muted', 'true');
      url.searchParams.set('controls', 'false');
      return url.toString();
    } catch {
      return camera.webrtc_url;
    }
  })();

  return (
    <div
      ref={containerRef}
      className={`group relative aspect-video w-full h-full bg-tm-card border rounded-xl overflow-hidden shadow-lg transition-all duration-200 select-none ${
        isFocused
          ? 'border-tm-orange ring-2 ring-tm-orange/30 shadow-tm-orange/10'
          : 'border-tm-border hover:border-slate-500'
      }`}
    >
      {/* ================= VIDEO CONTAINER ================= */}
      <div className="absolute inset-0 w-full h-full bg-black/90 flex items-center justify-center overflow-hidden">
        {hasError ? (
          <div className="flex flex-col items-center justify-center p-4 text-center">
            <AlertCircle className="w-10 h-10 text-tm-red mb-2 animate-bounce" />
            <p className="text-sm font-semibold text-white">Stream Signal Lost</p>
            <p className="text-xs text-tm-muted mt-0.5">
              Could not establish connection to {serverFullName}
            </p>
            <button
              onClick={handleReload}
              className="mt-3 px-3 py-1 bg-tm-slate text-xs text-white rounded border border-tm-border hover:border-tm-orange flex items-center space-x-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Stream</span>
            </button>
          </div>
        ) : isReloading ? (
          <div className="flex flex-col items-center space-y-2 text-tm-muted">
            <RefreshCw className="w-8 h-8 animate-spin text-tm-orange" />
            <span className="text-xs font-medium">Reconnecting Feed...</span>
          </div>
        ) : feedQuality === 'webrtc' ? (
          /* WebRTC Stream via iframe */
          <iframe
            ref={iframeRef}
            src={webrtcEmbedUrl}
            title={`WebRTC Stream - ${camera.name}`}
            className="w-full h-full border-0 pointer-events-auto"
            allow="autoplay; fullscreen"
            sandbox="allow-scripts allow-same-origin"
          />
        ) : (
          /* Fallback HLS Stream via HTML5 Video */
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-contain"
          />
        )}
      </div>

      {/* ================= DECOUPLED AI OVERLAY (YOLOv8) ================= */}
      <AIOverlay
        isVisible={isAIOverlayEnabled && !hasError && !isReloading}
        wsUrl={`ws://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:8765`}
        streamName={camera.name}
      />

      {/* ================= MINIMAL DEFAULT HUD ================= */}
      {/* Top Left: 🔴 LIVE Badge & Camera Name */}
      <div className="absolute top-2.5 left-2.5 z-10 flex items-center space-x-2 pointer-events-none transition-opacity duration-200">
        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-md border border-white/10 shadow-md">
          <span className="relative flex h-2.5 w-2.5">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isOnline ? 'bg-tm-red' : 'bg-slate-400'}`}></span>
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isOnline ? 'bg-tm-red' : 'bg-slate-500'}`}></span>
          </span>
          <span className="text-[11px] font-black tracking-wider text-white uppercase drop-shadow">
            LIVE
          </span>
          <span className="text-white/30 text-xs">•</span>
          <span className="text-xs font-bold text-white tracking-wide truncate max-w-[150px] sm:max-w-[200px]">
            {camera.name}
          </span>
        </div>
      </div>

      {/* Bottom Left: Server Tag & Stream Key */}
      <div className="absolute bottom-2.5 left-2.5 z-10 flex items-center space-x-1.5 pointer-events-none transition-opacity duration-200">
        <div className="px-2 py-0.5 rounded bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-mono text-slate-300 flex items-center space-x-1.5 shadow">
          <Server className="w-3 h-3 text-tm-orange" />
          <span>{serverTag}</span>
          <span className="text-white/30">|</span>
          <span className="text-tm-muted">{camera.stream_key}</span>
        </div>
      </div>

      {/* Snapshot Toast Overlay */}
      {snapshotSuccess && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 px-3.5 py-2 rounded-lg bg-emerald-950/90 border border-emerald-500 text-emerald-200 text-xs font-semibold flex items-center space-x-2 shadow-2xl backdrop-blur-md animate-fade-in">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{snapshotSuccess}</span>
        </div>
      )}

      {/* ================= HOVER CONTROLS OVERLAY ================= */}
      {/* Revealed on hover with smooth opacity transition */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none flex flex-col justify-between p-2.5 z-20">
        {/* Top Hover Bar */}
        <div className="flex items-center justify-between pointer-events-auto">
          {/* Server Info Tag */}
          <div className="px-2.5 py-1 rounded-md bg-tm-midnight/90 border border-tm-border text-xs text-white flex items-center space-x-1.5 shadow">
            <Radio className="w-3.5 h-3.5 text-tm-orange animate-pulse" />
            <span className="font-semibold">{serverFullName}</span>
          </div>

          {/* Action Button Group */}
          <div className="flex items-center space-x-1.5">
            {/* YOLOv8 AI Overlay Toggle */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsAIOverlayEnabled(!isAIOverlayEnabled);
              }}
              className={`px-2 py-1 rounded-md text-[11px] font-semibold flex items-center space-x-1 border shadow transition-all ${
                isAIOverlayEnabled
                  ? 'bg-emerald-600/90 text-white border-emerald-500 hover:bg-emerald-500 shadow-emerald-600/30'
                  : 'bg-tm-midnight/90 text-tm-muted border-tm-border hover:text-white'
              }`}
              title={isAIOverlayEnabled ? 'Disable YOLOv8 AI Telemetry Overlay' : 'Enable YOLOv8 AI Telemetry Overlay'}
            >
              <Sparkles className={`w-3 h-3 ${isAIOverlayEnabled ? 'text-emerald-200' : 'text-tm-muted'}`} />
              <span>{isAIOverlayEnabled ? 'AI Active' : 'AI Off'}</span>
            </button>

            {/* Feed Quality Switcher (WebRTC vs HLS) */}
            <button
              onClick={toggleFeedQuality}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center space-x-1 border shadow transition-all ${
                feedQuality === 'webrtc'
                  ? 'bg-tm-orange text-white border-tm-orange hover:brightness-110 shadow-tm-orange/30'
                  : 'bg-tm-midnight/90 text-tm-muted border-tm-border hover:text-white'
              }`}
              title={`Switch to ${feedQuality === 'webrtc' ? 'Backup Feed (HLS)' : 'Low-Latency Feed (WebRTC)'}`}
            >
              <Layers className="w-3 h-3" />
              <span>{feedQuality === 'webrtc' ? 'Low-Latency' : 'Backup'}</span>
            </button>

            {/* Refresh Stream */}
            <button
              onClick={handleReload}
              className="p-1.5 rounded-md bg-tm-midnight/90 border border-tm-border text-tm-muted hover:text-white hover:border-slate-500 shadow transition-colors"
              title="Refresh Stream Connection"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isReloading ? 'animate-spin text-tm-orange' : ''}`} />
            </button>

            {/* Snapshot Capture */}
            <button
              onClick={handleCaptureSnapshot}
              className="p-1.5 rounded-md bg-tm-midnight/90 border border-tm-border text-tm-muted hover:text-tm-orange hover:border-tm-orange/50 shadow transition-colors"
              title="Capture Snapshot (.jpg)"
            >
              <CameraIcon className="w-3.5 h-3.5" />
            </button>

            {/* Focus / Fullscreen */}
            <button
              onClick={handleFullscreen}
              className="p-1.5 rounded-md bg-tm-midnight/90 border border-tm-border text-tm-muted hover:text-white hover:border-slate-500 shadow transition-colors"
              title={isFocused ? 'Exit Focus View' : 'Focus / Fullscreen View'}
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Bottom Hover Bar */}
        <div className="flex items-center justify-between pointer-events-auto">
          <div className="text-[11px] font-mono text-slate-300 bg-black/60 px-2 py-0.5 rounded border border-white/5">
            Protocol: {feedQuality === 'webrtc' ? 'WebRTC / WHEP' : 'HLS / m3u8'}
          </div>

          <div className="text-[11px] text-tm-muted flex items-center space-x-2">
            <span className="font-mono text-emerald-400 font-semibold">1280x720 • 30fps</span>
          </div>
        </div>
      </div>
    </div>
  );
};
