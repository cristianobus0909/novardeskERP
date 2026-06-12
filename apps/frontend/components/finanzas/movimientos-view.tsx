'use client';
import React, { useState } from 'react';
import { useLibroCaja } from '../../hooks/use-caja';

export function MovimientosView() {
  const [rango, setRango] = useState<'hoy' | 'mes'>('mes');
  
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  
  const fechaDesde = rango === 'hoy' ? today.toISOString().split('T')[0] : firstDay.toISOString().split('T')[0];
  
  const { data, isLoading } = useLibroCaja(fechaDesde);
  const movimientos = data?.movimientos ?? [];
  const resumen = data?.resumen ?? { ingresos: 0, egresos: 0, saldo: 0 };

  return (
    <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '6px' }}>Libro de Caja</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Registro cronológico de todos los ingresos y egresos del negocio.
          </p>
        </div>
        <select className="form-input" style={{ width: 'auto' }} value={rango} onChange={(e) => setRango(e.target.value as any)}>
          <option value="hoy">Hoy</option>
          <option value="mes">Este Mes</option>
        </select>
      </div>

      {/* Tarjetas resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px' }}>
        {[
          { label: 'Ingresos', value: `$${resumen.ingresos.toLocaleString('es-AR', {minimumFractionDigits:2})}`, color: 'hsl(var(--success))' },
          { label: 'Egresos', value: `$${resumen.egresos.toLocaleString('es-AR', {minimumFractionDigits:2})}`, color: 'hsl(var(--danger))' },
          { label: 'Saldo neto', value: `$${resumen.saldo.toLocaleString('es-AR', {minimumFractionDigits:2})}`, color: 'hsl(var(--primary))' },
        ].map(card => (
          <div key={card.label} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>{card.label}</div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <div className="spinner" style={{ width: '40px', height: '40px' }}></div>
        </div>
      ) : movimientos.length === 0 ? (
        <div style={{ background: 'var(--bg-secondary)', border: '1px dashed var(--border-color)', borderRadius: '12px', padding: '60px', textAlign: 'center' }}>
          <svg style={{ display: 'block', margin: '0 auto 16px', opacity: 0.3 }} xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
          <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>Sin movimientos</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            No hay registros para el período seleccionado.
          </p>
        </div>
      ) : (
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-primary)' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Fecha</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Tipo</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Descripción</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Extra</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '600', fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Monto</th>
              </tr>
            </thead>
            <tbody>
              {movimientos.map((m: any, i: number) => (
                <tr key={`${m.tipo_registro}-${m.id}`} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{new Date(m.fecha).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ 
                      background: m.is_ingreso ? 'rgba(22,163,74,0.1)' : 'rgba(220,38,38,0.1)', 
                      color: m.is_ingreso ? 'hsl(var(--success))' : 'hsl(var(--danger))',
                      padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700' 
                    }}>
                      {m.tipo_registro}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: '600' }}>{m.descripcion}</td>
                  <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-secondary)' }}>{m.extra ?? '—'}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '700', color: m.is_ingreso ? 'hsl(var(--success))' : 'hsl(var(--danger))' }}>
                    {m.is_ingreso ? '+' : '-'}${Number(m.monto).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
