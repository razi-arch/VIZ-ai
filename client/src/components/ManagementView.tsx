import React, { useState } from 'react';
import { 
  Server, 
  Video, 
  Database, 
  Plus, 
  ExternalLink, 
  Copy, 
  Check, 
  Tv, 
  Activity, 
  Radio, 
  HardDrive,
  Edit3,
  Trash2,
  ShieldCheck,
  ShieldAlert,
  Users,
  Lock
} from 'lucide-react';
import type { Camera, AuthUser } from '../types';
import { SERVER_NODES } from '../types';
import { formatNodeName, getNodeShortTag, LABELS } from '../utils/terminology';
import { EditCameraModal } from './EditCameraModal';
import { DeleteConfirmModal } from './DeleteConfirmModal';

interface ManagementViewProps {
  cameras: Camera[];
  onOpenAddModal: () => void;
  onViewCameraOnWall: (cameraId: string) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  currentUser: AuthUser | null;
  onOpenLogin: () => void;
  onOpenUserManagement: () => void;
}

export const ManagementView: React.FC<ManagementViewProps> = ({
  cameras,
  onOpenAddModal,
  onViewCameraOnWall,
  onRefresh,
  isRefreshing,
  currentUser,
  onOpenLogin,
  onOpenUserManagement,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [cameraToEdit, setCameraToEdit] = useState<Camera | null>(null);
  const [cameraToDelete, setCameraToDelete] = useState<Camera | null>(null);

  const isAdmin = currentUser?.role === 'ADMIN';
  const onlineCameras = cameras.filter((c) => c.status === 'ONLINE').length;

  const copyToClipboard = (text: string, identifier: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(identifier);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="flex-1 flex flex-col p-6 bg-tm-slate overflow-y-auto select-none space-y-6">
      {/* Top Banner & Stats Overview */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-tm-border">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2.5">
            <Activity className="w-5 h-5 text-tm-orange" />
            <span>VMS Infrastructure Management</span>
          </h2>
          <p className="text-xs text-tm-muted mt-1">
            Cluster edge servers, active camera routing, and video stream registry
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="px-3.5 py-2 rounded-lg bg-tm-midnight hover:bg-tm-elevated border border-tm-border text-xs font-semibold text-white flex items-center space-x-2 transition-colors"
          >
            <span>{isRefreshing ? 'Checking...' : 'Refresh Status'}</span>
          </button>

          {isAdmin && (
            <button
              onClick={onOpenUserManagement}
              className="px-3.5 py-2 rounded-lg bg-tm-midnight hover:bg-tm-elevated border border-tm-border text-xs font-semibold text-white flex items-center space-x-2 transition-colors"
            >
              <Users className="w-4 h-4 text-tm-orange" />
              <span>Staff Accounts</span>
            </button>
          )}

          {isAdmin ? (
            <button
              onClick={onOpenAddModal}
              className="px-4 py-2 bg-gradient-to-r from-tm-orange to-tm-flame hover:brightness-110 text-white font-bold text-xs rounded-lg shadow-lg shadow-tm-orange/25 flex items-center space-x-2 transition-all transform active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>{LABELS.registerCamera}</span>
            </button>
          ) : (
            <button
              onClick={onOpenLogin}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs rounded-lg border border-slate-700 flex items-center space-x-2 transition-all"
              title="Sign in as Administrator to register cameras"
            >
              <Lock className="w-3.5 h-3.5 text-tm-orange" />
              <span>Admin Login Required</span>
            </button>
          )}
        </div>
      </div>

      {/* Role Notice Banner if Operator or Guest */}
      {!isAdmin && (
        <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-xs text-blue-300 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <ShieldAlert className="w-4 h-4 text-blue-400 shrink-0" />
            <span>
              {currentUser ? (
                <>Logged in as <strong>Operator ({currentUser.full_name})</strong>. You have view access to stream feeds. Registering, configuring, and deleting camera routes requires <strong>Administrator</strong> privileges.</>
              ) : (
                <>You are viewing the console as a <strong>Guest</strong>. Sign in as <strong>Administrator</strong> (`admin`) to manage camera feeds and staff credentials.</>
              )}
            </span>
          </div>
          <button
            onClick={onOpenLogin}
            className="px-3 py-1 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-white font-semibold text-xs transition-colors shrink-0 ml-4"
          >
            {currentUser ? 'Switch Account' : 'Sign In as Admin'}
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Cameras */}
        <div className="p-4 rounded-xl bg-tm-midnight border border-tm-border flex items-center space-x-3.5 shadow-md">
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400">
            <Video className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-tm-muted">Registered Cameras</p>
            <h3 className="text-2xl font-black text-white mt-0.5">{cameras.length}</h3>
          </div>
        </div>

        {/* Operational Status */}
        <div className="p-4 rounded-xl bg-tm-midnight border border-tm-border flex items-center space-x-3.5 shadow-md">
          <div className="p-3 rounded-lg bg-tm-green/10 border border-tm-green/30 text-tm-green">
            <Radio className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-tm-muted">Operational Feeds</p>
            <h3 className="text-2xl font-black text-tm-green mt-0.5">
              {onlineCameras} <span className="text-xs text-tm-muted font-normal">/ {cameras.length} Active</span>
            </h3>
          </div>
        </div>

        {/* Edge Cluster Nodes */}
        <div className="p-4 rounded-xl bg-tm-midnight border border-tm-border flex items-center space-x-3.5 shadow-md">
          <div className="p-3 rounded-lg bg-tm-orange/10 border border-tm-orange/30 text-tm-orange">
            <Server className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-tm-muted">Connected Edge Nodes</p>
            <h3 className="text-2xl font-black text-white mt-0.5">2 Nodes</h3>
          </div>
        </div>

        {/* System Registry */}
        <div className="p-4 rounded-xl bg-tm-midnight border border-tm-border flex items-center space-x-3.5 shadow-md">
          <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-tm-muted">{LABELS.systemRegistry}</p>
            <h3 className="text-sm font-bold text-emerald-400 mt-1 flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-tm-green animate-pulse" />
              <span>PostgreSQL 15</span>
            </h3>
          </div>
        </div>
      </div>

      {/* Cluster Nodes Topology Section */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-tm-muted">
          Active Streaming Infrastructure
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SERVER_NODES.map((node) => (
            <div
              key={node.id}
              className="p-4 rounded-xl bg-tm-midnight border border-tm-border space-y-3 shadow-md"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-lg bg-tm-slate border border-tm-border text-tm-orange">
                    <Server className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{node.label}</h4>
                    <p className="text-[11px] text-tm-muted font-mono">{node.location}</p>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-full bg-tm-green/10 border border-tm-green/30 text-tm-green text-xs font-semibold flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-tm-green" />
                  <span>ONLINE</span>
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-tm-border/60 text-xs">
                <div className="p-2 rounded bg-tm-slate/70">
                  <span className="text-[10px] text-tm-muted block">RTSP Ingest</span>
                  <span className="font-mono text-white text-xs font-bold">Port {node.rtspPort}</span>
                </div>
                <div className="p-2 rounded bg-tm-slate/70">
                  <span className="text-[10px] text-tm-muted block">Low-Latency (WebRTC)</span>
                  <span className="font-mono text-tm-orange text-xs font-bold">Port {node.webrtcPort}</span>
                </div>
                <div className="p-2 rounded bg-tm-slate/70">
                  <span className="text-[10px] text-tm-muted block">Backup Feed (HLS)</span>
                  <span className="font-mono text-emerald-400 text-xs font-bold">Port {node.hlsPort}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cameras Registry Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-tm-muted">
            Registered Video Channels ({cameras.length})
          </h3>
        </div>

        <div className="rounded-xl bg-tm-midnight border border-tm-border shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-tm-slate/80 text-tm-muted uppercase text-[10px] font-bold tracking-wider border-b border-tm-border">
                <tr>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Camera Name</th>
                  <th className="px-4 py-3">Camera ID</th>
                  <th className="px-4 py-3">Target Server</th>
                  <th className="px-4 py-3">Low-Latency Feed (WebRTC)</th>
                  <th className="px-4 py-3">Backup Feed (HLS)</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-tm-border/50 text-slate-300">
                {cameras.map((cam) => {
                  const isOnline = cam.status === 'ONLINE';
                  const nodeLabel = formatNodeName(cam.node_name);
                  const nodeTag = getNodeShortTag(cam.node_name);

                  return (
                    <tr key={cam.id} className="hover:bg-white/5 transition-colors">
                      {/* Status */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="flex items-center space-x-1.5 font-medium">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isOnline ? 'bg-tm-green animate-pulse' : 'bg-tm-red'
                            }`}
                          />
                          <span className={isOnline ? 'text-tm-green' : 'text-tm-red'}>
                            {cam.status}
                          </span>
                        </span>
                      </td>

                      {/* Name */}
                      <td className="px-4 py-3.5 font-bold text-white whitespace-nowrap">
                        {cam.name}
                      </td>

                      {/* Stream Key / Camera ID */}
                      <td className="px-4 py-3.5 font-mono text-tm-muted whitespace-nowrap">
                        {cam.stream_key}
                      </td>

                      {/* Target Server */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center space-x-1.5">
                          <Server className="w-3.5 h-3.5 text-tm-orange" />
                          <span className="font-medium text-white">{nodeLabel}</span>
                          <span className="text-[10px] bg-slate-800 text-tm-muted px-1.5 py-0.5 rounded border border-slate-700">
                            {nodeTag}
                          </span>
                        </div>
                      </td>

                      {/* WebRTC URL */}
                      <td className="px-4 py-3.5 font-mono text-xs">
                        <div className="flex items-center space-x-2 max-w-[200px]">
                          <span className="truncate text-slate-400">{cam.webrtc_url}</span>
                          <button
                            onClick={() => copyToClipboard(cam.webrtc_url, `webrtc-${cam.id}`)}
                            className="p-1 rounded hover:bg-tm-slate text-tm-muted hover:text-white shrink-0"
                            title="Copy Low-Latency URL"
                          >
                            {copiedKey === `webrtc-${cam.id}` ? (
                              <Check className="w-3.5 h-3.5 text-tm-green" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* HLS URL */}
                      <td className="px-4 py-3.5 font-mono text-xs">
                        <div className="flex items-center space-x-2 max-w-[200px]">
                          <span className="truncate text-slate-400">{cam.hls_url}</span>
                          <button
                            onClick={() => copyToClipboard(cam.hls_url, `hls-${cam.id}`)}
                            className="p-1 rounded hover:bg-tm-slate text-tm-muted hover:text-white shrink-0"
                            title="Copy Backup Feed URL"
                          >
                            {copiedKey === `hls-${cam.id}` ? (
                              <Check className="w-3.5 h-3.5 text-tm-green" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Action Buttons */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => onViewCameraOnWall(cam.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-tm-orange/15 hover:bg-tm-orange text-tm-orange hover:text-white border border-tm-orange/30 text-xs font-semibold inline-flex items-center space-x-1 transition-all"
                            title="View on Video Wall"
                          >
                            <Tv className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Wall</span>
                          </button>
                          {isAdmin ? (
                            <>
                              <button
                                onClick={() => setCameraToEdit(cam)}
                                className="p-1.5 rounded-lg bg-blue-500/15 hover:bg-blue-500 text-blue-400 hover:text-white border border-blue-500/30 text-xs font-semibold inline-flex items-center transition-all"
                                title="Edit Camera Configuration"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setCameraToDelete(cam)}
                                className="p-1.5 rounded-lg bg-tm-red/15 hover:bg-tm-red text-tm-red hover:text-white border border-tm-red/30 text-xs font-semibold inline-flex items-center transition-all"
                                title="Delete Camera"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={onOpenLogin}
                              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-tm-muted hover:text-white text-[10px] font-medium border border-slate-700 flex items-center space-x-1"
                              title="Sign in as Administrator to edit or delete"
                            >
                              <Lock className="w-3 h-3 text-tm-orange" />
                              <span>Admin</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit Camera Modal */}
      <EditCameraModal
        isOpen={!!cameraToEdit}
        camera={cameraToEdit}
        onClose={() => setCameraToEdit(null)}
        onCameraUpdated={async () => {
          onRefresh();
        }}
      />

      {/* Delete Camera Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!cameraToDelete}
        camera={cameraToDelete}
        onClose={() => setCameraToDelete(null)}
        onCameraDeleted={async () => {
          onRefresh();
        }}
      />
    </div>
  );
};
