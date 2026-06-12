import React, { useState, useEffect } from 'react';
import { useClientes, useCreateCliente, useUpdateCliente, useDeleteCliente } from '../../hooks/use-clientes';
import { useCuentaCorriente, useEnableCuentaCorriente, useRegistrarAbono } from '../../hooks/use-cuenta-corriente';
import { toast } from '../../store/use-toast-store';

export function ClientesView() {
  const { data: clientes, isLoading } = useClientes();
  const deleteMut = useDeleteCliente();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCcModalOpen, setIsCcModalOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<any>(null);

  const handleDelete = async (id: number) => {
    if (!confirm('¿Seguro que desea eliminar este cliente?')) return;
    try {
      await deleteMut.mutateAsync(id);
      toast.success('Cliente eliminado');
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar cliente');
    }
  };

  const openEdit = (cliente: any) => {
    setEditingCliente(cliente);
    setIsModalOpen(true);
  };

  const openCreate = () => {
    setEditingCliente(null);
    setIsModalOpen(true);
  };

  if (isLoading) return <div className="p-lg">Cargando clientes...</div>;

  return (
    <div className="p-lg">
      <div className="catalog-header">
        <h2 className="font-bold" style={{ fontSize: '24px' }}>Directorio de Clientes</h2>
        <button onClick={openCreate} className="btn-primary" style={{ width: 'auto' }}>+ Nuevo Cliente</button>
      </div>

      <div className="catalog-section">
        <div className="product-table-wrapper">
          <table className="product-table">
            <thead>
              <tr>
                <th>CUIT / DNI</th>
                <th>Razón Social / Nombre</th>
                <th>Email</th>
                <th>Teléfono</th>
                <th>Condición IVA</th>
                <th className="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clientes?.map((c: any) => (
                <tr key={c.id}>
                  <td>{c.cuit_dni}</td>
                  <td style={{ fontWeight: '500' }}>{c.razon_social}</td>
                  <td>{c.email || '-'}</td>
                  <td>{c.telefono || '-'}</td>
                  <td><span className="badge">{c.condicion_iva}</span></td>
                  <td className="text-right">
                    <button onClick={() => { setEditingCliente(c); setIsCcModalOpen(true); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--success))', marginRight: '12px' }}>Cta. Corriente</button>
                    <button onClick={() => openEdit(c)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--primary))', marginRight: '12px' }}>Editar</button>
                    <button onClick={() => handleDelete(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--danger))' }}>Eliminar</button>
                  </td>
                </tr>
              ))}
              {clientes?.length === 0 && (
                <tr><td colSpan={6} className="text-center p-lg" style={{ color: 'var(--text-secondary)' }}>No hay clientes registrados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <ClienteModal 
          cliente={editingCliente} 
          onClose={() => setIsModalOpen(false)} 
        />
      )}

      {isCcModalOpen && editingCliente && (
        <CuentaCorrienteModal 
          cliente={editingCliente} 
          onClose={() => setIsCcModalOpen(false)} 
        />
      )}
    </div>
  );
}

