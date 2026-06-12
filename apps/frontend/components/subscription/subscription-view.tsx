"use client";

import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../lib/api-client';
import { toast } from '../../store/use-toast-store';

export function SubscriptionView() {
  const [planData, setPlanData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubscribing, setIsSubscribing] = useState(false);

  useEffect(() => {
    fetchPlanData();
  }, []);

  const fetchPlanData = async () => {
    try {
      const data = await apiRequest<any>('/tenants/my-plan');
      setPlanData(data);
    } catch (error: any) {
      toast.error('Error al cargar la información del plan: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubscribe = async (tier: string) => {
    setIsSubscribing(true);
    try {
      const result = await apiRequest<{ init_point: string }>('/tenants/subscribe', {
        method: 'POST',
        body: JSON.stringify({ tier })
      });
      if (result.init_point) {
        window.location.href = result.init_point;
      } else {
        toast.error('No se pudo generar el enlace de pago');
      }
    } catch (err: any) {
      toast.error('Error al generar la suscripción: ' + err.message);
    } finally {
      setIsSubscribing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-full d-flex align-center justify-center fade-in">
        <span style={{ color: 'var(--text-muted)' }}>Cargando información del plan...</span>
      </div>
    );
  }

  const estadoSuscripcion = planData?.estado_plan || 'TRIAL';
  const planTier = planData?.plan_tier || 'TRIAL';
  const isActive = estadoSuscripcion === 'ACTIVE' || estadoSuscripcion === 'TRIAL';
  const isPastDue = estadoSuscripcion === 'PAST_DUE';
  const isCanceled = estadoSuscripcion === 'CANCELED';

  return (
    <div className="p-lg h-full overflow-y-auto fade-in" style={{ paddingBottom: '80px' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* Header de Estado */}
        <div className="auth-card scale-up text-center m-0" style={{ padding: '40px 24px', marginBottom: '32px', position: 'relative', overflow: 'hidden' }}>
          {isActive && (
            <div style={{ position: 'absolute', top: '-50px', left: '-50px', width: '150px', height: '150px', background: 'rgba(var(--success-rgb, 16, 185, 129), 0.1)', borderRadius: '50%', filter: 'blur(30px)' }}></div>
          )}
          
          <div className="align-center justify-center" style={{ display: 'inline-flex', width: '64px', height: '64px', borderRadius: '50%', background: isActive ? 'rgba(var(--success-rgb, 16, 185, 129), 0.1)' : 'rgba(var(--primary-rgb), 0.1)', color: isActive ? 'hsl(var(--success, 142 76% 36%))' : 'hsl(var(--primary))', marginBottom: '24px' }}>
            {isActive ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
            )}
          </div>
          
          <h2 className="font-extrabold" style={{ fontSize: '28px', marginBottom: '8px' }}>
            Plan Actual: <span style={{ color: isActive ? 'hsl(var(--success, 142 76% 36%))' : 'inherit' }}>{planTier}</span>
          </h2>
          
          <p style={{ color: 'var(--text-secondary)', fontSize: '16px', marginBottom: '0', maxWidth: '600px', margin: '0 auto' }}>
            {estadoSuscripcion === 'TRIAL' && (
              <>
                Estás utilizando la versión de prueba. Te quedan <strong style={{ color: 'hsl(var(--primary))' }}>{planData?.dias_restantes || 0} días</strong>.
                Pásate a un plan superior para desbloquear funciones.
              </>
            )}
            {estadoSuscripcion === 'ACTIVE' && `¡Gracias por tu confianza! Tienes activo el plan ${planTier}.`}
            {isPastDue && <span style={{ color: 'hsl(var(--danger, 0 84% 60%))' }}>Tu último pago fue rechazado. Por favor, regulariza tu situación para seguir usando el sistema.</span>}
            {isCanceled && <span style={{ color: 'hsl(var(--danger, 0 84% 60%))' }}>Tu suscripción ha sido cancelada. Renueva tu plan para recuperar el acceso.</span>}
          </p>
        </div>

        {/* Tarjetas de Precios */}
        <div className="d-flex gap-lg" style={{ overflowX: 'auto', paddingBottom: '24px', paddingTop: '16px' }}>
          
          {/* Plan Básico / Trial */}
          <div style={{ background: 'var(--bg-secondary)', border: planTier === 'TRIAL' ? '2px solid hsl(var(--primary))' : '1px solid var(--border-color)', borderRadius: '16px', padding: '32px', display: 'flex', flexDirection: 'column', flex: '0 0 300px' }}>
            <h3 className="font-bold text-lg mb-sm">Prueba Gratuita</h3>
            <div className="d-flex align-end gap-xs mb-lg">
              <span className="font-extrabold" style={{ fontSize: '36px', lineHeight: '1' }}>$0</span>
              <span className="text-muted" style={{ marginBottom: '6px' }}>/ 14 días</span>
            </div>
            <p className="text-muted" style={{ fontSize: '14px', marginBottom: '24px' }}>Ideal para explorar y conocer la plataforma.</p>
            
            <ul className="flex-col gap-md" style={{ listStyle: 'none', padding: 0, margin: 0, marginBottom: '32px', flex: 1, display: 'flex' }}>
              <li className="d-flex align-center gap-sm">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--success, 142 76% 36%))" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span style={{ fontSize: '14px' }}>Hasta 50 ventas/mes</span>
              </li>
              <li className="d-flex align-center gap-sm">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--success, 142 76% 36%))" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span style={{ fontSize: '14px' }}>Punto de venta básico</span>
              </li>
              <li className="d-flex align-center gap-sm text-muted">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                <span style={{ fontSize: '14px', textDecoration: 'line-through' }}>Facturación Electrónica</span>
              </li>
            </ul>

            <button disabled className="btn-secondary w-full" style={{ opacity: planTier === 'TRIAL' ? 1 : 0.5 }}>
              {planTier === 'TRIAL' ? 'Plan Actual' : 'Solo Nuevos'}
            </button>
          </div>

          {/* Plan Basico */}
          <div style={{ background: 'var(--bg-secondary)', border: planTier === 'BASICO' ? '2px solid hsl(var(--primary))' : '1px solid var(--border-color)', borderRadius: '16px', padding: '32px', display: 'flex', flexDirection: 'column', flex: '0 0 300px' }}>
            <h3 className="font-bold text-lg mb-sm">Básico</h3>
            <div className="d-flex align-end gap-xs mb-lg">
              <span className="font-extrabold" style={{ fontSize: '36px', lineHeight: '1' }}>$19.000</span>
              <span className="text-muted" style={{ marginBottom: '6px' }}>/ mes</span>
            </div>
            <p className="text-muted" style={{ fontSize: '14px', marginBottom: '24px' }}>Para pequeños comercios que recién empiezan.</p>
            
            <ul className="flex-col gap-md" style={{ listStyle: 'none', padding: 0, margin: 0, marginBottom: '32px', flex: 1, display: 'flex' }}>
              <li className="d-flex align-center gap-sm font-semibold">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span style={{ fontSize: '14px' }}>Hasta 250 ventas/mes</span>
              </li>
              <li className="d-flex align-center gap-sm">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--success, 142 76% 36%))" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span style={{ fontSize: '14px' }}>Facturación Electrónica</span>
              </li>
              <li className="d-flex align-center gap-sm text-muted">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                <span style={{ fontSize: '14px', textDecoration: 'line-through' }}>Contabilidad Avanzada</span>
              </li>
            </ul>

            <button 
                onClick={() => handleSubscribe('BASICO')} 
                disabled={isSubscribing || planTier === 'BASICO'}
                className={planTier === 'BASICO' ? "btn-secondary w-full" : "btn-primary w-full"} 
                style={{ opacity: isSubscribing ? 0.7 : 1 }}
              >
                {planTier === 'BASICO' ? 'Plan Actual' : 'Suscribirse'}
            </button>
          </div>

          {/* Plan Premium */}
          <div style={{ background: 'var(--bg-secondary)', border: planTier === 'PREMIUM' ? '2px solid hsl(var(--primary))' : '1px solid var(--border-color)', borderRadius: '16px', padding: '32px', display: 'flex', flexDirection: 'column', position: 'relative', boxShadow: '0 10px 30px -10px rgba(var(--primary-rgb), 0.2)', flex: '0 0 300px' }}>
            <div style={{ position: 'absolute', top: '-12px', right: '24px', background: 'hsl(var(--primary))', color: '#fff', fontSize: '11px', fontWeight: 'bold', padding: '4px 12px', borderRadius: '99px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Recomendado
            </div>
            
            <h3 className="font-bold text-lg mb-sm">Premium</h3>
            <div className="d-flex align-end gap-xs mb-lg">
              <span className="font-extrabold" style={{ fontSize: '36px', lineHeight: '1' }}>$29.000</span>
              <span className="text-muted" style={{ marginBottom: '6px' }}>/ mes</span>
            </div>
            <p className="text-muted" style={{ fontSize: '14px', marginBottom: '24px' }}>Acceso total para hacer crecer tu negocio.</p>
            
            <ul className="flex-col gap-md" style={{ listStyle: 'none', padding: 0, margin: 0, marginBottom: '32px', flex: 1, display: 'flex' }}>
              <li className="d-flex align-center gap-sm font-semibold">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span style={{ fontSize: '14px' }}>Hasta 1500 ventas/mes</span>
              </li>
              <li className="d-flex align-center gap-sm">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--success, 142 76% 36%))" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span style={{ fontSize: '14px' }}>Contabilidad y Cuentas</span>
              </li>
              <li className="d-flex align-center gap-sm">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--success, 142 76% 36%))" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span style={{ fontSize: '14px' }}>Importación Masiva</span>
              </li>
            </ul>

            <button 
                onClick={() => handleSubscribe('PREMIUM')} 
                disabled={isSubscribing || planTier === 'PREMIUM'}
                className={planTier === 'PREMIUM' ? "btn-secondary w-full" : "btn-primary w-full"} 
                style={{ opacity: isSubscribing ? 0.7 : 1 }}
              >
                {planTier === 'PREMIUM' ? 'Plan Actual' : 'Suscribirse'}
            </button>
          </div>

          {/* Plan Full */}
          <div style={{ background: 'var(--bg-secondary)', border: planTier === 'FULL' ? '2px solid hsl(var(--primary))' : '1px solid var(--border-color)', borderRadius: '16px', padding: '32px', display: 'flex', flexDirection: 'column', flex: '0 0 300px' }}>
            <h3 className="font-bold text-lg mb-sm">Full</h3>
            <div className="d-flex align-end gap-xs mb-lg">
              <span className="font-extrabold" style={{ fontSize: '36px', lineHeight: '1' }}>$44.900</span>
              <span className="text-muted" style={{ marginBottom: '6px' }}>/ mes</span>
            </div>
            <p className="text-muted" style={{ fontSize: '14px', marginBottom: '24px' }}>Sin límites para empresas consolidadas.</p>
            
            <ul className="flex-col gap-md" style={{ listStyle: 'none', padding: 0, margin: 0, marginBottom: '32px', flex: 1, display: 'flex' }}>
              <li className="d-flex align-center gap-sm font-semibold">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span style={{ fontSize: '14px' }}>Ventas Ilimitadas</span>
              </li>
              <li className="d-flex align-center gap-sm">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--success, 142 76% 36%))" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span style={{ fontSize: '14px' }}>Soporte técnico prioritario</span>
              </li>
              <li className="d-flex align-center gap-sm">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--success, 142 76% 36%))" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span style={{ fontSize: '14px' }}>Todas las funcionalidades</span>
              </li>
            </ul>

            <button 
                onClick={() => handleSubscribe('FULL')} 
                disabled={isSubscribing || planTier === 'FULL'}
                className={planTier === 'FULL' ? "btn-secondary w-full" : "btn-primary w-full"} 
                style={{ opacity: isSubscribing ? 0.7 : 1 }}
              >
                {planTier === 'FULL' ? 'Plan Actual' : 'Suscribirse'}
            </button>
          </div>
          
        </div>
      </div>
    </div>
  );
}
