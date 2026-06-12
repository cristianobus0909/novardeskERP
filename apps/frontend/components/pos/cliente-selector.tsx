import React, { useState } from 'react';
import { useClientes, useCreateCliente } from '../../hooks/use-clientes';
import { useCartStore } from '../../store/use-cart-store';
import { toast } from '../../store/use-toast-store';

export function ClienteSelector() {
  const { data: clientes } = useClientes();
  const createMut = useCreateCliente();
  const { cliente_id, setCliente } = useCartStore();

  const [search, setSearch] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
  const [newCliente, setNewCliente] = useState({
    cuit_dni: '',
    razon_social: ''
  });

  // Filtrar clientes
  const filtered = search.trim() ? clientes?.filter((c: any) => 
    c.cuit_dni.includes(search) || c.razon_social.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 5) : [];

  const handleSelect = (c: any) => {
    setCliente(c.id, c.cuit_dni, c.razon_social);
    setSearch('');
  };

  const handleClear = () => {
    setCliente(undefined, '', 'Consumidor Final');
  };

  const handleCreateFast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCliente.cuit_dni || !newCliente.razon_social) return;
    
    try {
      const created = await createMut.mutateAsync({
        cuit_dni: newCliente.cuit_dni,
        razon_social: newCliente.razon_social,
        condicion_iva: 'Consumidor Final'
      });
      toast.success('Cliente registrado rápidamente');
      setCliente(created.id, created.cuit_dni, created.razon_social);
      setIsCreating(false);
      setNewCliente({ cuit_dni: '', razon_social: '' });
    } catch (err: any) {
      toast.error(err.message || 'Error al crear cliente');
    }
  };

  const selectedCliente = clientes?.find((c: any) => c.id === cliente_id);

  if (selectedCliente) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-tertiary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '16px' }}>
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Cliente Seleccionado</div>
          <div style={{ fontWeight: 'bold' }}>{selectedCliente.razon_social}</div>
          <div style={{ fontSize: '12px' }}>DNI/CUIT: {selectedCliente.cuit_dni}</div>
        </div>
        <button type="button" onClick={handleClear} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--danger))' }}>Quitar</button>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: '16px', position: 'relative' }}>
      {!isCreating ? (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <label className="form-label">Buscar Cliente (Opcional)</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Buscar por DNI/CUIT o Nombre..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && filtered && filtered.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', zIndex: 10, marginTop: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                {filtered.map((c: any) => (
                  <div 
                    key={c.id} 
                    onClick={() => handleSelect(c)}
                    style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border-color)' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ fontWeight: 'bold' }}>{c.razon_social}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>DNI/CUIT: {c.cuit_dni}</div>
                  </div>
                ))}
              </div>
            )}
            {search && filtered && filtered.length === 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', zIndex: 10, marginTop: '4px', padding: '12px', textAlign: 'center', fontSize: '13px' }}>
                No se encontraron clientes.
              </div>
            )}
          </div>
          <button 
            type="button" 
            onClick={() => setIsCreating(true)} 
            className="btn-secondary" 
            style={{ marginTop: '22px', padding: '0', width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, borderRadius: '8px' }}
            title="Nuevo Cliente"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </button>
        </div>
      ) : (
        <div style={{ background: 'var(--bg-tertiary)', padding: '12px', borderRadius: '8px', border: '1px dashed var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontWeight: 'bold', fontSize: '14px' }}>Alta Rápida de Cliente</span>
            <button type="button" onClick={() => setIsCreating(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>&times;</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '8px' }}>
            <input type="text" className="form-input" placeholder="DNI / CUIT" value={newCliente.cuit_dni} onChange={(e) => setNewCliente({...newCliente, cuit_dni: e.target.value})} />
            <input type="text" className="form-input" placeholder="Nombre / Razón Social" value={newCliente.razon_social} onChange={(e) => setNewCliente({...newCliente, razon_social: e.target.value})} />
          </div>
          <button type="button" onClick={handleCreateFast} className="btn-primary" style={{ marginTop: '8px', padding: '6px' }}>Guardar y Seleccionar</button>
        </div>
      )}
    </div>
  );
}
