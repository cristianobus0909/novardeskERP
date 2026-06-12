'use client';
import React, { useState } from 'react';
import { useHistorialCaja } from '../../hooks/use-caja';

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function formatMoney(n: number) {
  return `$${Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
}

function duration(from: string, to: string | null) {
  if (!to) return 'Activa';
  const ms = new Date(to).getTime() - new Date(from).getTime();
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m`;
}

export function HistorialCajaView() {
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<number | null>(null);
  const { data, isLoading } = useHistorialCaja(page, 15);

  const turnos: any[] = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '6px' }}>Historial de Caja</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          Todos los turnos de apertura y cierre de caja registrados.
        </p>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <div className="spinner" style={{ width: '40px', height: '40px' }}></div>
        </div>
      ) : turnos.length === 0 ? (
        <div style={{ background: 'var(--bg-secondary)', border: '1px dashed var(--border-color)', borderRadius: '12px', padding: '60px', textAlign: 'center' }}>
          <svg style={{ display: 'block', margin: '0 auto 16px', opacity: 0.3 }} xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 14h18a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1z"></path>
            <path d="M5 14v-6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6"></path>
          </svg>
          <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>Sin turnos registrados</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Los turnos de caja aparecerán aquí una vez que se abra la primera caja.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {turnos.map((turno: any) => {
            const isOpen = turno.estado === 'ABIERTA';
            const isExpanded = expanded === turno.id;

            return (
              <div
                key={turno.id}
                style={{ background: 'var(--bg-secondary)', border: `1px solid ${isOpen ? 'hsl(var(--success))' : 'var(--border-color)'}`, borderRadius: '12px', overflow: 'hidden', transition: 'border-color 0.2s' }}
              >
                {/* Fila principal — clickeable para expandir */}
                <div
                  onClick={() => setExpanded(isExpanded ? null : turno.id)}
                  style={{ display: 'grid', gridTemplateColumns: '120px 1fr 120px 120px 120px 80px 36px', alignItems: 'center', gap: '12px', padding: '14px 20px', cursor: 'pointer' }}
                >
                  {/* Estado */}
                  <span style={{
                    fontSize: '11px', fontWeight: '700', padding: '3px 10px', borderRadius: '100px', textAlign: 'center',
                    background: isOpen ? 'rgba(22,163,74,0.12)' : 'rgba(100,116,139,0.1)',
                    color: isOpen ? 'hsl(var(--success))' : 'var(--text-muted)'
                  }}>
                    {isOpen ? '● ABIERTA' : '○ CERRADA'}
                  </span>

                  {/* Usuario + fechas */}
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '14px' }}>{turno.usuario?.nombre ?? '—'}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {formatDate(turno.creado_el)} → {isOpen ? 'activo' : formatDate(turno.fecha_cierre)}
                    </div>
                  </div>

                  {/* Duración */}
                  <div style={{ textAlign: 'right', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {duration(turno.creado_el, turno.fecha_cierre)}
                  </div>

                  {/* Apertura */}
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Apertura</div>
                    <div style={{ fontWeight: '700', fontSize: '14px' }}>{formatMoney(turno.monto_apertura)}</div>
                  </div>

                  {/* Total ventas */}
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Ventas</div>
                    <div style={{ fontWeight: '700', fontSize: '14px', color: 'hsl(var(--primary))' }}>
                      {formatMoney(turno.sumario?.totalVentas ?? 0)}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{turno.sumario?.cantVentas ?? 0} transac.</div>
                  </div>

                  {/* Efectivo */}
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Efect.</div>
                    <div style={{ fontWeight: '700', fontSize: '14px', color: 'hsl(var(--success))' }}>
                      {formatMoney(turno.sumario?.efectivoCaja ?? 0)}
                    </div>
                  </div>

                  {/* Chevron */}
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: 'var(--text-muted)' }}>
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </div>

                {/* Detalle expandible - Auditoría */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid var(--border-color)', padding: '16px 20px', background: 'var(--bg-primary)' }}>
                    <h4 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Auditoría de Cierre</h4>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-muted)' }}>Medio de Cobro</th>
                            <th style={{ textAlign: 'right', padding: '8px', color: 'var(--text-muted)' }}>Esperado (Sistema)</th>
                            <th style={{ textAlign: 'right', padding: '8px', color: 'var(--text-muted)' }}>Declarado (Cierre)</th>
                            <th style={{ textAlign: 'right', padding: '8px', color: 'var(--text-muted)' }}>Diferencia</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { label: 'Efectivo Total', sys: turno.sumario?.efectivoCaja, dec: (Number(turno.declarado_caja||0) + Number(turno.declarado_extraccion||0)), note: 'Gaveta + Extracción' },
                            { label: '└ Efectivo en Gaveta', sys: null, dec: turno.declarado_caja },
                            { label: '└ Efectivo a Extraer', sys: null, dec: turno.declarado_extraccion },
                            { label: 'Tarjeta Débito', sys: turno.sumario?.debitoCaja, dec: turno.declarado_tarjeta_debito },
                            { label: 'Tarjeta Crédito', sys: turno.sumario?.creditoCaja, dec: turno.declarado_tarjeta_credito },
                            { label: 'Transferencia', sys: turno.sumario?.transferenciaCaja, dec: turno.declarado_transferencia },
                            { label: 'Mercado Pago', sys: turno.sumario?.mercadopagoCaja, dec: turno.declarado_mercadopago },
                          ].map((row, i) => {
                            // Only calculate diff if there's a system expectation
                            const hasSys = row.sys != null;
                            const dif = hasSys ? ((row.dec == null ? 0 : Number(row.dec)) - Number(row.sys)) : 0;
                            let difColor = 'var(--text-secondary)';
                            if (hasSys && dif > 0) difColor = 'hsl(var(--primary))'; // Sobrante
                            if (hasSys && dif < 0) difColor = 'hsl(var(--danger))';  // Faltante

                            // Skip rendering empty methods
                            if (!hasSys && !row.dec) return null;
                            if (hasSys && !row.sys && !row.dec) return null;

                            return (
                              <tr key={i} style={{ borderBottom: '1px solid var(--border-color)', opacity: hasSys ? 1 : 0.8 }}>
                                <td style={{ padding: '8px', fontWeight: hasSys ? '600' : '400', paddingLeft: hasSys ? '8px' : '24px' }}>
                                  {row.label}
                                  {row.note && <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '6px' }}>({row.note})</span>}
                                </td>
                                <td style={{ padding: '8px', textAlign: 'right' }}>{hasSys ? formatMoney(row.sys) : '—'}</td>
                                <td style={{ padding: '8px', textAlign: 'right', fontWeight: '700' }}>{row.dec != null ? formatMoney(row.dec) : '—'}</td>
                                <td style={{ padding: '8px', textAlign: 'right', color: difColor, fontWeight: hasSys ? '700' : '400' }}>
                                  {hasSys ? (dif > 0 ? '+' : '') + formatMoney(dif) : '—'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {turno.notas_cierre && (
                      <div style={{ marginTop: '16px', background: 'var(--bg-secondary)', borderRadius: '8px', padding: '10px 14px', border: '1px solid var(--border-color)', fontSize: '13px', color: 'var(--text-secondary)' }}>
                        <strong>Notas de Cierre:</strong> {turno.notas_cierre}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Paginación */}
          {meta && meta.totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '8px', alignItems: 'center' }}>
              <button className="btn-secondary" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ width: 'auto', padding: '6px 16px' }}>Anterior</button>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Pág. {page} de {meta.totalPages}</span>
              <button className="btn-secondary" onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))} disabled={page === meta.totalPages}
                style={{ width: 'auto', padding: '6px 16px' }}>Siguiente</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
