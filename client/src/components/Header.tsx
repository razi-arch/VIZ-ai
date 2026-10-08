import React from 'react';
import { 
  Grid2X2, 
  Grid3X3, 
  Square, 
  Tv, 
  SlidersHorizontal, 
  RefreshCw, 
  Database,
  Maximize,
  Minimize,
  User,
  LogIn,
  LogOut,
  ShieldCheck,
  ShieldAlert,
  Users
} from 'lucide-react';
import type { GridMatrix, ViewMode, AuthUser } from '../types';
import { LABELS } from '../utils/terminology';

interface HeaderProps {
  currentMatrix: GridMatrix;
  onMatrixChange: (matrix: GridMatrix) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  isRefreshing: boolean;
  onRefresh: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  systemOnline?: boolean;
  currentUser: AuthUser | null;
  onOpenLogin: () => void;
  onOpenUserManagement: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentMatrix,
  onMatrixChange,
  viewMode,
  onViewModeChange,
  isRefreshing,
  onRefresh,
  isFullscreen,
  onToggleFullscreen,
  systemOnline = true,
  currentUser,
  onOpenLogin,
  onOpenUserManagement,
  onLogout,
}) => {
  return (
    <header className="h-16 bg-tm-midnight border-b border-tm-border px-4 md:px-6 flex items-center justify-between select-none shrink-0 z-30 shadow-md">
      {/* Brand Identity */}
      <div className="flex items-center space-x-3.5">
        {/* TM Geometric Brand Mark Icon */}
        <div className="relative flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-tm-orange to-tm-flame shadow-lg shadow-tm-orange/20 ring-1 ring-white/10">
          <svg 
            viewBox="0 0 24 24" 
            className="w-6 h-6 text-white drop-shadow-sm" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            {/* Stylized TM 'T' & Media Pulse Wave */}
            <path d="M4 6h16" />
            <path d="M12 6v14" />
            <path d="M7 14l2-2 3 3 5-5" strokeWidth="2" />
          </svg>
        </div>

        <div>
          <div className="flex items-center space-x-2">
            <span className="font-extrabold text-lg tracking-tight text-white">
              Viz<span className="text-tm-orange">AI</span>
            </span>
            <span className="text-sm font-semibold tracking-wider text-slate-300 uppercase">
              Video Engine
            </span>
            <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-semibold bg-tm-orange/15 text-tm-orange border border-tm-orange/30 rounded tracking-wider">
              TM VMS
            </span>
          </div>
          <p className="text-[11px] text-tm-muted leading-none hidden md:block">
            Telekom Malaysia Enterprise CCTV Matrix
          </p>
        </div>

        <div className="h-6 w-[1px] bg-tm-border mx-2 hidden sm:block" />

        {/* Live Operational Badge */}
        <div className="hidden sm:flex items-center space-x-2 px-2.5 py-1 rounded-full bg-tm-green/10 border border-tm-green/30">
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${systemOnline ? 'bg-tm-green' : 'bg-tm-red'}`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${systemOnline ? 'bg-tm-green' : 'bg-tm-red'}`}></span>
          </span>
          <span className="text-xs font-medium text-tm-green tracking-wide">
            {systemOnline ? LABELS.operationalStatus : 'System Reconnecting'}
          </span>
        </div>

        {/* System Registry Indicator */}
        <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300">
          <Database className="w-3.5 h-3.5 text-tm-orange" />
          <span className="text-[11px] text-tm-muted">{LABELS.systemRegistry}:</span>
          <span className="text-[11px] font-semibold text-emerald-400">Connected</span>
        </div>
      </div>

      {/* Center / Right Controls */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* View Mode Toggle */}
        <div className="bg-tm-slate/90 p-1 rounded-lg border border-tm-border flex items-center space-x-1 shadow-inner">
          <button
            onClick={() => onViewModeChange('wall')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              viewMode === 'wall'
                ? 'bg-tm-orange text-white shadow-md shadow-tm-orange/30'
                : 'text-tm-muted hover:text-white hover:bg-white/5'
            }`}
            title="Video Wall Grid"
          >
            <Tv className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Video Wall</span>
          </button>
          <button
            onClick={() => onViewModeChange('management')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              viewMode === 'management'
                ? 'bg-tm-orange text-white shadow-md shadow-tm-orange/30'
                : 'text-tm-muted hover:text-white hover:bg-white/5'
            }`}
            title="Management View"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Management View</span>
          </button>
        </div>

        {/* Layout Matrix Switcher (Visible in Video Wall Mode) */}
        {viewMode === 'wall' && (
          <div className="bg-tm-slate/90 p-1 rounded-lg border border-tm-border flex items-center space-x-1 shadow-inner">
            <button
              onClick={() => onMatrixChange('1x1')}
              className={`p-1.5 rounded-md text-xs font-medium transition-all ${
                currentMatrix === '1x1'
                  ? 'bg-tm-orange text-white shadow-sm'
                  : 'text-tm-muted hover:text-white hover:bg-white/5'
              }`}
              title="1x1 Single Focus Grid"
            >
              <Square className="w-4 h-4" />
            </button>
            <button
              onClick={() => onMatrixChange('2x2')}
              className={`p-1.5 rounded-md text-xs font-medium transition-all ${
                currentMatrix === '2x2'
                  ? 'bg-tm-orange text-white shadow-sm'
                  : 'text-tm-muted hover:text-white hover:bg-white/5'
              }`}
              title="2x2 Quad Grid (4 Feeds)"
            >
              <Grid2X2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onMatrixChange('3x3')}
              className={`p-1.5 rounded-md text-xs font-medium transition-all ${
                currentMatrix === '3x3'
                  ? 'bg-tm-orange text-white shadow-sm'
                  : 'text-tm-muted hover:text-white hover:bg-white/5'
              }`}
              title="3x3 High-Density Grid (9 Feeds)"
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Refresh Camera Feeds Button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="p-2 rounded-lg bg-tm-slate/80 hover:bg-tm-elevated border border-tm-border text-tm-muted hover:text-white transition-all focus:outline-none"
          title="Refresh Camera Feeds & System Registry"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-tm-orange' : ''}`} />
        </button>

        {/* Fullscreen Toggle */}
        <button
          onClick={onToggleFullscreen}
          className="p-2 rounded-lg bg-tm-slate/80 hover:bg-tm-elevated border border-tm-border text-tm-muted hover:text-white transition-all focus:outline-none"
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
        </button>

        <div className="h-6 w-[1px] bg-tm-border hidden sm:block" />

        {/* User Session Profile & Controls */}
        {currentUser ? (
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2 px-2.5 py-1.5 rounded-lg bg-tm-slate/90 border border-tm-border text-xs">
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-tm-orange to-tm-flame flex items-center justify-center text-[10px] text-white font-black shadow-sm">
                {currentUser.username.charAt(0).toUpperCase()}
              </div>
              <div className="hidden lg:block text-left leading-tight">
                <span className="text-white font-bold block text-[11px] truncate max-w-[90px]">
                  {currentUser.username}
                </span>
                <span className={`text-[9px] font-extrabold uppercase px-1 rounded inline-block ${
                  currentUser.role === 'ADMIN' ? 'bg-tm-orange/20 text-tm-orange' : 'bg-blue-500/20 text-blue-400'
                }`}>
                  {currentUser.role}
                </span>
              </div>
            </div>

            {/* Admin: Staff Management Icon */}
            {currentUser.role === 'ADMIN' && (
              <button
                onClick={onOpenUserManagement}
                className="p-2 rounded-lg bg-tm-slate/80 hover:bg-tm-elevated border border-tm-border text-slate-300 hover:text-white transition-all"
                title="Staff Accounts (RBAC Directory)"
              >
                <Users className="w-4 h-4 text-tm-orange" />
              </button>
            )}

            {/* Logout Button */}
            <button
              onClick={onLogout}
              className="p-2 rounded-lg bg-tm-red/10 hover:bg-tm-red/20 border border-tm-red/30 text-tm-red hover:text-white transition-all"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenLogin}
            className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-tm-orange to-tm-flame hover:brightness-110 text-white font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-tm-orange/30 transition-all"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
};
