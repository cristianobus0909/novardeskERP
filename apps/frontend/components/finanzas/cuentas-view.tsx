import React, { useState } from 'react';
import { toast } from '../../store/use-toast-store';
import { useCuentasContables, useCreateCuenta, useCreatePlan, useDeletePlan, CuentaContable } from '../../hooks/use-finanzas';

export function CuentasView() {
  const { data: cuentas = [], isLoading } = useCuentasContables();
  const createCuentaMutation = useCreateCuenta();
  const createPlanMutation = useCreatePlan();
  const deletePlanMutation = useDeletePlan();

  const [isCuentaModalOpen, setIsCuentaModalOpen] = useState(false);
  const [nuevaCuentaNombre, setNuevaCuentaNombre] = useState('');
  const [nuevaCuentaTipo, setNuevaCuentaTipo] = useState('TARJETA_CREDITO');

  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [selectedCuenta, setSelectedCuenta] = useState<CuentaContable | null>(null);
  
  const [nuevoPlanNombre, setNuevoPlanNombre] = useState('');
  const [nuevoPlanCuotas, setNuevoPlanCuotas] = useState(1);
  const [nuevoPlanRecargo, setNuevoPlanRecargo] = useState(0);
  const [nuevoPlanComision, setNuevoPlanComision] = useState(0);

  const handleCreateCuenta = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createCuentaMutation.mutateAsync({ nombre: nuevaCuentaNombre, tipo: nuevaCuentaTipo });
      toast.success('Cuenta contable creada exitosamente');
      setIsCuentaModalOpen(false);
      setNuevaCuentaNombre('');
    } catch (err: any) {
      toast.error(err.message || 'Error al crear cuenta');
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCuenta) return;
    try {
      await createPlanMutation.mutateAsync({
        cuentaId: selectedCuenta.id,
        nombre: nuevoPlanNombre,
        cuotas: nuevoPlanCuotas,
        recargo_porcentaje: nuevoPlanRecargo,
        comision_porcentaje: nuevoPlanComision,
      });
      toast.success('Plan de pago registrado');
      setIsPlanModalOpen(false);
      setNuevoPlanNombre('');
      setNuevoPlanCuotas(1);
      setNuevoPlanRecargo(0);
      setNuevoPlanComision(0);
    } catch (err: any) {
      toast.error(err.message || 'Error al crear plan');
    }
  };

  const handleDeletePlan = async (planId: number) => {
    if (confirm('¿Seguro que deseas desactivar este plan de pago? (No afectará ventas pasadas)')) {
      try {
        await deletePlanMutation.mutateAsync(planId);
        toast.success('Plan desactivado');
      } catch (err: any) {
        toast.error('Error al desactivar plan');
      }
    }
  };

  return (
    <div className="d-flex flex-col gap-xl w-full" style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header Section */}
      <div className="d-flex justify-between align-center">
        <div>
          <h1 className="font-bold" style={{ fontSize: '24px', marginBottom: '8px' }}>
            Plan de Cuentas Contables
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Gestiona tus cuentas contables, métodos de cobro y planes de financiación.
          </p>
        </div>
        <button 
          className="btn-primary" 
          style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '6px', width: 'fit-content', whiteSpace: 'nowrap' }}
          onClick={() => setIsCuentaModalOpen(true)}
        >
          Nueva Cuenta
        </button>
      </div>

      {isLoading ? (
        <div className="d-flex justify-center" style={{ padding: '60px' }}>
          <div className="spinner" style={{ width: '40px', height: '40px' }}></div>
        </div>
      ) : cuentas.length === 0 ? (
        <div className="text-center" style={{ padding: '60px 20px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
          <h3 className="font-bold" style={{ fontSize: '18px', marginBottom: '8px' }}>Aún no hay cuentas registradas</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Comienza creando tu primera cuenta contable (Ej: Caja, Banco Galicia, etc.)</p>
          <button className="btn-primary" onClick={() => setIsCuentaModalOpen(true)}>Crear Primera Cuenta</button>
        </div>
      ) : (
        <div className="table-container">
          <table className="product-table w-full text-left"   style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontSize: '13px', textTransform: 'uppercase' }}>
                <th className="p-md">Cuenta</th>
                <th className="p-md">Tipo</th>
                <th className="p-md">Planes de Financiación</th>
                <th className="p-md text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cuentas.map((cuenta) => (
                <tr key={cuenta.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td className="p-md" style={{ verticalAlign: 'top' }}>
                    <div className="font-semibold" style={{ fontSize: '15px' }}>{cuenta.nombre}</div>
                  </td>
                  <td className="p-md" style={{ verticalAlign: 'top' }}>
                    <span className="badge-plan" style={{ background: 'var(--bg-tertiary)', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>
                      {cuenta.tipo.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-md" style={{ verticalAlign: 'top' }}>
                    {cuenta.planes_pago.length === 0 ? (
                      <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>-</span>
                    ) : (
                      <div className="d-flex flex-col gap-sm">
                        {cuenta.planes_pago.map(plan => (
                          <div key={plan.id} className="d-flex align-center gap-md" style={{ background: 'var(--bg-secondary)', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', border: '1px solid var(--border-color)' }}>
                            <div className="flex-1">
                              <strong>{plan.nombre}</strong> <span style={{ color: 'var(--text-secondary)' }}>({plan.cuotas} {plan.cuotas === 1 ? 'cuota' : 'cuotas'})</span>
                              <div style={{ fontSize: '11px', marginTop: '4px' }}>
                                <span style={{ color: plan.recargo_porcentaje > 0 ? 'hsl(var(--danger))' : 'var(--text-secondary)' }}>Recargo: {plan.recargo_porcentaje}%</span>
                                {' | '}
                                <span style={{ color: plan.comision_porcentaje > 0 ? 'hsl(var(--warning))' : 'var(--text-secondary)' }}>Comisión: {plan.comision_porcentaje}%</span>
                              </div>
                            </div>
                            <button 
                              onClick={() => handleDeletePlan(plan.id)}
                              className="d-flex align-center justify-center" style={{ background: 'none', border: 'none', color: 'hsl(var(--danger))', cursor: 'pointer', padding: '4px' }}
                              title="Desactivar Plan"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="p-md text-right" style={{ verticalAlign: 'top' }}>
                    <button 
                      className="btn-secondary"
                      style={{ fontSize: '12px', padding: '6px 12px' }}
                      onClick={() => { setSelectedCuenta(cuenta); setIsPlanModalOpen(true); }}
                    >
                      + Añadir Plan
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Cuenta */}
      {isCuentaModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCuentaModalOpen(false)}>
          <div className="modal-content scale-up p-lg"   style={{ maxWidth: '500px', borderRadius: '12px' }} onClick={e => e.stopPropagation()}>
            <div className="d-flex justify-between align-center" style={{ marginBottom: '20px' }}>
              <h2 className="font-bold m-0" style={{ fontSize: '20px' }}>Nueva Cuenta</h2>
              <button onClick={() => setIsCuentaModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>&times;</button>
            </div>
            
            <form onSubmit={handleCreateCuenta} className="d-flex flex-col gap-lg">
              <div className="form-group">
                <label className="form-label">Nombre de Cuenta</label>
                <input type="text" className="form-input" value={nuevaCuentaNombre} onChange={e => setNuevaCuentaNombre(e.target.value)} placeholder="Ej: Visa Crédito Banco Galicia" required />
              </div>
              <div className="form-group">
                <label className="form-label">Tipo de Cuenta</label>
                <select className="form-input" value={nuevaCuentaTipo} onChange={e => setNuevaCuentaTipo(e.target.value)}>
                  <option value="BANCARIA">Cuenta Bancaria (Transferencias)</option>
                  <option value="TARJETA_CREDITO">Tarjeta de Crédito</option>
                  <option value="TARJETA_DEBITO">Tarjeta de Débito</option>
                  <option value="BILLETERA_VIRTUAL">Billetera Virtual</option>
                </select>
              </div>
              <button type="submit" className="btn-primary" disabled={createCuentaMutation.isPending}>
                {createCuentaMutation.isPending ? 'Guardando...' : 'Registrar Cuenta'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Plan */}
      {isPlanModalOpen && selectedCuenta && (
        <div className="modal-overlay" onClick={() => setIsPlanModalOpen(false)}>
          <div className="modal-content scale-up p-lg"   style={{ maxWidth: '500px', borderRadius: '12px' }} onClick={e => e.stopPropagation()}>
            <div className="d-flex justify-between align-center" style={{ marginBottom: '20px' }}>
              <h2 className="font-bold m-0" style={{ fontSize: '20px' }}>Nuevo Plan para {selectedCuenta.nombre}</h2>
              <button onClick={() => setIsPlanModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>&times;</button>
            </div>

            <form onSubmit={handleCreatePlan} className="d-flex flex-col gap-lg">
              <div className="form-group">
                <label className="form-label">Nombre del Plan</label>
                <input type="text" className="form-input" value={nuevoPlanNombre} onChange={e => setNuevoPlanNombre(e.target.value)} placeholder="Ej: Ahora 12, 3 Cuotas, etc." required />
              </div>
              
              <div className="gap-lg" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                <div className="form-group">
                  <label className="form-label">Cantidad Cuotas</label>
                  <input type="number" className="form-input" value={nuevoPlanCuotas} onChange={e => setNuevoPlanCuotas(Number(e.target.value))} min={1} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Recargo al Cliente (%)</label>
                  <input type="number" className="form-input" value={nuevoPlanRecargo} onChange={e => setNuevoPlanRecargo(Number(e.target.value))} min={0} step="0.01" />
                </div>
              </div>
              
              <div className="form-group" style={{ background: 'var(--bg-tertiary)', padding: '12px', borderRadius: '8px' }}>
                <label className="form-label" style={{ color: 'hsl(var(--warning))' }}>Comisión Bancaria (%)</label>
                <input type="number" className="form-input" value={nuevoPlanComision} onChange={e => setNuevoPlanComision(Number(e.target.value))} min={0} step="0.01" />
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: '1.4' }}>
                  Esta comisión no se le cobra al cliente. Se usa internamente para calcular la rentabilidad neta real.
                </p>
              </div>

              <button type="submit" className="btn-primary" disabled={createPlanMutation.isPending}>
                {createPlanMutation.isPending ? 'Guardando...' : 'Crear Plan de Financiación'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
