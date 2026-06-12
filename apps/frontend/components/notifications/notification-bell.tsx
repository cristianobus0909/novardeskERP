"use client";

import React, { useState, useEffect, useRef } from 'react';
import { apiRequest } from '../../lib/api-client';

interface Notificacion {
  id: number;
  titulo: string;
  mensaje: string;
  leida: boolean;
  creado_el: string;
}

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notificacion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchUnreadCount = async () => {
    try {
      const data = await apiRequest<{ unread: number }>('/notificaciones/unread-count');
      setUnreadCount(data.unread);
    } catch (e) {
      console.error('Error fetching unread notifications count', e);
    }
  };

  const fetchNotifications = async () => {
    try {
      const data = await apiRequest<Notificacion[]>('/notificaciones');
      setNotifications(data);
    } catch (e) {
      console.error('Error fetching notifications', e);
    }
  };

  const markAsRead = async (id: number) => {
    try {
      await apiRequest(`/notificaciones/${id}/read`, { method: 'PATCH' });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) {
      console.error('Error marking notification as read', e);
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiRequest('/notificaciones/mark-all-read', { method: 'PATCH' });
      setNotifications(prev => prev.map(n => ({ ...n, leida: true })));
      setUnreadCount(0);
    } catch (e) {
      console.error('Error marking all notifications as read', e);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        className="d-flex align-center justify-center" 
        style={{ 
          width: '36px', height: '36px', borderRadius: '50%', border: 'none', 
          background: isOpen ? 'var(--bg-tertiary)' : 'transparent',
          cursor: 'pointer', color: 'var(--text-primary)', position: 'relative',
          transition: 'background 0.2s'
        }}
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
        onMouseLeave={e => e.currentTarget.style.background = isOpen ? 'var(--bg-tertiary)' : 'transparent'}
        title="Notificaciones"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
        
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: '2px', right: '2px',
            background: 'hsl(var(--danger))', color: '#fff', fontSize: '10px',
            fontWeight: 'bold', width: '16px', height: '16px', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 0 2px var(--bg-primary)'
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="scale-up" style={{
          position: 'absolute', top: '45px', right: '0', width: '350px',
          background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
          borderRadius: '12px', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.3)',
          zIndex: 100, overflow: 'hidden', display: 'flex', flexDirection: 'column',
          maxHeight: '400px'
        }}>
          <div className="d-flex justify-between align-center" style={{ padding: '16px', borderBottom: '1px solid var(--border-color)' }}>
            <h3 className="font-bold m-0" style={{ fontSize: '15px' }}>Notificaciones</h3>
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                style={{ background: 'none', border: 'none', color: 'hsl(var(--primary))', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Marcar todas leídas
              </button>
            )}
          </div>
          
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {notifications.length === 0 ? (
              <div className="text-center p-md" style={{ color: 'var(--text-muted)' }}>
                No tienes notificaciones
              </div>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {notifications.map(notif => (
                  <li 
                    key={notif.id} 
                    style={{ 
                      padding: '16px', borderBottom: '1px solid var(--border-color)',
                      background: notif.leida ? 'transparent' : 'rgba(var(--primary-rgb), 0.05)',
                      cursor: 'pointer', transition: 'background 0.2s'
                    }}
                    onClick={() => { if (!notif.leida) markAsRead(notif.id); }}
                    onMouseEnter={e => e.currentTarget.style.background = notif.leida ? 'var(--bg-tertiary)' : 'rgba(var(--primary-rgb), 0.1)'}
                    onMouseLeave={e => e.currentTarget.style.background = notif.leida ? 'transparent' : 'rgba(var(--primary-rgb), 0.05)'}
                  >
                    <div className="d-flex justify-between align-start gap-sm mb-xs">
                      <strong style={{ fontSize: '13px', color: notif.leida ? 'var(--text-primary)' : 'hsl(var(--primary))' }}>{notif.titulo}</strong>
                      {!notif.leida && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'hsl(var(--primary))', flexShrink: 0, marginTop: '4px' }}></span>}
                    </div>
                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                      {notif.mensaje}
                    </p>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '8px' }}>
                      {new Date(notif.creado_el).toLocaleString('es-AR')}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
