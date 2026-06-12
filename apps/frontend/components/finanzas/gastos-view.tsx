'use client';
import React, { useState } from 'react';
import { useGastos, useCreateGasto } from '../../hooks/use-gastos';
import { useProveedores } from '../../hooks/use-proveedores';
import { toast } from '../../store/use-toast-store';

const CATEGORIAS = ['Alquiler', 'Sueldos', 'Proveedores', 'Servicios', 'Impuestos', 'Marketing', 'Mantenimiento', 'Otros'];

export function GastosView() {
  const { data: gastos = [] } = useGastos();
  const { data: proveedores = [] } = useProveedores();
  const createGasto = useCreateGasto();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ descripcion: '', monto: '', categoria: 'Otros', fecha: new Date().toISOString().split('T')[0], proveedor_id: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createGasto.mutateAsync({
        ...form,
        proveedor_id: form.proveedor_id ? Number(form.proveedor_id) : undefined
      });
      toast.success('Gasto registrado correctamente');
      setIsModalOpen(false);
      setForm({ descripcion: '', monto: '', categoria: 'Otros', fecha: new Date().toISOString().split('T')[0], proveedor_id: '' });
    } catch (err: any) {
      toast.error(err.message || 'Error al registrar gasto');
    }
  };

  return (
    <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
      <div className="d-flex justify-between align-center" style={{ marginBottom: '28px' }}>
        <div>
          <h1 className="font-extrabold" style={{ fontSize: '22px', marginBottom: '6px' }}>Gastos / Egresos</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Registrá los gastos operativos del negocio para calcular tu rentabilidad real.
          </p>
        </div>
        <button className="btn-primary" style={{ width: 'auto', padding: '8px 20px' }} onClick={() => setIsModalOpen(true)}>
          + Nuevo Gasto
        </button>
      </div>

      {gastos.length === 0 ? (
        <div className="text-center" style={{ background: 'var(--bg-secondary)', border: '1px dashed var(--border-color)', borderRadius: '12px', padding: '60px' }}>
          <svg style={{ display: 'block', margin: '0 auto 16px', opacity: 0.3 }} xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>
          <h3 className="font-bold" style={{ fontSize: '18px', marginBottom: '8px' }}>Sin gastos registrados</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>Comenzá registrando tus primeros gastos operativos.</p>
          <button className="btn-primary" style={{ width: 'auto', margin: '0 auto' }} onClick={() => setIsModalOpen(true)}>Registrar Gasto</button>
        </div>
      ) : (
        <div className="overflow-hidden" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
          <table className="w-full" style={{ borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-primary)' }}>
                <th className="text-left font-semibold" style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Fecha</th>
                <th className="text-left font-semibold" style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Descripción</th>
                <th className="text-left font-semibold" style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Categoría</th>
                <th className="text-left font-semibold" style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Proveedor</th>
                <th className="text-right font-semibold" style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Monto</th>
              </tr>
            </thead>
            <tbody>
              {gastos.map((g: any, i: number) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px 16px' }}>{g.fecha}</td>
                  <td className="font-semibold" style={{ padding: '12px 16px' }}>{g.descripcion}</td>
                  <td style={{ padding: '12px 16px' }}><span style={{ background: 'var(--bg-tertiary)', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}>{g.categoria}</span></td>
                  <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-secondary)' }}>{g.proveedor?.razon_social ?? '—'}</td>
                  <td className="text-right font-bold" style={{ padding: '12px 16px', color: 'hsl(var(--danger))' }}>-${Number(g.monto).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content scale-up" style={{ maxWidth: '460px', padding: '28px' }} onClick={e => e.stopPropagation()}>
            <div className="d-flex justify-between align-center" style={{ marginBottom: '20px' }}>
              <h2 className="font-extrabold m-0" style={{ fontSize: '18px' }}>Nuevo Gasto</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '20px' }}>×</button>
            </div>
            <form className="d-flex flex-col gap-lg" onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Descripción</label>
                <input className="form-input" type="text" placeholder="Ej: Alquiler junio" value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} required />
              </div>
              <div className="gap-md" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                <div className="form-group">
                  <label className="form-label">Monto ($)</label>
                  <input className="form-input" type="number" min="0" step="0.01" placeholder="0.00" value={form.monto} onChange={e => setForm({...form, monto: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Fecha</label>
                  <input className="form-input" type="date" value={form.fecha} onChange={e => setForm({...form, fecha: e.target.value})} required />
                </div>
              </div>
              <div className="gap-md" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                <div className="form-group">
                  <label className="form-label">Categoría</label>
                  <select className="form-input" value={form.categoria} onChange={e => setForm({...form, categoria: e.target.value})}>
                    {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Proveedor (Opcional)</label>
                  <select className="form-input" value={form.proveedor_id} onChange={e => setForm({...form, proveedor_id: e.target.value})}>
                    <option value="">Ninguno</option>
                    {proveedores.map((p: any) => <option key={p.id} value={p.id}>{p.razon_social}</option>)}
                  </select>
                </div>
              </div>
              <button type="submit" className="btn-primary">Registrar Gasto</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
