'use client';
import React from 'react';
import { useCierreResumen } from '../../hooks/use-caja';

export function CierreView() {
  const today = new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const { data: kpis, isLoading } = useCierreResumen();

  if (isLoading) {
    return <div className="d-flex justify-center" style={{ padding: '60px' }}><div className="spinner" style={{ width: '40px', height: '40px' }}></div></div>;
  }

  if (!kpis) {
    return (
      <div className="text-center" style={{ padding: '32px', maxWidth: '1000px', margin: '0 auto' }}>
        <h3 className="font-bold" style={{ fontSize: '18px', marginBottom: '8px' }}>No hay caja abierta</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Para ver el cierre del día, primero debés abrir una caja.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 className="font-extrabold" style={{ fontSize: '22px', marginBottom: '4px' }}>Cierre del Día (En Curso)</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', textTransform: 'capitalize' }}>{today}</p>
      </div>

      {/* KPIs del día */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
        {[
          { label: 'Ventas del día', value: `$${kpis.ventas_dia.toLocaleString('es-AR', {minimumFractionDigits:2})}`, sub: `${kpis.cant_ventas} transacciones`, color: 'hsl(var(--primary))' },
          { label: 'Gastos registrados', value: `$${kpis.gastos_dia.toLocaleString('es-AR', {minimumFractionDigits:2})}`, sub: `${kpis.cant_gastos} egresos`, color: 'hsl(var(--danger))' },
          { label: 'Ganancia bruta', value: `$${kpis.ganancia_bruta.toLocaleString('es-AR', {minimumFractionDigits:2})}`, sub: 'Ventas − Gastos', color: 'hsl(var(--success))' },
          { label: 'Efectivo en caja', value: `$${kpis.caja_efectivo.toLocaleString('es-AR', {minimumFractionDigits:2})}`, sub: 'Apertura + cobros', color: 'var(--text-primary)' },
        ].map(k => (
          <div key={k.label} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '18px' }}>
            <div className="font-bold" style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>{k.label}</div>
            <div className="font-extrabold" style={{ fontSize: '24px', color: k.color, marginBottom: '2px' }}>{k.value}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Desglose por medio de pago */}
      <div className="p-lg" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', marginBottom: '16px' }}>
        <h3 className="font-bold" style={{ fontSize: '15px', marginBottom: '16px' }}>Cobros por medio de pago</h3>
        {[
          { label: 'Efectivo', key: 'EFECTIVO' },
          { label: 'Tarjeta Débito', key: 'TARJETA_DEBITO' },
          { label: 'Tarjeta Crédito', key: 'TARJETA_CREDITO' },
          { label: 'Mercado Pago QR', key: 'MERCADO_PAGO' },
          { label: 'Transferencia', key: 'TRANSFERENCIA' },
          { label: 'Cuenta Corriente', key: 'CUENTA_CORRIENTE' }
        ].map(medio => (
          <div key={medio.key} className="d-flex justify-between align-center" style={{ padding: '10px 0', borderBottom: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{medio.label}</span>
            <span className="font-bold" style={{ fontSize: '15px', color: 'var(--text-primary)' }}>
              ${kpis.medios_pago[medio.key]?.toLocaleString('es-AR', {minimumFractionDigits:2}) ?? '0,00'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
