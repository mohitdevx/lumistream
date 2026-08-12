import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Film, Upload, Tv } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();

  const isLinkActive = (path: string) => {
    return location.pathname === path;
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
          <Link
            to="/upload"
            className="md:hidden flex p-2 rounded-lg bg-primary hover:bg-primary-hover text-bg-main transition-colors duration-200"
          >
            <Upload className="w-5 h-5" />
          </Link>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-accent flex items-center justify-center font-bold text-bg-main text-sm">
              U
            </div>
            <span className="hidden sm:inline-block text-sm font-medium text-text-main">
              Watcher
            </span>
          </div>
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
    </div>
  );
};
