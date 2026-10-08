import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  Server, 
  Video, 
  Link as LinkIcon, 
  Key, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Sparkles
} from 'lucide-react';
import type { NewCameraPayload } from '../types';
import { SERVER_NODES } from '../types';
import { registerCamera } from '../services/api';
import { LABELS } from '../utils/terminology';

interface AddCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCameraAdded: () => Promise<void>;
}

export const AddCameraModal: React.FC<AddCameraModalProps> = ({
  isOpen,
  onClose,
  onCameraAdded,
}) => {
  const [name, setName] = useState('');
  const [streamKey, setStreamKey] = useState('');
  const [rtspUrl, setRtspUrl] = useState('');
  const [nodeId, setNodeId] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Auto-generate stream key from name if streamKey hasn't been manually altered
  const handleNameChange = (val: string) => {
    setName(val);
    const slug = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

    if (!streamKey || streamKey.startsWith('cam_') || streamKey === '') {
      const generatedKey = slug ? `cam_${slug}` : '';
      setStreamKey(generatedKey);
      updateSuggestedRtsp(generatedKey, nodeId);
    }
  };

  const handleStreamKeyChange = (val: string) => {
    setStreamKey(val);
    updateSuggestedRtsp(val, nodeId);
  };

  const handleNodeChange = (newId: number) => {
    setNodeId(newId);
    updateSuggestedRtsp(streamKey, newId);
  };

  const updateSuggestedRtsp = (key: string, targetNodeId: number) => {
    const keyVal = key || 'cam_feed';
    const serverHost = targetNodeId === 1 ? 'mediamtx-pbt-a:8554' : 'mediamtx-pbt-b:8555';
    setRtspUrl(`rtsp://${serverHost}/${keyVal}`);
  };

  // Quick preset loader for convenient testing
  const loadPreset = (presetNumber: 1 | 2 | 3) => {
    if (presetNumber === 1) {
      setName('Main Entrance Gate');
      setStreamKey('cam_entrance_gate');
      setNodeId(1);
      setRtspUrl('rtsp://mediamtx-pbt-a:8554/cam_entrance_gate');
    } else if (presetNumber === 2) {
      setName('Perimeter Fence West');
      setStreamKey('cam_perimeter_west');
      setNodeId(2);
      setRtspUrl('rtsp://mediamtx-pbt-b:8555/cam_perimeter_west');
    } else {
      setName('Lobby Turnstile Hall');
      setStreamKey('cam_lobby_turnstile');
      setNodeId(1);
      setRtspUrl('rtsp://mediamtx-pbt-a:8554/cam_lobby_turnstile');
    }
    setErrorMessage(null);
  };

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

    const payload: NewCameraPayload = {
      name: name.trim(),
      stream_key: streamKey.trim(),
      rtsp_source_url: rtspUrl.trim(),
      node_id: Number(nodeId),
    };

    setIsLoading(true);

    try {
      await registerCamera(payload);
      setSuccessMessage(`Camera "${name}" successfully registered!`);

      // Refresh camera state dynamically without page reload
      await onCameraAdded();

      // Reset and close after brief confirmation
      setTimeout(() => {
        setName('');
        setStreamKey('');
        setRtspUrl('');
        setNodeId(1);
        setIsLoading(false);
        setSuccessMessage(null);
        onClose();
      }, 700);
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err.message || 'Failed to register camera. Please verify backend connection.');
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
            <div className="p-2 rounded-lg bg-tm-orange/15 border border-tm-orange/30 text-tm-orange">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                {LABELS.registerCamera}
              </h2>
              <p className="text-xs text-tm-muted">
                Add an RTSP video source to the Telekom Malaysia VMS Matrix
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

        {/* Quick Presets */}
        <div className="px-6 pt-3 pb-1 bg-tm-slate/20 border-b border-tm-border/40 flex items-center justify-between text-xs">
          <span className="text-tm-muted flex items-center space-x-1">
            <Sparkles className="w-3.5 h-3.5 text-tm-orange" />
            <span>Quick Presets:</span>
          </span>
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={() => loadPreset(1)}
              className="text-[11px] px-2 py-0.5 rounded bg-tm-slate hover:bg-slate-700 text-slate-300 border border-tm-border transition-colors"
            >
              Entrance Gate
            </button>
            <button
              type="button"
              onClick={() => loadPreset(2)}
              className="text-[11px] px-2 py-0.5 rounded bg-tm-slate hover:bg-slate-700 text-slate-300 border border-tm-border transition-colors"
            >
              Perimeter West
            </button>
          </div>
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
              <span>Camera Name</span>
              <span className="text-[10px] text-tm-muted">e.g. Entrance Gate</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Entrance Gate"
                className="w-full bg-tm-slate border border-tm-border rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-tm-muted focus:outline-none focus:border-tm-orange focus:ring-1 focus:ring-tm-orange transition-all"
              />
            </div>
          </div>

          {/* Camera ID / Stream Key */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5 flex items-center justify-between">
              <span className="flex items-center space-x-1">
                <Key className="w-3.5 h-3.5 text-tm-orange" />
                <span>Camera ID / Stream Key</span>
              </span>
              <span className="text-[10px] text-tm-muted">e.g. cam3_main</span>
            </label>
            <input
              type="text"
              required
              value={streamKey}
              onChange={(e) => handleStreamKeyChange(e.target.value)}
              placeholder="e.g. cam3_main"
              className="w-full bg-tm-slate border border-tm-border rounded-lg px-3.5 py-2.5 text-xs font-mono text-white placeholder-tm-muted focus:outline-none focus:border-tm-orange focus:ring-1 focus:ring-tm-orange transition-all"
            />
          </div>

          {/* Target Server Select Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5 flex items-center justify-between">
              <span className="flex items-center space-x-1">
                <Server className="w-3.5 h-3.5 text-tm-orange" />
                <span>Target Server</span>
              </span>
              <span className="text-[10px] text-tm-muted">Physical edge node location</span>
            </label>
            <select
              value={nodeId}
              onChange={(e) => handleNodeChange(Number(e.target.value))}
              className="w-full bg-tm-slate border border-tm-border rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-tm-orange focus:ring-1 focus:ring-tm-orange transition-all cursor-pointer"
            >
              {SERVER_NODES.map((server) => (
                <option key={server.id} value={server.id} className="bg-tm-midnight py-1 text-white">
                  {server.label} [node_id: {server.id}]
                </option>
              ))}
            </select>
            <p className="text-[11px] text-tm-muted mt-1">
              {nodeId === 1
                ? 'Routing to Cyberjaya Core Node (Node-A / mediamtx-pbt-a:8554)'
                : 'Routing to Puchong Secondary Node (Node-B / mediamtx-pbt-b:8555)'}
            </p>
          </div>

          {/* Camera Address / RTSP URL */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5 flex items-center justify-between">
              <span className="flex items-center space-x-1">
                <LinkIcon className="w-3.5 h-3.5 text-tm-orange" />
                <span>{LABELS.cameraAddress} (RTSP URL)</span>
              </span>
              <span className="text-[10px] text-tm-muted">Network transport source</span>
            </label>
            <input
              type="text"
              required
              value={rtspUrl}
              onChange={(e) => setRtspUrl(e.target.value)}
              placeholder="e.g. rtsp://mediamtx-pbt-a:8554/cam3_main"
              className="w-full bg-tm-slate border border-tm-border rounded-lg px-3.5 py-2.5 text-xs font-mono text-white placeholder-tm-muted focus:outline-none focus:border-tm-orange focus:ring-1 focus:ring-tm-orange transition-all"
            />
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
              className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-tm-orange to-tm-flame hover:brightness-110 text-white font-bold text-xs flex items-center space-x-2 shadow-lg shadow-tm-orange/30 transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Registering Camera...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>{LABELS.registerCamera}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
