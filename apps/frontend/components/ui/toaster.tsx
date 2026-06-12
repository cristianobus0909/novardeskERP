'use client';

import React from 'react';
import { useToastStore } from '../../store/use-toast-store';

export function Toaster() {
  const toasts = useToastStore((state) => state.toasts);
  const removeToast = useToastStore((state) => state.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      pointerEvents: 'none',
    }}>
      {toasts.map((toast) => {
        const bg = toast.type === 'error' ? 'hsl(var(--danger))' : toast.type === 'success' ? 'hsl(var(--success))' : 'var(--bg-secondary)';
        const color = toast.type === 'info' ? 'var(--text-primary)' : '#fff';
        
        return (
          <div
            key={toast.id}
            onClick={() => removeToast(toast.id)}
            style={{
              background: bg,
              color: color,
              padding: '12px 20px',
              borderRadius: '8px',
              boxShadow: '0 8px 16px rgba(0,0,0,0.15)',
              fontWeight: '500',
              fontSize: '14px',
              pointerEvents: 'auto',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              animation: 'slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              border: toast.type === 'info' ? '1px solid var(--border-color)' : 'none'
            }}
          >
            <span>{toast.message}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeToast(toast.id);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'currentColor',
                opacity: 0.7,
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        );
      })}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
