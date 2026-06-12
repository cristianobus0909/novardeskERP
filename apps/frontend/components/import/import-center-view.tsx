import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { toast } from '../../store/use-toast-store';

type EntityType = 'productos' | 'clientes';

export function ImportCenterView() {
  const [selectedEntity, setSelectedEntity] = useState<EntityType>('productos');
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [hasErrors, setHasErrors] = useState(false);

  // Generar plantilla de descarga
  const downloadTemplate = () => {
    let headers: string[] = [];
    if (selectedEntity === 'productos') {
      headers = ['codigo', 'nombre', 'precio_venta', 'costo', 'stock_actual', 'categoria'];
    } else {
      headers = ['cuit_dni', 'razon_social', 'email', 'telefono', 'direccion', 'condicion_iva'];
    }

    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla');
    XLSX.writeFile(wb, `plantilla_${selectedEntity}.xlsx`);
  };

  // Manejar archivo subido
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      if (!wsname) {
        toast.error('El archivo Excel no tiene hojas.');
        return;
      }
      const ws = wb.Sheets[wsname];
      if (!ws) {
        toast.error('La hoja de cálculo está vacía.');
        setIsValidating(false);
        return;
      }
      const data = XLSX.utils.sheet_to_json(ws);
      validateDataRemotely(data);
    };
    reader.readAsBinaryString(file);
  };

  const validateDataRemotely = async (data: any[]) => {
    try {
      const res = await fetch(`/api/import/validate/${selectedEntity}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Error al validar con el servidor');
      
      const { validatedData, hasErrors } = await res.json();
      setParsedData(validatedData.map((row: any, i: number) => ({ ...row, _index: i + 1 })));
      setHasErrors(hasErrors);
    } catch (err: any) {
      toast.error(err.message || 'Error de validación');
    } finally {
      setIsValidating(false);
    }
  };

  const handleConfirm = async () => {
    if (hasErrors) {
      toast.error('Corrige los errores antes de importar');
      return;
    }
    
    try {
      toast.success('Iniciando importación...');
      const res = await fetch(`/api/import/commit/${selectedEntity}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(parsedData)
      });
      
      if (!res.ok) throw new Error('Error al importar datos');
      
      const result = await res.json();
      toast.success(result.message || 'Importación completada con éxito');
      setParsedData([]); // Limpiar tras el éxito
    } catch (err: any) {
      toast.error(err.message || 'Error durante la importación');
    }
  };

  return (
    <div className="p-lg h-full d-flex flex-col gap-md fade-in">
      <div className="d-flex align-center justify-between border-b pb-md">
        <div>
          <h2 className="font-bold text-lg">Centro de Importación</h2>
          <p className="text-muted text-sm mt-xs">Importa catálogos de productos y clientes desde Excel.</p>
        </div>
        
        <div className="d-flex align-center gap-sm">
          <select 
            className="form-input" 
            value={selectedEntity} 
            onChange={(e) => {
              setSelectedEntity(e.target.value as EntityType);
              setParsedData([]);
            }}
            style={{ width: '200px', margin: 0 }}
          >
            <option value="productos">Catálogo de Productos</option>
            <option value="clientes">Directorio de Clientes</option>
          </select>
          
          <button onClick={downloadTemplate} className="btn-secondary d-flex align-center gap-xs">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Plantilla
          </button>

          <label className="btn-secondary d-flex align-center gap-xs" style={{ cursor: 'pointer', margin: 0, borderStyle: 'dashed', borderColor: 'var(--text-secondary)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
            Subir Excel
            <input 
              type="file" 
              accept=".xlsx, .xls, .csv" 
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      </div>

      <div className="flex-1 bg-surface border rounded-md d-flex flex-col overflow-hidden">
        {isValidating ? (
          <div className="flex-1 d-flex flex-col align-center justify-center text-muted">
            <div className="spinner mb-md" style={{ width: '32px', height: '32px', border: '3px solid var(--border-color)', borderTopColor: 'hsl(var(--primary))', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            <p>Validando datos con el servidor...</p>
          </div>
        ) : parsedData.length === 0 ? (
          <div className="flex-1 d-flex flex-col align-center justify-center text-muted text-center p-xl">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mb-md"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
            <p className="font-semibold text-primary">No hay datos cargados</p>
            <p className="text-sm mt-xs">Seleccioná qué querés importar, descargá la plantilla y subila para visualizar los datos aquí.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <table className="product-table text-sm w-full">
              <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 1 }}>
                <tr>
                  <th style={{ width: '60px', textAlign: 'center' }}>#</th>
                  <th>Identificador</th>
                  <th>Nombre / Razón Social</th>
                  <th style={{ width: '100px' }}>Estado</th>
                  <th>Observaciones</th>
                </tr>
              </thead>
              <tbody>
                {parsedData.map((row) => {
                  const idCol = selectedEntity === 'productos' ? row.codigo : row.cuit_dni;
                  const nameCol = selectedEntity === 'productos' ? row.nombre : row.razon_social;
                  const isError = row._errors && row._errors.length > 0;

                  return (
                    <tr key={row._index} style={{ background: isError ? 'rgba(239, 68, 68, 0.04)' : 'transparent' }}>
                      <td className="text-muted text-center">{row._index}</td>
                      <td className="font-semibold">{idCol || '-'}</td>
                      <td>{nameCol || '-'}</td>
                      <td>
                        {isError ? (
                          <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'hsl(var(--danger))', border: '1px solid rgba(239, 68, 68, 0.2)' }}>Error</span>
                        ) : (
                          <span className="badge" style={{ background: 'rgba(34, 197, 94, 0.1)', color: 'hsl(var(--success))', border: '1px solid rgba(34, 197, 94, 0.2)' }}>Válido</span>
                        )}
                      </td>
                      <td style={{ color: isError ? 'hsl(var(--danger))' : 'var(--text-muted)' }}>
                        {isError ? row._errors.join(' • ') : 'Listo para importar'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {parsedData.length > 0 && (
        <div className="d-flex align-center justify-between border-t pt-md mt-auto">
          <div className="text-sm text-muted d-flex gap-lg">
            <span>Total filas: <strong style={{ color: 'var(--text-primary)' }}>{parsedData.length}</strong></span>
            <span>Errores: <strong style={{ color: hasErrors ? 'hsl(var(--danger))' : 'var(--text-primary)' }}>{parsedData.filter(r => r._errors?.length).length}</strong></span>
          </div>
          <button 
            onClick={handleConfirm} 
            disabled={hasErrors || isValidating}
            className="btn-primary d-flex align-center gap-sm"
            style={{ opacity: hasErrors ? 0.5 : 1 }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
            Confirmar e Importar
          </button>
        </div>
      )}
    </div>
  );
}
