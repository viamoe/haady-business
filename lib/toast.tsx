'use client';

import { toast as sonnerToast } from 'sonner';
import { solidToast } from '@/components/ui/solid-toast';
import { ErrorType } from './error-handler';

interface ToastOptions {
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  errorType?: ErrorType;
}

// Custom toast wrapper functions
export const toast = {
  success: (title: string, options?: ToastOptions) => {
    return sonnerToast.success(title, {
      description: options?.description,
      duration: options?.duration || 5000,
      action: options?.action ? {
        label: options.action.label,
        onClick: options.action.onClick,
      } : undefined,
      className: options?.className,
    });
  },

  error: (title: string, options?: ToastOptions) => {
    return sonnerToast.error(title, {
      description: options?.description,
      duration: options?.duration || 5000,
      action: options?.action ? {
        label: options.action.label,
        onClick: options.action.onClick,
      } : undefined,
      className: options?.className,
    });
  },

  info: (title: string, options?: ToastOptions) => {
    return sonnerToast.info(title, {
      description: options?.description,
      duration: options?.duration || 5000,
      action: options?.action ? {
        label: options.action.label,
        onClick: options.action.onClick,
      } : undefined,
      className: options?.className,
    });
  },

  warning: (title: string, options?: ToastOptions) => {
    return sonnerToast.warning(title, {
      description: options?.description,
      duration: options?.duration || 5000,
      action: options?.action ? {
        label: options.action.label,
        onClick: options.action.onClick,
      } : undefined,
      className: options?.className,
    });
  },

  // Solid toast variants - Full width, colored background, white text
  // Uses custom portal-based toast component for full control
  solid: {
    success: (title: string, options?: ToastOptions) => {
      solidToast.success(title, {
        description: options?.description,
        duration: options?.duration,
      });
    },

    error: (title: string, options?: ToastOptions) => {
      solidToast.error(title, {
        description: options?.description,
        duration: options?.duration || 5000,
      });
    },

    warning: (title: string, options?: ToastOptions) => {
      solidToast.warning(title, {
        description: options?.description,
        duration: options?.duration,
      });
    },

    info: (title: string, options?: ToastOptions) => {
      solidToast.info(title, {
        description: options?.description,
        duration: options?.duration,
      });
    },
  },
};
