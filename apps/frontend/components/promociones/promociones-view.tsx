import React, { useState } from 'react';
import { usePromociones, useCreatePromocion, useTogglePromocion, useDeletePromocion } from '../../hooks/use-promociones';
import { toast } from '../../store/use-toast-store';
import { useProducts } from '../../hooks/use-products';

export function PromocionesView() {
  const { data: promociones, isLoading } = usePromociones();
  const createMut = useCreatePromocion();
  const toggleMut = useTogglePromocion();
  const deleteMut = useDeletePromocion();

  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    tipo_regla: 'GLOBAL',
    valor_regla: '',
    cantidad_minima: '',
    descuento_porcentaje: '',
    descuento_monto: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!formData.nombre) return toast.error('El nombre es obligatorio');
      if (!formData.descuento_porcentaje && !formData.descuento_monto) {
        return toast.error('Debes indicar un porcentaje o un monto fijo de descuento');
      }

      await createMut.mutateAsync({
        nombre: formData.nombre,
        descripcion: formData.descripcion,
        tipo_regla: formData.tipo_regla,
        valor_regla: formData.valor_regla || null,
        cantidad_minima: formData.cantidad_minima ? parseInt(formData.cantidad_minima) : null,
        descuento_porcentaje: formData.descuento_porcentaje ? parseFloat(formData.descuento_porcentaje) : null,
        descuento_monto: formData.descuento_monto ? parseFloat(formData.descuento_monto) : null,
      });

      toast.success('Promoción creada exitosamente');
      setIsCreating(false);
      setFormData({
        nombre: '',
        descripcion: '',
        tipo_regla: 'GLOBAL',
        valor_regla: '',
        cantidad_minima: '',
        descuento_porcentaje: '',
        descuento_monto: ''
      });
    } catch (err: any) {
      toast.error(err.message || 'Error al crear la promoción');
    }
  };

  const handleToggle = async (id: number) => {
    try {
      await toggleMut.mutateAsync(id);
      toast.success('Estado actualizado');
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Seguro que deseas eliminar esta promoción?')) return;
    try {
      await deleteMut.mutateAsync(id);
      toast.success('Promoción eliminada');
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar');
    }
  };

  return (
    <div className="promociones-view">
      <div className="d-flex justify-between" style={{ marginBottom: '24px' }}>
        <h2 className="font-bold" style={{ fontSize: '20px' }}>Gestión de Promociones</h2>
        <button className="btn-primary" style={{ width: 'auto' }} onClick={() => setIsCreating(!isCreating)}>
          {isCreating ? 'Cancelar' : '+ Nueva Promoción'}
        </button>
      </div>

      {isCreating && (
        <form onSubmit={handleSubmit} className="p-lg d-flex flex-col gap-lg" style={{ background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '24px' }}>
          <h3>Crear Regla de Promoción</h3>
          <div className="gap-lg" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            <div className="form-group">
              <label className="form-label">Nombre de la Promoción</label>
              <input type="text" className="form-input" required value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} placeholder="Ej: Black Friday, 3x2 en Remeras" />
            </div>
            <div className="form-group">
              <label className="form-label">Descripción Interna</label>
              <input type="text" className="form-input" value={formData.descripcion} onChange={e => setFormData({...formData, descripcion: e.target.value})} placeholder="Para control interno" />
            </div>

            <div className="form-group">
              <label className="form-label">Tipo de Regla</label>
              <select className="form-input" value={formData.tipo_regla} onChange={e => setFormData({...formData, tipo_regla: e.target.value})}>
                <option value="GLOBAL">Global (Aplica a todo el carrito)</option>
                <option value="CATEGORIA">Categoría Específica</option>
                <option value="PRODUCTO">Producto Específico (ID/SKU)</option>
              </select>
            </div>

            {formData.tipo_regla !== 'GLOBAL' && (
              <div className="form-group">
                <label className="form-label">
                  {formData.tipo_regla === 'CATEGORIA' ? 'Nombre exacto de la Categoría' : 'Código o ID del Producto'}
                </label>
                <input type="text" className="form-input" required value={formData.valor_regla} onChange={e => setFormData({...formData, valor_regla: e.target.value})} placeholder={formData.tipo_regla === 'CATEGORIA' ? 'Ej: Indumentaria' : 'Ej: PROD-001'} />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Cantidad Mínima Requerida (Opcional)</label>
              <input type="number" className="form-input" value={formData.cantidad_minima} onChange={e => setFormData({...formData, cantidad_minima: e.target.value})} placeholder="Ej: Lleva 3..." />
            </div>

            <div className="form-group">
              <label className="form-label">% Descuento</label>
              <input type="number" step="0.01" className="form-input" value={formData.descuento_porcentaje} onChange={e => setFormData({...formData, descuento_porcentaje: e.target.value, descuento_monto: ''})} placeholder="Ej: 20" disabled={!!formData.descuento_monto} />
            </div>

            <div className="form-group">
              <label className="form-label">O Monto Fijo ($)</label>
              <input type="number" step="0.01" className="form-input" value={formData.descuento_monto} onChange={e => setFormData({...formData, descuento_monto: e.target.value, descuento_porcentaje: ''})} placeholder="Ej: 5000" disabled={!!formData.descuento_porcentaje} />
            </div>
          </div>
          <button type="submit" className="btn-primary" disabled={createMut.isPending}>
            {createMut.isPending ? 'Guardando...' : 'Guardar Promoción'}
          </button>
        </form>
      )}

      {isLoading ? <p>Cargando promociones...</p> : (
        <div className="d-flex flex-col gap-lg">
          {promociones?.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No hay promociones configuradas.</p>}
          {promociones?.map((promo: any) => (
            <div key={promo.id} className="d-flex justify-between align-center p-md" style={{ background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)', opacity: promo.activa ? 1 : 0.6 }}>
              <div>
                <h4 className="font-bold d-flex align-center gap-sm" style={{ fontSize: '16px' }}>
                  {promo.nombre}
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', background: promo.activa ? 'hsl(var(--success))' : 'var(--border-color)', color: promo.activa ? 'black' : 'var(--text-secondary)' }}>
                    {promo.activa ? 'ACTIVA' : 'INACTIVA'}
                  </span>
                </h4>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Regla: <strong>{promo.tipo_regla}</strong> {promo.valor_regla && `(${promo.valor_regla})`} | 
                  Min: {promo.cantidad_minima || 1} uds. | 
                  Descuento: {promo.descuento_porcentaje ? `${promo.descuento_porcentaje}%` : `$${promo.descuento_monto}`}
                </p>
                {promo.descripcion && <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Nota: {promo.descripcion}</p>}
              </div>
              <div className="d-flex gap-sm">
                <button onClick={() => handleToggle(promo.id)} className="btn-secondary" style={{ padding: '6px 12px', width: 'auto' }}>
                  {promo.activa ? 'Desactivar' : 'Activar'}
                </button>
                <button onClick={() => handleDelete(promo.id)} className="btn-secondary" style={{ padding: '6px 12px', width: 'auto', color: 'hsl(var(--danger))' }}>
                  Borrar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
