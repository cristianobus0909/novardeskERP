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

  // Limites de usuarios
  let baseUserLimit = 1;
  if (tenant?.plan_tier === 'BASICO') baseUserLimit = 2;
  else if (tenant?.plan_tier === 'PREMIUM') baseUserLimit = 3;
  else if (tenant?.plan_tier === 'FULL') baseUserLimit = 4;

  const allowedUsersLimit = baseUserLimit + ((tenant as any)?.usuarios_adicionales || 0);
  const currentUsersCount = employees.length;
  const isUserLimitReached = currentUsersCount >= allowedUsersLimit;

  // Tenant form state
  const [razonSocial, setRazonSocial] = useState(tenant?.razon_social || '');
  const [rubro, setRubro] = useState(tenant?.rubro || 'Kiosco/Minisuper');
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
        rubro: rubro,
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
    <div className="p-lg d-flex flex-col gap-xl">
      
      {/* Tarjeta de Datos de Empresa */}
      <div className="profile-card p-lg"   style={{ background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'block' }}>
        <h2 className="font-bold" style={{ fontSize: '18px', marginBottom: '16px' }}>Perfil del Comercio</h2>
        <form onSubmit={handleUpdateTenant} className="gap-lg" style={{ display: 'grid', maxWidth: '400px' }}>
          <div className="gap-lg" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            <div className="form-group">
              <label className="form-label">Razón Social</label>
              <input
                type="text"
                className="form-input"
                value={razonSocial}
                onChange={(e) => setRazonSocial(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Rubro Comercial</label>
              <select
                className="form-input"
                value={rubro}
                onChange={(e) => setRubro(e.target.value)}
              >
                <option value="Kiosco/Minisuper">Kiosco / Minisuper</option>
                <option value="Indumentaria/calzado/Accesorios">Indumentaria / Calzado / Accesorios</option>
                <option value="Forrajeria/Semilleria">Forrajería / Semillería</option>
                <option value="Farmacia">Farmacia</option>
                <option value="General">Otro (General)</option>
              </select>
            </div>
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
            <div className="d-flex gap-md align-start">
              <div className="overflow-hidden d-flex align-center justify-center font-bold" style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', flexShrink: 0, fontSize: '20px', color: 'var(--text-muted)' }}>
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Logo"
                    className="w-full h-full" style={{ objectFit: 'cover' }}
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  (tenant?.razon_social?.charAt(0) || 'L').toUpperCase()
                )}
              </div>
              <input
                type="url"
                className="form-input flex-1"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://ejemplo.com/mi-logo.png"
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
      <div className="profile-card p-lg"   style={{ background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'block' }}>
        <h2 className="font-bold" style={{ fontSize: '18px', marginBottom: '8px' }}>Facturación Electrónica (AFIP/ARCA)</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>Configura tu certificado y punto de venta para emitir facturas oficiales desde la caja.</p>
        <form onSubmit={handleUpdateTenant} className="gap-lg" style={{ display: 'grid', maxWidth: '600px' }}>
          <div className="gap-lg" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
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
          
          <div className="d-flex align-center justify-between p-md" style={{ background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div>
              <span className="font-semibold" style={{ fontSize: '14px', display: 'block' }}>Facturación Automática</span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Emitir comprobante legal automáticamente al cobrar un ticket en la caja.</span>
            </div>
            <label className="toggle-switch m-0"  >
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
      <div className="profile-card p-lg"   style={{ background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'block' }}>
        <div className="d-flex justify-between align-center" style={{ marginBottom: '16px' }}>
          <h2 className="font-bold" style={{ fontSize: '18px' }}>Gestión de Cuentas (Empleados)</h2>
          <button 
            onClick={() => setIsEmployeeModalOpen(true)} 
            className="btn-primary" 
            style={{ width: 'auto', padding: '6px 16px', opacity: isUserLimitReached ? 0.5 : 1 }}
            disabled={isUserLimitReached}
            title={isUserLimitReached ? "Límite de usuarios alcanzado" : "Registrar nuevo empleado"}
          >
            + Nuevo Empleado
          </button>
        </div>
        {isUserLimitReached && (
          <div style={{ color: 'var(--danger)', fontSize: '13px', background: 'rgba(255, 71, 87, 0.05)', border: '1px solid var(--danger)', borderRadius: '6px', padding: '8px 12px', marginBottom: '16px' }}>
            <strong>Límite de usuarios alcanzado:</strong> Tu plan actual {tenant?.plan_tier} permite hasta {allowedUsersLimit} usuarios ({baseUserLimit} base + {(tenant as any)?.usuarios_adicionales || 0} adicionales). Para registrar más empleados, contacta a soporte para contratar usuarios adicionales o mejora tu suscripción.
          </div>
        )}

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
                  <td colSpan={4} className="text-center" style={{ padding: '20px' }}>Cargando empleados...</td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center" style={{ padding: '20px' }}>No hay empleados registrados.</td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp.id}>
                    <td className="font-semibold">{emp.nombre}</td>
                    <td>{emp.email}</td>
                    <td><span className="badge-plan" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>{emp.role?.nombre}</span></td>
                    <td>
                      {emp.activo ? (
                        <span className="font-semibold" style={{ color: 'hsl(var(--success))', fontSize: '13px' }}>Activo</span>
                      ) : (
                        <span className="font-semibold" style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Inactivo</span>
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
      <div className="profile-card p-lg"   style={{ background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'block' }}>
        <div className="d-flex align-center gap-md" style={{ marginBottom: '16px' }}>
          <div className="d-flex align-center justify-center font-bold" style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#009EE3', color: 'white' }}>
            MP
          </div>
          <h2 className="font-bold" style={{ fontSize: '18px' }}>Integración Mercado Pago</h2>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
          Configura tus credenciales para recibir pagos con Smart POS o Códigos QR directamente en tu cuenta.
        </p>

        {isLoadingMp ? (
          <p>Cargando configuración...</p>
        ) : (
          <form onSubmit={handleSaveMpConfig} className="gap-lg" style={{ display: 'grid', maxWidth: '600px' }}>
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
            
            <form onSubmit={handleCreateEmployee} className="d-flex flex-col gap-lg">
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

              <div className="d-flex gap-md" style={{ marginTop: '16px' }}>
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
