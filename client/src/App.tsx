import React, { useState, useEffect, useCallback } from 'react';
import type { Camera, GridMatrix, ViewMode, AuthUser } from './types';
import { fetchCameras, checkSystemHealth, getCurrentUser, logout, getStoredUser } from './services/api';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { VideoWall } from './components/VideoWall';
import { ManagementView } from './components/ManagementView';
import { AddCameraModal } from './components/AddCameraModal';
import { LoginModal } from './components/LoginModal';
import { UserManagementModal } from './components/UserManagementModal';
import { AlertCircle, RefreshCw } from 'lucide-react';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(getStoredUser());
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [isUserManagementModalOpen, setIsUserManagementModalOpen] = useState<boolean>(false);

  const [cameras, setCameras] = useState<Camera[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [matrix, setMatrix] = useState<GridMatrix>('2x2');
  const [viewMode, setViewMode] = useState<ViewMode>('wall');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [systemOnline, setSystemOnline] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Load cameras from API
  const loadCameras = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsRefreshing(true);
    try {
      const data = await fetchCameras();
      setCameras(data);
      setErrorMessage(null);

      // Default select first camera if none selected, or fallback if selected camera was deleted
      setSelectedCameraId((current) => {
        if (!current) return data[0]?.id || null;
        const exists = data.some((c) => c.id === current);
        return exists ? current : (data[0]?.id || null);
      });
    } catch (err: any) {
      console.error('Failed to load cameras:', err);
      setErrorMessage(err.message || 'Unable to connect to VizAI Core backend at http://localhost:3000');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Periodic health check
  const checkHealth = useCallback(async () => {
    const health = await checkSystemHealth();
    setSystemOnline(health.online);
  }, []);

  // Handle User Logout
  const handleLogout = () => {
    logout();
    setCurrentUser(null);
    loadCameras();
  };

  // Handle Successful Login
  const handleLoginSuccess = (user: AuthUser) => {
    setCurrentUser(user);
    loadCameras();
  };

  // Initial load & session check
  useEffect(() => {
    getCurrentUser().then((user) => {
      if (user) setCurrentUser(user);
    });

    loadCameras();
    checkHealth();

    // Auto-poll camera status every 15 seconds
    const interval = setInterval(() => {
      loadCameras(true);
      checkHealth();
    }, 15000);

    return () => clearInterval(interval);
  }, [loadCameras, checkHealth]);

  // Handle Fullscreen Toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // View a specific camera on video wall from management view or sidebar
  const handleViewCameraOnWall = (cameraId: string) => {
    setSelectedCameraId(cameraId);
    setViewMode('wall');
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-tm-slate text-white overflow-hidden font-sans select-none">
      {/* Top Header */}
      <Header
        currentMatrix={matrix}
        onMatrixChange={setMatrix}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        isRefreshing={isRefreshing}
        onRefresh={() => loadCameras()}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        systemOnline={systemOnline}
        currentUser={currentUser}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onOpenUserManagement={() => setIsUserManagementModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Backend Disconnected Warning Banner */}
      {errorMessage && (
        <div className="bg-tm-red/20 border-b border-tm-red/40 px-4 py-2 flex items-center justify-between text-xs text-tm-red">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              <strong>Backend Alert:</strong> {errorMessage} (Ensure `http://localhost:3000` is active)
            </span>
          </div>
          <button
            onClick={() => loadCameras()}
            className="px-2.5 py-1 rounded bg-tm-red/30 hover:bg-tm-red/50 text-white font-medium flex items-center space-x-1"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Retry Connection</span>
          </button>
        </div>
      )}

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Collapsible Sidebar */}
        <Sidebar
          cameras={cameras}
          selectedCameraId={selectedCameraId}
          onSelectCamera={handleViewCameraOnWall}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenAddModal={() => setIsAddModalOpen(true)}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        {/* Main Workspace Canvas */}
        <main className="flex-1 flex flex-col min-w-0 min-h-0 bg-tm-slate overflow-hidden relative">
          {isLoading && cameras.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin text-tm-orange" />
              <p className="text-xs font-semibold text-slate-300">
                Initializing VizAI Video Matrix...
              </p>
            </div>
          ) : viewMode === 'wall' ? (
            <VideoWall
              cameras={cameras}
              matrix={matrix}
              selectedCameraId={selectedCameraId}
              onSelectCamera={setSelectedCameraId}
              onOpenAddModal={() => setIsAddModalOpen(true)}
            />
          ) : (
            <ManagementView
              cameras={cameras}
              onOpenAddModal={() => setIsAddModalOpen(true)}
              onViewCameraOnWall={handleViewCameraOnWall}
              onRefresh={() => loadCameras()}
              isRefreshing={isRefreshing}
              currentUser={currentUser}
              onOpenLogin={() => setIsLoginModalOpen(true)}
              onOpenUserManagement={() => setIsUserManagementModalOpen(true)}
            />
          )}
        </main>
      </div>

      {/* Add Camera Modal / Drawer */}
      <AddCameraModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onCameraAdded={async () => {
          await loadCameras();
        }}
      />

      {/* Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Staff User Management Modal */}
      <UserManagementModal
        isOpen={isUserManagementModalOpen}
        onClose={() => setIsUserManagementModalOpen(false)}
        currentUser={currentUser}
      />
    </div>
  );
};

export default App;
