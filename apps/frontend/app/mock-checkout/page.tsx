'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from '../../store/use-toast-store';

function MockCheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const preapprovalId = searchParams.get('preapproval_id');
  const tenantId = searchParams.get('tenant_id');
  const tier = searchParams.get('tier') || 'PREMIUM';

  if (!preapprovalId || !tenantId) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <h2>Error: Falta preapproval_id o tenant_id</h2>
        <button onClick={() => router.push('/')} style={{ marginTop: '20px', padding: '10px 20px', cursor: 'pointer' }}>
          Volver
        </button>
      </div>
    );
  }

  const handleWebhook = async (status: 'active' | 'pastdue' | 'cancelled') => {
    setLoading(true);
    try {
      const randomPart = Math.floor(Math.random() * 1000);
      const newResourceId = `sub_${status}_${tenantId}_${tier}_${randomPart}`;

      const payload = {
        type: 'preapproval',
        data: {
          id: newResourceId
        }
      };

      const res = await fetch('http://localhost:3000/webhooks/mercadopago', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-bypass-signature': 'true',
          'x-request-id': `mock-req-${randomPart}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error('Error al enviar webhook simulado');
      }

      toast.success(`Webhook enviado exitosamente (Simulación: ${status}).`);
      router.push('/');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', fontFamily: 'sans-serif' }}>
      <div style={{ background: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', maxWidth: '500px', width: '100%', textAlign: 'center' }}>
        <div style={{ width: '80px', height: '80px', background: '#009ee3', color: 'white', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
        </div>
        
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>
          Mercado Pago (Simulador)
        </h1>
        <p style={{ color: '#666', marginBottom: '32px' }}>
          Estás en el entorno de pruebas offline. Elige el resultado que deseas simular para la suscripción de NovarDesk.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <button 
            onClick={() => handleWebhook('active')}
            disabled={loading}
            style={{ padding: '16px', background: '#009ee3', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s' }}
          >
            Aprobar Cobro (ACTIVE)
          </button>
          
          <button 
            onClick={() => handleWebhook('pastdue')}
            disabled={loading}
            style={{ padding: '16px', background: '#ff7733', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s' }}
          >
            Rechazar Cobro (PAST_DUE)
          </button>
          
          <button 
            onClick={() => handleWebhook('cancelled')}
            disabled={loading}
            style={{ padding: '16px', background: '#e0e0e0', color: '#333', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s' }}
          >
            Cancelar Suscripción (CANCELED)
          </button>
        </div>

        <button 
          onClick={() => router.push('/')}
          style={{ marginTop: '32px', background: 'transparent', border: 'none', color: '#009ee3', cursor: 'pointer', fontSize: '14px', textDecoration: 'underline' }}
        >
          Volver al sistema sin hacer nada
        </button>
      </div>
    </div>
  );
}

export default function MockCheckoutPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center' }}>Cargando simulador...</div>}>
      <MockCheckoutContent />
    </Suspense>
  );
}
