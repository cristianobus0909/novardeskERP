'use client';
import React, { useState } from 'react';
import { useProveedores, useCreateProveedor } from '../../hooks/use-proveedores';
import { toast } from '../../store/use-toast-store';

export function ProveedoresView() {
  const { data: proveedores = [] } = useProveedores();
  const createProveedor = useCreateProveedor();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ razon_social: '', cuit: '', contacto: '', email: '', condicion_iva: 'Responsable Inscripto' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createProveedor.mutateAsync(form);
      toast.success('Proveedor creado correctamente');
      setIsModalOpen(false);
      setForm({ razon_social: '', cuit: '', contacto: '', email: '', condicion_iva: 'Responsable Inscripto' });
    } catch (err: any) {
      toast.error(err.message || 'Error al crear proveedor');
    }
  };

  return (
    <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '6px' }}>Proveedores</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Gestioná tus proveedores y su información fiscal para órdenes de compra.
          </p>
        </div>
        <button className="btn-primary" style={{ width: 'auto', padding: '8px 20px' }} onClick={() => setIsModalOpen(true)}>
          + Nuevo Proveedor
        </button>
      </div>

      {proveedores.length === 0 ? (
        <div style={{ background: 'var(--bg-secondary)', border: '1px dashed var(--border-color)', borderRadius: '12px', padding: '60px', textAlign: 'center' }}>
          <svg style={{ display: 'block', margin: '0 auto 16px', opacity: 0.3 }} xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>Sin proveedores cargados</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>Agregá tus proveedores para rastrear compras y cuentas por pagar.</p>
          <button className="btn-primary" style={{ width: 'auto', margin: '0 auto' }} onClick={() => setIsModalOpen(true)}>Agregar Proveedor</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {proveedores.map((p: any, i: number) => (
            <div key={i} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px' }}>
              <div style={{ fontWeight: '700', fontSize: '16px', marginBottom: '4px' }}>{p.razon_social}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'monospace', marginBottom: '8px' }}>CUIT: {p.cuit}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{p.contacto}</div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content scale-up" style={{ maxWidth: '460px', padding: '28px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0 }}>Nuevo Proveedor</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '20px' }}>×</button>
            </div>
            <form style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Razón Social</label>
                <input className="form-input" type="text" placeholder="Nombre del proveedor" value={form.razon_social} onChange={e => setForm({...form, razon_social: e.target.value})} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">CUIT</label>
                  <input className="form-input" type="text" placeholder="30-12345678-9" value={form.cuit} onChange={e => setForm({...form, cuit: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Condición IVA</label>
                  <select className="form-input" value={form.condicion_iva} onChange={e => setForm({...form, condicion_iva: e.target.value})}>
                    <option value="Responsable Inscripto">Responsable Inscripto</option>
                    <option value="Monotributista">Monotributista</option>
                    <option value="Exento">Exento</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Contacto / Teléfono</label>
                <input className="form-input" type="text" placeholder="Nombre y teléfono del contacto" value={form.contacto} onChange={e => setForm({...form, contacto: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" placeholder="proveedor@empresa.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
              </div>
              <button type="submit" className="btn-primary">Guardar Proveedor</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
