import React, { useState } from 'react';
import { toast } from '../../store/use-toast-store';
import { useAuthStore } from '../../store/use-auth-store';
import { useEmployees, useCreateEmployee, useUpdateTenantProfile } from '../../hooks/use-settings';
import { useMpConfig, useSaveMpConfig } from '../../hooks/use-mp';

export function SettingsView() {
  const { tenant, user, setAuth, token } = useAuthStore();
  const { data: employees = [], isLoading } = useEmployees();
  const updateTenantMutation = useUpdateTenantProfile();
  const createEmployeeMutation = useCreateEmployee();

  // Tenant form state
  const [razonSocial, setRazonSocial] = useState(tenant?.razon_social || '');
  const [cuit, setCuit] = useState(tenant?.cuit || '');
  const [domicilioFiscal, setDomicilioFiscal] = useState((tenant as any)?.domicilio_fiscal || '');
  const [condicionIva, setCondicionIva] = useState((tenant as any)?.condicion_iva || '');
  const [afipPuntoVenta, setAfipPuntoVenta] = useState((tenant as any)?.afip_punto_venta?.toString() || '');
  const [afipCrt, setAfipCrt] = useState((tenant as any)?.afip_crt || '');
  const [afipKey, setAfipKey] = useState((tenant as any)?.afip_key || '');
  const [afipFacturacionAutomatica, setAfipFacturacionAutomatica] = useState(tenant?.afip_facturacion_automatica || false);
  const [logoUrl, setLogoUrl] = useState(tenant?.logo_url || '');

  // Employee modal state
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [empEmail, setEmpEmail] = useState('');
  const [empNombre, setEmpNombre] = useState('');
  const [empPassword, setEmpPassword] = useState('');

  // MP State
  const { data: mpConfig, isLoading: isLoadingMp } = useMpConfig();
  const saveMpConfigMutation = useSaveMpConfig();
  const [mpAccessToken, setMpAccessToken] = useState('');
  const [mpCajaId, setMpCajaId] = useState('');

  // Actualizar el estado local cuando llegan los datos del hook
  React.useEffect(() => {
    if (mpConfig) {
      setMpAccessToken(mpConfig.mp_access_token || '');
      setMpCajaId(mpConfig.mp_caja_id || '');
    }
  }, [mpConfig]);

  const handleUpdateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await updateTenantMutation.mutateAsync({
        razon_social: razonSocial,
        cuit: cuit,
        domicilio_fiscal: domicilioFiscal,
        condicion_iva: condicionIva,
        afip_punto_venta: afipPuntoVenta ? Number(afipPuntoVenta) : undefined,
        afip_crt: afipCrt,
        afip_key: afipKey || undefined,
        afip_facturacion_automatica: afipFacturacionAutomatica,
        logo_url: logoUrl || undefined,
      } as any);
      // Actualizar el estado global con el nuevo tenant, preservando el resto de las propiedades
      if (tenant) {
        setAuth(token!, user!, { ...tenant, ...result.tenant });
      }
      toast.success('Datos de la empresa actualizados correctamente');
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar datos');
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
      toast.success('Empleado creado exitosamente');
    } catch (err: any) {
      toast.error(err.message || 'Error al crear empleado');
    }
  };

  const handleSaveMpConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveMpConfigMutation.mutateAsync({
        mp_access_token: mpAccessToken,
        mp_caja_id: mpCajaId
      });
      toast.success('Configuración de Mercado Pago guardada exitosamente');
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar configuración MP');
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
          <div className="form-group">
            <label className="form-label">Domicilio Fiscal (Opcional)</label>
            <input
              type="text"
              className="form-input"
              value={domicilioFiscal}
              onChange={(e) => setDomicilioFiscal(e.target.value)}
              placeholder="Ej: Av. Siempreviva 742"
            />
          </div>

          {/* Logo del comercio */}
          <div className="form-group">
            <label className="form-label">Logo del Comercio (URL de imagen)</label>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '700', color: 'var(--text-muted)' }}>
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Logo"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  (tenant?.razon_social?.charAt(0) || 'L').toUpperCase()
                )}
              </div>
              <input
                type="url"
                className="form-input"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://ejemplo.com/mi-logo.png"
                style={{ flex: 1 }}
              />
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', display: 'block' }}>Pegá la URL directa de tu logo (PNG, JPG o SVG). Aparecerá en el menú lateral y en los tickets impresos.</span>
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

      {/* Tarjeta de Facturación AFIP */}
      <div className="profile-card" style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'block' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>Facturación Electrónica (AFIP/ARCA)</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>Configura tu certificado y punto de venta para emitir facturas oficiales desde la caja.</p>
        <form onSubmit={handleUpdateTenant} style={{ display: 'grid', gap: '16px', maxWidth: '600px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Condición frente al IVA</label>
              <select className="form-input" value={condicionIva} onChange={(e) => setCondicionIva(e.target.value)}>
                <option value="">Seleccionar...</option>
                <option value="Responsable Inscripto">Responsable Inscripto</option>
                <option value="Monotributista">Monotributista</option>
                <option value="Exento">Exento</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Punto de Venta Web Services</label>
              <input
                type="number"
                className="form-input"
                value={afipPuntoVenta}
                onChange={(e) => setAfipPuntoVenta(e.target.value)}
                placeholder="Ej: 4"
              />
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div>
              <span style={{ fontWeight: '600', fontSize: '14px', display: 'block' }}>Facturación Automática</span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Emitir comprobante legal automáticamente al cobrar un ticket en la caja.</span>
            </div>
            <label className="toggle-switch" style={{ margin: 0 }}>
              <input 
                type="checkbox" 
                checked={afipFacturacionAutomatica}
                onChange={(e) => setAfipFacturacionAutomatica(e.target.checked)}
              />
              <span className="slider round"></span>
            </label>
          </div>
          
          <div className="form-group">
            <label className="form-label">Certificado Digital (CRT)</label>
            <textarea
              className="form-input"
              value={afipCrt}
              onChange={(e) => setAfipCrt(e.target.value)}
              placeholder="-----BEGIN CERTIFICATE-----..."
              style={{ minHeight: '100px', fontFamily: 'monospace', fontSize: '12px' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Llave Privada (KEY)</label>
            <textarea
              className="form-input"
              value={afipKey}
              onChange={(e) => setAfipKey(e.target.value)}
              placeholder={tenant?.afip_crt ? "Obligatorio solo si cambias el certificado..." : "-----BEGIN PRIVATE KEY-----..."}
              style={{ minHeight: '100px', fontFamily: 'monospace', fontSize: '12px' }}
            />
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            disabled={updateTenantMutation.isPending}
            style={{ marginTop: '8px', width: 'max-content' }}
          >
            {updateTenantMutation.isPending ? 'Guardando...' : 'Guardar Configuración Fiscal'}
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

      {/* Tarjeta de Mercado Pago */}
      <div className="profile-card" style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'block' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#009EE3', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
            MP
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Integración Mercado Pago</h2>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
          Configura tus credenciales para recibir pagos con Smart POS o Códigos QR directamente en tu cuenta.
        </p>

        {isLoadingMp ? (
          <p>Cargando configuración...</p>
        ) : (
          <form onSubmit={handleSaveMpConfig} style={{ display: 'grid', gap: '16px', maxWidth: '600px' }}>
            <div className="form-group">
              <label className="form-label">Production Access Token</label>
              <input
                type="password"
                className="form-input"
                value={mpAccessToken}
                onChange={(e) => setMpAccessToken(e.target.value)}
                placeholder={mpConfig?.isConfigured ? '**** (Configurado)' : 'APP_USR-123456...'}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">ID de Caja (Device ID para Smart POS)</label>
              <input
                type="text"
                className="form-input"
                value={mpCajaId}
                onChange={(e) => setMpCajaId(e.target.value)}
                placeholder="Ej: CAJA_01"
                required
              />
            </div>
            <button 
              type="submit" 
              className="btn-primary" 
              disabled={saveMpConfigMutation.isPending}
              style={{ marginTop: '8px', width: 'max-content' }}
            >
              {saveMpConfigMutation.isPending ? 'Guardando...' : 'Vincular Cuenta Mercado Pago'}
            </button>
          </form>
        )}
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
