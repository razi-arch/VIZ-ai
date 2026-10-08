import React, { useState } from 'react';
import { 
  X, 
  Trash2, 
  AlertTriangle, 
  Loader2, 
  Server,
  Video
} from 'lucide-react';
import type { Camera } from '../types';
import { deleteCamera } from '../services/api';
import { formatNodeName } from '../utils/terminology';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  camera: Camera | null;
  onClose: () => void;
  onCameraDeleted: () => Promise<void>;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  camera,
  onClose,
  onCameraDeleted,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !camera) return null;

  const handleDelete = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      await deleteCamera(camera.id);
      await onCameraDeleted();
      setIsLoading(false);
      onClose();
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err.message || 'Failed to delete camera. Please verify backend connection.');
    }
  };

  const nodeLabel = formatNodeName(camera.node_name);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in select-none">
      <div 
        className="relative w-full max-w-md bg-tm-midnight border border-tm-red/40 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-tm-border bg-tm-red/10">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-tm-red/20 border border-tm-red/40 text-tm-red">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                Confirm Camera Deletion
              </h2>
              <p className="text-xs text-tm-red font-medium">
                Irreversible Infrastructure Action
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-tm-muted hover:text-white hover:bg-tm-slate transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-tm-red/20 border border-tm-red/40 text-tm-red text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <p className="text-xs text-slate-300 leading-relaxed">
            Are you sure you want to permanently remove this camera from the active VMS matrix? 
            Incoming video routes and WebRTC players for this channel will be deactivated immediately.
          </p>

          {/* Camera Info Card */}
          <div className="p-3.5 rounded-xl bg-tm-slate/80 border border-tm-border space-y-2 text-xs">
            <div className="flex items-center space-x-2 text-white font-bold">
              <Video className="w-4 h-4 text-tm-orange" />
              <span>{camera.name}</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-tm-muted font-mono pt-1 border-t border-tm-border/50">
              <span>Stream Key: <strong className="text-slate-200">{camera.stream_key}</strong></span>
              <span className="flex items-center space-x-1">
                <Server className="w-3 h-3 text-tm-orange" />
                <span>{nodeLabel}</span>
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-lg border border-tm-border text-xs font-semibold text-tm-muted hover:text-white hover:bg-tm-slate transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isLoading}
              className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-red-600 to-rose-600 hover:brightness-110 text-white font-bold text-xs flex items-center space-x-2 shadow-lg shadow-red-500/25 transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Deleting Camera...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Camera</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
