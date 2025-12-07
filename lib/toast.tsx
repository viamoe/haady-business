'use client';

import { useState, useEffect, useRef } from 'react';
import { toast as sonnerToast } from 'sonner';
import { RefreshCw, Check } from 'lucide-react';

interface ToastOptions {
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  showRefreshIcon?: boolean; // Deprecated: use showCheckIcon instead
  showCheckIcon?: boolean; // New option to show animated check icon
}

const DEFAULT_DURATION = 5000; // 5 seconds

// Track active toast to prevent multiple toasts
let activeToastId: string | number | null = null;

// Toast with check icon component
const ToastWithCheckIcon = ({ 
  title, 
  duration = DEFAULT_DURATION,
  type = 'success',
  onComplete,
}: { 
  title: string; 
  duration?: number;
  type?: 'success' | 'error' | 'info' | 'warning';
  onComplete?: () => void;
}) => {
  const typeColors = {
    success: 'text-green-400',
    error: 'text-red-400',
    info: 'text-blue-400',
    warning: 'text-yellow-400',
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  return (
    <div className="flex items-center gap-3 bg-[#0F0F0F] border-0 rounded-lg px-4 py-2.5 min-w-[280px]">
      <div className="relative w-6 h-6 flex-shrink-0 flex items-center justify-center">
        <Check className={`w-5 h-5 ${typeColors[type]} animate-[scaleIn_0.3s_ease-out_forwards]`} style={{ transformOrigin: 'center' }} />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-white">{title}</p>
      </div>
    </div>
  );
};

// Circular countdown component
const ToastWithCountdown = ({ 
  title, 
  description, 
  duration = DEFAULT_DURATION,
  type = 'success',
  onComplete,
  action
}: { 
  title: string; 
  description?: string; 
  duration?: number;
  type?: 'success' | 'error' | 'info' | 'warning';
  onComplete?: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
}) => {
  const [countdown, setCountdown] = useState(Math.ceil(duration / 1000));
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const totalSeconds = Math.ceil(duration / 1000);
    setCountdown(totalSeconds);
    setProgress(100);

    const interval = setInterval(() => {
      setCountdown((prev) => {
        const newValue = prev - 1;
        const progressPercent = (newValue / totalSeconds) * 100;
        setProgress(progressPercent);
        
        if (newValue <= 0) {
          clearInterval(interval);
          onComplete?.();
          return 0;
        }
        return newValue;
      });
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [duration, onComplete]);

  const circumference = 2 * Math.PI * 18; // radius = 18
  const offset = circumference - (progress / 100) * circumference;

  const typeColors = {
    success: 'text-green-400',
    error: 'text-red-400',
    info: 'text-blue-400',
    warning: 'text-yellow-400',
  };

  return (
    <div className="flex items-center gap-3 bg-[#0F0F0F] border-0 rounded-lg p-4 min-w-[320px]">
      <div className="relative w-10 h-10 flex-shrink-0">
        <svg className="w-10 h-10 transform -rotate-90" viewBox="0 0 40 40">
          <circle
            cx="20"
            cy="20"
            r="18"
            stroke="currentColor"
            strokeWidth="3"
            fill="none"
            className="text-muted-foreground/20"
          />
          <circle
            cx="20"
            cy="20"
            r="18"
            stroke="currentColor"
            strokeWidth="3"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={`${typeColors[type]} transition-all duration-1000`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-semibold text-white">{countdown}</span>
        </div>
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-white">{title}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="ml-2 px-3 py-1.5 text-xs font-semibold text-white bg-[#0062fb] hover:bg-[#0052d9] rounded-md transition-colors border-0"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};

// Helper function to show toast with delay if needed
const showToast = (
  title: string,
  options: ToastOptions | undefined,
  type: 'success' | 'error' | 'info' | 'warning'
): number | string | undefined => {
  const show = () => {
    let ToastComponent: any;
    let toastProps: any;
    
    if (options?.showCheckIcon) {
      ToastComponent = ToastWithCheckIcon;
      toastProps = {
        title,
        duration: options?.duration || DEFAULT_DURATION,
        type,
        onComplete: () => {
          activeToastId = null;
        },
      };
    } else {
      ToastComponent = ToastWithCountdown;
      toastProps = {
        title,
        description: options?.description,
        duration: options?.duration || DEFAULT_DURATION,
        type,
        action: options?.action,
        onComplete: () => {
          activeToastId = null;
        },
      };
    }
    
    const toastId = sonnerToast.custom(
      (id) => {
        return <ToastComponent {...toastProps} />;
      },
      {
        duration: options?.duration || DEFAULT_DURATION,
        onDismiss: () => {
          activeToastId = null;
        },
        onAutoClose: () => {
          activeToastId = null;
        },
      }
    );
    activeToastId = toastId;
    return toastId;
  };

  // If there's an active toast, dismiss it first and wait before showing new one
  if (activeToastId !== null) {
    sonnerToast.dismiss(activeToastId);
    activeToastId = null;
    setTimeout(show, 300);
    return undefined;
  }

  return show();
};

// Custom toast wrapper functions
export const toast = {
  success: (title: string, options?: ToastOptions) => {
    return showToast(title, options, 'success');
  },

  error: (title: string, options?: ToastOptions) => {
    return showToast(title, options, 'error');
  },

  info: (title: string, options?: ToastOptions) => {
    return showToast(title, options, 'info');
  },

  warning: (title: string, options?: ToastOptions) => {
    return showToast(title, options, 'warning');
  },

  // Keep custom for special cases like the auth form
  custom: sonnerToast.custom,
};

