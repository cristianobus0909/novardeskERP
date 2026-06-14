import React, { useState, useEffect } from 'react';
import {
  useListasPrecio,
  useCreateListaPrecio,
  useUpdateListaPrecio,
  useDeleteListaPrecio,
  useListaPrecioDetails
} from '../../hooks/use-listas-precio';
import { useProducts } from '../../hooks/use-products';
import { toast } from '../../store/use-toast-store';

export function ListasPrecioView() {
  const { data: listas, isLoading: isLoadingListas } = useListasPrecio();
  const { data: productsData, isLoading: isLoadingProducts } = useProducts(1, 1000); // load up to 1000 products to cover the catalog
  
  const createMut = useCreateListaPrecio();
  const updateMut = useUpdateListaPrecio();
  const deleteMut = useDeleteListaPrecio();

  // Navigation states
  const [isEditing, setIsEditing] = useState(false);
  const [selectedListId, setSelectedListId] = useState<number | null>(null);
  const [listName, setListName] = useState('');
  
  // Custom price mapping: variantId -> customPrice (string/number)
  const [customPrices, setCustomPrices] = useState<Record<number, string>>({});
  
  // Search and filter states inside editor
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'custom_only'>('all');
  const [listSearchQuery, setListSearchQuery] = useState('');

  // Bulk operation states
  const [bulkPercent, setBulkPercent] = useState('');
  const [bulkType, setBulkType] = useState<'discount_sell' | 'markup_cost'>('discount_sell');

  // Fetch details if editing
  const { data: listDetails, isLoading: isLoadingDetails } = useListaPrecioDetails(selectedListId);

  // Initialize editor with list details
  useEffect(() => {
    if (selectedListId && listDetails) {
      setListName(listDetails.nombre || '');
      const prices: Record<number, string> = {};
      listDetails.items?.forEach(item => {
        prices[item.variante_id] = item.precio.toString();
      });
      setCustomPrices(prices);
    }
  }, [selectedListId, listDetails]);

  // Flatten all variants from all products for display in the table
  const allVariants = React.useMemo(() => {
    if (!productsData?.data) return [];
    return productsData.data.flatMap((prod: any) => 
      prod.variantes?.map((v: any) => ({
        ...v,
        productoNombre: prod.nombre,
        es_servicio: prod.es_servicio
      })) || []
    );
  }, [productsData]);

  // Handle Edit button click
  const handleEdit = (list: any) => {
    setSelectedListId(list.id);
    setListName(list.nombre);
    setCustomPrices({});
    setIsEditing(true);
    setSearchQuery('');
    setFilterMode('all');
  };

  // Handle New button click
  const handleNew = () => {
    setSelectedListId(null);
    setListName('');
    setCustomPrices({});
    setIsEditing(true);
    setSearchQuery('');
    setFilterMode('all');
  };

  // Handle Delete button click
  const handleDelete = async (id: number) => {
    if (!confirm('¿Seguro que desea eliminar esta lista de precios?')) return;
    try {
      await deleteMut.mutateAsync(id);
      toast.success('Lista de precios eliminada correctamente.');
    } catch (err: any) {
      toast.error('Error al eliminar lista: ' + err.message);
    }
  };

  // Handle Custom Price Change in the editor
  const handlePriceChange = (variantId: number, value: string) => {
    setCustomPrices(prev => ({
      ...prev,
      [variantId]: value
    }));
  };

  // Clear a custom price (falling back to standard sale price)
  const handleClearPrice = (variantId: number) => {
    setCustomPrices(prev => {
      const copy = { ...prev };
      delete copy[variantId];
      return copy;
    });
  };

  // Apply Bulk pricing calculations
  const handleApplyBulk = () => {
    const percent = parseFloat(bulkPercent);
    if (isNaN(percent) || percent < 0) {
      toast.error('Por favor ingrese un porcentaje válido mayor o igual a 0');
      return;
    }

    const updated: Record<number, string> = { ...customPrices };
    let count = 0;

    // Apply to variants that match the current search filter to be user-friendly
    const targetVariants = allVariants.filter(v => {
      const matchesSearch = 
        v.productoNombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.codigo_barras?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });

    targetVariants.forEach(v => {
      const sellPrice = parseFloat(v.precio_venta.toString());
      const costPrice = parseFloat(v.costo?.toString() || '0');

      if (bulkType === 'discount_sell') {
        // Apply discount off default sell price: sellPrice * (1 - percent/100)
        const newPrice = sellPrice * (1 - percent / 100);
        updated[v.id] = newPrice.toFixed(2);
        count++;
      } else if (bulkType === 'markup_cost') {
        // Apply markup over cost price: costPrice * (1 + percent/100)
        if (costPrice > 0) {
          const newPrice = costPrice * (1 + percent / 100);
          updated[v.id] = newPrice.toFixed(2);
          count++;
        }
      }
    });

    setCustomPrices(updated);
    toast.success(`Se calcularon precios para ${count} variantes.`);
  };

  // Save the list
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!listName.trim()) {
      toast.error('La lista debe tener un nombre.');
      return;
    }

    // Prepare items list (exclude empty inputs)
    const items = Object.entries(customPrices)
      .map(([variantId, priceStr]) => {
        const price = parseFloat(priceStr);
        return {
          variante_id: parseInt(variantId),
          precio: price
        };
      })
      .filter(item => !isNaN(item.precio) && item.precio >= 0);

    try {
      if (selectedListId) {
        await updateMut.mutateAsync({
          id: selectedListId,
          nombre: listName,
          items
        });
        toast.success('Lista de precios actualizada.');
      } else {
        await createMut.mutateAsync({
          nombre: listName,
          items
        });
        toast.success('Lista de precios creada.');
      }
      setIsEditing(false);
      setSelectedListId(null);
    } catch (err: any) {
      toast.error('Error al guardar la lista: ' + err.message);
    }
  };

  // Filter lists by search query
  const filteredListas = listas?.filter(l => 
    l.nombre.toLowerCase().includes(listSearchQuery.toLowerCase())
  );

  // Filter variants by search query and custom prices filter
  const filteredVariants = allVariants.filter(v => {
    const matchesSearch = 
      v.productoNombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.codigo_barras?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    if (filterMode === 'custom_only') {
      return customPrices[v.id] !== undefined && customPrices[v.id] !== '';
    }

    return true;
  });

  if (isLoadingListas) return <div className="p-lg">Cargando listas de precios...</div>;

  return (
    <div className="p-lg" style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '80px' }}>
      {!isEditing ? (
        // LIST VIEW
        <>
          <div className="catalog-header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 className="font-bold" style={{ fontSize: '24px', margin: 0 }}>Listas de Precios</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
                Define precios alternativos para tus productos (ej. Mayorista, Distribuidor, Ofertas).
              </p>
            </div>
            <button onClick={handleNew} className="btn-primary" style={{ width: 'auto', padding: '10px 20px', borderRadius: '8px' }}>
              + Nueva Lista
            </button>
          </div>

          <div className="catalog-section" style={{ background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '20px' }}>
            <div className="form-group" style={{ marginBottom: '20px', maxWidth: '400px' }}>
              <input
                type="text"
                placeholder="Buscar lista por nombre..."
                className="form-input"
                value={listSearchQuery}
                onChange={e => setListSearchQuery(e.target.value)}
              />
            </div>

            <div className="product-table-wrapper">
              <table className="product-table">
                <thead>
                  <tr>
                    <th>Nombre de la Lista</th>
                    <th>Precios Personalizados</th>
                    <th>Fecha de Creación</th>
                    <th className="text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredListas?.map((list: any) => (
                    <tr key={list.id} style={{ transition: 'background 0.2s' }}>
                      <td style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{list.nombre}</td>
                      <td>
                        <span className="badge" style={{ background: 'rgba(var(--primary-rgb), 0.1)', color: 'hsl(var(--primary))', fontWeight: '600' }}>
                          {list._count?.items ?? list.items?.length ?? 0} artículos
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>
                        {new Date(list.creado_el).toLocaleDateString()}
                      </td>
                      <td className="text-right">
                        <button
                          onClick={() => handleEdit(list)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--primary))', marginRight: '16px', fontWeight: '600' }}
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(list.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--danger))', fontWeight: '600' }}
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredListas?.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center p-xl" style={{ color: 'var(--text-secondary)' }}>
                        No se encontraron listas de precios.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        // EDIT / CREATE FORM
        <form onSubmit={handleSave} className="fade-in">
          <div className="catalog-header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 className="font-bold" style={{ fontSize: '24px', margin: 0 }}>
                {selectedListId ? 'Editar Lista de Precios' : 'Nueva Lista de Precios'}
              </h2>
            </div>
            <div className="d-flex gap-md">
              <button
                type="button"
                className="btn-secondary"
                style={{ width: 'auto', padding: '10px 20px', borderRadius: '8px' }}
                onClick={() => {
                  setIsEditing(false);
                  setSelectedListId(null);
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-primary"
                style={{ width: 'auto', padding: '10px 20px', borderRadius: '8px' }}
              >
                Guardar Lista
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
            {/* General Info Card */}
            <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '20px' }}>
              <div className="form-group" style={{ maxWidth: '500px' }}>
                <label className="form-label" style={{ fontWeight: '600', marginBottom: '8px', display: 'block' }}>Nombre de la Lista</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Lista Mayorista, Ofertas de Fin de Año..."
                  className="form-input"
                  value={listName}
                  onChange={e => setListName(e.target.value)}
                />
              </div>
            </div>

            {/* Pricing Editor Card */}
            <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>Definición de Precios</h3>
              
              {/* Bulk Calculations Area */}
              <div style={{ 
                background: 'var(--bg-tertiary)', 
                borderRadius: '8px', 
                padding: '16px', 
                marginBottom: '20px', 
                border: '1px dashed var(--border-color)',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '16px'
              }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
                  ⚡ Calcular en Lote (Filtro Actual):
                </div>
                <div className="d-flex align-center gap-sm">
                  <select 
                    className="form-input" 
                    style={{ width: 'auto', padding: '6px 12px' }}
                    value={bulkType}
                    onChange={e => setBulkType(e.target.value as any)}
                  >
                    <option value="discount_sell">Descuento sobre venta base (%)</option>
                    <option value="markup_cost">Recargo sobre costo (%)</option>
                  </select>
                  <input
                    type="number"
                    placeholder="Ej. 10"
                    className="form-input"
                    style={{ width: '90px', padding: '6px 12px' }}
                    value={bulkPercent}
                    onChange={e => setBulkPercent(e.target.value)}
                  />
                  <span style={{ color: 'var(--text-secondary)' }}>%</span>
                </div>
                <button
                  type="button"
                  className="btn-primary"
                  style={{ width: 'auto', padding: '6px 16px', fontSize: '14px' }}
                  onClick={handleApplyBulk}
                >
                  Aplicar
                </button>
              </div>

              {/* Search & Filter bar for items */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '16px', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="Buscar producto por nombre, SKU o código de barras..."
                  className="form-input"
                  style={{ maxWidth: '450px' }}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                
                <div className="d-flex gap-sm">
                  <button
                    type="button"
                    className={filterMode === 'all' ? 'btn-primary' : 'btn-secondary'}
                    style={{ width: 'auto', padding: '6px 14px', fontSize: '13px', borderRadius: '6px' }}
                    onClick={() => setFilterMode('all')}
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    className={filterMode === 'custom_only' ? 'btn-primary' : 'btn-secondary'}
                    style={{ width: 'auto', padding: '6px 14px', fontSize: '13px', borderRadius: '6px' }}
                    onClick={() => setFilterMode('custom_only')}
                  >
                    Solo Personalizados ({Object.keys(customPrices).length})
                  </button>
                </div>
              </div>

              {/* Table of items */}
              {isLoadingProducts || (selectedListId && isLoadingDetails) ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>Cargando catálogo...</div>
              ) : (
                <div className="product-table-wrapper" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                  <table className="product-table">
                    <thead style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--bg-secondary)' }}>
                      <tr>
                        <th>Producto / Variante</th>
                        <th>SKU</th>
                        <th>Costo Base</th>
                        <th>Precio Base</th>
                        <th style={{ width: '220px' }}>Precio Personalizado</th>
                        <th className="text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredVariants.map((v: any) => {
                        const hasCustom = customPrices[v.id] !== undefined && customPrices[v.id] !== '';
                        const sellVal = parseFloat(v.precio_venta.toString());
                        const costVal = parseFloat(v.costo?.toString() || '0');
                        const customVal = hasCustom ? parseFloat(customPrices[v.id] || '') : NaN;
                        
                        // Calculate margin and discount labels
                        let labelText = '';
                        if (hasCustom && !isNaN(customVal)) {
                          if (costVal > 0) {
                            const margin = ((customVal - costVal) / costVal) * 100;
                            labelText = `Margen: ${margin.toFixed(0)}%`;
                          } else {
                            const disc = ((sellVal - customVal) / sellVal) * 100;
                            labelText = `Desc: ${disc.toFixed(0)}%`;
                          }
                        }

                        return (
                          <tr key={v.id}>
                            <td>
                              <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{v.productoNombre}</div>
                              {v.atributos_extra && Object.keys(v.atributos_extra).length > 0 && (
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                  {Object.entries(v.atributos_extra).map(([k, val]) => `${k}: ${val}`).join(', ')}
                                </div>
                              )}
                            </td>
                            <td>
                              <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{v.sku}</span>
                            </td>
                            <td>
                              {costVal > 0 ? `$${costVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                            </td>
                            <td>
                              <strong style={{ color: 'var(--text-primary)' }}>
                                ${sellVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </strong>
                            </td>
                            <td>
                              <div className="d-flex align-center gap-xs">
                                <span style={{ color: 'var(--text-secondary)' }}>$</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  placeholder={sellVal.toFixed(2)}
                                  className="form-input"
                                  style={{ 
                                    padding: '6px 10px', 
                                    fontSize: '14px', 
                                    fontWeight: hasCustom ? '600' : '400',
                                    borderColor: hasCustom ? 'hsl(var(--primary))' : 'var(--border-color)',
                                    background: hasCustom ? 'rgba(var(--primary-rgb), 0.02)' : 'var(--bg-secondary)'
                                  }}
                                  value={customPrices[v.id] || ''}
                                  onChange={e => handlePriceChange(v.id, e.target.value)}
                                />
                              </div>
                              {labelText && (
                                <span style={{ fontSize: '11px', color: 'hsl(var(--success))', fontWeight: '600', marginTop: '3px', display: 'block' }}>
                                  {labelText}
                                </span>
                              )}
                            </td>
                            <td className="text-right">
                              {hasCustom ? (
                                <button
                                  type="button"
                                  onClick={() => handleClearPrice(v.id)}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--danger))', fontSize: '13px', fontWeight: '600' }}
                                >
                                  Restablecer
                                </button>
                              ) : (
                                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Original</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {filteredVariants.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center p-xl" style={{ color: 'var(--text-secondary)' }}>
                            No hay productos que coincidan con la búsqueda.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
