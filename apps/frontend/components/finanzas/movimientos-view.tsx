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
      <div className="d-flex justify-between align-center" style={{ marginBottom: '28px' }}>
        <div>
          <h1 className="font-extrabold" style={{ fontSize: '22px', marginBottom: '6px' }}>Libro de Caja</h1>
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
      <div className="gap-lg" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '28px' }}>
        {[
          { label: 'Ingresos', value: `$${resumen.ingresos.toLocaleString('es-AR', {minimumFractionDigits:2})}`, color: 'hsl(var(--success))' },
          { label: 'Egresos', value: `$${resumen.egresos.toLocaleString('es-AR', {minimumFractionDigits:2})}`, color: 'hsl(var(--danger))' },
          { label: 'Saldo neto', value: `$${resumen.saldo.toLocaleString('es-AR', {minimumFractionDigits:2})}`, color: 'hsl(var(--primary))' },
        ].map(card => (
          <div key={card.label} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px' }}>
            <div className="font-semibold" style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>{card.label}</div>
            <div className="font-extrabold" style={{ fontSize: '28px', color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="d-flex justify-center" style={{ padding: '60px' }}>
          <div className="spinner" style={{ width: '40px', height: '40px' }}></div>
        </div>
      ) : movimientos.length === 0 ? (
        <div className="text-center" style={{ background: 'var(--bg-secondary)', border: '1px dashed var(--border-color)', borderRadius: '12px', padding: '60px' }}>
          <svg style={{ display: 'block', margin: '0 auto 16px', opacity: 0.3 }} xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
          <h3 className="font-bold" style={{ fontSize: '18px', marginBottom: '8px' }}>Sin movimientos</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            No hay registros para el período seleccionado.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
          <table className="w-full" style={{ borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-primary)' }}>
                <th className="text-left font-semibold" style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Fecha</th>
                <th className="text-left font-semibold" style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Tipo</th>
                <th className="text-left font-semibold" style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Descripción</th>
                <th className="text-left font-semibold" style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Extra</th>
                <th className="text-right font-semibold" style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Monto</th>
              </tr>
            </thead>
            <tbody>
              {movimientos.map((m: any, i: number) => (
                <tr key={`${m.tipo_registro}-${m.id}`} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{new Date(m.fecha).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span className="font-bold" style={{ background: m.is_ingreso ? 'rgba(22, 163, 74, 0.1)' : 'rgba(220, 38, 38, 0.1)', color: m.is_ingreso ? 'hsl(var(--success))' : 'hsl(var(--danger))', padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>
                      {m.tipo_registro}
                    </span>
                  </td>
                  <td className="font-semibold" style={{ padding: '12px 16px' }}>{m.descripcion}</td>
                  <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-secondary)' }}>{m.extra ?? '—'}</td>
                  <td className="text-right font-bold" style={{ padding: '12px 16px', color: m.is_ingreso ? 'hsl(var(--success))' : 'hsl(var(--danger))' }}>
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
