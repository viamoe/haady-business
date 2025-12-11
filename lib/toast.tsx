'use client';

import { toast as sonnerToast } from 'sonner';
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
};