function CuentaCorrienteModal({ cliente, onClose }: { cliente: any, onClose: () => void }) {
  const { data: cuenta, isLoading } = useCuentaCorriente(cliente.id);
  const enableMut = useEnableCuentaCorriente();
  const abonoMut = useRegistrarAbono();

  const [limite, setLimite] = useState(0);
  const [montoAbono, setMontoAbono] = useState('');

  const handleActivar = async () => {
    try {
      await enableMut.mutateAsync({ clienteId: cliente.id, limite });
      toast.success('Límite de crédito asignado');
    } catch (err: any) {
      toast.error(err.message || 'Error');
    }
  };

  const handlePagar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!montoAbono || Number(montoAbono) <= 0) return;
    try {
      await abonoMut.mutateAsync({ clienteId: cliente.id, monto: Number(montoAbono), concepto: 'Pago en Efectivo (Caja)' });
      toast.success('Pago registrado');
      setMontoAbono('');
    } catch (err: any) {
      toast.error(err.message || 'Error al registrar abono');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content scale-up" style={{ maxWidth: '600px' }}>
        <div className="d-flex justify-between align-center" style={{ marginBottom: '20px' }}>
          <h2>Cuenta Corriente: {cliente.razon_social}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-secondary)' }}>&times;</button>
        </div>

        {isLoading ? (
          <p>Cargando información...</p>
        ) : (
          <div>
            {!cuenta?.activa ? (
              <div className="p-lg text-center" style={{ background: 'var(--bg-tertiary)', borderRadius: '12px' }}>
                <p style={{ marginBottom: '16px' }}>Este cliente no tiene una Cuenta Corriente activa.</p>
                <div className="d-flex gap-md justify-center align-center">
                  <label>Límite de Crédito: $</label>
                  <input type="number" className="form-input" style={{ width: '150px' }} value={limite} onChange={(e) => setLimite(Number(e.target.value))} />
                  <button className="btn-primary" style={{ width: 'auto' }} onClick={handleActivar} disabled={enableMut.isPending}>Activar Cuenta</button>
                </div>
              </div>
            ) : (
              <div className="d-flex flex-col gap-xl">
                {/* Resumen */}
                <div className="gap-lg" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                  <div className="profile-card p-md"   style={{ background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Saldo Actual (Deuda)</span>
                    <h3 style={{ fontSize: '24px', color: Number(cuenta.saldo_actual) > 0 ? 'hsl(var(--danger))' : 'hsl(var(--success))', margin: '4px 0' }}>
                      ${Number(cuenta.saldo_actual).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </h3>
                  </div>
                  <div className="profile-card p-md"   style={{ background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Crédito Disponible</span>
                    <h3 style={{ fontSize: '24px', margin: '4px 0' }}>
                      {Number(cuenta.limite_credito) === -1 ? 'Ilimitado' : `$${(Number(cuenta.limite_credito) - Number(cuenta.saldo_actual)).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`}
                    </h3>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {Number(cuenta.limite_credito) === -1 ? 'Límite total: Sin Límite' : `Límite total: $${Number(cuenta.limite_credito).toLocaleString()}`}
                    </span>
                  </div>
                </div>

                {/* Ingresar Pago */}
                <form onSubmit={handlePagar} className="d-flex gap-md p-md" style={{ alignItems: 'flex-end', background: 'var(--bg-tertiary)', borderRadius: '12px' }}>
                  <div className="form-group flex-1"   style={{ marginBottom: 0 }}>
                    <label className="form-label">Recibir Pago del Cliente</label>
                    <input type="number" className="form-input" placeholder="Monto a abonar" value={montoAbono} onChange={(e) => setMontoAbono(e.target.value)} required />
                  </div>
                  <button type="submit" className="btn-primary" style={{ width: 'auto' }} disabled={abonoMut.isPending}>Registrar Pago</button>
                </form>

                {/* Historial */}
                <div>
                  <h4 className="font-bold" style={{ marginBottom: '12px', fontSize: '14px' }}>Últimos Movimientos</h4>
                  <div className="overflow-y-auto" style={{ maxHeight: '250px' }}>
                    <table className="product-table" style={{ fontSize: '13px' }}>
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>Concepto</th>
                          <th className="text-right">Debe</th>
                          <th className="text-right">Haber</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cuenta.movimientos.map((m) => (
                          <tr key={m.id}>
                            <td>{new Date(m.fecha_movimiento).toLocaleDateString()}</td>
                            <td>{m.concepto}</td>
                            <td className="text-right" style={{ color: 'hsl(var(--danger))' }}>
                              {m.tipo_movimiento === 'CARGO' ? `$${Number(m.monto).toLocaleString('es-AR', {minimumFractionDigits: 2})}` : '-'}
                            </td>
                            <td className="text-right" style={{ color: 'hsl(var(--success))' }}>
                              {m.tipo_movimiento === 'ABONO' ? `$${Number(m.monto).toLocaleString('es-AR', {minimumFractionDigits: 2})}` : '-'}
                            </td>
                          </tr>
                        ))}
                        {cuenta.movimientos.length === 0 && (
                          <tr><td colSpan={4} className="text-center">No hay movimientos registrados.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ClienteModal({ cliente, onClose }: { cliente: any, onClose: () => void }) {
  const createMut = useCreateCliente();
  const updateMut = useUpdateCliente();
  
  const { data: cuenta } = useCuentaCorriente(cliente?.id || null);
  const enableMut = useEnableCuentaCorriente();

  const [formData, setFormData] = useState({
    tipo_documento: cliente?.tipo_documento || 'DNI',
    cuit_dni: cliente?.cuit_dni || '',
    razon_social: cliente?.razon_social || '',
    email: cliente?.email || '',
    telefono: cliente?.telefono || '',
    direccion: cliente?.direccion || '',
    condicion_iva: cliente?.condicion_iva || 'Consumidor Final',
    limite_credito: 0,
  });

  useEffect(() => {
    if (cuenta && cuenta.activa) {
      setFormData(prev => ({ ...prev, limite_credito: Number(cuenta.limite_credito) }));
    }
  }, [cuenta]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const baseData = {
        tipo_documento: formData.tipo_documento, cuit_dni: formData.cuit_dni, razon_social: formData.razon_social, email: formData.email, telefono: formData.telefono, direccion: formData.direccion, condicion_iva: formData.condicion_iva
      };

      if (cliente) {
        await updateMut.mutateAsync({ id: cliente.id, data: baseData });
        if (cuenta || formData.limite_credito !== 0) {
          await enableMut.mutateAsync({ clienteId: cliente.id, limite: formData.limite_credito });
        }
        toast.success('Cliente actualizado');
      } else {
        const newCliente = await createMut.mutateAsync(baseData);
        if (formData.limite_credito !== 0) {
          await enableMut.mutateAsync({ clienteId: newCliente.id, limite: formData.limite_credito });
        }
        toast.success('Cliente creado');
      }
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar el cliente');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '500px' }}>
        <div className="d-flex justify-between align-center" style={{ marginBottom: '20px' }}>
          <h2>{cliente ? 'Editar Cliente' : 'Nuevo Cliente'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-secondary)' }}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="d-flex flex-col gap-lg">
          <div className="gap-md" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 3fr' }}>
            <div className="form-group">
              <label className="form-label">Tipo Doc.</label>
              <select className="form-input" value={formData.tipo_documento} onChange={(e) => setFormData({...formData, tipo_documento: e.target.value})}>
                <option value="DNI">DNI</option>
                <option value="CUIT">CUIT</option>
                <option value="CUIL">CUIL</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Número</label>
              <input type="text" className="form-input" required value={formData.cuit_dni} onChange={(e) => setFormData({...formData, cuit_dni: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Razón Social / Nombre</label>
              <input type="text" className="form-input" required value={formData.razon_social} onChange={(e) => setFormData({...formData, razon_social: e.target.value})} />
            </div>
          </div>

          <div className="gap-md" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" className="form-input" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Teléfono</label>
              <input type="text" className="form-input" value={formData.telefono} onChange={(e) => setFormData({...formData, telefono: e.target.value})} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Dirección</label>
            <input type="text" className="form-input" value={formData.direccion} onChange={(e) => setFormData({...formData, direccion: e.target.value})} />
          </div>

          <div className="gap-md" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            <div className="form-group">
              <label className="form-label">Condición frente al IVA</label>
              <select className="form-input" value={formData.condicion_iva} onChange={(e) => setFormData({...formData, condicion_iva: e.target.value})}>
                <option value="Consumidor Final">Consumidor Final</option>
                <option value="Responsable Inscripto">Responsable Inscripto</option>
                <option value="Monotributista">Monotributista</option>
                <option value="Exento">Exento</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Límite Cta. Corriente ($)</label>
              <div className="d-flex gap-sm align-center">
                <input type="number" min="0" className="form-input flex-1" disabled={formData.limite_credito === -1} value={formData.limite_credito === 0 || formData.limite_credito === -1 ? '' : formData.limite_credito} onChange={(e) => setFormData({...formData, limite_credito: Number(e.target.value) || 0})} placeholder={formData.limite_credito === -1 ? 'Sin límite' : 'Vacío (no activar)'} />
                <label className="d-flex align-center gap-xs" style={{ fontSize: '12px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={formData.limite_credito === -1} onChange={(e) => setFormData({...formData, limite_credito: e.target.checked ? -1 : 0})} />
                  Sin Límite
                </label>
              </div>
            </div>
          </div>

          <div className="d-flex gap-md" style={{ marginTop: '8px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={createMut.isPending || updateMut.isPending}>
              {createMut.isPending || updateMut.isPending ? 'Guardando...' : 'Guardar Cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
