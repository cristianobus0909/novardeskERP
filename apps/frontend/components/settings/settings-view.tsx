import React, { useState } from 'react';
import { useAuthStore } from '../../store/use-auth-store';
import { useEmployees, useCreateEmployee, useUpdateTenantProfile } from '../../hooks/use-settings';

export function SettingsView() {
  const { tenant, user, setAuth, token } = useAuthStore();
  const { data: employees = [], isLoading } = useEmployees();
  const updateTenantMutation = useUpdateTenantProfile();
  const createEmployeeMutation = useCreateEmployee();

  // Tenant form state
  const [razonSocial, setRazonSocial] = useState(tenant?.razon_social || '');
  const [cuit, setCuit] = useState(tenant?.cuit || '');

  // Employee modal state
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [empEmail, setEmpEmail] = useState('');
  const [empNombre, setEmpNombre] = useState('');
  const [empPassword, setEmpPassword] = useState('');

  const handleUpdateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await updateTenantMutation.mutateAsync({
        razon_social: razonSocial,
        cuit: cuit,
      });
      // Actualizar el estado global con el nuevo tenant, preservando el resto de las propiedades
      if (tenant) {
        setAuth(token!, user!, { ...tenant, ...result.tenant });
      }
      alert('Datos de la empresa actualizados correctamente');
    } catch (err: any) {
      alert(err.message || 'Error al actualizar datos');
    }
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createEmployeeMutation.mutateAsync({
        email: empEmail,
        nombre: empNombre,
        password: empPassword,
      });
      setIsEmployeeModalOpen(false);
      setEmpEmail('');
      setEmpNombre('');
      setEmpPassword('');
      alert('Empleado creado exitosamente');
    } catch (err: any) {
      alert(err.message || 'Error al crear empleado');
    }
  };

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Tarjeta de Datos de Empresa */}
      <div className="profile-card" style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'block' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>Perfil del Comercio</h2>
        <form onSubmit={handleUpdateTenant} style={{ display: 'grid', gap: '16px', maxWidth: '400px' }}>
          <div className="form-group">
            <label className="form-label">Razón Social o Nombre del Negocio</label>
            <input
              type="text"
              className="form-input"
              value={razonSocial}
              onChange={(e) => setRazonSocial(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">CUIT / RUT (Opcional)</label>
            <input
              type="text"
              className="form-input"
              value={cuit}
              onChange={(e) => setCuit(e.target.value)}
              placeholder="Ej: 30-12345678-9"
            />
          </div>
          <button 
            type="submit" 
            className="btn-primary" 
            disabled={updateTenantMutation.isPending}
            style={{ marginTop: '8px' }}
          >
            {updateTenantMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </form>
      </div>

      {/* Tarjeta de Gestión de Empleados */}
      <div className="profile-card" style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'block' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Gestión de Cuentas (Empleados)</h2>
          <button onClick={() => setIsEmployeeModalOpen(true)} className="btn-primary" style={{ width: 'auto', padding: '6px 16px' }}>
            + Nuevo Empleado
          </button>
        </div>

        <div className="product-table-wrapper" style={{ marginTop: '16px' }}>
          <table className="product-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo Electrónico</th>
                <th>Rol</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '20px' }}>Cargando empleados...</td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '20px' }}>No hay empleados registrados.</td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp.id}>
                    <td style={{ fontWeight: '600' }}>{emp.nombre}</td>
                    <td>{emp.email}</td>
                    <td><span className="badge-plan" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>{emp.role?.nombre}</span></td>
                    <td>
                      {emp.activo ? (
                        <span style={{ color: 'hsl(var(--success))', fontSize: '13px', fontWeight: '600' }}>Activo</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '600' }}>Inactivo</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nuevo Empleado */}
      {isEmployeeModalOpen && (
        <div className="modal-overlay" onClick={() => setIsEmployeeModalOpen(false)}>
          <div className="modal-content scale-up" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Registrar Nuevo Empleado</h2>
              <button className="modal-close" onClick={() => setIsEmployeeModalOpen(false)}>&times;</button>
            </div>
            
            <form onSubmit={handleCreateEmployee} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Nombre Completo</label>
                <input
                  type="text"
                  className="form-input"
                  value={empNombre}
                  onChange={(e) => setEmpNombre(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Correo Electrónico</label>
                <input
                  type="email"
                  className="form-input"
                  value={empEmail}
                  onChange={(e) => setEmpEmail(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Contraseña Temporal</label>
                <input
                  type="password"
                  className="form-input"
                  value={empPassword}
                  onChange={(e) => setEmpPassword(e.target.value)}
                  minLength={6}
                  required
                />
              </div>

              <div style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
                <button type="submit" className="btn-primary" disabled={createEmployeeMutation.isPending}>
                  {createEmployeeMutation.isPending ? 'Creando...' : 'Crear Cuenta'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setIsEmployeeModalOpen(false)}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
