import React, { useEffect, useState, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Film, Upload, Tv, Bell, X, CheckCircle2, AlertTriangle, Loader2, Info, LogOut } from 'lucide-react';
import { socket } from '../utils/socket';

interface LayoutProps {
  children: React.ReactNode;
}

interface TranscodeTask {
  videoId: string;
  title: string;
  progress: number;
  status: 'processing' | 'success' | 'error';
  error?: string;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [transcodeTasks, setTranscodeTasks] = useState<TranscodeTask[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const userJson = localStorage.getItem('user');
  let user: any = null;
  try {
    user = userJson ? JSON.parse(userJson) : null;
  } catch (e) {
    console.error('Failed to parse user storage:', e);
  }
  const username = user?.username || 'Watcher';
  const nameInitials = user 
    ? `${user.firstName ? user.firstName[0] : 'W'}${user.lastName ? user.lastName[0] : ''}`.toUpperCase()
    : 'W';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/auth';
  };

  const isLinkActive = (path: string) => {
    return location.pathname === path;
  };

  useEffect(() => {
    // 1. Fetch active transcodes on mount
    const fetchActiveTranscodes = async () => {
      try {
        const res = await fetch(`${API_URL}/api/videos/transcoding`);
        if (res.ok) {
          const data = await res.json();
          setTranscodeTasks(data);
        }
      } catch (err) {
        console.error('Failed to fetch active transcodes:', err);
      }
    };

    fetchActiveTranscodes();

    // 2. Setup socket progress event listeners
    const handleTranscodeProgress = (data: TranscodeTask) => {
      setTranscodeTasks(prev => {
        const index = prev.findIndex(t => t.videoId === data.videoId);
        if (index > -1) {
          const updated = [...prev];
          updated[index] = data;
          return updated;
        } else {
          return [data, ...prev];
        }
      });
    };

    const handleActiveTranscodes = (tasks: TranscodeTask[]) => {
      setTranscodeTasks(tasks);
    };

    socket.on('transcode-progress', handleTranscodeProgress);
    socket.on('active-transcodes', handleActiveTranscodes);

    // 3. Handle clicking outside to close notifications dropdown
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      socket.off('transcode-progress', handleTranscodeProgress);
      socket.off('active-transcodes', handleActiveTranscodes);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [API_URL]);

  const activeCount = transcodeTasks.filter(t => t.status === 'processing').length;

  const dismissTask = (videoId: string) => {
    setTranscodeTasks(prev => prev.filter(t => t.videoId !== videoId));
  };

  return (
    <div className="min-h-screen bg-bg-main text-text-main flex flex-col">
      {/* Navigation Header */}
      <header className="sticky top-0 z-40 bg-bg-surface/80 backdrop-blur-md border-b border-border-main/50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <Link to="/" className="flex items-center space-x-2 text-xl font-bold tracking-tight text-glow text-primary transition-all">
            <Film className="w-6 h-6 text-primary" />
            <span>LumiStream</span>
          </Link>

          <nav className="hidden md:flex space-x-1">
            <Link
              to="/"
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isLinkActive('/')
                  ? 'bg-primary-light text-primary'
                  : 'text-text-muted hover:text-text-main hover:bg-border-main/40'
              }`}
            >
              <Tv className="w-4 h-4" />
              <span>Watchrooms</span>
            </Link>
            <Link
              to="/upload"
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isLinkActive('/upload')
                  ? 'bg-primary-light text-primary'
                  : 'text-text-muted hover:text-text-main hover:bg-border-main/40'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Upload Video</span>
            </Link>
          </nav>
        </div>

        {/* User Info Mock & Quick Action */}
        <div className="flex items-center space-x-4">
          {/* Notification Bell */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 rounded-lg border border-border-main hover:bg-bg-surface hover:text-primary transition-all cursor-pointer relative"
              aria-label="Transcoding Notifications"
            >
              <Bell className={`w-5 h-5 ${activeCount > 0 ? 'animate-bounce text-primary' : 'text-text-muted'}`} />
              {transcodeTasks.length > 0 && (
                <span className={`absolute top-1 right-1 w-2.5 h-2.5 rounded-full ${
                  activeCount > 0 ? 'bg-primary animate-ping' : 'bg-accent'
                }`} />
              )}
            </button>

            {/* Notification Dropdown Panel */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-bg-surface border border-border-main rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in text-left">
                <div className="p-4 border-b border-border-main/50 flex items-center justify-between bg-bg-main/30">
                  <div className="flex items-center space-x-2">
                    <Bell className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold text-text-main">Transcoding Activities</span>
                  </div>
                  {transcodeTasks.length > 0 && (
                    <button
                      onClick={() => setTranscodeTasks([])}
                      className="text-[10px] text-text-muted hover:text-primary transition-colors cursor-pointer"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-border-main/30">
                  {transcodeTasks.length === 0 ? (
                    <div className="p-8 text-center text-xs text-text-muted flex flex-col items-center justify-center space-y-2">
                      <Info className="w-6 h-6 text-border-active" />
                      <span>No active transcoding tasks</span>
                      <p className="text-[10px] max-w-[200px]">Uploaded videos that are being processed will show up here in real-time.</p>
                    </div>
                  ) : (
                    transcodeTasks.map(task => (
                      <div key={task.videoId} className="p-4 space-y-2.5 hover:bg-bg-main/20 transition-all relative group">
                        <button
                          onClick={() => dismissTask(task.videoId)}
                          className="absolute top-2 right-2 text-text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-bg-main cursor-pointer"
                          title="Dismiss"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                        
                        <div className="flex justify-between items-start pr-5">
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs font-semibold text-text-main truncate" title={task.title}>
                              {task.title}
                            </h4>
                            <p className="text-[10px] text-text-muted mt-0.5 capitalize flex items-center space-x-1">
                              {task.status === 'processing' && (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 text-primary animate-spin inline" />
                                  <span>Transcoding HLS...</span>
                                </>
                              )}
                              {task.status === 'success' && (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 inline" />
                                  <span className="text-emerald-400">Complete! Ready to watch</span>
                                </>
                              )}
                              {task.status === 'error' && (
                                <>
                                  <AlertTriangle className="w-3.5 h-3.5 text-red-400 inline" />
                                  <span className="text-red-400 truncate">Failed: {task.error}</span>
                                </>
                              )}
                            </p>
                          </div>
                          <span className={`text-xs font-bold ${
                            task.status === 'success' ? 'text-emerald-400' :
                            task.status === 'error' ? 'text-red-400' : 'text-primary'
                          }`}>
                            {task.progress}%
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-300 rounded-full ${
                              task.status === 'success' ? 'bg-emerald-500' :
                              task.status === 'error' ? 'bg-red-500' : 'bg-primary'
                            }`}
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <Link
            to="/upload"
            className="md:hidden flex p-2 rounded-lg bg-primary hover:bg-primary-hover text-bg-main transition-colors duration-200"
          >
            <Upload className="w-5 h-5" />
          </Link>
          <Link
            to="/profile"
            className="flex items-center space-x-2 bg-bg-main border border-border-main/50 px-2.5 py-1 rounded-lg hover:border-primary/50 transition-colors"
          >
            {user?.avatarUrl ? (
              <img 
                src={user.avatarUrl} 
                alt={username} 
                className="w-6 h-6 rounded-full object-cover"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-zinc-300 text-xs">
                {nameInitials}
              </div>
            )}
            <span className="hidden sm:inline-block text-xs font-semibold text-text-main">
              {username}
            </span>
          </Link>
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="p-2 rounded-lg border border-border-main hover:bg-red-950/20 hover:border-red-500/30 hover:text-red-400 text-text-muted transition-all cursor-pointer"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border-main/30 py-6 text-center text-xs text-text-muted">
        <p>&copy; {new Date().getFullYear()} LumiStream. Aesthetic Synchronized Video Streaming.</p>
      </footer>

      {/* Monochromatic Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-sm w-full p-6 space-y-6 shadow-2xl animate-scale-up text-left">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-white">Log Out</h3>
              <p className="text-xs text-zinc-400">Are you sure you want to log out of your LumiStream session?</p>
            </div>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-350 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-750 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
