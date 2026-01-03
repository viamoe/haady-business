'use client';

import React from 'react';
import { toast as sonnerToast } from 'sonner';
import { solidToast } from '@/components/ui/solid-toast';
import { ErrorType } from './error-handler';

interface ToastOptions {
  description?: string | React.ReactNode;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  errorType?: ErrorType;
  productImage?: string | null;
  productName?: string;
}

// Custom toast wrapper functions
export const toast = {
  success: (title: string, options?: ToastOptions) => {
    // If product image and name are provided, create custom layout
    let toastTitle: string | React.ReactNode = title;
    let description: string | React.ReactNode = options?.description;
    
    // Check if we should show product info (only if explicitly provided)
    if (options && (options.productImage !== undefined || options.productName !== undefined)) {
      const hasImage = options.productImage && options.productImage.trim() !== ''
      const hasName = options.productName && options.productName.trim() !== ''
      
      if (hasImage || hasName) {
        // Create custom title with product name first, then success message
        const productName = hasName ? options.productName! : ''
        const successMessage = title // "Product updated successfully" or "Product created successfully"
        
        toastTitle = (
          <div className="flex items-center gap-2.5" style={{ width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }}>
            {hasImage && (
              <div className="h-10 w-10 overflow-hidden bg-gray-50 flex-shrink-0" style={{ flexShrink: 0 }}>
                <img 
                  src={options.productImage!} 
                  alt={productName || 'Product'} 
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              </div>
            )}
            <div className="flex-1 min-w-0" style={{ overflow: 'hidden', minWidth: 0, maxWidth: hasImage ? 'calc(100% - 3rem)' : '100%', boxSizing: 'border-box' }}>
              {hasName && (
                <p 
                  className="text-sm font-medium text-gray-900" 
                  title={productName}
                  style={{ 
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    width: '100%',
                    maxWidth: '100%',
                    display: 'block',
                    boxSizing: 'border-box',
                    margin: 0,
                    lineHeight: '1.25rem',
                    fontSize: '0.875rem'
                  }}
                >
                  {productName}
                </p>
              )}
              <p 
                className="text-xs text-gray-500" 
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  width: '100%',
                  maxWidth: '100%',
                  boxSizing: 'border-box',
                  margin: 0,
                  lineHeight: '1rem',
                  fontSize: '0.8125rem',
                  marginTop: hasName ? '0.125rem' : '0'
                }}
              >
                {successMessage}
              </p>
            </div>
          </div>
        );
      }
    }

    return sonnerToast.success(toastTitle as any, {
      description: description as any,
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
        description: typeof options?.description === 'string' ? options.description : undefined,
        duration: options?.duration,
      });
    },

    error: (title: string, options?: ToastOptions) => {
      solidToast.error(title, {
        description: typeof options?.description === 'string' ? options.description : undefined,
        duration: options?.duration || 5000,
      });
    },

    warning: (title: string, options?: ToastOptions) => {
      solidToast.warning(title, {
        description: typeof options?.description === 'string' ? options.description : undefined,
        duration: options?.duration,
      });
    },

    info: (title: string, options?: ToastOptions) => {
      solidToast.info(title, {
        description: typeof options?.description === 'string' ? options.description : undefined,
        duration: options?.duration,
      });
    },
  },
};
