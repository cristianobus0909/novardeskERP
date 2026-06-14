'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../store/use-auth-store';
import { apiRequest } from '../../lib/api-client';
import { toast } from '../../store/use-toast-store';
import { useProveedores, useCreateProveedor } from '../../hooks/use-proveedores';
import * as XLSX from 'xlsx';

export function InventarioView() {
  const { tenant } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'stock' | 'movimientos' | 'auditoria'>('stock');
  
  const [productos, setProductos] = useState<any[]>([]);
  const [depositos, setDepositos] = useState<any[]>([]);
  const [historial, setHistorial] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Listas de Precios para Auditoría
  const [listasPrecios, setListasPrecios] = useState<any[]>([]);
  const [criterioValores, setCriterioValores] = useState<'costo' | 'precio_venta' | 'lista_precio'>('costo');
  const [listaPrecioIdSelected, setListaPrecioIdSelected] = useState<number | null>(null);
  const [preciosMap, setPreciosMap] = useState<Record<number, number>>({});

  // Buscadores
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMovimientoQuery, setSearchMovimientoQuery] = useState('');
  const [searchAuditQuery, setSearchAuditQuery] = useState('');

  // Modales
  const [isMovimientoModalOpen, setIsMovimientoModalOpen] = useState(false);
  const [isProveedorModalOpen, setIsProveedorModalOpen] = useState(false);
  const [activeRemito, setActiveRemito] = useState<any | null>(null);

  // Formulario de Ingreso de Movimiento
  const [movimientoTipo, setMovimientoTipo] = useState<string>('ENTRADA_COMPRA');
  const [movimientoConcepto, setMovimientoConcepto] = useState('');
  const [selectedProveedorId, setSelectedProveedorId] = useState<string>('');
  const [movimientoDestinatario, setMovimientoDestinatario] = useState('');
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [manualSearchQuery, setManualSearchQuery] = useState('');
  const [manualSearchResults, setManualSearchResults] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<any[]>([]); // { variante: any, cantidad: number }[]

  // Proveedores
  const { data: proveedores = [], refetch: refetchProveedores } = useProveedores();
  const createProveedorMut = useCreateProveedor();
  const [newProveedorForm, setNewProveedorForm] = useState({
    razon_social: '',
    cuit: '',
    condicion_iva: 'Responsable Inscripto',
    contacto: '',
    email: ''
  });

  // Conteo Auditoría
  const [auditCounts, setAuditCounts] = useState<Record<number, string>>({}); // { variante_id: cantidad_contada_string }

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prodRes, depRes, histRes, listasRes] = await Promise.all([
        apiRequest('/productos'),
        apiRequest('/inventario/depositos'),
        apiRequest('/inventario/historial'),
        apiRequest('/listas-precio').catch(() => [])
      ]);
      setProductos(prodRes.data || prodRes);
      setDepositos(depRes);
      setHistorial(histRes);
      setListasPrecios(listasRes || []);
    } catch (err: any) {
      toast.error('Error al cargar datos de depósito: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Recargar datos de lista de precios seleccionada
  useEffect(() => {
    if (criterioValores === 'lista_precio' && listaPrecioIdSelected) {
      const fetchListDetails = async () => {
        try {
          const detail = await apiRequest(`/listas-precio/${listaPrecioIdSelected}`);
          const map: Record<number, number> = {};
          if (detail && detail.items) {
            detail.items.forEach((item: any) => {
              map[item.variante_id] = Number(item.precio);
            });
          }
          setPreciosMap(map);
        } catch (e: any) {
          toast.error('Error al cargar lista de precios: ' + e.message);
        }
      };
      fetchListDetails();
    } else {
      setPreciosMap({});
    }
  }, [criterioValores, listaPrecioIdSelected]);

  // Auxiliar para formatear variantes con sus talles/colores
  const formatVariantName = (v: any) => {
    const pName = v.producto?.nombre || '';
    let attrs = '';
    if (v.atributos_extra) {
      try {
        const obj = typeof v.atributos_extra === 'string' ? JSON.parse(v.atributos_extra) : v.atributos_extra;
        const parts = Object.values(obj).filter(Boolean);
        if (parts.length > 0) {
          attrs = ` (${parts.join(' / ')})`;
        }
      } catch (e) {
        // Ignorar
      }
    }
    return `${pName}${attrs}`;
  };

  // Preparar lista plana de todas las variantes disponibles
  const variantesDisponibles = productos.flatMap(p => 
    (p.variantes || []).map((v: any) => ({ ...v, producto: p }))
  );

  // Filtrar variantes para Disponibilidad
  const variantesDisponiblesFiltradas = variantesDisponibles.filter(v => {
    const term = searchQuery.toLowerCase();
    return v.producto?.nombre?.toLowerCase().includes(term) || v.sku?.toLowerCase().includes(term);
  });

  const lowStockCount = variantesDisponibles.filter(v => Number(v.stock_actual) <= Number(v.stock_minimo || 0)).length;
  const totalValueCost = variantesDisponibles.reduce((acc, v) => acc + (Number(v.stock_actual) * Number(v.costo || 0)), 0);
  const totalValueSale = variantesDisponibles.reduce((acc, v) => acc + (Number(v.stock_actual) * Number(v.precio_venta || 0)), 0);

  // Buscar variantes para carga manual en Modal de Movimiento
  useEffect(() => {
    if (manualSearchQuery.trim().length > 1) {
      const term = manualSearchQuery.toLowerCase();
      const filtered = variantesDisponibles.filter(v => 
        v.producto?.nombre?.toLowerCase().includes(term) || v.sku?.toLowerCase().includes(term)
      ).slice(0, 5);
      setManualSearchResults(filtered);
    } else {
      setManualSearchResults([]);
    }
  }, [manualSearchQuery]);

  // Agregar variante manualmente a la lista en el Modal de Movimiento
  const handleAddManualVariant = (v: any) => {
    setSelectedItems(prev => {
      const exists = prev.find(item => item.variante.id === v.id);
      if (exists) {
        return prev.map(item => 
          item.variante.id === v.id 
            ? { ...item, cantidad: item.cantidad + 1 } 
            : item
        );
      }
      return [...prev, { variante: v, cantidad: 1 }];
    });
    setManualSearchQuery('');
    setManualSearchResults([]);
  };

  // Escaneo de código de barras
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannedBarcode.trim()) return;

    const term = scannedBarcode.trim().toLowerCase();
    const match = variantesDisponibles.find(v => 
      v.sku?.toLowerCase() === term || v.codigo_barras?.toLowerCase() === term
    );

    if (match) {
      handleAddManualVariant(match);
      setScannedBarcode('');
      toast.success(`${match.producto?.nombre} agregado.`);
    } else {
      toast.error(`Código '${scannedBarcode}' no encontrado.`);
    }
  };

  // Quitar variante del lote de movimiento
  const handleRemoveItem = (vId: number) => {
    setSelectedItems(prev => prev.filter(item => item.variante.id !== vId));
  };

  // Cambiar cantidad en lote de movimiento
  const handleQtyChange = (vId: number, qtyVal: string) => {
    const qty = parseFloat(qtyVal);
    setSelectedItems(prev => prev.map(item => 
      item.variante.id === vId 
        ? { ...item, cantidad: isNaN(qty) ? 0 : qty } 
        : item
    ));
  };

  // Guardar nuevo proveedor
  const handleCreateProveedor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newProv = await createProveedorMut.mutateAsync(newProveedorForm);
      toast.success('Proveedor creado correctamente');
      setIsProveedorModalOpen(false);
      setNewProveedorForm({
        razon_social: '',
        cuit: '',
        condicion_iva: 'Responsable Inscripto',
        contacto: '',
        email: ''
      });
      await refetchProveedores();
      if (newProv && newProv.id) {
        setSelectedProveedorId(String(newProv.id));
      }
    } catch (err: any) {
      toast.error(err.message || 'Error al crear proveedor');
    }
  };

  // Confirmar Movimiento Lote y Generar Remito
  const handleConfirmMovimiento = async () => {
    if (!depositos.length) {
      toast.error('No hay depósitos registrados.');
      return;
    }
    if (selectedItems.length === 0) {
      toast.error('Ingrese al menos un producto.');
      return;
    }
    if (selectedItems.some(i => i.cantidad <= 0)) {
      toast.error('Todos los productos deben tener cantidades mayores a 0.');
      return;
    }

    let provName = '';
    if (['ENTRADA_COMPRA', 'SALIDA_AJUSTE'].includes(movimientoTipo) && selectedProveedorId) {
      const prov = proveedores.find((p: any) => String(p.id) === selectedProveedorId);
      if (prov) provName = ` - Proveedor: ${prov.razon_social}`;
    }

    const destName = movimientoDestinatario ? ` - Destino/Motivo: ${movimientoDestinatario}` : '';
    const conceptoFinal = `${movimientoConcepto || 'Movimiento manual'}${provName}${destName}`;
    
    // Generar código de remito único
    const pad = (n: number) => String(n).padStart(2, '0');
    const now = new Date();
    const remitoCode = `RMT-${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}-${Math.floor(1000 + Math.random() * 9000)}`;

    const itemsToSend = selectedItems.map(item => ({
      variante_id: item.variante.id,
      cantidad: item.cantidad
    }));

    try {
      setLoading(true);
      await apiRequest('/inventario/movimientos/lote', {
        method: 'POST',
        body: JSON.stringify({
          deposito_id: depositos[0].id,
          tipo: movimientoTipo,
          concepto: conceptoFinal,
          comprobante: remitoCode,
          items: itemsToSend
        })
      });

      // Guardar información del remito para mostrarlo
      setActiveRemito({
        codigo: remitoCode,
        fecha: now,
        tipo: movimientoTipo,
        concepto: conceptoFinal,
        items: selectedItems.map(item => ({
          nombre: formatVariantName(item.variante),
          sku: item.variante.sku,
          cantidad: item.cantidad,
          unidad: item.variante.producto?.unidad_medida || 'unidad'
        }))
      });

      toast.success('Movimientos registrados. Remito generado.');
      setIsMovimientoModalOpen(false);
      setSelectedItems([]);
      setMovimientoConcepto('');
      setMovimientoDestinatario('');
      setSelectedProveedorId('');
      fetchData();
    } catch (err: any) {
      toast.error('Error al registrar movimiento: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- LOGICA DE AUDITORIA ---
  // Importar desde Excel
  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        if (!wsname) {
          toast.error('El archivo Excel no contiene hojas.');
          return;
        }
        const ws = wb.Sheets[wsname];
        if (!ws) {
          toast.error('La hoja de cálculo está vacía o es inválida.');
          return;
        }
        const rawData = XLSX.utils.sheet_to_json(ws) as any[];

        if (!rawData || rawData.length === 0) {
          toast.error('El archivo Excel está vacío.');
          return;
        }

        let matchedCount = 0;
        let ignoredCount = 0;
        const countsMap: Record<string, number> = {};

        rawData.forEach((row: any) => {
          const skuKey = Object.keys(row).find(k => k.toLowerCase() === 'sku' || k.toLowerCase() === 'codigo' || k.toLowerCase() === 'código');
          const cantKey = Object.keys(row).find(k => k.toLowerCase() === 'cantidad' || k.toLowerCase() === 'cant' || k.toLowerCase() === 'count' || k.toLowerCase() === 'qty');
          
          if (skuKey && cantKey) {
            const skuVal = String(row[skuKey]).trim();
            const cantVal = parseFloat(row[cantKey]);
            if (skuVal && !isNaN(cantVal)) {
              countsMap[skuVal] = cantVal;
              matchedCount++;
            } else {
              ignoredCount++;
            }
          } else {
            ignoredCount++;
          }
        });

        setAuditCounts(prev => {
          const updated = { ...prev };
          variantesDisponibles.forEach(v => {
            if (v.sku && countsMap[v.sku] !== undefined) {
              updated[v.id] = String(countsMap[v.sku]);
            }
          });
          return updated;
        });

        toast.success(`Importados ${matchedCount} productos de Excel. (Ignorados/Inválidos: ${ignoredCount})`);
      } catch (err: any) {
        toast.error('Error al procesar archivo Excel: ' + err.message);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = ''; // Reset file input
  };

  // Inicializar conteos
  const handleInitializeAudit = (type: 'sistema' | 'cero' | 'limpiar') => {
    if (type === 'limpiar') {
      setAuditCounts({});
      toast.success('Se limpiaron todos los conteos de la auditoría.');
      return;
    }

    const updated: Record<number, string> = {};
    variantesDisponibles.forEach(v => {
      updated[v.id] = type === 'sistema' ? String(v.stock_actual) : '0';
    });
    setAuditCounts(updated);
    toast.success(`Planilla inicializada con stock ${type === 'sistema' ? 'de sistema' : 'en cero'}.`);
  };

  // Resolver precio unitario según el criterio de valoración seleccionado
  const resolvePriceUnit = (v: any): number => {
    if (criterioValores === 'costo') {
      return Number(v.costo || 0);
    } else if (criterioValores === 'precio_venta') {
      return Number(v.precio_venta || 0);
    } else if (criterioValores === 'lista_precio') {
      const customPrice = preciosMap[v.id];
      return customPrice !== undefined ? customPrice : Number(v.precio_venta || 0);
    }
    return 0;
  };

  // Calcular totales de auditoría
  const auditItemsCalculated = variantesDisponibles.map(v => {
    const countedStr = auditCounts[v.id];
    const isCounted = countedStr !== undefined && countedStr !== '';
    const counted = isCounted ? parseFloat(countedStr) : null;
    const system = Number(v.stock_actual);
    const diff = counted !== null ? counted - system : 0;
    const priceUnit = resolvePriceUnit(v);
    const valuationDiff = diff * priceUnit;

    return {
      variante: v,
      system,
      counted,
      isCounted,
      diff,
      priceUnit,
      valuationDiff
    };
  });

  const countedItems = auditItemsCalculated.filter(item => item.isCounted);
  const totalAuditDiffUnits = countedItems.reduce((acc, item) => acc + item.diff, 0);
  const totalAuditValuation = countedItems.reduce((acc, item) => acc + item.valuationDiff, 0);

  // Confirmar y aplicar auditoría (Ajuste en lote)
  const handleConfirmAuditoria = async () => {
    const differences = auditItemsCalculated.filter(item => item.isCounted && item.diff !== 0);

    if (differences.length === 0) {
      toast.error('No hay discrepancias o no se ha cargado ningún conteo físico para ajustar.');
      return;
    }

    if (!depositos.length) {
      toast.error('No hay depósitos registrados.');
      return;
    }

    // Dividimos los movimientos en Entradas (diff > 0) y Salidas (diff < 0)
    const entradas = differences.filter(d => d.diff > 0);
    const salidas = differences.filter(d => d.diff < 0);

    try {
      setLoading(true);

      // Si hay entradas que hacer
      if (entradas.length > 0) {
        await apiRequest('/inventario/movimientos/lote', {
          method: 'POST',
          body: JSON.stringify({
            deposito_id: depositos[0].id,
            tipo: 'ENTRADA_AJUSTE',
            concepto: 'Ajuste de Stock por Auditoría Física (Ingreso)',
            items: entradas.map(e => ({
              variante_id: e.variante.id,
              cantidad: e.diff // es positivo
            }))
          })
        });
      }

      // Si hay salidas que hacer
      if (salidas.length > 0) {
        await apiRequest('/inventario/movimientos/lote', {
          method: 'POST',
          body: JSON.stringify({
            deposito_id: depositos[0].id,
            tipo: 'SALIDA_AJUSTE',
            concepto: 'Ajuste de Stock por Auditoría Física (Faltante)',
            items: salidas.map(s => ({
              variante_id: s.variante.id,
              cantidad: Math.abs(s.diff) // pasamos la cantidad positiva para restar
            }))
          })
        });
      }

      toast.success('Auditoría aplicada con éxito. Stock del sistema actualizado.');
      setAuditCounts({});
      fetchData();
    } catch (err: any) {
      toast.error('Error al aplicar ajustes de auditoría: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-lg animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* TABS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { id: 'stock', label: 'Disponibilidad' },
            { id: 'movimientos', label: 'Entradas y Salidas' },
            { id: 'auditoria', label: 'Auditoría de Stock' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: '10px 20px',
                background: activeTab === tab.id ? 'var(--bg-secondary)' : 'transparent',
                color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-muted)',
                border: 'none',
                borderRadius: '8px',
                fontWeight: activeTab === tab.id ? 600 : 500,
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'all 0.2s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'movimientos' && (
          <button 
            className="btn-primary" 
            style={{ width: 'auto', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}
            onClick={() => {
              setIsMovimientoModalOpen(true);
              // Enfocar input de código de barras al abrir
              setTimeout(() => barcodeInputRef.current?.focus(), 150);
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="M12 5v14"></path></svg>
            Ingresar Movimiento
          </button>
        )}
      </div>

      {/* TABS CONTENT */}
      {activeTab === 'stock' && (
        <>
          <section className="stats-grid">
            <div className="stat-card">
              <span className="stat-label">Total Variantes</span>
              <span className="stat-value primary">{variantesDisponibles.length}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Stock Bajo o Agotado</span>
              <span className="stat-value warning">{lowStockCount}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Valorización (Costo)</span>
              <span className="stat-value success">
                ${totalValueCost.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Valorización (Venta Estándar)</span>
              <span className="stat-value info" style={{ color: 'hsl(var(--primary))' }}>
                ${totalValueSale.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </section>

          <section className="catalog-section">
            <div className="catalog-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
              <input
                type="text"
                placeholder="Buscar por nombre de producto o SKU..."
                className="form-input search-box"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="product-table-wrapper">
              <table className="product-table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>SKU</th>
                    <th>Unidad</th>
                    <th>Costo Unitario</th>
                    <th>Precio Venta</th>
                    <th>Stock Actual</th>
                    <th>Stock Mínimo</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {variantesDisponiblesFiltradas.map(v => {
                    const isLowStock = Number(v.stock_actual) <= Number(v.stock_minimo || 0);
                    return (
                      <tr key={v.id}>
                        <td className="font-bold">{formatVariantName(v)}</td>
                        <td className="text-muted">{v.sku}</td>
                        <td style={{ textTransform: 'capitalize' }}>{v.producto?.unidad_medida}</td>
                        <td>${Number(v.costo || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                        <td>${Number(v.precio_venta || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                        <td className="font-bold" style={{ fontSize: '15px' }}>{Number(v.stock_actual).toLocaleString('es-AR', { maximumFractionDigits: 3 })}</td>
                        <td className="text-muted">{Number(v.stock_minimo || 0).toLocaleString('es-AR', { maximumFractionDigits: 3 })}</td>
                        <td>
                          {isLowStock ? (
                            <span style={{ 
                              background: 'rgba(255, 71, 87, 0.1)', 
                              color: 'var(--danger)', 
                              padding: '4px 8px', 
                              borderRadius: '4px', 
                              fontSize: '12px', 
                              fontWeight: 'bold' 
                            }}>
                              BAJO STOCK
                            </span>
                          ) : (
                            <span style={{ 
                              background: 'rgba(46, 213, 115, 0.1)', 
                              color: 'var(--success)', 
                              padding: '4px 8px', 
                              borderRadius: '4px', 
                              fontSize: '12px', 
                              fontWeight: 'bold' 
                            }}>
                              OK
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {variantesDisponiblesFiltradas.length === 0 && (
                    <tr><td colSpan={8} className="text-center text-muted p-lg">No hay productos en el inventario</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {activeTab === 'movimientos' && (
        <section className="catalog-section">
          <div className="catalog-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h2 className="font-bold" style={{ fontSize: '18px' }}>Historial de Movimientos de Depósito</h2>
              <p className="text-muted" style={{ fontSize: '13px', marginTop: '4px' }}>Audita las entradas, salidas y remitos registrados en las existencias.</p>
            </div>
            <input
              type="text"
              placeholder="Buscar movimiento o SKU..."
              className="form-input search-box"
              value={searchMovimientoQuery}
              onChange={(e) => setSearchMovimientoQuery(e.target.value)}
            />
          </div>

          <div className="product-table-wrapper">
            <table className="product-table">
              <thead>
                <tr>
                  <th>Fecha y Hora</th>
                  <th>Remito / Comprobante</th>
                  <th>Producto</th>
                  <th>Tipo</th>
                  <th>Concepto / Motivo</th>
                  <th>Cantidad</th>
                  <th>Usuario</th>
                </tr>
              </thead>
              <tbody>
                {historial
                  .filter(h => {
                    const term = searchMovimientoQuery.toLowerCase();
                    return (
                      h.comprobante?.toLowerCase().includes(term) ||
                      h.variante?.sku?.toLowerCase().includes(term) ||
                      h.variante?.producto?.nombre?.toLowerCase().includes(term) ||
                      h.concepto?.toLowerCase().includes(term)
                    );
                  })
                  .map(h => {
                    const isPositive = ['ENTRADA_COMPRA', 'ENTRADA_AJUSTE'].includes(h.tipo);
                    return (
                      <tr key={h.id}>
                        <td className="text-muted">{new Date(h.fecha).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}</td>
                        <td className="font-bold" style={{ color: 'var(--primary)', cursor: 'pointer' }} onClick={() => {
                          // Cargar remito desde el historial para reimpresión/visualización
                          const itemsDelRemito = historial
                            .filter(x => x.comprobante === h.comprobante)
                            .map(x => ({
                              nombre: formatVariantName(x.variante),
                              sku: x.variante?.sku,
                              cantidad: Number(x.cantidad),
                              unidad: x.variante?.producto?.unidad_medida || 'unidad'
                            }));
                          
                          // Eliminar duplicados si los hay
                          const uniqueItems = Array.from(new Map(itemsDelRemito.map(item => [item.sku, item])).values());

                          setActiveRemito({
                            codigo: h.comprobante,
                            fecha: new Date(h.fecha),
                            tipo: h.tipo,
                            concepto: h.concepto,
                            items: uniqueItems
                          });
                        }}>
                          {h.comprobante || 'S/N'}
                        </td>
                        <td className="font-bold">
                          {formatVariantName(h.variante)} <span className="text-muted text-sm" style={{ display: 'block', fontSize: '11px' }}>({h.variante?.sku})</span>
                        </td>
                        <td>
                          <span style={{ 
                            background: isPositive ? 'rgba(46, 213, 115, 0.1)' : 'rgba(255, 71, 87, 0.1)',
                            color: isPositive ? 'var(--success)' : 'var(--danger)',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 'bold'
                          }}>
                            {h.tipo.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="text-muted" style={{ maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {h.concepto || '-'}
                        </td>
                        <td className="font-bold" style={{ color: isPositive ? 'var(--success)' : 'var(--danger)', fontSize: '15px' }}>
                          {isPositive ? '+' : '-'}{Number(h.cantidad).toLocaleString('es-AR', { maximumFractionDigits: 3 })}
                        </td>
                        <td className="text-muted">{h.usuario?.nombre || 'Sistema'}</td>
                      </tr>
                    );
                  })}
                {historial.length === 0 && (
                  <tr><td colSpan={7} className="text-center text-muted p-lg">No hay movimientos registrados</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === 'auditoria' && (() => {
        const isPremiumOrFull = tenant && ['PREMIUM', 'FULL'].includes(tenant.plan_tier || '');
        if (!isPremiumOrFull) {
          return (
            <div className="auth-card scale-up text-center" style={{ padding: '48px 24px', background: 'var(--bg-secondary)', borderRadius: '16px', border: '1px solid var(--border-color)', maxWidth: '640px', margin: '40px auto' }}>
              <div className="align-center justify-center" style={{ display: 'inline-flex', width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(var(--primary-rgb), 0.1)', color: 'hsl(var(--primary))', marginBottom: '24px' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              </div>
              <h2 className="font-extrabold" style={{ fontSize: '22px', marginBottom: '12px' }}>
                Auditoría de Stock (Plan Premium)
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '15px', lineHeight: '1.6', marginBottom: '28px' }}>
                Realizá recuentos físicos de existencias, importá conteos masivamente con planillas Excel, visualizá discrepancias y valorá las diferencias monetarias de forma automática.
              </p>
              
              <div style={{ background: 'var(--bg-primary)', padding: '16px 20px', borderRadius: '12px', border: '1px solid var(--border-color)', textAlign: 'left', marginBottom: '32px' }}>
                <h4 className="font-bold" style={{ fontSize: '13px', margin: '0 0 12px 0', textTransform: 'uppercase', color: 'hsl(var(--primary))', letterSpacing: '0.05em' }}>Beneficios del módulo</h4>
                <ul className="flex-col gap-sm" style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex' }}>
                  <li className="d-flex align-center gap-sm" style={{ fontSize: '13px' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    <span><strong>Importación desde Excel:</strong> Cargá planillas .xlsx en un segundo.</span>
                  </li>
                  <li className="d-flex align-center gap-sm" style={{ fontSize: '13px' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    <span><strong>Valoración Multicriterio:</strong> Compará pérdidas y ganancias por Costo o Precios.</span>
                  </li>
                  <li className="d-flex align-center gap-sm" style={{ fontSize: '13px' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    <span><strong>Ajustes Automáticos:</strong> Sincronizá el stock de sistema con un solo clic.</span>
                  </li>
                </ul>
              </div>

              <div style={{ color: 'var(--text-secondary)', fontSize: '14px', fontStyle: 'italic' }}>
                Para acceder, por favor dirígete a la sección de <strong>"Mi Suscripción"</strong> en el menú lateral y mejora tu plan.
              </div>
            </div>
          );
        }

        return (
          <section className="catalog-section" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="catalog-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h2 className="font-bold" style={{ fontSize: '18px' }}>Auditoría y Recuento Físico de Stock</h2>
                <p className="text-muted" style={{ fontSize: '13px', marginTop: '4px' }}>Realice el recuento físico de productos y el sistema calculará las diferencias valoradas.</p>
              </div>
              
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <div className="form-group" style={{ margin: 0, minWidth: '200px' }}>
                  <label className="form-label" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Criterio de Valoración</label>
                  <select 
                    className="form-input" 
                    value={criterioValores} 
                    onChange={e => {
                      setCriterioValores(e.target.value as any);
                      if (e.target.value !== 'lista_precio') setListaPrecioIdSelected(null);
                    }}
                    style={{ padding: '8px 12px' }}
                  >
                    <option value="costo">Costo del Producto</option>
                    <option value="precio_venta">Precio de Venta Estándar</option>
                    {listasPrecios.map(lp => (
                      <option key={lp.id} value={`lista_precio_${lp.id}`}>Lista: {lp.nombre}</option>
                    ))}
                  </select>
                </div>

                {criterioValores.startsWith('lista_precio_') && (
                  <div style={{ display: 'none' }}>
                    {(() => {
                      const id = parseInt(criterioValores.replace('lista_precio_', ''));
                      if (listaPrecioIdSelected !== id) {
                        setListaPrecioIdSelected(id);
                        setCriterioValores('lista_precio');
                      }
                      return null;
                    })()}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                  <label htmlFor="excel-upload-audit" className="btn-secondary" style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0 }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                    Importar Excel
                  </label>
                  <input 
                    type="file" 
                    id="excel-upload-audit" 
                    accept=".xlsx,.xls,.csv" 
                    onChange={handleExcelImport} 
                    style={{ display: 'none' }} 
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px' }}>
              <button 
                className="btn-secondary" 
                style={{ fontSize: '13px', padding: '6px 12px', width: 'auto' }}
                onClick={() => handleInitializeAudit('sistema')}
              >
                Iniciar con Stock del Sistema
              </button>
              <button 
                className="btn-secondary" 
                style={{ fontSize: '13px', padding: '6px 12px', width: 'auto' }}
                onClick={() => handleInitializeAudit('cero')}
              >
                Iniciar todo en Cero (0)
              </button>
              <button 
                className="btn-secondary" 
                style={{ fontSize: '13px', padding: '6px 12px', width: 'auto', color: 'var(--danger)' }}
                onClick={() => handleInitializeAudit('limpiar')}
              >
                Limpiar conteos
              </button>
              
              <div style={{ flex: 1 }}></div>

              <input 
                type="text" 
                placeholder="Filtrar por nombre o SKU..." 
                className="form-input" 
                value={searchAuditQuery} 
                onChange={e => setSearchAuditQuery(e.target.value)}
                style={{ maxWidth: '250px', padding: '6px 12px', fontSize: '13px' }}
              />
            </div>

            <div className="product-table-wrapper" style={{ maxHeight: '450px', overflowY: 'auto' }}>
              <table className="product-table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>SKU</th>
                    <th style={{ width: '130px', textAlign: 'center' }}>Stock Sistema</th>
                    <th style={{ width: '150px', textAlign: 'center' }}>Físico Contado</th>
                    <th style={{ width: '130px', textAlign: 'center' }}>Diferencia</th>
                    <th style={{ width: '140px', textAlign: 'right' }}>Precio Val. ({criterioValores === 'costo' ? 'Costo' : criterioValores === 'precio_venta' ? 'Venta Est.' : 'Lista Sel.'})</th>
                    <th style={{ width: '150px', textAlign: 'right' }}>Val. Diferencia</th>
                  </tr>
                </thead>
                <tbody>
                  {auditItemsCalculated
                    .filter(item => {
                      const term = searchAuditQuery.toLowerCase();
                      return (
                        item.variante.sku?.toLowerCase().includes(term) ||
                        item.variante.producto?.nombre?.toLowerCase().includes(term)
                      );
                    })
                    .map(item => {
                      const diffVal = item.diff;
                      const isDiffNegative = diffVal < 0;
                      const isDiffPositive = diffVal > 0;
                      
                      return (
                        <tr key={item.variante.id} style={{ background: item.isCounted ? 'rgba(var(--primary-rgb), 0.02)' : undefined }}>
                          <td className="font-bold">{formatVariantName(item.variante)}</td>
                          <td className="text-muted">{item.variante.sku}</td>
                          <td className="text-center font-bold">{Number(item.system).toLocaleString('es-AR', { maximumFractionDigits: 3 })}</td>
                          <td>
                            <input 
                              type="number"
                              step="0.001"
                              placeholder="Sin contar"
                              className="form-input"
                              value={auditCounts[item.variante.id] ?? ''}
                              onChange={e => setAuditCounts(prev => ({
                                ...prev,
                                [item.variante.id]: e.target.value
                              }))}
                              style={{ 
                                padding: '6px 10px', 
                                fontSize: '13px', 
                                textAlign: 'center',
                                borderColor: item.isCounted ? 'hsl(var(--primary))' : undefined,
                                background: item.isCounted ? 'transparent' : 'rgba(var(--primary-rgb), 0.01)'
                              }}
                            />
                          </td>
                          <td className="text-center font-bold" style={{ 
                            color: isDiffPositive ? 'var(--success)' : isDiffNegative ? 'var(--danger)' : 'var(--text-muted)'
                          }}>
                            {item.isCounted ? (
                              <>
                                {diffVal > 0 ? '+' : ''}
                                {diffVal.toLocaleString('es-AR', { maximumFractionDigits: 3 })}
                              </>
                            ) : '-'}
                          </td>
                          <td className="text-right">
                            ${item.priceUnit.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="text-right font-bold" style={{ 
                            color: isDiffPositive ? 'var(--success)' : isDiffNegative ? 'var(--danger)' : 'var(--text-muted)'
                          }}>
                            {item.isCounted ? (
                              <>
                                {item.valuationDiff > 0 ? '+' : ''}
                                ${item.valuationDiff.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                              </>
                            ) : '-'}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '24px' }}>
                <div>
                  <span className="text-muted" style={{ fontSize: '12px', display: 'block' }}>Productos Contados</span>
                  <span className="font-extrabold" style={{ fontSize: '18px' }}>
                    {countedItems.length} de {variantesDisponibles.length}
                  </span>
                </div>
                <div>
                  <span className="text-muted" style={{ fontSize: '12px', display: 'block' }}>Diferencia en Unidades</span>
                  <span className={`font-extrabold`} style={{ fontSize: '18px', color: totalAuditDiffUnits > 0 ? 'var(--success)' : totalAuditDiffUnits < 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                    {totalAuditDiffUnits > 0 ? '+' : ''}{totalAuditDiffUnits.toLocaleString('es-AR', { maximumFractionDigits: 3 })}
                  </span>
                </div>
                <div>
                  <span className="text-muted" style={{ fontSize: '12px', display: 'block' }}>Valorización Neta</span>
                  <span className={`font-extrabold`} style={{ fontSize: '18px', color: totalAuditValuation > 0 ? 'var(--success)' : totalAuditValuation < 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                    {totalAuditValuation > 0 ? '+' : ''}${totalAuditValuation.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <button 
                className="btn-primary" 
                style={{ width: 'auto', padding: '12px 28px' }}
                disabled={loading || countedItems.length === 0}
                onClick={handleConfirmAuditoria}
              >
                {loading ? 'Aplicando Ajustes...' : 'Confirmar Auditoría y Ajustar Stock'}
              </button>
            </div>
          </section>
        );
      })()}

      {/* MODAL INGRESO MOVIMIENTO */}
      {isMovimientoModalOpen && (
        <div className="modal-overlay" onClick={() => setIsMovimientoModalOpen(false)}>
          <div className="modal-content scale-up" style={{ maxWidth: '750px', padding: '28px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            
            {/* Header */}
            <div className="d-flex justify-between align-center" style={{ marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <h2 className="font-extrabold m-0" style={{ fontSize: '20px' }}>Ingresar Movimiento de Stock</h2>
              <button onClick={() => setIsMovimientoModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '24px' }}>×</button>
            </div>

            <div className="overflow-y-auto" style={{ flex: 1, paddingRight: '4px' }}>
              {/* Form Configuración del Movimiento */}
              <div className="gap-md" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', marginBottom: '20px' }}>
                
                <div className="form-group">
                  <label className="form-label">Tipo de Movimiento</label>
                  <select 
                    className="form-input"
                    value={movimientoTipo}
                    onChange={e => {
                      setMovimientoTipo(e.target.value);
                      if (e.target.value !== 'ENTRADA_COMPRA') setSelectedProveedorId('');
                    }}
                  >
                    <option value="ENTRADA_COMPRA">Entrada por Compra (+)</option>
                    <option value="ENTRADA_AJUSTE">Entrada por Ajuste (+)</option>
                    <option value="SALIDA_AJUSTE">Salida por Ajuste / Merma (-)</option>
                    <option value="TRASLADO">Salida por Traslado a Sucursal (-)</option>
                    <option value="REMITO_ENTREGA">Salida por Devolución / Otro (-)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Concepto / Motivo</label>
                  <input 
                    type="text" 
                    placeholder="Ej: Recepción mercadería otoño" 
                    className="form-input" 
                    value={movimientoConcepto} 
                    onChange={e => setMovimientoConcepto(e.target.value)} 
                  />
                </div>

                {/* Proveedor selector - visible para compras */}
                {movimientoTipo === 'ENTRADA_COMPRA' && (
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Proveedor</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <select 
                        className="form-input" 
                        value={selectedProveedorId} 
                        onChange={e => setSelectedProveedorId(e.target.value)}
                        style={{ flex: 1 }}
                      >
                        <option value="">-- Seleccionar Proveedor --</option>
                        {proveedores.map((p: any) => (
                          <option key={p.id} value={p.id}>{p.razon_social} (CUIT: {p.cuit})</option>
                        ))}
                      </select>
                      <button 
                        type="button" 
                        className="btn-secondary" 
                        style={{ width: '40px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 'bold' }}
                        onClick={() => setIsProveedorModalOpen(true)}
                        title="Crear nuevo proveedor"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}

                {/* Traslado o Destinatario */}
                {['TRASLADO', 'REMITO_ENTREGA'].includes(movimientoTipo) && (
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Destinatario / Sucursal de Destino</label>
                    <input 
                      type="text" 
                      placeholder="Ej: Sucursal Belgrano, Devolución fallas, Donación..." 
                      className="form-input" 
                      value={movimientoDestinatario} 
                      onChange={e => setMovimientoDestinatario(e.target.value)} 
                    />
                  </div>
                )}
              </div>

              {/* Búsqueda y Carga de Productos */}
              <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '16px', marginBottom: '20px', background: 'rgba(var(--primary-rgb), 0.01)' }}>
                <h3 className="font-bold" style={{ fontSize: '14px', marginBottom: '12px', color: 'hsl(var(--primary))' }}>Carga de Productos</h3>
                
                <div className="gap-md" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                  
                  {/* Barcode Form */}
                  <form onSubmit={handleBarcodeSubmit} className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '12px' }}>Escanear por Código de Barras / SKU</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input 
                        type="text" 
                        ref={barcodeInputRef}
                        placeholder="Escanear y presionar Enter..." 
                        className="form-input"
                        value={scannedBarcode}
                        onChange={e => setScannedBarcode(e.target.value)}
                      />
                      <button type="submit" className="btn-secondary" style={{ width: 'auto', padding: '0 16px' }}>Agregar</button>
                    </div>
                  </form>

                  {/* Manual search */}
                  <div className="form-group" style={{ margin: 0, position: 'relative' }}>
                    <label className="form-label" style={{ fontSize: '12px' }}>Buscar por Nombre del Producto</label>
                    <input 
                      type="text" 
                      placeholder="Escriba para buscar..." 
                      className="form-input" 
                      value={manualSearchQuery}
                      onChange={e => setManualSearchQuery(e.target.value)}
                    />

                    {manualSearchResults.length > 0 && (
                      <div style={{ 
                        position: 'absolute', 
                        top: '100%', 
                        left: 0, 
                        right: 0, 
                        background: 'var(--bg-secondary)', 
                        border: '1px solid var(--border-color)', 
                        borderRadius: '6px', 
                        zIndex: 150, 
                        boxShadow: 'var(--shadow-md)',
                        maxHeight: '200px',
                        overflowY: 'auto'
                      }}>
                        {manualSearchResults.map(v => (
                          <div 
                            key={v.id} 
                            style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border-color)', fontSize: '13px' }}
                            className="nav-item"
                            onClick={() => handleAddManualVariant(v)}
                          >
                            <span className="font-bold" style={{ display: 'block' }}>{formatVariantName(v)}</span>
                            <span className="text-muted" style={{ fontSize: '11px' }}>SKU: {v.sku} - Stock: {v.stock_actual}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Detalle de Productos a mover */}
              <h3 className="font-bold" style={{ fontSize: '15px', marginBottom: '8px' }}>Productos Seleccionados ({selectedItems.length})</h3>
              
              <div className="product-table-wrapper" style={{ maxHeight: '250px' }}>
                <table className="product-table">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th style={{ width: '120px' }}>SKU</th>
                      <th style={{ width: '100px', textAlign: 'center' }}>Stock Act.</th>
                      <th style={{ width: '120px', textAlign: 'center' }}>Cantidad</th>
                      <th style={{ width: '50px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedItems.map(item => (
                      <tr key={item.variante.id}>
                        <td className="font-bold">{formatVariantName(item.variante)}</td>
                        <td className="text-muted">{item.variante.sku}</td>
                        <td className="text-center">{Number(item.variante.stock_actual).toLocaleString('es-AR', { maximumFractionDigits: 3 })}</td>
                        <td>
                          <input 
                            type="number" 
                            step="0.001" 
                            min="0.001" 
                            className="form-input" 
                            value={item.cantidad} 
                            onChange={e => handleQtyChange(item.variante.id, e.target.value)}
                            style={{ padding: '4px 8px', textAlign: 'center', fontSize: '13px' }}
                          />
                        </td>
                        <td>
                          <button 
                            type="button" 
                            style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '18px', cursor: 'pointer', padding: 0 }}
                            onClick={() => handleRemoveItem(item.variante.id)}
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                    {selectedItems.length === 0 && (
                      <tr><td colSpan={5} className="text-center text-muted p-lg">No hay productos cargados en el lote</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer */}
            <div className="d-flex justify-between align-center" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '20px' }}>
              <span className="text-muted" style={{ fontSize: '13px' }}>
                Total de items en lote: <strong>{selectedItems.reduce((acc, i) => acc + i.cantidad, 0)}</strong>
              </span>
              <div className="d-flex gap-md">
                <button type="button" className="btn-secondary" style={{ width: 'auto' }} onClick={() => setIsMovimientoModalOpen(false)}>Cancelar</button>
                <button 
                  type="button" 
                  className="btn-primary" 
                  style={{ width: 'auto' }} 
                  disabled={loading || selectedItems.length === 0} 
                  onClick={handleConfirmMovimiento}
                >
                  {loading ? 'Procesando...' : 'Confirmar y Generar Remito'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* SUB-MODAL PROVEEDOR IN-LINE */}
      {isProveedorModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 200 }} onClick={() => setIsProveedorModalOpen(false)}>
          <div className="modal-content scale-up" style={{ maxWidth: '440px', padding: '24px' }} onClick={e => e.stopPropagation()}>
            <div className="d-flex justify-between align-center" style={{ marginBottom: '16px' }}>
              <h3 className="font-extrabold m-0" style={{ fontSize: '16px' }}>Registrar Nuevo Proveedor</h3>
              <button onClick={() => setIsProveedorModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '20px' }}>×</button>
            </div>
            
            <form className="d-flex flex-col gap-md" onSubmit={handleCreateProveedor}>
              <div className="form-group">
                <label className="form-label">Razón Social</label>
                <input 
                  className="form-input" 
                  type="text" 
                  placeholder="Nombre de la empresa" 
                  value={newProveedorForm.razon_social} 
                  onChange={e => setNewProveedorForm({...newProveedorForm, razon_social: e.target.value})} 
                  required 
                />
              </div>
              <div className="gap-md" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                <div className="form-group">
                  <label className="form-label">CUIT</label>
                  <input 
                    className="form-input" 
                    type="text" 
                    placeholder="30-12345678-9" 
                    value={newProveedorForm.cuit} 
                    onChange={e => setNewProveedorForm({...newProveedorForm, cuit: e.target.value})} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Condición IVA</label>
                  <select 
                    className="form-input" 
                    value={newProveedorForm.condicion_iva} 
                    onChange={e => setNewProveedorForm({...newProveedorForm, condicion_iva: e.target.value})}
                  >
                    <option value="Responsable Inscripto">Responsable Inscripto</option>
                    <option value="Monotributista">Monotributista</option>
                    <option value="Exento">Exento</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Contacto / Teléfono</label>
                <input 
                  className="form-input" 
                  type="text" 
                  placeholder="Contacto comercial" 
                  value={newProveedorForm.contacto} 
                  onChange={e => setNewProveedorForm({...newProveedorForm, contacto: e.target.value})} 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input 
                  className="form-input" 
                  type="email" 
                  placeholder="proveedor@empresa.com" 
                  value={newProveedorForm.email} 
                  onChange={e => setNewProveedorForm({...newProveedorForm, email: e.target.value})} 
                />
              </div>
              <button type="submit" className="btn-primary" disabled={createProveedorMut.isPending}>
                {createProveedorMut.isPending ? 'Guardando...' : 'Guardar Proveedor'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* OVERLAY / MODAL REMITO IMPRIMIBLE */}
      {activeRemito && (
        <div className="modal-overlay" style={{ zIndex: 300, background: 'rgba(0, 0, 0, 0.7)' }} onClick={() => setActiveRemito(null)}>
          <div className="modal-content scale-up" style={{ maxWidth: '800px', background: 'var(--bg-primary)', padding: '0', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            
            {/* Cabecera del visualizador */}
            <div className="d-flex justify-between align-center p-md hide-on-print" style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
              <span className="font-bold">Visualización de Remito Comercial</span>
              <div className="d-flex gap-md">
                <button 
                  onClick={() => window.print()} 
                  className="btn-primary" 
                  style={{ width: 'auto', padding: '6px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                  Imprimir Remito
                </button>
                <button 
                  onClick={() => setActiveRemito(null)} 
                  className="btn-secondary" 
                  style={{ width: 'auto', padding: '6px 16px' }}
                >
                  Cerrar
                </button>
              </div>
            </div>

            {/* Hoja de Remito */}
            <div id="print-remito" style={{ padding: '40px', background: '#ffffff', color: '#1a1a1a', fontFamily: 'Courier New, monospace', minHeight: '600px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              
              {/* Encabezado */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px double #1a1a1a', paddingBottom: '20px', marginBottom: '20px' }}>
                  <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 4px 0', letterSpacing: '0.05em' }}>{tenant?.razon_social || 'NOVA RETAIL S.A.'}</h1>
                    <p style={{ margin: '2px 0', fontSize: '12px' }}>Administración Central y Depósito</p>
                    <p style={{ margin: '2px 0', fontSize: '12px' }}>Email: contacto@novardesk.com</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-block', border: '1px solid #1a1a1a', padding: '5px 15px', textAlign: 'center', fontWeight: 'bold', marginBottom: '8px', fontSize: '20px' }}>X</div>
                    <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 4px 0' }}>REMITO</h2>
                    <p style={{ margin: '2px 0', fontSize: '13px', fontWeight: 'bold' }}>N° {activeRemito.codigo}</p>
                    <p style={{ margin: '2px 0', fontSize: '11px' }}>Fecha: {new Date(activeRemito.fecha).toLocaleDateString('es-AR')} - {new Date(activeRemito.fecha).toLocaleTimeString('es-AR', {hour: '2-digit', minute:'2-digit'})}</p>
                  </div>
                </div>

                {/* Detalle Origen / Destino */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', border: '1px solid #1a1a1a', padding: '15px', marginBottom: '20px', fontSize: '12px' }}>
                  <div>
                    <strong style={{ display: 'block', marginBottom: '6px', borderBottom: '1px solid #1a1a1a' }}>ORIGEN / EMISOR:</strong>
                    <strong>{tenant?.razon_social}</strong><br />
                    CUIT: {tenant?.cuit || '30-99999999-9'}<br />
                    IVA: Responsable Inscripto<br />
                    Depósito Central NovarDesk
                  </div>
                  <div>
                    <strong style={{ display: 'block', marginBottom: '6px', borderBottom: '1px solid #1a1a1a' }}>DETALLES DEL MOVIMIENTO:</strong>
                    <strong>Tipo:</strong> {activeRemito.tipo.replace('_', ' ')}<br />
                    <strong>Concepto:</strong> {activeRemito.concepto}<br />
                  </div>
                </div>

                {/* Tabla de Productos */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '30px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #1a1a1a' }}>
                      <th style={{ textAlign: 'left', padding: '8px 4px' }}>Item</th>
                      <th style={{ textAlign: 'left', padding: '8px 4px' }}>Descripción del Producto</th>
                      <th style={{ textAlign: 'left', padding: '8px 4px' }}>SKU</th>
                      <th style={{ textAlign: 'right', padding: '8px 4px', width: '100px' }}>Cantidad</th>
                      <th style={{ textAlign: 'left', padding: '8px 4px', width: '80px', paddingLeft: '12px' }}>Unidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeRemito.items.map((item: any, idx: number) => (
                      <tr key={idx} style={{ borderBottom: '1px dashed #cccccc' }}>
                        <td style={{ padding: '8px 4px' }}>{idx + 1}</td>
                        <td style={{ padding: '8px 4px', fontWeight: 'bold' }}>{item.nombre}</td>
                        <td style={{ padding: '8px 4px' }}>{item.sku}</td>
                        <td style={{ padding: '8px 4px', textAlign: 'right', fontWeight: 'bold' }}>{Number(item.cantidad).toLocaleString('es-AR', { maximumFractionDigits: 3 })}</td>
                        <td style={{ padding: '8px 4px', paddingLeft: '12px', textTransform: 'capitalize' }}>{item.unidad}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Firmas al pie */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '60px', paddingTop: '20px', fontSize: '11px' }}>
                <div style={{ textAlign: 'center', width: '40%' }}>
                  <div style={{ borderTop: '1px solid #1a1a1a', paddingTop: '8px' }}>
                    Firma Responsable Depósito
                  </div>
                </div>
                <div style={{ textAlign: 'center', width: '40%' }}>
                  <div style={{ borderTop: '1px solid #1a1a1a', paddingTop: '8px' }}>
                    Recibe Conforme (Firma y Aclaración)
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* ESTILO CSS GLOBAL EXCLUSIVO PARA IMPRESION DE REMITOS */}
      <style>{`
        @media print {
          /* Ocultar todo en la página */
          body * {
            visibility: hidden !important;
          }
          /* Mostrar únicamente el remito impreso */
          #print-remito, #print-remito * {
            visibility: visible !important;
          }
          #print-remito {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            font-size: 11pt !important;
          }
          .hide-on-print {
            display: none !important;
          }
          /* Asegurar que los saltos de página e inputs no se rompan */
          @page {
            size: A4;
            margin: 1.5cm;
          }
        }
      `}</style>

    </div>
  );
}
