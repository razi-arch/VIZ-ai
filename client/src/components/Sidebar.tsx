import React from 'react';
import { 
  Search, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Video, 
  Server, 
  X,
  HardDrive
} from 'lucide-react';
import type { Camera } from '../types';
import { formatNodeName, getNodeShortTag, LABELS } from '../utils/terminology';

interface SidebarProps {
  cameras: Camera[];
  selectedCameraId: string | null;
  onSelectCamera: (cameraId: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenAddModal: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  cameras,
  selectedCameraId,
  onSelectCamera,
  searchQuery,
  onSearchChange,
  onOpenAddModal,
  isCollapsed,
  onToggleCollapse,
}) => {
  // Filter cameras by search query (name, stream_key, or node)
  const filteredCameras = cameras.filter((cam) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const nodeLabel = formatNodeName(cam.node_name).toLowerCase();
    return (
      cam.name.toLowerCase().includes(q) ||
      cam.stream_key.toLowerCase().includes(q) ||
      nodeLabel.includes(q)
    );
  });

  const onlineCount = cameras.filter((c) => c.status === 'ONLINE').length;

  return (
    <aside
      className={`relative flex flex-col bg-tm-midnight border-r border-tm-border transition-all duration-300 select-none z-20 shrink-0 ${
        isCollapsed ? 'w-16' : 'w-72 md:w-80'
      }`}
    >
      {/* Collapse Toggle Handle */}
      <button
        onClick={onToggleCollapse}
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="absolute -right-3 top-5 w-6 h-6 rounded-full bg-tm-midnight border border-tm-border text-tm-muted hover:text-white hover:border-tm-orange flex items-center justify-center shadow-lg z-30 transition-colors focus:outline-none"
      >
        {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>

      {/* Top Action & Search Area */}
      <div className="p-3.5 border-b border-tm-border space-y-3">
        {/* Primary Action: Add Camera Button */}
        <button
          onClick={onOpenAddModal}
          className={`w-full py-2.5 px-3 bg-gradient-to-r from-tm-orange to-tm-flame hover:brightness-110 text-white font-semibold rounded-lg shadow-lg shadow-tm-orange/25 flex items-center justify-center space-x-2 transition-all duration-150 transform active:scale-[0.98] ${
            isCollapsed ? 'px-0 justify-center' : ''
          }`}
          title={LABELS.registerCamera}
        >
          <Plus className="w-5 h-5 shrink-0 stroke-[2.5]" />
          {!isCollapsed && (
            <span className="text-sm tracking-wide font-bold">
              {LABELS.registerCamera}
            </span>
          )}
        </button>

        {/* Search Box */}
        {!isCollapsed ? (
          <div className="relative">
            <Search className="w-4 h-4 text-tm-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search camera by name or ID..."
              className="w-full bg-tm-slate/90 border border-tm-border rounded-lg pl-9 pr-8 py-2 text-xs text-white placeholder-tm-muted focus:outline-none focus:border-tm-orange focus:ring-1 focus:ring-tm-orange transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-tm-muted hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : (
          <div className="flex justify-center">
            <button
              onClick={onToggleCollapse}
              className="p-2 rounded-lg bg-tm-slate text-tm-muted hover:text-white"
              title="Expand to Search"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Camera Inventory Header */}
      {!isCollapsed && (
        <div className="px-4 py-2 bg-tm-slate/40 border-b border-tm-border/60 flex items-center justify-between text-[11px] text-tm-muted uppercase font-bold tracking-wider">
          <span>Camera Feeds ({filteredCameras.length})</span>
          <span className="flex items-center space-x-1 text-tm-green">
            <span className="w-1.5 h-1.5 rounded-full bg-tm-green animate-pulse" />
            <span>{onlineCount} Online</span>
          </span>
        </div>
      )}

      {/* Camera List */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-1.5 divide-y-0">
        {filteredCameras.length === 0 ? (
          <div className="py-8 text-center text-tm-muted px-4">
            {!isCollapsed ? (
              <>
                <Video className="w-8 h-8 mx-auto mb-2 opacity-30 text-tm-muted" />
                <p className="text-xs font-medium">No cameras found</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  {searchQuery ? 'Try matching another name' : 'Click "+ Register New Camera"'}
                </p>
              </>
            ) : (
              <Video className="w-5 h-5 mx-auto opacity-30" />
            )}
          </div>
        ) : (
          filteredCameras.map((cam) => {
            const isSelected = selectedCameraId === cam.id;
            const isOnline = cam.status === 'ONLINE';
            const serverTag = getNodeShortTag(cam.node_name);

            if (isCollapsed) {
              return (
                <button
                  key={cam.id}
                  onClick={() => onSelectCamera(cam.id)}
                  className={`relative w-full aspect-square rounded-lg flex items-center justify-center transition-all ${
                    isSelected
                      ? 'bg-tm-orange/20 border-2 border-tm-orange text-white'
                      : 'hover:bg-tm-slate/80 text-tm-muted hover:text-white border border-transparent'
                  }`}
                  title={`${cam.name} (${cam.stream_key}) — ${formatNodeName(cam.node_name)}`}
                >
                  <Video className="w-5 h-5" />
                  <span
                    className={`absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full border-2 border-tm-midnight ${
                      isOnline ? 'bg-tm-green' : 'bg-tm-red'
                    }`}
                  />
                </button>
              );
            }

            return (
              <div
                key={cam.id}
                onClick={() => onSelectCamera(cam.id)}
                className={`group cursor-pointer rounded-lg p-2.5 transition-all border flex items-start space-x-3 ${
                  isSelected
                    ? 'bg-tm-orange/10 border-tm-orange shadow-md shadow-tm-orange/10'
                    : 'bg-tm-slate/50 hover:bg-tm-slate/90 border-tm-border/60 hover:border-slate-600'
                }`}
              >
                {/* Status Dot with pulse */}
                <div className="pt-1 shrink-0">
                  <span className="relative flex h-2.5 w-2.5">
                    {isOnline && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tm-green opacity-75"></span>
                    )}
                    <span
                      className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                        isOnline ? 'bg-tm-green' : 'bg-tm-red'
                      }`}
                    />
                  </span>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-white truncate group-hover:text-tm-orange transition-colors">
                      {cam.name}
                    </h4>
                    <span className="text-[10px] font-mono text-tm-muted bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700/60 shrink-0 ml-1">
                      {serverTag}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-1 text-[11px] text-tm-muted">
                    <span className="font-mono truncate">{cam.stream_key}</span>
                    <span className="text-[10px] text-emerald-400 capitalize">{cam.status.toLowerCase()}</span>
                  </div>

                  {/* Server location line */}
                  <div className="mt-1 flex items-center space-x-1 text-[10px] text-slate-400">
                    <Server className="w-3 h-3 text-tm-orange/80 shrink-0" />
                    <span className="truncate">{formatNodeName(cam.node_name)}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Infrastructure Summary Panel */}
      {!isCollapsed && (
        <div className="p-3 border-t border-tm-border bg-tm-slate/80 space-y-2 text-[11px]">
          <div className="flex items-center justify-between text-tm-muted font-semibold uppercase text-[10px] tracking-wider">
            <span>Cluster Edge Nodes</span>
            <span className="text-emerald-400 font-mono">2 / 2 Active</span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <div className="p-1.5 rounded bg-tm-midnight/80 border border-tm-border flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-tm-green shrink-0" />
              <div className="min-w-0">
                <p className="font-bold text-[10px] text-white truncate">Server 01</p>
                <p className="text-[9px] text-tm-muted truncate">Cyberjaya</p>
              </div>
            </div>

            <div className="p-1.5 rounded bg-tm-midnight/80 border border-tm-border flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-tm-green shrink-0" />
              <div className="min-w-0">
                <p className="font-bold text-[10px] text-white truncate">Server 02</p>
                <p className="text-[9px] text-tm-muted truncate">Puchong</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] text-tm-muted pt-1 border-t border-tm-border/40">
            <span className="flex items-center space-x-1">
              <HardDrive className="w-3 h-3 text-tm-orange" />
              <span>{LABELS.systemRegistry}</span>
            </span>
            <span className="text-emerald-400 font-medium">PostgreSQL 15</span>
          </div>
        </div>
      )}
    </aside>
  );
};
