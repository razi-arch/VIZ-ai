import React, { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Tv, 
  Plus, 
  X, 
  Maximize2
} from 'lucide-react';
import type { Camera, GridMatrix } from '../types';
import { StreamTile } from './StreamTile';
import { LABELS } from '../utils/terminology';

interface VideoWallProps {
  cameras: Camera[];
  matrix: GridMatrix;
  selectedCameraId: string | null;
  onSelectCamera: (cameraId: string) => void;
  onOpenAddModal: () => void;
}

export const VideoWall: React.FC<VideoWallProps> = ({
  cameras,
  matrix,
  selectedCameraId,
  onSelectCamera,
  onOpenAddModal,
}) => {
  const [fullscreenCamera, setFullscreenCamera] = useState<Camera | null>(null);

  // If no cameras are registered at all
  if (cameras.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-tm-slate select-none">
        <div className="w-16 h-16 rounded-2xl bg-tm-midnight border border-tm-border flex items-center justify-center text-tm-orange shadow-xl mb-4">
          <Tv className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-white mb-1">
          No Registered Cameras in System Registry
        </h3>
        <p className="text-xs text-tm-muted max-w-md mb-6 leading-relaxed">
          The video matrix wall currently has no active video streams. Connect your first IP camera stream to start real-time monitoring.
        </p>
        <button
          onClick={onOpenAddModal}
          className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-tm-orange to-tm-flame hover:brightness-110 text-white font-bold text-sm flex items-center space-x-2 shadow-lg shadow-tm-orange/30 transition-all transform active:scale-95"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>{LABELS.registerCamera}</span>
        </button>
      </div>
    );
  }

  // Determine active camera for 1x1 mode
  const currentSelectedCamera =
    cameras.find((c) => c.id === selectedCameraId) || cameras[0];
  const currentCameraIndex = cameras.findIndex(
    (c) => c.id === currentSelectedCamera.id
  );

  const handlePrevCamera = () => {
    const prevIndex = (currentCameraIndex - 1 + cameras.length) % cameras.length;
    onSelectCamera(cameras[prevIndex].id);
  };

  const handleNextCamera = () => {
    const nextIndex = (currentCameraIndex + 1) % cameras.length;
    onSelectCamera(cameras[nextIndex].id);
  };

  // Determine slot capacity
  const targetSlots = matrix === '1x1' ? 1 : matrix === '2x2' ? 4 : 9;

  // Build array of slots
  const slots: (Camera | null)[] = [];
  if (matrix === '1x1') {
    slots.push(currentSelectedCamera);
  } else {
    for (let i = 0; i < targetSlots; i++) {
      slots.push(cameras[i] || null);
    }
  }

  // Grid styling based on matrix
  const getGridClasses = () => {
    switch (matrix) {
      case '1x1':
        return 'grid-cols-1 grid-rows-1 max-w-5xl mx-auto';
      case '2x2':
        return 'grid-cols-1 md:grid-cols-2 grid-rows-2';
      case '3x3':
        return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 grid-rows-3';
      default:
        return 'grid-cols-2 grid-rows-2';
    }
  };

  return (
    <div className="flex-1 flex flex-col p-3 md:p-4 bg-tm-slate overflow-hidden select-none">
      {/* 1x1 Navigation Header Bar */}
      {matrix === '1x1' && cameras.length > 1 && (
        <div className="mb-2.5 flex items-center justify-between px-3 py-1.5 bg-tm-midnight/80 border border-tm-border rounded-lg text-xs">
          <div className="flex items-center space-x-2 text-tm-muted">
            <span className="font-semibold text-white">Focus Channel:</span>
            <span className="font-mono text-tm-orange">
              {currentCameraIndex + 1} of {cameras.length}
            </span>
            <span>—</span>
            <span className="text-white font-medium">{currentSelectedCamera.name}</span>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={handlePrevCamera}
              className="p-1 rounded bg-tm-slate hover:bg-tm-border text-white transition-colors"
              title="Previous Camera"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNextCamera}
              className="p-1 rounded bg-tm-slate hover:bg-tm-border text-white transition-colors"
              title="Next Camera"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* The Responsive Video Grid */}
      <div
        className={`flex-1 grid gap-2.5 md:gap-3.5 w-full h-full auto-rows-fr ${getGridClasses()}`}
      >
        {slots.map((cam, idx) => (
          <div key={cam ? cam.id : `empty-slot-${idx}`} className="w-full h-full min-h-0 min-w-0">
            <StreamTile
              camera={cam}
              slotNumber={idx + 1}
              isFocused={cam?.id === selectedCameraId}
              onFocus={(c) => setFullscreenCamera(c)}
              onOpenAddCamera={onOpenAddModal}
            />
          </div>
        ))}
      </div>

      {/* Expanded Modal for Focus / Fullscreen Mode */}
      {fullscreenCamera && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col p-4 md:p-6 animate-fade-in">
          <div className="flex items-center justify-between mb-3 text-white">
            <div className="flex items-center space-x-3">
              <span className="text-base font-bold flex items-center space-x-2">
                <Maximize2 className="w-4 h-4 text-tm-orange" />
                <span>{fullscreenCamera.name}</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-tm-midnight border border-tm-border text-xs font-mono text-tm-muted">
                {fullscreenCamera.stream_key}
              </span>
            </div>

            <button
              onClick={() => setFullscreenCamera(null)}
              className="p-2 rounded-lg bg-tm-midnight hover:bg-tm-border border border-tm-border text-white transition-colors"
              title="Close Expanded View (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 w-full h-full max-h-[85vh]">
            <StreamTile
              camera={fullscreenCamera}
              slotNumber={1}
              isFocused={true}
              onFocus={() => setFullscreenCamera(null)}
              onOpenAddCamera={onOpenAddModal}
            />
          </div>
        </div>
      )}
    </div>
  );
};
