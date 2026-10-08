import React, { useState, useEffect } from 'react';
import { 
  X, 
  Edit3, 
  Server, 
  Video, 
  Link as LinkIcon, 
  Key, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Monitor,
  Activity
} from 'lucide-react';
import type { Camera, UpdateCameraPayload } from '../types';
import { SERVER_NODES } from '../types';
import { updateCamera } from '../services/api';

interface EditCameraModalProps {
  isOpen: boolean;
  camera: Camera | null;
  onClose: () => void;
  onCameraUpdated: () => Promise<void>;
}

export const EditCameraModal: React.FC<EditCameraModalProps> = ({
  isOpen,
  camera,
  onClose,
  onCameraUpdated,
}) => {
  const [name, setName] = useState('');
  const [streamKey, setStreamKey] = useState('');
  const [rtspUrl, setRtspUrl] = useState('');
  const [nodeId, setNodeId] = useState<number>(1);
  const [resolution, setResolution] = useState('1280x720');
  const [status, setStatus] = useState<'ONLINE' | 'OFFLINE'>('ONLINE');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (camera) {
      setName(camera.name || '');
      setStreamKey(camera.stream_key || '');
      setRtspUrl(camera.rtsp_source_url || '');
      
      // Determine node number based on node_name or node_id
      if (camera.node_name === 'Node-B' || camera.node_id === 2 || camera.node_id === '2') {
        setNodeId(2);
      } else {
        setNodeId(1);
      }

      setResolution(camera.resolution || '1280x720');
      setStatus(camera.status === 'OFFLINE' ? 'OFFLINE' : 'ONLINE');
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [camera, isOpen]);

  if (!isOpen || !camera) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!name.trim()) {
      setErrorMessage('Camera Name is required.');
      return;
    }
    if (!streamKey.trim()) {
      setErrorMessage('Camera ID / Stream Key is required.');
      return;
    }
    if (!rtspUrl.trim()) {
      setErrorMessage('Camera Address / RTSP URL is required.');
      return;
    }

    const payload: UpdateCameraPayload = {
      name: name.trim(),
      stream_key: streamKey.trim(),
      rtsp_source_url: rtspUrl.trim(),
      node_id: Number(nodeId),
      resolution: resolution.trim(),
      status: status,
    };

    setIsLoading(true);

    try {
      await updateCamera(camera.id, payload);
      setSuccessMessage(`Camera "${name}" successfully updated!`);

      // Refresh camera state dynamically without page reload
      await onCameraUpdated();

      // Close modal after brief confirmation
      setTimeout(() => {
        setIsLoading(false);
        setSuccessMessage(null);
        onClose();
      }, 700);
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err.message || 'Failed to update camera. Please verify backend connection.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in select-none">
      <div 
        className="relative w-full max-w-lg bg-tm-midnight border border-tm-border rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-tm-border bg-tm-slate/50">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                Edit Camera Configuration
              </h2>
              <p className="text-xs text-tm-muted font-mono">
                ID: {camera.id.slice(0, 8)}... | {camera.stream_key}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 rounded-lg bg-tm-red/15 border border-tm-red/40 text-tm-red text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Banner */}
          {successMessage && (
            <div className="p-3 rounded-lg bg-tm-green/15 border border-tm-green/40 text-tm-green text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Camera Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5 flex items-center justify-between">
              <span className="flex items-center space-x-1">
                <Video className="w-3.5 h-3.5 text-blue-400" />
                <span>Camera Name</span>
              </span>
              <span className="text-[10px] text-tm-muted">Display title</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Entrance Gate"
              className="w-full bg-tm-slate border border-tm-border rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-tm-muted focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all"
            />
          </div>

          {/* Camera ID / Stream Key */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5 flex items-center justify-between">
              <span className="flex items-center space-x-1">
                <Key className="w-3.5 h-3.5 text-blue-400" />
                <span>Camera ID / Stream Key</span>
              </span>
              <span className="text-[10px] text-tm-muted">Unique route identifier</span>
            </label>
            <input
              type="text"
              required
              value={streamKey}
              onChange={(e) => setStreamKey(e.target.value)}
              placeholder="e.g. cam3_main"
              className="w-full bg-tm-slate border border-tm-border rounded-lg px-3.5 py-2.5 text-xs font-mono text-white placeholder-tm-muted focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all"
            />
          </div>

          {/* Target Server Select Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5 flex items-center justify-between">
              <span className="flex items-center space-x-1">
                <Server className="w-3.5 h-3.5 text-blue-400" />
                <span>Target Server Node</span>
              </span>
              <span className="text-[10px] text-tm-muted">Physical edge location</span>
            </label>
            <select
              value={nodeId}
              onChange={(e) => setNodeId(Number(e.target.value))}
              className="w-full bg-tm-slate border border-tm-border rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all cursor-pointer"
            >
              {SERVER_NODES.map((server) => (
                <option key={server.id} value={server.id} className="bg-tm-midnight py-1 text-white">
                  {server.label} [node_id: {server.id}]
                </option>
              ))}
            </select>
          </div>

          {/* Camera Address / RTSP URL */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5 flex items-center justify-between">
              <span className="flex items-center space-x-1">
                <LinkIcon className="w-3.5 h-3.5 text-blue-400" />
                <span>Camera Address (RTSP URL)</span>
              </span>
              <span className="text-[10px] text-tm-muted">Network transport source</span>
            </label>
            <input
              type="text"
              required
              value={rtspUrl}
              onChange={(e) => setRtspUrl(e.target.value)}
              placeholder="e.g. rtsp://mediamtx-pbt-a:8554/cam1_main"
              className="w-full bg-tm-slate border border-tm-border rounded-lg px-3.5 py-2.5 text-xs font-mono text-white placeholder-tm-muted focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all"
            />
          </div>

          {/* Two-Column Grid: Resolution & Operational Status */}
          <div className="grid grid-cols-2 gap-3">
            {/* Resolution */}
            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1.5 flex items-center space-x-1">
                <Monitor className="w-3.5 h-3.5 text-blue-400" />
                <span>Resolution</span>
              </label>
              <select
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                className="w-full bg-tm-slate border border-tm-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all cursor-pointer"
              >
                <option value="1280x720" className="bg-tm-midnight">1280x720 (720p HD)</option>
                <option value="1920x1080" className="bg-tm-midnight">1920x1080 (1080p FHD)</option>
                <option value="3840x2160" className="bg-tm-midnight">3840x2160 (4K UHD)</option>
              </select>
            </div>

            {/* Operational Status */}
            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1.5 flex items-center space-x-1">
                <Activity className="w-3.5 h-3.5 text-blue-400" />
                <span>Operational Status</span>
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'ONLINE' | 'OFFLINE')}
                className="w-full bg-tm-slate border border-tm-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all cursor-pointer"
              >
                <option value="ONLINE" className="bg-tm-midnight text-tm-green">🟢 ONLINE (Active)</option>
                <option value="OFFLINE" className="bg-tm-midnight text-tm-red">🔴 OFFLINE (Disabled)</option>
              </select>
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-3 flex items-center justify-end space-x-3 border-t border-tm-border">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-lg border border-tm-border text-xs font-semibold text-tm-muted hover:text-white hover:bg-tm-slate transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110 text-white font-bold text-xs flex items-center space-x-2 shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <Edit3 className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
