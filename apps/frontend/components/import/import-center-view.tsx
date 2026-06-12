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
    <div className="p-lg h-full d-flex flex-col gap-lg fade-in">
      <div>
        <h2 className="font-bold text-lg mb-sm">Centro de Importación Masiva</h2>
        <p className="text-muted text-sm">Descargá una plantilla, completala en Excel y subila para importar datos de forma rápida.</p>
      </div>

      <div className="d-flex gap-lg">
        {/* Panel Izquierdo: Controles */}
        <div className="profile-card d-flex flex-col gap-md p-md bg-surface border rounded-md" style={{ width: '350px' }}>
          
          <div className="form-group mb-0">
            <label className="form-label">1. ¿Qué deseas importar?</label>
            <select 
              className="form-input" 
              value={selectedEntity} 
              onChange={(e) => {
                setSelectedEntity(e.target.value as EntityType);
                setParsedData([]);
              }}
            >
              <option value="productos">Catálogo de Productos</option>
              <option value="clientes">Directorio de Clientes</option>
            </select>
          </div>

          <div className="border-t pt-sm">
            <label className="form-label">2. Descargar Plantilla</label>
            <p className="text-muted text-sm mb-sm">Usá nuestro archivo pre-formateado para asegurar que los datos se carguen correctamente.</p>
            <button onClick={downloadTemplate} className="btn-secondary w-full d-flex align-center justify-center gap-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              Descargar {selectedEntity === 'productos' ? 'Productos.xlsx' : 'Clientes.xlsx'}
            </button>
          </div>

          <div className="border-t pt-sm">
            <label className="form-label">3. Subir Archivo</label>
            <input 
              type="file" 
              accept=".xlsx, .xls, .csv" 
              onChange={handleFileUpload}
              className="form-input p-sm"
              style={{ padding: '8px' }}
            />
          </div>

          {parsedData.length > 0 && (
            <div className="border-t pt-sm mt-auto">
               <button 
                onClick={handleConfirm} 
                disabled={hasErrors}
                className="btn-primary w-full"
                style={{ opacity: hasErrors ? 0.5 : 1 }}
              >
                Confirmar Importación ({parsedData.length} filas)
              </button>
              {hasErrors && (
                <p className="text-sm text-center mt-sm" style={{ color: 'hsl(var(--danger))' }}>
                  Hay errores en los datos que deben ser corregidos.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Panel Derecho: Vista Previa */}
        <div className="flex-1 bg-surface border rounded-md p-md d-flex flex-col">
          <h3 className="font-bold mb-md">Vista Previa de Datos</h3>
          
          {parsedData.length === 0 ? (
            <div className="flex-1 d-flex flex-col align-center justify-center text-muted text-center p-xl border" style={{ borderStyle: 'dashed', borderRadius: '8px' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-md"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
              <p>Aún no has subido ningún archivo.</p>
              <p className="text-sm">Subí tu Excel para ver la validación aquí.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              <table className="product-table text-sm">
                <thead>
                  <tr>
                    <th>Fila</th>
                    <th>Identificador</th>
                    <th>Nombre / Razón Social</th>
                    <th>Estado</th>
                    <th>Observaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedData.map((row) => {
                    const idCol = selectedEntity === 'productos' ? row.codigo : row.cuit_dni;
                    const nameCol = selectedEntity === 'productos' ? row.nombre : row.razon_social;
                    const isError = row._errors && row._errors.length > 0;

                    return (
                      <tr key={row._index} style={{ background: isError ? 'rgba(239, 68, 68, 0.05)' : 'transparent' }}>
                        <td className="text-muted">#{row._index}</td>
                        <td className="font-semibold">{idCol || '-'}</td>
                        <td>{nameCol || '-'}</td>
                        <td>
                          {isError ? (
                            <span className="badge" style={{ background: 'hsl(var(--danger))', color: 'white' }}>Error</span>
                          ) : (
                            <span className="badge" style={{ background: 'hsl(var(--success))', color: 'white' }}>Ok</span>
                          )}
                        </td>
                        <td style={{ color: isError ? 'hsl(var(--danger))' : 'inherit' }}>
                          {isError ? row._errors.join(', ') : 'Listo para importar'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
