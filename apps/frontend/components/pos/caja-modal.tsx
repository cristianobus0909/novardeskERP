import React, { useState } from 'react';
import { useAbrirCaja, useCerrarCaja, useEstadoCaja } from '../../hooks/use-caja';
import { toast } from '../../store/use-toast-store';

export function AbrirCajaModal({ onClose }: { onClose?: () => void }) {
  const [monto, setMonto] = useState('');
  const abrirCajaMut = useAbrirCaja();

  const handleAbrir = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!monto || isNaN(Number(monto))) {
      toast.error('Ingrese un monto válido');
      return;
    }
    
    try {
      await abrirCajaMut.mutateAsync(Number(monto));
      toast.success('Caja abierta exitosamente');
      if (onClose) onClose();
    } catch (err: any) {
      toast.error(err.message || 'Error al abrir caja');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '400px' }}>
        <h2>Abrir Caja (Inicio de Turno)</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Para comenzar a facturar en el Punto de Venta, debe declarar el fondo de cambio (efectivo inicial en gaveta).
        </p>
        
        <form onSubmit={handleAbrir}>
          <div className="form-group">
            <label className="form-label">Fondo de Cambio (Efectivo Inicial) $</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="form-input"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="Ej: 5000.00"
              autoFocus
              required
            />
          </div>

          <div className="d-flex gap-md" style={{ marginTop: '24px' }}>
            <button
              type="submit"
              className="btn-primary"
              disabled={abrirCajaMut.isPending}
            >
              {abrirCajaMut.isPending ? 'Abriendo...' : 'Abrir Caja'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function CerrarCajaModal({ onClose }: { onClose: () => void }) {
  const { data: estadoCaja } = useEstadoCaja();
  const cerrarCajaMut = useCerrarCaja();
  
  const [efectivoTotal, setEfectivoTotal] = useState('');
  const [declaradoDebito, setDeclaradoDebito] = useState('');
  const [declaradoCredito, setDeclaradoCredito] = useState('');
  const [declaradoTransferencia, setDeclaradoTransferencia] = useState('');
  const [declaradoMercadopago, setDeclaradoMercadopago] = useState('');
  
  const handleCerrar = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const contado = Number(efectivoTotal || 0);
      const apertura = Number(estadoCaja?.turno?.monto_apertura || 0);
      
      const aGaveta = Math.min(contado, apertura);
      const aExtraer = Math.max(0, contado - apertura);

      await cerrarCajaMut.mutateAsync({
        declarado_caja: aGaveta,
        declarado_extraccion: aExtraer,
        declarado_tarjeta_debito: Number(declaradoDebito || 0),
        declarado_tarjeta_credito: Number(declaradoCredito || 0),
        declarado_transferencia: Number(declaradoTransferencia || 0),
        declarado_mercadopago: Number(declaradoMercadopago || 0),
        notas_cierre: ''
      });
      toast.success('Caja cerrada exitosamente (Cierre Z)');
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Error al cerrar caja');
    }
  };

  const sumario = estadoCaja?.sumario;

  return (
    <div className="modal-overlay">
      <div className="modal-content overflow-y-auto"   style={{ maxWidth: '600px', maxHeight: '90vh' }}>
        <h2>Cierre de Caja (Z)</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Declare los montos físicos y electrónicos contados al finalizar el turno.
        </p>
        
        {sumario && (
          <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '13px' }}>
            <h4 style={{ margin: '0 0 8px 0' }}>Sumario Calculado por Sistema</h4>
            <div className="gap-sm" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
              <div>Efectivo: ${sumario.efectivo.toFixed(2)}</div>
              <div>Débito: ${sumario.debito.toFixed(2)}</div>
              <div>Crédito: ${sumario.credito.toFixed(2)}</div>
              <div>Transferencia: ${sumario.transferencia.toFixed(2)}</div>
            </div>
          </div>
        )}

        <form onSubmit={handleCerrar}>
          <div className="gap-lg" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            <div className="form-group p-md"   style={{ gridColumn: '1 / -1', background: 'rgba(22, 163, 74, 0.05)', border: '1px solid hsl(var(--success))', borderRadius: '8px' }}>
              <label className="form-label" style={{ color: 'hsl(var(--success))', fontSize: '15px' }}>Total Efectivo Contado (Físico) $</label>
              <input type="number" step="0.01" className="form-input" value={efectivoTotal} onChange={(e) => setEfectivoTotal(e.target.value)} required style={{ fontSize: '18px', padding: '12px' }} />
              
              {efectivoTotal && !isNaN(Number(efectivoTotal)) && (
                <div className="d-flex gap-lg" style={{ marginTop: '12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <div><strong>Queda en Gaveta:</strong> ${Math.min(Number(efectivoTotal), Number(estadoCaja?.turno?.monto_apertura || 0)).toLocaleString('es-AR', {minimumFractionDigits:2})}</div>
                  <div><strong>A Extraer (Sobre):</strong> ${Math.max(0, Number(efectivoTotal) - Number(estadoCaja?.turno?.monto_apertura || 0)).toLocaleString('es-AR', {minimumFractionDigits:2})}</div>
                </div>
              )}
            </div>
            
            <div className="form-group">
              <label className="form-label">Lote Tarjeta Débito $</label>
              <input type="number" step="0.01" className="form-input" value={declaradoDebito} onChange={(e) => setDeclaradoDebito(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Lote Tarjeta Crédito $</label>
              <input type="number" step="0.01" className="form-input" value={declaradoCredito} onChange={(e) => setDeclaradoCredito(e.target.value)} required />
            </div>
            
            <div className="form-group">
              <label className="form-label">Total Transferencias $</label>
              <input type="number" step="0.01" className="form-input" value={declaradoTransferencia} onChange={(e) => setDeclaradoTransferencia(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Total MercadoPago $</label>
              <input type="number" step="0.01" className="form-input" value={declaradoMercadopago} onChange={(e) => setDeclaradoMercadopago(e.target.value)} required />
            </div>
          </div>

          <div className="d-flex gap-md" style={{ marginTop: '24px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary" style={{ background: 'hsl(var(--danger))' }} disabled={cerrarCajaMut.isPending}>
              {cerrarCajaMut.isPending ? 'Cerrando...' : 'Confirmar Cierre Z'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
