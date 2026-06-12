import React, { useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';

export function TicketView({ venta, tenant, onClose }: { venta: any; tenant: any; onClose: () => void }) {
  useEffect(() => {
    // Cuando el componente se monta, abre el diálogo de impresión con un retraso mayor
    // para que el usuario pueda ver el ticket en pantalla primero
    const timer = setTimeout(() => {
      window.print();
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  if (!venta || !tenant) return null;

  return (
    <div className="ticket-overlay">
      <div className="ticket-print-area">
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', margin: '0 0 4px 0' }}>{tenant.razon_social}</h2>
          <p style={{ fontSize: '12px', margin: '0' }}>CUIT: {tenant.cuit || '00-00000000-0'}</p>
        </div>
        
        <div style={{ fontSize: '12px', marginBottom: '12px', borderBottom: '1px dashed #000', paddingBottom: '8px' }}>
          <p style={{ margin: '2px 0' }}>Ticket N°: {venta.id.toString().padStart(8, '0')}</p>
          <p style={{ margin: '2px 0' }}>Fecha: {new Date(venta.fecha_venta).toLocaleString('es-AR')}</p>
          <p style={{ margin: '2px 0' }}>Cliente: {venta.nombre_cliente}</p>
          <p style={{ margin: '2px 0' }}>Método Pago: {venta.metodo_pago}</p>
        </div>

        <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', marginBottom: '12px' }}>
          <thead>
            <tr style={{ borderBottom: '1px dashed #000' }}>
              <th style={{ textAlign: 'left', padding: '4px 0' }}>Cant</th>
              <th style={{ textAlign: 'left', padding: '4px 0' }}>Desc</th>
              <th style={{ textAlign: 'right', padding: '4px 0' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {venta.detalles?.map((det: any, idx: number) => (
              <tr key={idx}>
                <td style={{ padding: '4px 0', verticalAlign: 'top' }}>{det.cantidad}</td>
                <td style={{ padding: '4px 0' }}>
                  {det.variante?.producto?.nombre}
                </td>
                <td style={{ padding: '4px 0', textAlign: 'right', verticalAlign: 'top' }}>
                  ${Number(det.subtotal).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ borderTop: '1px dashed #000', paddingTop: '8px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '16px' }}>
          <span>TOTAL:</span>
          <span>${Number(venta.total).toFixed(2)}</span>
        </div>

        {venta.cae && (
          <div style={{ borderTop: '1px dashed #000', paddingTop: '12px', marginTop: '12px', textAlign: 'center' }}>
            <p style={{ margin: '0 0 4px 0', fontSize: '11px', fontWeight: 'bold' }}>Comprobante Autorizado por AFIP</p>
            <p style={{ margin: '0 0 2px 0', fontSize: '10px' }}>CAE: {venta.cae}</p>
            <p style={{ margin: '0 0 8px 0', fontSize: '10px' }}>
              Vto CAE: {venta.vto_cae ? new Date(venta.vto_cae).toLocaleDateString('es-AR') : ''}
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '8px' }}>
              {(() => {
                try {
                  const qrData = {
                    ver: 1,
                    fecha: venta.fecha_venta.split('T')[0],
                    cuit: Number(tenant.cuit.replace(/[^0-9]/g, '')),
                    ptoVta: tenant.afip_punto_venta,
                    tipoCmp: venta.tipo_comprobante === 'FACTURA_A' ? 1 : (venta.tipo_comprobante === 'FACTURA_B' ? 6 : 11),
                    nroCmp: venta.nro_factura,
                    importe: Number(venta.total),
                    moneda: 'PES',
                    ctz: 1,
                    tipoDocRec: 99,
                    nroDocRec: 0,
                    tipoCodAut: 'E',
                    codAut: Number(venta.cae)
                  };
                  const base64Str = btoa(JSON.stringify(qrData));
                  const urlAfip = `https://www.afip.gob.ar/fe/qr/?p=${base64Str}`;
                  return <QRCodeSVG value={urlAfip} size={100} />;
                } catch (e) {
                  return null;
                }
              })()}
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', fontSize: '11px', marginTop: '24px' }}>
          <p style={{ margin: '0 0 4px 0' }}>¡Gracias por su compra!</p>
          <p style={{ margin: '0' }}>Powered by NovarDesk ERP</p>
        </div>
      </div>

      <div className="ticket-actions no-print" style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '12px' }}>
        <button onClick={() => window.print()} className="btn-primary">Imprimir de nuevo</button>
        <button onClick={onClose} className="btn-secondary">Cerrar</button>
      </div>

      <style>{`
        .ticket-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 9999;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
        }
        .ticket-print-area {
          background: white; color: black; width: 300px; padding: 20px;
          font-family: monospace; border-radius: 4px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);
          position: relative;
        }
        @media print {
          body * { visibility: hidden; }
          .ticket-print-area, .ticket-print-area * { visibility: visible; }
          .ticket-print-area { position: absolute; left: 0; top: 0; width: 80mm; padding: 0; box-shadow: none; }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
}
