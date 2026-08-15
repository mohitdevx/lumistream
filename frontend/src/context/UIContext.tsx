import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Loader2, CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface UIContextType {
  showLoader: (text?: string) => void;
  hideLoader: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loaderText, setLoaderText] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showLoader = useCallback((text?: string) => {
    setLoaderText(text || 'Loading...');
  }, []);

  const hideLoader = useCallback(() => {
    setLoaderText(null);
  }, []);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto remove after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <UIContext.Provider value={{ showLoader, hideLoader, showToast }}>
      {children}

      {/* Global Loader Overlay */}
      {loaderText !== null && (
        <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-black/75 backdrop-blur-md animate-fade-in">
          <div className="bg-bg-surface/60 border border-border-main p-8 rounded-2xl flex flex-col items-center space-y-4 shadow-2xl max-w-xs text-center">
            <div className="relative">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
              <div className="absolute inset-0 rounded-full border border-primary/20 border-t-primary animate-ping" />
            </div>
            <p className="text-xs font-bold text-text-main tracking-tight uppercase">{loaderText}</p>
          </div>
        </div>
      )}

      {/* Global Toast Stack */}
      <div className="fixed bottom-5 right-5 z-[999] flex flex-col space-y-3.5 max-w-sm w-full px-4 sm:px-0 pointer-events-none">
        {toasts.map((toast) => {
          let Icon = Info;
          let colorClasses = 'bg-blue-950/45 border-blue-500/30 text-blue-400';
          if (toast.type === 'success') {
            Icon = CheckCircle2;
            colorClasses = 'bg-emerald-950/45 border-emerald-500/30 text-emerald-400';
          } else if (toast.type === 'error') {
            Icon = AlertTriangle;
            colorClasses = 'bg-red-950/45 border-red-500/30 text-red-400';
          }

          return (
            <div
              key={toast.id}
              className={`flex items-start justify-between p-4 rounded-2xl border backdrop-blur-md shadow-2xl pointer-events-auto ${colorClasses} animate-[scale-up_0.18s_ease-out_forwards]`}
            >
              <div className="flex items-start space-x-3 text-left">
                <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span className="text-xs font-semibold leading-relaxed break-words">{toast.message}</span>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="ml-3 p-1 rounded-lg text-text-muted hover:text-text-main transition-colors cursor-pointer flex-shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </UIContext.Provider>
  );
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
};
