'use client';
import React, { useState } from 'react';
import { ClienteSelector } from './cliente-selector';
import { useCartStore } from '../../store/use-cart-store';
import { toast } from '../../store/use-toast-store';
import { useCuentasContables } from '../../hooks/use-finanzas';
import { useCuentaCorriente } from '../../hooks/use-cuenta-corriente';
import { useCreateSale } from '../../hooks/use-sales';
import { TicketView } from './ticket-view';

interface PosSimpleViewProps {
  products: any[];
  discountMonto: number;
  discountMotivo: string;
  pagosAgregados: any[];
  setPagosAgregados: (p: any[]) => void;
  setDiscountMonto: (v: number) => void;
  setDiscountMotivo: (v: string) => void;
  setIsDescuentoModalOpen: (v: boolean) => void;
  tenant: any;
  isVendedor: boolean;
}

export function PosSimpleView({
  products,
  discountMonto,
  discountMotivo,
  pagosAgregados,
  setPagosAgregados,
  setDiscountMonto,
  setDiscountMotivo,
  setIsDescuentoModalOpen,
  tenant,
  isVendedor
}: PosSimpleViewProps) {
  const {
    items: cartItems,
    id_cliente,
    cliente_id,
    nombre_cliente,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
  } = useCartStore();

  const { data: cuentasContables = [] } = useCuentasContables();
  const { data: cuentaCorriente } = useCuentaCorriente(cliente_id || null);
  const createSaleMutation = useCreateSale();

  const [searchQuery, setSearchQuery] = useState('');
  const [ticketSale, setTicketSale] = useState<any>(null);
  const [nuevoMonto, setNuevoMonto] = useState('');
  const [selectedMedio, setSelectedMedio] = useState('EFECTIVO');
  const [selectedCuentaId, setSelectedCuentaId] = useState<number | string>('');
  const [selectedPlanId, setSelectedPlanId] = useState<number | ''>('');

  const [lastCardType, setLastCardType] = useState('TARJETA_CREDITO');
  const [lastCuentaId, setLastCuentaId] = useState<number | string>('');

  React.useEffect(() => {
    if (selectedMedio === 'TARJETA_CREDITO' || selectedMedio === 'TARJETA_DEBITO') {
      setLastCardType(selectedMedio);
    }
  }, [selectedMedio]);

  React.useEffect(() => {
    if (selectedCuentaId !== '') {
      setLastCuentaId(selectedCuentaId);
    }
  }, [selectedCuentaId]);

  const subtotal = cartItems.reduce((acc, item) => acc + item.subtotal * item.cantidad, 0);
  const totalConDescuento = Math.max(0, subtotal - discountMonto);
  const recargoTotal = pagosAgregados.reduce((acc, p) => acc + (p.recargo_monto || 0), 0);
  
  let recargoActivo = 0;
  let planNombreActivo = '';
  if ((selectedMedio === 'TARJETA_CREDITO' || selectedMedio === 'TARJETA_DEBITO') && selectedCuentaId && selectedPlanId) {
    const cuenta = cuentasContables.find(c => c.id === selectedCuentaId);
    const plan = cuenta?.planes_pago?.find(p => p.id === selectedPlanId);
    if (plan) {
      recargoActivo = Math.round(totalConDescuento * (Number(plan.recargo_porcentaje) / 100));
      planNombreActivo = plan.nombre;
    }
  }

  const totalReal = totalConDescuento + recargoTotal + recargoActivo;
  const pagosActuales = pagosAgregados.reduce((a, b) => a + b.monto, 0);
  const saldoRestante = Math.max(0, totalReal - pagosActuales);

  const filteredProducts = products
    .flatMap((prod: any) => prod.variantes?.map((v: any) => ({ ...v, producto: prod })) || [])
    .filter((v: any) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        v.producto.nombre.toLowerCase().includes(q) ||
        v.sku.toLowerCase().includes(q) ||
        v.codigo_barras?.toLowerCase().includes(q)
      );
    })
    .slice(0, 40);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cartItems.length === 0) { toast.error('El carrito está vacío'); return; }

    try {
      let pagosFin = [...pagosAgregados];
      if (pagosFin.length === 0) {
        if ((selectedMedio === 'TARJETA_CREDITO' || selectedMedio === 'TARJETA_DEBITO') && (!selectedCuentaId || !selectedPlanId)) {
          toast.error('Debe seleccionar la tarjeta y las cuotas');
          return;
        }
        pagosFin = [{ 
          metodo_pago: selectedMedio, 
          monto: totalReal, 
          cuenta_contable_id: selectedCuentaId || undefined,
          plan_pago_id: selectedPlanId || undefined,
          recargo_monto: recargoActivo,
          nombre_plan: planNombreActivo
        }];
      }

      const recargo_monto_total = pagosFin.reduce((acc, p) => acc + (p.recargo_monto || 0), 0);
      const totalRealFinal = totalConDescuento + recargo_monto_total;

      const payload: any = {
        detalles: cartItems.map(item => ({
          variante_id: item.variantId,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
          subtotal: item.subtotal
        })),
        id_cliente: id_cliente || undefined,
        cliente_id: cliente_id || undefined,
        nombre_cliente: nombre_cliente || 'Consumidor Final',
        metodo_pago: pagosFin[0]?.metodo_pago || 'EFECTIVO',
        pagos: pagosFin.map(p => ({
          metodo_pago: p.metodo_pago,
          monto: p.monto,
          cuenta_contable_id: p.cuenta_contable_id,
          plan_pago_id: p.plan_pago_id
        })),
        subtotal,
        descuento_monto: discountMonto,
        descuento_motivo: discountMotivo,
        recargo_monto: recargo_monto_total,
        recargo_motivo: recargo_monto_total > 0 ? 'Recargo por financiación' : undefined,
        total: totalRealFinal
      };

      const result = await createSaleMutation.mutateAsync(payload);
      toast.success(`Venta #${result.id} registrada.`);
      setTicketSale(result);
      clearCart();
      setPagosAgregados([]);
      setDiscountMonto(0);
      setDiscountMotivo('');
      setNuevoMonto('');
    } catch (err: any) {
      toast.error(err.message || 'Error al registrar venta');
    }
  };

  return (
    <>
      {ticketSale && (
        <TicketView
          venta={ticketSale}
          tenant={tenant}
          onClose={() => setTicketSale(null)}
        />
      )}

      <div className="overflow-hidden gap-md" style={{ display: 'grid', gridTemplateColumns: '1fr', height: 'calc(100vh - 160px)' }}>
        {/* ─── Buscador de productos ─── */}
        <div className="d-flex flex-col gap-md overflow-hidden">

          <div className="d-flex align-center" style={{ gap: '10px' }}>
            <div className="relative flex-1">
              <svg className="absolute" style={{ left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
                xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input
                type="text"
                className="form-input"
                placeholder="Buscar producto por nombre, SKU o código de barras..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                autoFocus
                style={{ paddingLeft: '38px', fontSize: '15px', height: '44px' }}
              />
            </div>
            {discountMonto > 0 && (
              <span className="font-bold" style={{ fontSize: '13px', color: 'hsl(var(--success))', whiteSpace: 'nowrap', background: 'rgba(22, 163, 74, 0.1)', padding: '6px 12px', borderRadius: '8px' }}>
                Dto: -${discountMonto.toFixed(2)}
              </span>
            )}
            <button
              type="button"
              onClick={() => setIsDescuentoModalOpen(true)}
              disabled={cartItems.length === 0}
              className="font-semibold" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0 14px', height: '44px', cursor: 'pointer', fontSize: '13px', color: 'hsl(var(--primary))', whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              + Dto
            </button>
          </div>

          {/* Split: productos arriba, carrito + cobro abajo */}
          <div className="gap-lg flex-1 overflow-hidden" style={{ display: 'grid', gridTemplateColumns: '1fr 360px', minHeight: 0 }}>

            {/* Productos */}
            <div className="overflow-hidden d-flex flex-col gap-sm">
              <span className="font-bold" style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {filteredProducts.length} Resultado{filteredProducts.length !== 1 ? 's' : ''}
              </span>
              <div className="overflow-y-auto flex-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))', gap: '10px', alignContent: 'start', paddingRight: '4px' }}>
                {filteredProducts.length === 0 ? (
                  <div className="text-center" style={{ gridColumn: '1/-1', padding: '48px', color: 'var(--text-muted)' }}>
                    {searchQuery ? 'Sin resultados' : 'Busca un producto arriba'}
                  </div>
                ) : filteredProducts.map((v: any) => {
                  const stock = typeof v.stock_actual === 'string' ? parseFloat(v.stock_actual) : v.stock_actual;
                  const precio = typeof v.precio_venta === 'string' ? parseFloat(v.precio_venta) : v.precio_venta;
                  const sinStock = !v.producto.es_servicio && stock <= 0;
                  return (
                    <div
                      key={v.id}
                      onClick={() => !sinStock && addItem(v)}
                      className="d-flex flex-col gap-xs" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '12px', cursor: sinStock ? 'not-allowed' : 'pointer', opacity: sinStock ? 0.5 : 1, transition: 'all 0.15s ease' }}
                      onMouseEnter={e => {
                        if (!sinStock) {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.borderColor = 'hsl(var(--primary))';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(var(--primary-rgb),0.15)';
                        }
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.borderColor = 'var(--border-color)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{v.sku}</span>
                      <span className="font-semibold" style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.2 }}>
                        {v.producto.nombre}
                      </span>
                      <span className="font-extrabold" style={{ fontSize: '15px', color: 'hsl(var(--primary))', marginTop: '4px' }}>
                        ${precio.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </span>
                      {!v.producto.es_servicio && (
                        <span className="font-semibold" style={{ fontSize: '10px', color: stock < 5 ? 'hsl(var(--warning))' : 'hsl(var(--success))' }}>
                          {sinStock ? 'Sin stock' : `Stock: ${stock}`}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Carrito + Cobro */}
            <form onSubmit={handleCheckout} className="d-flex flex-col overflow-hidden" style={{ gap: '0', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
              
              {/* Header carrito */}
              <div className="d-flex justify-between align-center" style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-primary)', flexShrink: 0 }}>
                <span className="font-bold" style={{ fontSize: '14px' }}>Ticket Actual</span>
                <span style={{ fontSize: '12px', background: 'var(--bg-tertiary)', padding: '2px 8px', borderRadius: '100px' }}>
                  {cartItems.length} ítem{cartItems.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Lista de items — tabla compacta */}
              <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
                {cartItems.length === 0 ? (
                  <div className="text-center" style={{ padding: '32px', color: 'var(--text-muted)', fontSize: '13px' }}>
                    <svg style={{ display: 'block', margin: '0 auto 8px', opacity: 0.3 }} xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle>
                      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                    </svg>
                    Agregá productos haciendo clic
                  </div>
                ) : (
                  <table className="w-full" style={{ borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <th className="text-left font-semibold" style={{ padding: '8px 12px', color: 'var(--text-muted)', fontSize: '11px', background: 'var(--bg-primary)' }}>Producto</th>
                        <th className="text-center font-semibold" style={{ padding: '8px 8px', color: 'var(--text-muted)', fontSize: '11px', background: 'var(--bg-primary)' }}>Cant</th>
                        <th className="text-right font-semibold" style={{ padding: '8px 12px', color: 'var(--text-muted)', fontSize: '11px', background: 'var(--bg-primary)' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cartItems.map(item => (
                        <tr key={item.variantId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '8px 12px' }}>
                            <div className="font-semibold" style={{ fontSize: '13px', lineHeight: 1.2 }}>{item.nombre}</div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{item.sku}</div>
                          </td>
                          <td className="p-sm text-center">
                            <div className="d-flex align-center justify-center" style={{ gap: '2px' }}>
                              <button type="button" onClick={() => updateQuantity(item.variantId, item.cantidad - 1)}
                                className="d-flex align-center justify-center" style={{ width: '20px', height: '20px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', lineHeight: 1 }}>-</button>
                              <span className="text-center font-bold" style={{ minWidth: '28px' }}>{item.cantidad}</span>
                              <button type="button" onClick={() => updateQuantity(item.variantId, item.cantidad + 1)}
                                className="d-flex align-center justify-center" style={{ width: '20px', height: '20px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', lineHeight: 1 }}>+</button>
                            </div>
                          </td>
                          <td className="text-right" style={{ padding: '8px 12px' }}>
                            <div className="font-bold" style={{ fontSize: '13px' }}>${(item.subtotal * item.cantidad).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</div>
                            <button type="button" onClick={() => removeItem(item.variantId)}
                              className="p-0 font-semibold" style={{ fontSize: '10px', color: 'hsl(var(--danger))', background: 'none', border: 'none', cursor: 'pointer' }}>
                              Quitar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Panel inferior: totales + cobro */}
              <div className="d-flex flex-col" style={{ flexShrink: 0, borderTop: '1px solid var(--border-color)', padding: '12px 16px', gap: '10px', background: 'var(--bg-primary)' }}>
                <ClienteSelector />

                {/* Pagos acumulados */}
                {pagosAgregados.length > 0 && (
                  <div className="d-flex flex-col gap-xs">
                    {pagosAgregados.map((p, idx) => (
                      <div key={idx} className="d-flex justify-between align-center" style={{ fontSize: '12px', padding: '4px 8px', background: 'var(--bg-secondary)', borderRadius: '6px' }}>
                        <span className="font-semibold">{p.metodo_pago.replace(/_/g, ' ')}</span>
                        <div className="d-flex gap-sm align-center">
                          <span className="font-bold" style={{ color: 'hsl(var(--primary))' }}>${p.monto.toFixed(2)}</span>
                          <button type="button" onClick={() => setPagosAgregados(pagosAgregados.filter((_, i) => i !== idx))}
                            style={{ color: 'hsl(var(--danger))', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px' }}>✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Total */}
                <div className="d-flex justify-between align-center">
                  <span className="font-semibold" style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Total</span>
                  <span className="font-extrabold" style={{ fontSize: '26px', color: 'hsl(var(--primary))', fontFamily: 'monospace' }}>
                    ${totalReal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Selector de medio de pago rápido */}
                <div className="d-flex" style={{ gap: '6px' }}>
                  {['EFECTIVO', 'TARJETA_DEBITO', 'TARJETA_CREDITO', 'MERCADOPAGO_QR', ...(cuentaCorriente?.activa ? ['CUENTA_CORRIENTE'] : [])].map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setSelectedMedio(m)}
                      className="flex-1 font-bold" style={{ padding: '6px 2px', fontSize: '10px', borderRadius: '6px', border: '1px solid', borderColor: selectedMedio === m ? 'hsl(var(--primary))' : 'var(--border-color)', background: selectedMedio === m ? 'rgba(var(--primary-rgb), 0.1)' : 'var(--bg-secondary)', color: selectedMedio === m ? 'hsl(var(--primary))' : 'var(--text-secondary)', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.03em', transition: 'all 0.15s' }}
                    >
                      {m === 'EFECTIVO' ? 'Efectivo' :
                       m === 'TARJETA_DEBITO' ? 'Débito' :
                       m === 'TARJETA_CREDITO' ? 'Crédito' :
                       m === 'MERCADOPAGO_QR' ? 'MP QR' :
                       m === 'CUENTA_CORRIENTE' ? 'Cta Cte' : m}
                    </button>
                  ))}
                </div>

                {/* Selectores de Tarjeta y Cuotas (Formato Botones con CSS Grid Transition) */}
                <div style={{
                  display: 'grid',
                  gridTemplateRows: (selectedMedio === 'TARJETA_CREDITO' || selectedMedio === 'TARJETA_DEBITO') ? '1fr' : '0fr',
                  transition: 'grid-template-rows 0.35s cubic-bezier(0.4, 0, 0.2, 1), margin-top 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                  marginTop: (selectedMedio === 'TARJETA_CREDITO' || selectedMedio === 'TARJETA_DEBITO') ? '8px' : '0px'
                }}>
                  <div className="overflow-hidden d-flex flex-col gap-sm" style={{ opacity: (selectedMedio === 'TARJETA_CREDITO' || selectedMedio === 'TARJETA_DEBITO') ? 1 : 0, transition: 'opacity 0.25s ease' }}>
                    {/* Botones de Tarjetas */}
                    <div className="d-flex flex-wrap" style={{ gap: '6px' }}>
                      {cuentasContables.filter(c => c.tipo === lastCardType).map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setSelectedCuentaId(c.id);
                            setSelectedPlanId('');
                          }}
                          className="font-bold" style={{ flex: '1 1 auto', padding: '6px 8px', fontSize: '11px', borderRadius: '6px', border: '1px solid', borderColor: selectedCuentaId === c.id ? 'hsl(var(--primary))' : 'var(--border-color)', background: selectedCuentaId === c.id ? 'rgba(var(--primary-rgb), 0.1)' : 'var(--bg-secondary)', color: selectedCuentaId === c.id ? 'hsl(var(--primary))' : 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.15s' }}
                        >
                          {c.nombre}
                        </button>
                      ))}
                    </div>
                    
                    
                    {/* Botones de Cuotas */}
                    <div style={{
                      display: 'grid',
                      gridTemplateRows: (selectedCuentaId !== '' && (selectedMedio === 'TARJETA_CREDITO' || selectedMedio === 'TARJETA_DEBITO')) ? '1fr' : '0fr',
                      transition: 'grid-template-rows 0.35s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}>
                      <div className="overflow-hidden d-flex flex-wrap" style={{ gap: '6px', opacity: (selectedCuentaId !== '' && (selectedMedio === 'TARJETA_CREDITO' || selectedMedio === 'TARJETA_DEBITO')) ? 1 : 0, transition: 'opacity 0.25s ease' }}>
                        {(() => {
                          const cuenta = cuentasContables.find(c => c.id === lastCuentaId);
                          if (cuenta && cuenta.planes_pago?.length > 0) {
                            return cuenta.planes_pago.map(p => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => setSelectedPlanId(p.id)}
                                className="font-bold" style={{ flex: '1 1 auto', padding: '6px 8px', fontSize: '11px', borderRadius: '6px', border: '1px solid', borderColor: selectedPlanId === p.id ? 'hsl(var(--primary))' : 'var(--border-color)', background: selectedPlanId === p.id ? 'rgba(var(--primary-rgb), 0.1)' : 'var(--bg-secondary)', color: selectedPlanId === p.id ? 'hsl(var(--primary))' : 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.15s' }}
                              >
                                {p.nombre} {p.recargo_porcentaje > 0 ? `(+${p.recargo_porcentaje}%)` : ''}
                              </button>
                            ));
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Saldo restante */}
                {pagosAgregados.length > 0 && (
                  <div className="text-right font-extrabold" style={{ fontSize: '12px', color: saldoRestante > 0 ? 'hsl(var(--danger))' : 'hsl(var(--success))' }}>
                    {saldoRestante > 0 ? `Resta: $${saldoRestante.toFixed(2)}` : `Cambio: $${Math.abs(saldoRestante).toFixed(2)}`}
                  </div>
                )}

                {/* Botones */}
                <div className="d-flex gap-sm">
                  <button
                    type="button"
                    onClick={() => { clearCart(); setPagosAgregados([]); setDiscountMonto(0); setDiscountMotivo(''); }}
                    disabled={cartItems.length === 0}
                    style={{ padding: '10px', background: 'none', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '13px', flexShrink: 0 }}
                  >
                    Vaciar
                  </button>
                  <button className="btn-primary flex-1 font-extrabold"
                    type="submit"
                    
                     style={{ padding: '12px', fontSize: '15px' }}
                    disabled={cartItems.length === 0 || createSaleMutation.isPending || (pagosAgregados.length > 0 && saldoRestante > 0.01)}
                  >
                    {createSaleMutation.isPending ? 'Procesando...' : '✓ Cobrar'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
