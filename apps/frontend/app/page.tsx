'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from '../store/use-toast-store';
import { useAuthStore } from '../store/use-auth-store';
import { apiRequest } from '../lib/api-client';
import dynamic from 'next/dynamic';

const LoadingFallback = () => <div className="text-center" style={{ padding: '60px', color: 'var(--text-secondary)' }}><div className="spinner" style={{ width: '30px', height: '30px', margin: '0 auto 16px' }}></div>Cargando módulo...</div>;

const ClientesView = dynamic(() => import('../components/clientes/clientes-view').then(mod => mod.ClientesView), { loading: LoadingFallback });
const PromocionesView = dynamic(() => import('../components/promociones/promociones-view').then(mod => mod.PromocionesView), { loading: LoadingFallback });
const SettingsView = dynamic(() => import('../components/settings/settings-view').then(mod => mod.SettingsView), { loading: LoadingFallback });
const FinanzasView = dynamic(() => import('../components/finanzas/cuentas-view').then(mod => mod.CuentasView), { loading: LoadingFallback });
const MovimientosView = dynamic(() => import('../components/finanzas/movimientos-view').then(mod => mod.MovimientosView), { loading: LoadingFallback });
const GastosView = dynamic(() => import('../components/finanzas/gastos-view').then(mod => mod.GastosView), { loading: LoadingFallback });
const ProveedoresView = dynamic(() => import('../components/finanzas/proveedores-view').then(mod => mod.ProveedoresView), { loading: LoadingFallback });
const CierreView = dynamic(() => import('../components/finanzas/cierre-view').then(mod => mod.CierreView), { loading: LoadingFallback });
const HistorialCajaView = dynamic(() => import('../components/finanzas/historial-caja-view').then(mod => mod.HistorialCajaView), { loading: LoadingFallback });
const DashboardView = dynamic(() => import('../components/dashboard/dashboard-view').then(mod => mod.DashboardView), { ssr: false, loading: LoadingFallback });

import { ClienteSelector } from '../components/pos/cliente-selector';
import { useProducts, useCreateProduct } from '../hooks/use-products';
import { useEstadoCaja } from '../hooks/use-caja';
import { AbrirCajaModal, CerrarCajaModal } from '../components/pos/caja-modal';

import { ImportCenterView } from '../components/import/import-center-view';
import { TicketView } from '../components/pos/ticket-view';
import { PosSimpleView } from '../components/pos/pos-simple-view';
import { useCartStore } from '../store/use-cart-store';
import { useSales, useCreateSale } from '../hooks/use-sales';
import { usePromocionesActivas } from '../hooks/use-promociones';
import { useMpQrIntent, useMpPosIntent } from '../hooks/use-mp';

import { useCuentasContables } from '../hooks/use-finanzas';
import { useCuentaCorriente } from '../hooks/use-cuenta-corriente';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  // Estados de autenticación locales para el formulario
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Estados del modal de creación de producto
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoria, setCategoria] = useState('Indumentaria');
  const [marca, setMarca] = useState('');
  const [esServicio, setEsServicio] = useState(false);
  
  // Estado para la variante en el formulario de creación
  const [sku, setSku] = useState('');
  const [codigoBarras, setCodigoBarras] = useState('');
  const [precioVenta, setPrecioVenta] = useState('0');
  const [stockActual, setStockActual] = useState('0');

  // Atributos dinámicos específicos del rubro
  const [talle, setTalle] = useState('M');
  const [color, setColor] = useState('Azul');
  const [unidad, setUnidad] = useState('unidad');
  const [fraccionable, setFraccionable] = useState(false);
  const [customKey, setCustomKey] = useState('');
  const [customValue, setCustomValue] = useState('');

  // Filtros de búsqueda en catálogo
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('Todos');

  // Zustand Auth Store
  const { token, user, tenant, setAuth, logout } = useAuthStore();

  const isVendedor = user?.role === 'Vendedor';

  // Zustand Cart Store
  const {
    items: cartItems,
    id_cliente,
    cliente_id,
    nombre_cliente,
    metodo_pago,
    addItem,
    removeItem,
    updateQuantity,
    updatePrice,
    setCliente,
    setMetodoPago,
    clearCart,
  } = useCartStore();

  const { data: cuentaCorriente } = useCuentaCorriente(cliente_id || null);

  type TabType = 'dashboard' | 'catalog' | 'pos' | 'sales' | 'clientes' | 'promociones' | 'settings' | 'finances' | 'subscription' | 'import-center';
  type FinanzasTab = 'cuentas' | 'movimientos' | 'gastos' | 'proveedores' | 'cierre' | 'historial-caja';
  // Estado de la pestaña activa en la barra lateral
  const [activeTab, setActiveTab] = useState<TabType>('pos');
  const [finanzasSubTab, setFinanzasSubTab] = useState<FinanzasTab>('cuentas');
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(new Set(['pos']));
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCajaDropdownOpen, setIsCajaDropdownOpen] = useState(false);
  const [isFinanzasDropdownOpen, setIsFinanzasDropdownOpen] = useState(false);

  useEffect(() => {
    setVisitedTabs(prev => {
      if (prev.has(activeTab)) return prev;
      return new Set(prev).add(activeTab);
    });
  }, [activeTab]);

  // Asegurarnos de que el admin empiece en el dashboard
  useEffect(() => {
    if (user && !isVendedor && activeTab === 'pos') {
      setActiveTab('dashboard');
    }
  }, [user, isVendedor]);

  // Estado del menú desplegable del perfil superior
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isCloseCajaModalOpen, setIsCloseCajaModalOpen] = useState(false);
  
  // Layout del POS: 'classic' | 'simple'
  const [posLayout, setPosLayout] = useState<'classic' | 'simple'>('classic');

  // Persistir la preferencia de layout
  React.useEffect(() => {
    const saved = localStorage.getItem('novardesk-pos-layout') as 'classic' | 'simple' | null;
    if (saved) setPosLayout(saved);
  }, []);
  const togglePosLayout = () => {
    const next = posLayout === 'classic' ? 'simple' : 'classic';
    setPosLayout(next);
    localStorage.setItem('novardesk-pos-layout', next);
  };
  
  // Estados Mobile
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  // Queries
  const { data: estadoCaja } = useEstadoCaja();
  const [posSearchQuery, setPosSearchQuery] = useState('');
  const [ticketSale, setTicketSale] = useState<any>(null);

  // Estado de modal para detalle de venta
  const [selectedSale, setSelectedSale] = useState<any | null>(null);
  const [isSaleDetailOpen, setIsSaleDetailOpen] = useState(false);

  // Estados para Pagos Combinados y Descuentos
  const { data: cuentasContables = [] } = useCuentasContables();

  const [discountMonto, setDiscountMonto] = useState(0);
  const [discountMotivo, setDiscountMotivo] = useState('');
  const [isDescuentoModalOpen, setIsDescuentoModalOpen] = useState(false);
  const [pinAutorizacion, setPinAutorizacion] = useState<string>('');
  const [pagosAgregados, setPagosAgregados] = useState<{ metodo_pago: string, monto: number, cuenta_contable_id?: number, plan_pago_id?: number, recargo_monto?: number, nombre_plan?: string }[]>([]);
  const [nuevoMontoPago, setNuevoMontoPago] = useState('');
  const [selectedMedioBase, setSelectedMedioBase] = useState<string>('');
  const [selectedCuentaId, setSelectedCuentaId] = useState<number | string>('');
  const [selectedPlanId, setSelectedPlanId] = useState<number | ''>('');
  const [clientSearchQuery, setClientSearchQuery] = useState('');

  // Estados para Mercado Pago
  const [isMpModalOpen, setIsMpModalOpen] = useState(false);
  const [mpMode, setMpMode] = useState<'QR' | 'POS' | null>(null);
  const [mpQrData, setMpQrData] = useState<string | null>(null);
  const mpQrIntentMutation = useMpQrIntent();
  const mpPosIntentMutation = useMpPosIntent();

  const { data: promocionesActivas } = usePromocionesActivas();
  const [promocionAplicada, setPromocionAplicada] = useState<any>(null);

  // Auto-evaluar promociones cada vez que cambia el carrito
  useEffect(() => {
    if (!promocionesActivas || promocionesActivas.length === 0 || cartItems.length === 0) {
      if (promocionAplicada) {
         setPromocionAplicada(null);
         setDiscountMonto(0);
         setDiscountMotivo('');
      }
      return;
    }

    let mejorPromocion = null;
    let maxDescuento = 0;

    for (const promo of promocionesActivas) {
       let montoAplicable = 0;
       let unidadesAplicables = 0;

       if (promo.tipo_regla === 'GLOBAL') {
          montoAplicable = cartItems.reduce((acc, item) => acc + item.subtotal, 0);
          unidadesAplicables = cartItems.reduce((acc, item) => acc + item.cantidad, 0);
       } else if (promo.tipo_regla === 'CATEGORIA') {
          const aplicables = cartItems.filter(i => i.categoria === promo.valor_regla);
          montoAplicable = aplicables.reduce((acc, item) => acc + item.subtotal, 0);
          unidadesAplicables = aplicables.reduce((acc, item) => acc + item.cantidad, 0);
       } else if (promo.tipo_regla === 'PRODUCTO') {
          const idRegla = parseInt(promo.valor_regla);
          const aplicables = cartItems.filter(i => i.producto_id === idRegla || i.sku === promo.valor_regla);
          montoAplicable = aplicables.reduce((acc, item) => acc + item.subtotal, 0);
          unidadesAplicables = aplicables.reduce((acc, item) => acc + item.cantidad, 0);
       }

       if (promo.cantidad_minima && unidadesAplicables < promo.cantidad_minima) {
          continue; // No cumple regla de cantidad
       }

       if (montoAplicable > 0) {
          let descuentoActual = 0;
          if (promo.descuento_porcentaje) {
             descuentoActual = montoAplicable * (parseFloat(promo.descuento_porcentaje) / 100);
          } else if (promo.descuento_monto) {
             descuentoActual = parseFloat(promo.descuento_monto);
          }

          if (descuentoActual > montoAplicable) descuentoActual = montoAplicable;

          if (descuentoActual > maxDescuento) {
             maxDescuento = descuentoActual;
             mejorPromocion = promo;
          }
       }
    }

    if (mejorPromocion && maxDescuento > 0) {
       setPromocionAplicada(mejorPromocion);
       setDiscountMonto(maxDescuento);
       setDiscountMotivo(`Promo Automática: ${mejorPromocion.nombre}`);
    } else {
       if (promocionAplicada) {
         setPromocionAplicada(null);
         setDiscountMonto(0);
         setDiscountMotivo('');
       }
    }
  }, [cartItems, promocionesActivas]);

  const [productPage, setProductPage] = useState(1);
  const [salesPage, setSalesPage] = useState(1);

  // React Query Hooks (Ahora Paginados)
  const { data: productsData, isLoading: isLoadingProducts, error: productsError } = useProducts(productPage, 50);
  const products = productsData?.data || [];
  const productsMeta = productsData?.meta;

  const { data: salesData, isLoading: isLoadingSales } = useSales(salesPage, 50);
  const sales = salesData?.data || [];
  const salesMeta = salesData?.meta;
  const createProductMutation = useCreateProduct();
  const createSaleMutation = useCreateSale();

  // Asegurar hidratación en el cliente para evitar mismatch de SSR con Zustand Persist
  useEffect(() => {
    setMounted(true);

    // Cargar preferencia de tema guardada o usar la del sistema
    const savedTheme = localStorage.getItem('novardesk-theme') as 'light' | 'dark' | null;
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');

    setTheme(initialTheme);
    document.documentElement.setAttribute('data-theme', initialTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('novardesk-theme', newTheme);
  };

  const handleLogout = () => {
    logout();
    setIsProfileDropdownOpen(false);
  };

  // --- CÁLCULO DE SALDO RESTANTE PARA EL INPUT DE PAGO ---
  const globalSubtotal = cartItems.reduce((acc, item) => acc + (item.subtotal * item.cantidad), 0);
  const globalTotalConDescuento = Math.max(0, globalSubtotal - discountMonto);
  const globalRecargoTotal = pagosAgregados.reduce((acc, p) => acc + (p.recargo_monto || 0), 0);
  const globalTotalReal = globalTotalConDescuento + globalRecargoTotal;
  const globalPagosActuales = pagosAgregados.reduce((a,b)=>a+b.monto, 0);
  const globalSaldoRestante = Math.max(0, globalTotalReal - globalPagosActuales);

  useEffect(() => {
    if (globalSaldoRestante > 0) {
      setNuevoMontoPago(globalSaldoRestante.toString());
    } else if (cartItems.length === 0 || globalSaldoRestante === 0) {
      setNuevoMontoPago('');
    }
  }, [globalSaldoRestante, cartItems.length]);

  if (!mounted) {
    return null; // Renderizado básico vacío durante la hidratación de Next.js
  }

  // --- CONTROLADORES DE AUTENTICACIÓN ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setLoading(true);
    try {
      const data = await apiRequest<{ access_token: string; user: any; tenant: any }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setAuth(data.access_token, data.user, data.tenant);
      if (data.user.role !== 'Vendedor') {
        setActiveTab('dashboard');
      } else {
        setActiveTab('pos');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };


  // --- CONTROLADORES DEL FORMULARIO DE PRODUCTOS ---
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    // Estructurar atributos extra basados en el rubro/categoría
    let atributos_extra: Record<string, any> = {};
    if (categoria === 'Indumentaria') {
      atributos_extra = { talle, color };
    } else if (categoria === 'Almacén') {
      atributos_extra = { unidad, fraccionable };
    } else if (categoria === 'Otros' && customKey) {
      atributos_extra = { [customKey]: customValue };
    }

    const payload = {
      nombre,
      descripcion: descripcion || undefined,
      categoria: categoria || undefined,
      marca: marca || undefined,
      es_servicio: esServicio,
      variantes: [
        {
          sku,
          codigo_barras: codigoBarras || undefined,
          precio_venta: parseFloat(precioVenta) || 0,
          stock_actual: parseFloat(stockActual) || 0,
          atributos_extra,
        },
      ],
    };

    try {
      await createProductMutation.mutateAsync(payload);
      
      // Limpiar formulario y cerrar modal
      setNombre('');
      setDescripcion('');
      setMarca('');
      setSku('');
      setCodigoBarras('');
      setPrecioVenta('0');
      setStockActual('0');
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar el producto');
    }
  };

  const handleDeleteProduct = async (productId: number) => {
    if (!confirm('¿Está seguro de que desea eliminar este producto y todas sus variantes?')) return;
    try {
      await apiRequest(`/productos/${productId}`, {
        method: 'DELETE',
      });
      // Forzar recarga de productos
      window.location.reload(); // Simple recarga para actualizar el render
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar el producto');
    }
  };

  // --- CONTROLADORES DE PUNTO DE VENTA (POS) ---
  const handlePosSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!posSearchQuery.trim()) return;
    try {
      const variant = await apiRequest<any>(`/productos/variante/buscar?q=${encodeURIComponent(posSearchQuery.trim())}`);
      addItem(variant);
      setPosSearchQuery('');
    } catch (err: any) {
      toast.error(err.message || 'Variante no encontrada');
    }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cartItems.length === 0) {
      toast.error('El carrito está vacío');
      return;
    }

    // Calcular total base, descuentos y recargos
    const subtotal = cartItems.reduce((acc, item) => acc + (item.subtotal * item.cantidad), 0);
    const totalConDescuento = Math.max(0, subtotal - discountMonto);

    // Calcular el recargo de los pagos agregados
    const recargoTotal = pagosAgregados.reduce((acc, p) => acc + (p.recargo_monto || 0), 0);
    
    // El Total Real a pagar es el (Subtotal - Descuento + Recargo)
    const totalReal = totalConDescuento + recargoTotal;

    try {
      let pagosFin = [...pagosAgregados];
      let recargoCalculadoDefault = 0;

      if (pagosFin.length === 0) {
        let finalMetodo = 'EFECTIVO';
        let finalCuentaId = undefined;
        let finalPlanId = undefined;
        
        if (['EFECTIVO', 'CUENTA_CORRIENTE', 'MERCADOPAGO_QR', 'MERCADOPAGO_POS'].includes(selectedMedioBase as string)) {
           finalMetodo = selectedMedioBase as string;
        } else if (selectedCuentaId) {
           const cuenta = cuentasContables.find(c => c.id === selectedCuentaId);
           if (cuenta) {
             finalMetodo = cuenta.tipo;
             finalCuentaId = cuenta.id;
             if (cuenta.planes_pago.length > 0 && selectedPlanId) {
                const plan = cuenta.planes_pago.find(p => p.id === selectedPlanId);
                if (plan) {
                  finalPlanId = plan.id;
                  recargoCalculadoDefault = Math.round(totalConDescuento * (Number(plan.recargo_porcentaje) / 100));
                }
             }
           }
        }
        
        pagosFin = [{ 
           metodo_pago: finalMetodo, 
           monto: totalConDescuento + recargoCalculadoDefault, 
           cuenta_contable_id: finalCuentaId,
           plan_pago_id: finalPlanId,
           recargo_monto: recargoCalculadoDefault
        }];
      }

      const recargo_monto_total = pagosFin.reduce((acc, p) => acc + (p.recargo_monto || 0), 0);
      const totalRealFinal = totalConDescuento + recargo_monto_total;

      const payload = {
        detalles: cartItems.map(item => ({
          variante_id: item.variantId,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
          subtotal: item.subtotal
        })),
        id_cliente: id_cliente || undefined,
        cliente_id: cliente_id || undefined,
        nombre_cliente: nombre_cliente || 'Consumidor Final',
        metodo_pago: pagosFin[0]?.metodo_pago || 'EFECTIVO',
        pagos: pagosFin.map(p => ({
          metodo_pago: p.metodo_pago,
          monto: p.monto,
          cuenta_contable_id: p.cuenta_contable_id,
          plan_pago_id: p.plan_pago_id
        })),
        subtotal,
        descuento_monto: discountMonto,
        descuento_motivo: discountMotivo,
        recargo_monto: recargo_monto_total,
        recargo_motivo: recargo_monto_total > 0 ? 'Recargo por financiación' : undefined,
        total: totalRealFinal
      };

      const result = await createSaleMutation.mutateAsync(payload);
      toast.success(`Venta #${result.id} registrada exitosamente.`);
      
      // Obtener los detalles completos para el ticket
      setTicketSale(result);
      
      clearCart();
      setDiscountMonto(0);
      setDiscountMotivo('');
      setPagosAgregados([]);
      setNuevoMontoPago('');
      setSelectedMedioBase('');
      setSelectedCuentaId('');
      setSelectedPlanId('');
      setClientSearchQuery('');
    } catch (err: any) {
      toast.error(err.message || 'Error al procesar la venta');
    }
  };



  // --- CÁLCULO DE ESTADÍSTICAS ---
  const totalProducts = products.length;
  let lowStockAlerts = 0;
  let totalInventoryValue = 0;

  products.forEach((p) => {
    p.variantes.forEach((v) => {
      const stock = typeof v.stock_actual === 'string' ? parseFloat(v.stock_actual) : v.stock_actual;
      const precio = typeof v.precio_venta === 'string' ? parseFloat(v.precio_venta) : v.precio_venta;
      if (stock < 5) {
        lowStockAlerts++;
      }
      totalInventoryValue += stock * precio;
    });
  });

  // --- FILTRADO DE PRODUCTOS ---
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.marca?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.variantes.some((v) => v.sku.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      activeCategoryFilter === 'Todos' || p.categoria === activeCategoryFilter;

    return matchesSearch && matchesCategory;
  });

  const uniqueCategories = ['Todos', ...Array.from(new Set(products.map((p) => p.categoria).filter((cat): cat is string => !!cat)))];

  // --- RENDER VISTA LOGIN ---
  if (!token) {
    return (
      <div className="auth-wrapper fade-in relative"  >
        <div className="absolute" style={{ top: '24px', right: '24px', zIndex: 10 }}>
          <div
            onClick={toggleTheme}
            className="theme-switch-container"
            title={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
          >
            <div className="theme-switch-thumb"></div>
            <div className="theme-switch-icons">
              <span className={`theme-switch-icon ${theme === 'light' ? 'active' : ''}`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
              </span>
              <span className={`theme-switch-icon ${theme === 'dark' ? 'active' : ''}`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
              </span>
            </div>
          </div>
        </div>
        <div className="auth-card scale-up">
          <div className="auth-header">
            <h1 className="auth-title">NovarDesk ERP</h1>
            <p className="auth-subtitle">Ingresa para administrar tu comercio</p>
          </div>

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Correo Electrónico</label>
              <input
                type="email"
                className="form-input"
                placeholder="ejemplo@comercio.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Contraseña</label>
              <input
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {authError && (
              <p className="text-center" style={{ color: 'red', fontSize: '13px', marginBottom: '16px' }}>
                {authError}
              </p>
            )}

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Validando...' : 'Iniciar Sesión'}
            </button>
          </form>


        </div>
      </div>
    );
  }

  // --- COMPONENTE EXTRAÍDO PARA EL CARRITO (REUTILIZABLE EN MOBILE/DESKTOP) ---
  const renderCartPanel = () => {
    const subtotal = globalSubtotal;
    const totalConDescuento = globalTotalConDescuento;
    const recargoTotal = globalRecargoTotal;
    const totalReal = globalTotalReal;
    const pagosActuales = globalPagosActuales;
    const saldoRestante = globalSaldoRestante;
    
    return (
    <>
      {/* Carrito (Mitad Superior) */}
      <div className="flex-1 overflow-y-auto d-flex flex-col" style={{ padding: '20px', borderBottom: '1px solid var(--border-color)' }}>
        <h3 className="font-bold d-flex justify-between align-center" style={{ fontSize: '16px', marginBottom: '16px' }}>
          <span>Ticket Actual</span>
          {cartItems.length > 0 && (
            <span style={{ background: 'var(--bg-tertiary)', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>{cartItems.length} ítems</span>
          )}
        </h3>
        
        {cartItems.length === 0 ? (
          <div className="text-center" style={{ padding: '60px 20px', color: 'var(--text-muted)', margin: 'auto' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 16px auto', display: 'block', color: 'var(--text-muted)' }}><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
            Haz clic en los productos para agregarlos al carrito.
          </div>
        ) : (
          <div className="d-flex flex-col gap-md">
            {cartItems.map((item) => (
              <div key={item.variantId} className="d-flex flex-col gap-sm" style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div className="d-flex justify-between align-start">
                  <div>
                    <span className="font-semibold" style={{ display: 'block', fontSize: '14px', lineHeight: 1.2 }}>{item.nombre}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{item.sku}</span>
                  </div>
                  <button 
                    type="button"
                    style={{ background: 'none', border: 'none', color: 'hsl(var(--text-muted))', cursor: 'pointer', padding: '4px' }}
                    onClick={() => removeItem(item.variantId)}
                    title="Quitar"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
                </div>
                
                <div className="d-flex justify-between align-center">
                  <div className="d-flex align-center gap-xs" style={{ background: 'var(--bg-secondary)', borderRadius: '6px', padding: '2px' }}>
                    <button 
                      type="button"
                      className="p-0 d-flex align-center justify-center" style={{ width: '24px', height: '24px', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
                      onClick={() => updateQuantity(item.variantId, item.cantidad - 1)}
                    >
                      -
                    </button>
                    <input
                      type="number"
                      step={item.es_servicio ? '1' : '0.001'}
                      className="text-center p-0 font-semibold" style={{ width: '40px', height: '24px', background: 'transparent', border: 'none', fontSize: '13px', color: 'var(--text-primary)' }}
                      value={item.cantidad}
                      onChange={(e) => updateQuantity(item.variantId, parseFloat(e.target.value) || 0)}
                    />
                    <button 
                      type="button"
                      className="p-0 d-flex align-center justify-center" style={{ width: '24px', height: '24px', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
                      onClick={() => updateQuantity(item.variantId, item.cantidad + 1)}
                    >
                      +
                    </button>
                  </div>
                  <div className="text-right">
                    <span className="font-bold" style={{ fontSize: '16px', color: 'var(--text-primary)' }}>
                      ${(item.subtotal * item.cantidad).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cobro (Mitad Inferior) */}
      <div className="p-md" style={{ background: 'var(--bg-primary)', borderTop: '1px solid var(--border-color)', flexShrink: 0 }}>
        
        {/* Descuentos section */}
        {discountMonto > 0 && (
          <div className="d-flex justify-between" style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px dashed var(--border-color)', color: 'hsl(var(--success))' }}>
            <span className="font-semibold" style={{ fontSize: '13px' }}>Descuento ({discountMotivo})</span>
            <span className="font-bold" style={{ fontSize: '13px' }}>-${discountMonto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
          </div>
        )}

        <div className="d-flex justify-between align-center" style={{ marginBottom: '12px' }}>
          <div className="d-flex flex-col">
            <span className="font-bold" style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>Total</span>
            {cartItems.length > 0 && (
              <button 
                type="button" 
                onClick={() => setIsDescuentoModalOpen(true)} 
                className="p-0 text-left font-semibold" style={{ fontSize: '11px', background: 'none', border: 'none', color: 'hsl(var(--primary))', cursor: 'pointer' }}
              >
                + Aplicar Descuento
              </button>
            )}
          </div>
          <span className="font-extrabold" style={{ fontSize: '28px', color: 'hsl(var(--primary))', fontFamily: 'monospace' }}>
            ${totalReal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <form onSubmit={handleCheckout} className="d-flex flex-col gap-lg">
          <ClienteSelector />

          {/* Pagos Múltiples */}
          <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div className="font-semibold" style={{ marginBottom: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>MÉTODOS DE PAGO</div>
            
            {pagosAgregados.length > 0 && (
               <div className="d-flex flex-col" style={{ gap: '6px', marginBottom: '12px' }}>
                 {pagosAgregados.map((p, idx) => (
                    <div key={idx} className="d-flex justify-between align-center p-sm" style={{ fontSize: '13px', background: 'var(--bg-primary)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                      <span className="font-semibold">{p.metodo_pago.replace('_', ' ')}</span>
                      <div className="d-flex gap-md align-center">
                        <span className="font-extrabold" style={{ color: 'hsl(var(--primary))' }}>${p.monto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                        <button type="button" onClick={() => setPagosAgregados(pagosAgregados.filter((_, i) => i !== idx))} style={{ color: 'hsl(var(--danger))', border: 'none', background: 'none', cursor: 'pointer', padding: '2px 4px', borderRadius: '4px' }}>✕</button>
                      </div>
                    </div>
                 ))}
               </div>
            )}

            {/* Select de Cuentas Contables y Planes */}
            <div className="d-flex flex-col gap-sm">
              <div className="d-flex gap-sm">
                <select 
                  value={selectedMedioBase} 
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedMedioBase(val);
                    if (['EFECTIVO', 'CUENTA_CORRIENTE', 'MERCADOPAGO_QR', 'MERCADOPAGO_POS'].includes(val)) {
                      setSelectedCuentaId(val);
                    } else {
                      setSelectedCuentaId('');
                    }
                    setSelectedPlanId('');
                  }} 
                  className="form-input flex-1" style={{ padding: '0 8px', fontSize: '13px' }}
                >
                  <option value="">Seleccionar Medio de Pago...</option>
                  <option value="EFECTIVO" className="font-bold">Efectivo</option>
                  {cuentaCorriente && cuentaCorriente.activa && (
                    <option value="CUENTA_CORRIENTE" className="font-bold" style={{ color: 'hsl(var(--primary))' }}>
                      Cuenta Corriente (Disp: {Number(cuentaCorriente.limite_credito) === -1 ? 'Ilimitado' : `$${(Number(cuentaCorriente.limite_credito) - Number(cuentaCorriente.saldo_actual)).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`})
                    </option>
                  )}
                  <option value="MERCADOPAGO_QR" className="font-bold">Mercado Pago QR</option>
                  <option value="MERCADOPAGO_POS" className="font-bold">Mercado Pago Smart POS</option>
                  <option value="TARJETA_CREDITO" className="font-bold">Tarjeta de Crédito</option>
                  <option value="TARJETA_DEBITO" className="font-bold">Tarjeta de Débito</option>
                  <option value="TRANSFERENCIA" className="font-bold">Transferencia</option>
                  <option value="OTRO" className="font-bold">Otro</option>
                </select>

                <input className="form-input text-center font-bold" 
                  type="number" 
                   
                  placeholder="Monto a abonar" 
                   style={{ width: '160px' }} 
                  value={nuevoMontoPago} 
                  onChange={e => setNuevoMontoPago(e.target.value)} 
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      document.getElementById('add-payment-btn')?.click();
                    }
                  }}
                />
              </div>

              {/* Si es Tarjeta/Transferencia mostramos la cuenta correspondiente */}
              {['TARJETA_CREDITO', 'TARJETA_DEBITO', 'TRANSFERENCIA', 'OTRO'].includes(selectedMedioBase) && (
                <select 
                  className="form-input" 
                  value={selectedCuentaId} 
                  onChange={(e) => {
                    setSelectedCuentaId(e.target.value ? Number(e.target.value) : '');
                    setSelectedPlanId('');
                  }} 
                  style={{ fontSize: '13px', padding: '4px 8px', marginTop: '4px' }}
                >
                  <option value="">Seleccionar Cuenta/Tarjeta...</option>
                  {cuentasContables.filter(c => c.tipo === selectedMedioBase).map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              )}

              {/* Si elige una cuenta contable que tiene planes de pago, mostramos el selector */}
              {selectedCuentaId !== '' && selectedCuentaId !== 'EFECTIVO' && selectedCuentaId !== 'CUENTA_CORRIENTE' && selectedCuentaId !== 'MERCADOPAGO_QR' && selectedCuentaId !== 'MERCADOPAGO_POS' && (
                (() => {
                  const cuenta = cuentasContables.find(c => c.id === selectedCuentaId);
                  if (cuenta && cuenta.planes_pago.length > 0) {
                    return (
                      <select 
                        className="form-input" 
                        value={selectedPlanId} 
                        onChange={e => setSelectedPlanId(Number(e.target.value))}
                        style={{ fontSize: '12px', padding: '4px 8px' }}
                      >
                        <option value="">Seleccionar Plan de Pago...</option>
                        {cuenta.planes_pago.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.nombre} (Recargo: {p.recargo_porcentaje}%)
                          </option>
                        ))}
                      </select>
                    );
                  }
                  return null;
                })()
              )}

              <button 
                id="add-payment-btn"
                className="btn-secondary" 
                style={{ fontSize: '12px', padding: '6px' }}
                onClick={() => {
                  const aAgregar = Number(nuevoMontoPago) || saldoRestante;
                  if (aAgregar <= 0) return;
                  if (!selectedCuentaId) {
                    toast.error('Selecciona un medio de pago');
                    return;
                  }

                  let finalMetodo = 'EFECTIVO';
                  let finalCuentaId = undefined;
                  let finalPlanId = undefined;
                  let recargoCalculado = 0;
                  let nombrePlan = '';

                  if (selectedCuentaId === 'EFECTIVO' || selectedCuentaId === 'MERCADOPAGO_QR' || selectedCuentaId === 'MERCADOPAGO_POS' || selectedCuentaId === 'CUENTA_CORRIENTE') {
                    finalMetodo = selectedCuentaId as string;
                  } else {
                    const cuenta = cuentasContables.find(c => c.id === selectedCuentaId);
                    if (cuenta) {
                      finalMetodo = cuenta.tipo;
                      finalCuentaId = cuenta.id;
                      
                      if (cuenta.planes_pago.length > 0) {
                        if (!selectedPlanId) {
                          toast.error('Debe seleccionar un plan de pago para esta tarjeta');
                          return;
                        }
                        const plan = cuenta.planes_pago.find(p => p.id === selectedPlanId);
                        if (plan) {
                          finalPlanId = plan.id;
                          nombrePlan = plan.nombre;
                          // Recargo = monto * (porcentaje / 100)
                          recargoCalculado = Math.round(aAgregar * (Number(plan.recargo_porcentaje) / 100));
                        }
                      }
                    }
                  }

                  // Aumentar el pago total asumiendo que el cliente paga el monto que nos debían MÁS el recargo
                  // o el monto final de esa tarjeta.
                  const montoFinalConRecargo = aAgregar + recargoCalculado;

                  setPagosAgregados([
                    ...pagosAgregados, 
                    { 
                      metodo_pago: finalMetodo, 
                      monto: montoFinalConRecargo, 
                      cuenta_contable_id: finalCuentaId,
                      plan_pago_id: finalPlanId,
                      recargo_monto: recargoCalculado,
                      nombre_plan: nombrePlan
                    }
                  ]);
                  setNuevoMontoPago('');
                  setSelectedCuentaId('');
                  setSelectedPlanId('');
                }}
              >
                Sumar Pago
              </button>
            </div>
            
            {/* Validar Saldo */}
            {pagosAgregados.length > 0 && (
                 <div className="text-right font-extrabold" style={{ marginTop: '12px', fontSize: '13px', color: saldoRestante > 0 ? 'hsl(var(--danger))' : 'hsl(var(--success))' }}>
                   {saldoRestante > 0 ? `Resta abonar: $${saldoRestante.toLocaleString('es-AR', {minimumFractionDigits: 2})}` : `Cambio a favor: $${Math.abs(saldoRestante).toLocaleString('es-AR', {minimumFractionDigits: 2})}`}
                 </div>
            )}
          </div>

          <div className="d-flex gap-md" style={{ marginTop: '8px' }}>
            <button className="btn-primary flex-1 p-md font-bold" 
              type="submit" 
               
               style={{ fontSize: '16px' }}
              disabled={cartItems.length === 0 || createSaleMutation.isPending || (pagosAgregados.length > 0 && saldoRestante > 0.01)}
            >
              {createSaleMutation.isPending ? 'Procesando...' : 'Cobrar Ticket'}
            </button>
            <button 
              type="button" 
              className="btn-secondary" 
              style={{ width: 'auto', padding: '0 16px' }}
              onClick={() => { clearCart(); setPagosAgregados([]); setDiscountMonto(0); setDiscountMotivo(''); }}
              disabled={cartItems.length === 0}
            >
              Vaciar
            </button>
          </div>
        </form>
      </div>
    </>
    );
  };

  // --- RENDER VISTA DASHBOARD PANEL ---
  return (
    <div className="app-container fade-in">
      {/* Overlay del sidebar móvil */}
      {isMobileMenuOpen && (
        <div className="modal-overlay mobile-only" style={{ zIndex: 95 }} onClick={() => setIsMobileMenuOpen(false)}></div>
      )}

      {/* Topbar móvil */}
      <div className="mobile-topbar mobile-only">
        <button className="hamburger-btn" onClick={() => setIsMobileMenuOpen(true)}>☰</button>
        <span className="font-bold" style={{ fontSize: '18px', color: 'hsl(var(--primary))' }}>NovarDesk</span>
        <div style={{ width: '24px' }}></div>
      </div>

      {/* Sidebar de Navegación */}
      <aside 
        className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`}
        onMouseLeave={() => {
          setIsCajaDropdownOpen(false);
          setIsFinanzasDropdownOpen(false);
        }}
      >
        <div>
          <div className="logo-section d-flex align-center gap-md p-sm" 
             
             style={{ cursor: 'pointer', transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)', userSelect: 'none' }}
            onClick={(e) => {
              const textEl = e.currentTarget.querySelector('.logo-text-container') as HTMLElement;
              const avatarEl = e.currentTarget.querySelector('.avatar') as HTMLElement;
              if (textEl && avatarEl) {
                const isHidden = textEl.style.maxWidth === '0px' || textEl.style.maxWidth === '';
                
                // Text animation
                textEl.style.maxWidth = isHidden ? '150px' : '0px';
                textEl.style.opacity = isHidden ? '1' : '0';
                textEl.style.marginLeft = isHidden ? '0px' : '-8px';
                
                // Bag scale and translate animation
                avatarEl.style.transform = isHidden ? 'scale(1) translateX(0px)' : 'scale(1.4) translateX(30px)';
              }
            }}
          >
            <div className="avatar d-flex align-center justify-center"   style={{ background: 'transparent', color: 'hsl(var(--primary))', width: '42px', height: '42px', border: 'none', transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)', transformOrigin: 'center left' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'translateX(-4px)' }}>
                {/* Asa de la bolsa (Curva de la D, la parte recta es el borde de la bolsa) */}
                <path d="M8 10V6a4 4 0 0 1 8 0v4" />
                
                {/* Cuerpo de la bolsa (Trapezoide elegante con base redondeada) */}
                <path d="M5 10h14l1 11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
                {/* Detalle de pliegue de la bolsa */}
                <path d="M4.5 13h15" strokeWidth="1" opacity="0.4" />
                
                {/* Letra N (Tipografía original con fix de renderizado para animación fluida) */}
                <text x="12" y="19.5" fontFamily="inherit" fontSize="10" fontWeight="800" textAnchor="middle" fill="currentColor" stroke="none" style={{ textRendering: 'geometricPrecision', WebkitFontSmoothing: 'antialiased' }}>N</text>
              </svg>
            </div>
            <div className="logo-text-container overflow-hidden d-flex align-center" 
              
               style={{ maxWidth: '150px', opacity: 1, transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)', whiteSpace: 'nowrap' }}
            >
              <span className="logo-text font-extrabold"   style={{ fontSize: '20px', letterSpacing: '-0.5px' }}>NovarDesk</span>
            </div>
          </div>

          <ul className="nav-links">
            {!isVendedor && (
              <li 
                className={`nav-item d-flex align-center gap-md ${activeTab === 'dashboard' ? 'active' : ''}`} style={{ cursor: 'pointer' }}
                onClick={() => React.startTransition(() => setActiveTab('dashboard'))}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
                <span>Dashboard</span>
              </li>
            )}
            <li 
              className={`nav-item d-flex align-center gap-md ${activeTab === 'pos' ? 'active' : ''}`} style={{ cursor: 'pointer' }}
              onClick={() => setActiveTab('pos')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
              <span>Punto de Venta (POS)</span>
            </li>
            
            <li className="nav-item d-flex align-center gap-md justify-between" 
              
               style={{ cursor: 'pointer' }}
              onClick={() => setIsCajaDropdownOpen(!isCajaDropdownOpen)}
            >
              <div className="d-flex align-center gap-md">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 14h18a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1z"></path><path d="M5 14v-6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6"></path><rect x="9" y="3" width="6" height="3" rx="1"></rect><circle cx="12" cy="17" r="1"></circle></svg>
                <span>Gestión de Caja</span>
              </div>
              <svg className="hide-on-collapse" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isCajaDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9"></polyline></svg>
            </li>
            
            {/* Menú Desplegable (Animado con CSS) */}
            <div className={`sidebar-dropdown ${isCajaDropdownOpen ? 'open' : ''}`}>
              {estadoCaja?.status !== 'ABIERTA' && (
                <li className="nav-item sub-menu-item d-flex align-center gap-md" 
                  
                   style={{ cursor: 'pointer' }}
                  onClick={() => {
                    React.startTransition(() => setActiveTab('pos'));
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>
                  <span>Abrir Caja</span>
                </li>
              )}
              {estadoCaja?.status === 'ABIERTA' && (
                <li className="nav-item sub-menu-item d-flex align-center gap-md" 
                  
                   style={{ cursor: 'pointer' }}
                  onClick={() => setIsCloseCajaModalOpen(true)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                  <span>Cerrar Caja Z</span>
                </li>
              )}
            </div>

            <li 
              className={`nav-item d-flex align-center gap-md ${activeTab === 'sales' ? 'active' : ''}`} style={{ cursor: 'pointer' }}
              onClick={() => React.startTransition(() => setActiveTab('sales'))}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
              <span>Historial de Ventas</span>
            </li>
            <li 
              className={`nav-item d-flex align-center gap-md ${activeTab === 'catalog' ? 'active' : ''}`} style={{ cursor: 'pointer' }}
              onClick={() => React.startTransition(() => setActiveTab('catalog'))}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
              <span>Catálogo de Productos</span>
            </li>
            <li 
              className={`nav-item d-flex align-center gap-md ${activeTab === 'clientes' ? 'active' : ''}`} style={{ cursor: 'pointer' }}
              onClick={() => React.startTransition(() => setActiveTab('clientes'))}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              <span>Clientes</span>
            </li>
            {!isVendedor && (
              <>
                <li 
                  className={`nav-item d-flex align-center gap-md ${activeTab === 'promociones' ? 'active' : ''}`} style={{ cursor: 'pointer' }}
                  onClick={() => React.startTransition(() => setActiveTab('promociones'))}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
                  <span>Promociones</span>
                </li>
                <li 
                  className={`nav-item d-flex align-center gap-md justify-between ${activeTab === 'finances' ? 'active' : ''}`} style={{ cursor: 'pointer' }}
                  onClick={() => {
                    setIsFinanzasDropdownOpen(!isFinanzasDropdownOpen);
                    if (activeTab !== 'finances') {
                      setActiveTab('finances');
                      setFinanzasSubTab('cuentas');
                    }
                  }}
                >
                  <div className="d-flex align-center gap-md">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                    <span>Contabilidad</span>
                  </div>
                  <svg className="hide-on-collapse" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isFinanzasDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }}><polyline points="6 9 12 15 18 9"></polyline></svg>
                </li>

                {/* Sub-menú Contabilidad */}
                <div className={`sidebar-dropdown ${isFinanzasDropdownOpen ? 'open' : ''}`}>
                  {([
                    { id: 'cuentas', label: 'Cuentas Contables', icon: <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg> },
                    { id: 'movimientos', label: 'Libro de Caja', icon: <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg> },
                    { id: 'gastos', label: 'Gastos / Egresos', icon: <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg> },
                    { id: 'proveedores', label: 'Proveedores', icon: <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg> },
                    { id: 'cierre', label: 'Cierre del Día', icon: <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> },
                    { id: 'historial-caja', label: 'Historial de Caja', icon: <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 14h18a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1z"></path><path d="M5 14v-6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6"></path><rect x="9" y="3" width="6" height="3" rx="1"></rect></svg> },
                  ] as { id: FinanzasTab; label: string; icon: React.ReactNode }[]).map(item => (
                    <li className="nav-item sub-menu-item d-flex align-center"
                      key={item.id}
                      
                       style={{ cursor: 'pointer', gap: '10px', paddingLeft: '36px', fontSize: '13px', background: activeTab === 'finances' && finanzasSubTab === item.id ? 'rgba(var(--primary-rgb), 0.08)' : 'transparent', color: activeTab === 'finances' && finanzasSubTab === item.id ? 'hsl(var(--primary))' : 'var(--text-secondary)', fontWeight: activeTab === 'finances' && finanzasSubTab === item.id ? '700' : '400', borderRadius: '8px', marginBottom: '2px' }}
                      onClick={() => React.startTransition(() => { setActiveTab('finances'); setFinanzasSubTab(item.id); })}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </li>
                  ))}
                </div>
                <li 
                  className={`nav-item d-flex align-center gap-md ${activeTab === 'settings' ? 'active' : ''}`} style={{ cursor: 'pointer' }}
                  onClick={() => React.startTransition(() => setActiveTab('settings'))}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                  <span>Configuración</span>
                </li>
                <li 
                  className={`nav-item d-flex align-center gap-md ${activeTab === 'import-center' ? 'active' : ''}`} style={{ cursor: 'pointer' }}
                  onClick={() => React.startTransition(() => setActiveTab('import-center'))}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                  <span>Importar Datos</span>
                </li>
              </>
            )}
          </ul>
        </div>
        
        <div className="user-profile-section d-flex flex-col gap-sm"   style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>

          {/* Tenant + User info */}
          <div className="d-flex align-center gap-md" style={{ padding: '4px 0' }}>
            <div className="avatar overflow-hidden"   style={{ flexShrink: 0, padding: tenant?.logo_url ? 0 : undefined }}>
              {tenant?.logo_url ? (
                <img
                  src={tenant.logo_url}
                  alt={tenant.razon_social}
                  className="w-full h-full" style={{ objectFit: 'cover', borderRadius: '50%' }}
                  onError={e => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                    (e.currentTarget.parentElement as HTMLElement).textContent = user?.nombre?.charAt(0).toUpperCase() || 'T';
                  }}
                />
              ) : (
                user?.nombre?.charAt(0).toUpperCase() || 'U'
              )}
            </div>
            <div className="profile-info">
              <span className="profile-name font-bold"   style={{ fontSize: '13px' }}>{tenant?.razon_social}</span>
              <span className="profile-role" style={{ fontSize: '11px' }}>{user?.nombre} · {user?.role}</span>
              <span className="badge-plan" style={{ marginTop: '4px', display: 'inline-block', marginLeft: 0 }}>Plan: {tenant?.estado_plan}</span>
            </div>
          </div>

          {/* Acciones */}
          <div className="hide-on-collapse d-flex flex-col gap-xs"  >

            {/* Toggle Tema */}
            <button
              onClick={toggleTheme}
              className="d-flex align-center w-full text-left" style={{ gap: '10px', padding: '8px 10px', background: 'none', border: 'none', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '550', transition: 'background 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
              title={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
            >
              {theme === 'light' ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line></svg>
              )}
              <span>{theme === 'light' ? 'Modo oscuro' : 'Modo claro'}</span>
            </button>

            {/* Cerrar sesión */}
            <button
              onClick={handleLogout}
              className="d-flex align-center w-full text-left" style={{ gap: '10px', padding: '8px 10px', background: 'none', border: 'none', borderRadius: '8px', cursor: 'pointer', color: 'hsl(var(--danger))', fontSize: '13px', fontWeight: '550', transition: 'background 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(220, 38, 38, 0.06)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Panel de Contenido Principal */}
      <main className="main-content">
        <header className="top-bar flex-wrap gap-lg align-center"  >
          <div className="flex-1" style={{ minWidth: '200px' }}>
            <h1 className="font-bold" style={{ fontSize: '26px' }}>
              {activeTab === 'dashboard' && 'Dashboard Gerencial'}
              {activeTab === 'catalog' && 'Inventario de Comercio'}
              {activeTab === 'import-center' && 'Centro de Importación'}
              {activeTab === 'pos' && 'Punto de Venta (POS)'}
              {activeTab === 'sales' && 'Historial de Transacciones'}
              {activeTab === 'clientes' && 'Gestión de Clientes'}
              {activeTab === 'promociones' && 'Motor de Promociones'}
              {activeTab === 'finances' && 'Gestión de Contabilidad'}
              {activeTab === 'settings' && 'Configuración de la Empresa'}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
              {activeTab === 'dashboard' && 'Monitorea el rendimiento de ventas y productos en tiempo real.'}
              {activeTab === 'catalog' && 'Administra tus productos, variantes y niveles de stock.'}
              {activeTab === 'sales' && 'Consulta y audita las ventas registradas y estados fiscales.'}
              {activeTab === 'clientes' && 'Gestiona tu base de clientes y sus historiales de compra.'}
              {activeTab === 'promociones' && 'Crea reglas automáticas de descuento para el Punto de Venta.'}
              {activeTab === 'finances' && 'Administra tus cuentas, gastos y balances financieros.'}
              {activeTab === 'settings' && 'Administra la información de tu empresa y cuentas de empleados.'}
              {activeTab === 'import-center' && 'Importa masivamente clientes y productos desde planillas de cálculo.'}
            </p>
          </div>
          
          {/* Opciones Superiores Derecha — solo acciones contextuales */}
          <div className="d-flex align-center gap-md" style={{ flexShrink: 0 }}>

            {/* Toggle layout POS */}
            {activeTab === 'pos' && estadoCaja?.status === 'ABIERTA' && (
              <div
                title={posLayout === 'classic' ? 'Cambiar a vista Caja Rápida' : 'Cambiar a vista Clásica'}
                className="d-flex align-center font-semibold" style={{ gap: '6px', cursor: 'pointer', padding: '6px 12px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', fontSize: '12px', color: 'var(--text-secondary)', userSelect: 'none', transition: 'all 0.2s' }}
                onClick={togglePosLayout}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-tertiary)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-secondary)'}
              >
                {posLayout === 'classic' ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect>
                      <rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect>
                    </svg>
                    <span>Caja Rápida</span>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                      <line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line>
                    </svg>
                    <span>Vista Clásica</span>
                  </>
                )}
              </div>
            )}

            {/* Cerrar Caja Z */}
            {activeTab === 'pos' && estadoCaja?.status === 'ABIERTA' && (
              <button
                onClick={() => setIsCloseCajaModalOpen(true)}
                className="font-semibold" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', padding: '6px 12px', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px', cursor: 'pointer' }}
              >
                Cerrar Caja Z
              </button>
            )}

          </div>
        </header>


        {visitedTabs.has('dashboard') && (
          <div className="w-full" style={{ position: activeTab === 'dashboard' ? 'relative' : 'absolute', left: activeTab === 'dashboard' ? 0 : '-10000px', top: activeTab === 'dashboard' ? 0 : '-10000px', visibility: activeTab === 'dashboard' ? 'visible' : 'hidden' }}>
            <DashboardView />
          </div>
        )}

        {activeTab === 'catalog' && (
          <>
            {/* Tarjetas de Estadísticas */}
            <section className="stats-grid">
              <div className="stat-card">
                <span className="stat-label">Total Productos</span>
                <span className="stat-value primary">{totalProducts}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Alertas de Stock Bajo (&lt; 5)</span>
                <span className="stat-value warning">{lowStockAlerts}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Valorización de Inventario</span>
                <span className="stat-value success">
                  ${totalInventoryValue.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </section>

            {/* Sección de Catálogo */}
            <section className="catalog-section">
              <div className="catalog-header">
                <input
                  type="text"
                  placeholder="Buscar por nombre, SKU o marca..."
                  className="form-input search-box"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />

                <div className="action-row">
                  {!isVendedor && (
                    <button onClick={() => setIsModalOpen(true)} className="btn-primary" style={{ width: 'auto' }}>
                      + Cargar Producto
                    </button>
                  )}
                </div>
              </div>

              {/* Filtros de Categoría */}
              <div className="d-flex gap-sm flex-wrap" style={{ padding: '12px 24px', borderBottom: '1px solid var(--border-color)' }}>
                {uniqueCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategoryFilter(cat)}
                    className={`btn-secondary`}
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      borderRadius: '100px',
                      background: activeCategoryFilter === cat ? 'rgba(var(--primary-rgb), 0.08)' : 'transparent',
                      color: activeCategoryFilter === cat ? 'hsl(var(--primary))' : 'var(--text-secondary)',
                      borderColor: activeCategoryFilter === cat ? 'hsl(var(--primary))' : 'var(--border-color)',
                      width: 'auto',
                      height: 'auto'
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Tabla de Productos */}
              <div className="product-table-wrapper">
                <table className="product-table">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Marca</th>
                      <th>Categoría</th>
                      <th>Variantes (SKU / Stock / Precio)</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingProducts ? (
                      <tr>
                        <td colSpan={5} className="text-center" style={{ padding: '40px', color: 'var(--text-muted)' }}>
                          Cargando catálogo...
                        </td>
                      </tr>
                    ) : filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center" style={{ padding: '40px', color: 'var(--text-muted)' }}>
                          No se encontraron productos en este comercio.
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map((p) => (
                        <tr key={p.id}>
                          <td className="font-semibold">{p.nombre}</td>
                          <td>{p.marca || '-'}</td>
                          <td>
                            <span className="variant-tag" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>
                              {p.categoria || 'Sin Categoría'}
                            </span>
                          </td>
                          <td>
                            <div className="d-flex flex-col" style={{ gap: '6px' }}>
                              {p.variantes.map((v) => (
                                <div key={v.id} className="d-flex align-center gap-sm flex-wrap">
                                  <span className="font-bold" style={{ fontFamily: 'monospace', fontSize: '13px' }}>
                                    {v.sku}
                                  </span>
                                  <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                                    (Stock: {v.stock_actual} | ${parseFloat(v.precio_venta as string).toLocaleString('es-AR')})
                                  </span>
                                  {Object.entries(v.atributos_extra || {}).map(([key, val]) => (
                                    <span key={key} className="attribute-pill">
                                      {key}: {String(val)}
                                    </span>
                                  ))}
                                </div>
                              ))}
                            </div>
                          </td>
                          <td>
                            {!isVendedor && (
                              <button
                                onClick={() => handleDeleteProduct(p.id)}
                                className="btn-secondary"
                                style={{
                                  padding: '6px 12px',
                                  color: 'hsl(var(--danger))',
                                  borderColor: 'rgba(220, 38, 38, 0.2)',
                                  background: 'rgba(220, 38, 38, 0.05)',
                                  width: 'auto',
                                  height: 'auto',
                                  fontSize: '12px'
                                }}
                              >
                                Eliminar
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Paginación Catálogo */}
              {productsMeta && productsMeta.totalPages > 1 && (
                <div className="d-flex justify-center gap-md align-center" style={{ marginTop: '16px' }}>
                  <button 
                    className="btn-secondary" 
                    onClick={() => setProductPage(p => Math.max(1, p - 1))}
                    disabled={productPage === 1}
                  >
                    Anterior
                  </button>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Página {productPage} de {productsMeta.totalPages}
                  </span>
                  <button 
                    className="btn-secondary" 
                    onClick={() => setProductPage(p => Math.min(productsMeta.totalPages, p + 1))}
                    disabled={productPage === productsMeta.totalPages}
                  >
                    Siguiente
                  </button>
                </div>
              )}
            </section>
          </>
        )}

        {/* MODAL CIERRE DE CAJA */}
        {isCloseCajaModalOpen && (
          <CerrarCajaModal onClose={() => setIsCloseCajaModalOpen(false)} />
        )}

        {/* MODAL APLICAR DESCUENTO */}
        {isMpModalOpen && (
          <div className="modal-overlay">
            <div className="modal-content scale-up text-center"   style={{ maxWidth: '400px', padding: '32px' }}>
              <div className="align-center justify-center" style={{ display: 'inline-flex', width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(0, 158, 227, 0.1)', color: '#009EE3', marginBottom: '16px' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>
              </div>
              
              <h2 className="font-extrabold" style={{ fontSize: '20px', marginBottom: '8px' }}>
                {mpMode === 'QR' ? 'Cobro con Código QR' : 'Cobro con Lector Smart POS'}
              </h2>
              
              <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '14px' }}>
                {mpMode === 'QR' 
                  ? 'Pídele al cliente que escanee el código QR con la app de Mercado Pago.' 
                  : 'Sigue las instrucciones en la pantalla del lector Point Smart/Plus.'}
              </p>

              {mpMode === 'QR' && mpQrData ? (
                <div className="p-md" style={{ background: '#fff', borderRadius: '12px', display: 'inline-block', marginBottom: '24px' }}>
                  {/* Simulador visual de QR */}
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(mpQrData)}`} alt="QR Code" style={{ width: '200px', height: '200px' }} />
                </div>
              ) : (
                <div style={{ padding: '40px', background: 'var(--bg-tertiary)', borderRadius: '12px', marginBottom: '24px' }}>
                  <div className="spinner" style={{ margin: '0 auto' }}></div>
                  <p className="font-semibold" style={{ marginTop: '16px', fontSize: '13px' }}>Conectando con Mercado Pago...</p>
                </div>
              )}

              <div className="d-flex flex-col gap-md">
                <button 
                  className="btn-primary"
                  style={{ background: '#009EE3', color: 'white', borderColor: '#009EE3' }}
                  onClick={async () => {
                    // SIMULADOR: Forzar pago exitoso
                    try {
                      setIsMpModalOpen(false);
                      const payload = (window as any).__pendingSalePayload;
                      if(payload) {
                        const result = await createSaleMutation.mutateAsync(payload);
                        toast.success(`Venta #${result.id} registrada exitosamente (Simulador MP).`);
                        clearCart();
                        setPagosAgregados([]);
                        setDiscountMonto(0);
                        setDiscountMotivo('');
                        setNuevoMontoPago('');
                      }
                    } catch (err:any) {
                      toast.error(err.message);
                    }
                  }}
                >
                  (Dev) Simular Pago Aprobado
                </button>
                <button 
                  className="btn-secondary"
                  onClick={() => setIsMpModalOpen(false)}
                >
                  Cancelar Cobro
                </button>
              </div>
            </div>
          </div>
        )}

        {isDescuentoModalOpen && (
          <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '400px' }}>
              <div className="modal-header">
                <h2>Aplicar Descuento</h2>
                <button onClick={() => setIsDescuentoModalOpen(false)} className="close-btn">&times;</button>
              </div>
              <div className="d-flex flex-col gap-lg" style={{ marginTop: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Motivo o Cupón</label>
                  <input type="text" className="form-input" value={discountMotivo} onChange={e => setDiscountMotivo(e.target.value)} placeholder="Ej. Cliente VIP, PROMO20" />
                </div>
                <div className="form-group">
                  <label className="form-label">Monto a Descontar ($)</label>
                  <input type="number" className="form-input" value={discountMonto === 0 ? '' : discountMonto} onChange={e => setDiscountMonto(parseFloat(e.target.value) || 0)} />
                </div>
                
                {isVendedor && (
                  <div className="form-group" style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', border: '1px dashed hsl(var(--danger))' }}>
                    <label className="form-label" style={{ color: 'hsl(var(--danger))' }}>PIN de Autorización (Administrador)</label>
                    <input className="form-input text-center" type="password" maxLength={6}  value={pinAutorizacion} onChange={e => setPinAutorizacion(e.target.value)} placeholder="****"  style={{ letterSpacing: '8px', fontSize: '20px' }} />
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>Requerido para autorizar este descuento.</span>
                  </div>
                )}

                <button 
                  type="button" 
                  className="btn-primary" 
                  onClick={async () => {
                     if (discountMonto <= 0) {
                       toast.error('El monto debe ser mayor a 0');
                       return;
                     }
                     if (isVendedor) {
                       if (!pinAutorizacion) {
                         toast.error('Debe ingresar el PIN de autorización');
                         return;
                       }
                       try {
                         await apiRequest('/auth/autorizar-pin', { method: 'POST', body: JSON.stringify({ pin: pinAutorizacion }) });
                         toast.success('Descuento autorizado por Supervisor');
                         setIsDescuentoModalOpen(false);
                         setPinAutorizacion('');
                       } catch(err:any) {
                         toast.error(err.message || 'PIN incorrecto');
                       }
                     } else {
                       setIsDescuentoModalOpen(false);
                     }
                  }}
                >
                  Confirmar Descuento
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TICKET DE VENTA POPUP */}
        {ticketSale && (
          <TicketView 
            venta={ticketSale} 
            tenant={tenant} 
            onClose={() => setTicketSale(null)} 
          />
        )}

        {/* --- VISTA PROMOCIONES --- */}
        {activeTab === 'promociones' && <PromocionesView />}

        {/* --- VISTA CLIENTES --- */}
        {activeTab === 'clientes' && <ClientesView />}

        {/* --- VISTA CONTABILIDAD (con sub-tabs) --- */}
        {activeTab === 'finances' && (
          <>
            {finanzasSubTab === 'cuentas' && <FinanzasView />}
            {finanzasSubTab === 'movimientos' && <MovimientosView />}
            {finanzasSubTab === 'gastos' && <GastosView />}
            {finanzasSubTab === 'proveedores' && <ProveedoresView />}
            {finanzasSubTab === 'cierre' && <CierreView />}
            {finanzasSubTab === 'historial-caja' && <HistorialCajaView />}
          </>
        )}
        {activeTab === 'settings' && <SettingsView />}
        {activeTab === 'import-center' && <ImportCenterView />}

        {/* --- VISTA POS --- */}
        {activeTab === 'pos' && (
          estadoCaja?.status === 'CERRADA' ? (
            <AbrirCajaModal />
          ) : posLayout === 'simple' ? (
            <PosSimpleView
              products={products}
              discountMonto={discountMonto}
              discountMotivo={discountMotivo}
              pagosAgregados={pagosAgregados}
              setPagosAgregados={setPagosAgregados}
              setDiscountMonto={setDiscountMonto}
              setDiscountMotivo={setDiscountMotivo}
              setIsDescuentoModalOpen={setIsDescuentoModalOpen}
              tenant={tenant}
              isVendedor={isVendedor}
            />
          ) : (
          <div className="pos-grid">
            {/* Columna Izquierda: Catálogo Visual */}
            <div className="pos-catalog-panel">
              <div className="pos-catalog-header">
                <input className="form-input w-full"
                  type="text"
                  placeholder="Buscar por nombre, SKU o marca..."
                  
                   style={{ fontSize: '15px' }}
                  value={posSearchQuery}
                  onChange={(e) => setPosSearchQuery(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="pos-catalog-grid">
                {products.flatMap((prod: any) => prod.variantes?.map((v: any) => ({ ...v, producto: prod })) || [])
                  .filter((v: any) => {
                    if (!posSearchQuery) return true;
                    const query = posSearchQuery.toLowerCase();
                    return v.producto.nombre.toLowerCase().includes(query) || 
                           v.sku.toLowerCase().includes(query) || 
                           v.producto.marca?.toLowerCase().includes(query);
                  })
                  .map((variante: any) => {
                    // Generar un color sutil basado en la categoría para el placeholder visual
                    const getCategoryColor = (cat: string) => {
                      if (!cat) return 'hsl(var(--primary))';
                      const hash = cat.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                      return `hsl(${(hash * 137) % 360}, 60%, 45%)`;
                    };
                    const color = getCategoryColor(variante.producto.categoria);
                    const variantName = variante.atributos_extra ? Object.values(variante.atributos_extra).join(' ') : 'Única';

                    return (
                      <div 
                        key={variante.id}
                        onClick={() => addItem(variante)}
                        className="overflow-hidden d-flex flex-col" style={{ background: 'var(--bg-primary)', borderRadius: '12px', border: '1px solid var(--border-color)', cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.02)' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-4px)';
                          e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.08)';
                          e.currentTarget.style.borderColor = color;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)';
                          e.currentTarget.style.borderColor = 'var(--border-color)';
                        }}
                      >
                        {/* Imagen Placeholder */}
                        <div style={{ height: '120px', background: `linear-gradient(135deg, ${color}22, ${color}44)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: color, fontWeight: 'bold', fontSize: '24px' }}>
                          {variante.producto.nombre.substring(0, 2).toUpperCase()}
                        </div>
                        
                        <div className="d-flex flex-col gap-xs flex-1" style={{ padding: '12px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{variante.sku}</span>
                          <span className="font-semibold" style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.2 }}>{variante.producto.nombre}</span>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{variantName}</span>
                          <span className="font-extrabold" style={{ fontSize: '16px', color: 'hsl(var(--primary))', marginTop: 'auto', paddingTop: '8px' }}>
                            ${Number(variante.precio_venta).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Columna Derecha: Panel de Carrito y Cobro (DESKTOP ONLY) */}
            <div className="pos-checkout-panel desktop-only d-flex flex-col overflow-hidden"   style={{ background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              {renderCartPanel()}
            </div>

            {/* Bottom Bar Flotante (MOBILE ONLY) */}
            <div className="mobile-cart-bar mobile-only flex-col gap-md"   style={{ alignItems: 'stretch' }}>
              <div className="d-flex justify-between align-center">
                <div className="d-flex flex-col">
                  <span className="font-semibold" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Ticket ({cartItems.length} ítems)</span>
                  <span className="font-extrabold" style={{ fontSize: '22px', color: 'hsl(var(--primary))', lineHeight: 1 }}>
                    ${cartItems.reduce((acc, item) => acc + (item.subtotal * item.cantidad), 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <button 
                  className="btn-secondary" 
                  style={{ width: 'auto', padding: '8px 16px', borderRadius: '100px', fontSize: '13px' }}
                  onClick={() => setIsMobileCartOpen(true)}
                  disabled={cartItems.length === 0}
                >
                  Ver Carrito
                </button>
              </div>
              
              <div className="d-flex gap-sm">
                <button 
                  type="button"
                  className="btn-secondary" 
                  style={{ padding: '12px', borderRadius: '8px', color: 'hsl(var(--danger))', borderColor: 'rgba(220, 38, 38, 0.2)', width: 'auto' }}
                  onClick={clearCart}
                  disabled={cartItems.length === 0}
                >
                  Vaciar
                </button>
                <button className="btn-primary flex-1 font-bold" 
                  type="button"
                   
                   style={{ padding: '12px', borderRadius: '8px', fontSize: '15px', boxShadow: '0 4px 12px rgba(var(--primary-rgb), 0.3)' }}
                  onClick={() => setIsMobileCartOpen(true)}
                  disabled={cartItems.length === 0}
                >
                  Finalizar
                </button>
              </div>
            </div>

            {/* Modal/Drawer de Carrito (MOBILE ONLY) */}
            {isMobileCartOpen && (
              <div className="mobile-cart-drawer mobile-only">
                <div className="drawer-header">
                  <h3 className="font-bold" style={{ fontSize: '18px' }}>Detalle del Ticket</h3>
                  <button onClick={() => setIsMobileCartOpen(false)} className="close-btn">&times;</button>
                </div>
                <div className="flex-1 d-flex flex-col overflow-hidden" style={{ paddingBottom: '80px' /* Espacio inferior extra para scrollear */ }}>
                  {renderCartPanel()}
                </div>
              </div>
            )}

          </div>
          )
        )}

        {activeTab === 'sales' && (
          <div className="p-lg">
            <div className="catalog-section">
              <div className="product-table-wrapper">
                <table className="product-table">
                  <thead>
                    <tr>
                      <th>ID Venta</th>
                      <th>Fecha / Hora</th>
                      <th>Cliente</th>
                      <th>Vendedor</th>
                      <th>Método de Pago</th>
                      <th>Estado Fiscal</th>
                      <th className="text-right">Total</th>
                      <th className="text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingSales ? (
                      <tr>
                        <td colSpan={8} className="text-center" style={{ padding: '40px', color: 'var(--text-muted)' }}>
                          Cargando historial de ventas...
                        </td>
                      </tr>
                    ) : sales.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center" style={{ padding: '40px', color: 'var(--text-muted)' }}>
                          No se han registrado ventas en este comercio aún.
                        </td>
                      </tr>
                    ) : (
                      sales.map((sale) => (
                        <tr key={sale.id}>
                          <td className="font-bold">#{sale.id}</td>
                          <td>{new Date(sale.fecha_venta).toLocaleString('es-AR')}</td>
                          <td>
                            <span className="font-semibold" style={{ display: 'block' }}>{sale.nombre_cliente}</span>
                            {sale.id_cliente && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>DNI/CUIT: {sale.id_cliente}</span>}
                          </td>
                          <td>{sale.usuario.nombre}</td>
                          <td>
                            <span className="variant-tag" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>
                              {sale.metodo_pago.replace('_', ' ')}
                            </span>
                          </td>
                          <td>
                            <span className={`badge-plan`} style={{ 
                              background: sale.estado_arca === 'APROBADO' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(107, 114, 128, 0.1)', 
                              color: sale.estado_arca === 'APROBADO' ? 'hsl(var(--success))' : 'var(--text-secondary)',
                              borderColor: 'transparent'
                            }}>
                              {sale.estado_arca}
                            </span>
                          </td>
                          <td className="text-right font-bold" style={{ fontFamily: 'monospace' }}>
                            ${parseFloat(sale.total as string).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="text-center">
                            <button
                              className="btn-secondary"
                              style={{ padding: '4px 10px', fontSize: '12px', width: 'auto', height: 'auto' }}
                              onClick={() => {
                                setSelectedSale(sale);
                                setIsSaleDetailOpen(true);
                              }}
                            >
                              Ver Detalle
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Paginación Ventas */}
              {salesMeta && salesMeta.totalPages > 1 && (
                <div className="d-flex justify-center gap-md align-center" style={{ marginTop: '16px' }}>
                  <button 
                    className="btn-secondary" 
                    onClick={() => setSalesPage(p => Math.max(1, p - 1))}
                    disabled={salesPage === 1}
                  >
                    Anterior
                  </button>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Página {salesPage} de {salesMeta.totalPages}
                  </span>
                  <button 
                    className="btn-secondary" 
                    onClick={() => setSalesPage(p => Math.min(salesMeta.totalPages, p + 1))}
                    disabled={salesPage === salesMeta.totalPages}
                  >
                    Siguiente
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'subscription' && (
          <div className="p-lg" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div className="auth-card scale-up text-center m-0"   style={{ padding: '40px 24px' }}>
              <div className="align-center justify-center" style={{ display: 'inline-flex', width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(var(--primary-rgb), 0.1)', color: 'hsl(var(--primary))', marginBottom: '24px' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
              </div>
              
              <h2 className="font-extrabold" style={{ fontSize: '28px', marginBottom: '8px' }}>
                Plan Actual: <span style={{ color: tenant?.estado_plan === 'ACTIVE' ? 'hsl(var(--success))' : 'inherit' }}>{tenant?.estado_plan}</span>
              </h2>
              
              <p style={{ color: 'var(--text-secondary)', fontSize: '16px', marginBottom: '32px' }}>
                {tenant?.estado_plan === 'TRIAL' && 'Estás utilizando la versión de prueba. Pásate al plan Premium para desbloquear todas las funciones sin límites.'}
                {tenant?.estado_plan === 'ACTIVE' && '¡Gracias por ser Premium! Tienes acceso a todas las funcionalidades del sistema.'}
                {tenant?.estado_plan === 'PAST_DUE' && 'Tu último pago fue rechazado. Por favor, regulariza tu situación para seguir usando el sistema.'}
                {tenant?.estado_plan === 'CANCELED' && 'Tu suscripción ha sido cancelada. Renueva tu plan para recuperar el acceso.'}
              </p>

              <div className="gap-xl text-left" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', marginBottom: '32px' }}>
                <div style={{ padding: '20px', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                  <span className="font-bold" style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Empresa</span>
                  <strong style={{ fontSize: '16px' }}>{tenant?.razon_social}</strong>
                  <div style={{ marginTop: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>CUIT: {tenant?.cuit}</div>
                </div>
                <div style={{ padding: '20px', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                  <span className="font-bold" style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Próximo Vencimiento</span>
                  <strong style={{ fontSize: '16px' }}>
                    {tenant?.fecha_proximo_cobro ? new Date(tenant.fecha_proximo_cobro).toLocaleDateString('es-AR') : (tenant?.fin_prueba ? new Date(tenant.fin_prueba).toLocaleDateString('es-AR') : 'No definido')}
                  </strong>
                </div>
              </div>

              {tenant?.estado_plan !== 'ACTIVE' && (
                <button 
                  className="btn-primary" 
                  style={{ fontSize: '16px', padding: '16px 32px', borderRadius: '100px', width: 'auto' }}
                  onClick={async () => {
                    try {
                      const res = await apiRequest<{ init_point: string }>('/tenants/subscribe', { method: 'POST' });
                      if (res.init_point) {
                        window.location.href = res.init_point;
                      }
                    } catch (err: any) {
                      toast.error('Error al generar la suscripción: ' + err.message);
                    }
                  }}
                >
                  Suscribirse por $2.500 / mes
                </button>
              )}
            </div>
          </div>
        )}


      </main>

      {/* Modal para Crear Producto */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content scale-up">
            <div className="modal-header">
              <h2 className="modal-title">Cargar Nuevo Producto</h2>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateProduct}>
              <div className="gap-lg" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                <div className="form-group">
                  <label className="form-label">Nombre del Producto</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej: Camisa Slim Fit"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Marca</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej: Levi's"
                    value={marca}
                    onChange={(e) => setMarca(e.target.value)}
                  />
                </div>
              </div>

              <div className="gap-lg" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                <div className="form-group">
                  <label className="form-label">Categoría / Rubro</label>
                  <select
                    className="form-input"
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                  >
                    <option value="Indumentaria">Indumentaria</option>
                    <option value="Almacén">Almacén (Fiambrería/Kiosco)</option>
                    <option value="Otros">Otros (Atributos Custom)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">¿Es un Servicio?</label>
                  <div className="d-flex align-center gap-sm" style={{ height: '42px' }}>
                    <input
                      type="checkbox"
                      checked={esServicio}
                      onChange={(e) => setEsServicio(e.target.checked)}
                      style={{ width: '20px', height: '20px' }}
                    />
                    <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                      El servicio no requiere control de stock físico.
                    </span>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Descripción</label>
                <textarea
                  className="form-input"
                  placeholder="Detalles sobre el producto..."
                  rows={2}
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </div>

              {/* Formulario de Variantes */}
              <div className="variants-section">
                <h3 className="font-bold" style={{ fontSize: '15px', marginBottom: '16px', color: 'hsl(var(--primary))' }}>
                  Datos de la Variante Principal (SKU)
                </h3>

                <div className="variant-form-card">
                  <div className="form-group">
                    <label className="form-label">SKU (Identificador Único)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ej: JEAN-LEV-M-BLU"
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Código de Barras</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ej: 779012345678"
                      value={codigoBarras}
                      onChange={(e) => setCodigoBarras(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Precio de Venta ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      value={precioVenta}
                      onChange={(e) => setPrecioVenta(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Stock Inicial</label>
                    <input
                      type="number"
                      step="0.001"
                      className="form-input"
                      value={stockActual}
                      onChange={(e) => setStockActual(e.target.value)}
                      required
                    />
                  </div>

                  {/* Carga dinámica de atributos según el rubro */}
                  <div className="variant-full-row" style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '12px' }}>
                    <h4 className="font-bold" style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px' }}>
                      Atributos Extra de Rubro ({categoria})
                    </h4>

                    {categoria === 'Indumentaria' && (
                      <div className="gap-lg" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                        <div className="form-group">
                          <label className="form-label">Talle</label>
                          <select className="form-input" value={talle} onChange={(e) => setTalle(e.target.value)}>
                            <option value="S">S</option>
                            <option value="M">M</option>
                            <option value="L">L</option>
                            <option value="XL">XL</option>
                            <option value="XXL">XXL</option>
                            <option value="38">38</option>
                            <option value="40">40</option>
                            <option value="42">42</option>
                            <option value="44">44</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Color</label>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="Ej: Negro"
                            value={color}
                            onChange={(e) => setColor(e.target.value)}
                          />
                        </div>
                      </div>
                    )}

                    {categoria === 'Almacén' && (
                      <div className="gap-lg" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                        <div className="form-group">
                          <label className="form-label">Unidad de Medida</label>
                          <select className="form-input" value={unidad} onChange={(e) => setUnidad(e.target.value)}>
                            <option value="unidad">Unidad</option>
                            <option value="kg">Kilogramo (kg)</option>
                            <option value="g">Gramo (g)</option>
                            <option value="litro">Litro (l)</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="form-label">¿Es Fraccionable?</label>
                          <div className="d-flex align-center gap-sm" style={{ height: '42px' }}>
                            <input
                              type="checkbox"
                              checked={fraccionable}
                              onChange={(e) => setFraccionable(e.target.checked)}
                              style={{ width: '20px', height: '20px' }}
                            />
                            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                              Permite vender en decimales (ej. 0.5 kg).
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {categoria === 'Otros' && (
                      <div className="gap-lg" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                        <div className="form-group">
                          <label className="form-label">Nombre del Atributo (Ej: material)</label>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="Ej: Material"
                            value={customKey}
                            onChange={(e) => setCustomKey(e.target.value)}
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Valor (Ej: Algodón)</label>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="Ej: Algodón"
                            value={customValue}
                            onChange={(e) => setCustomValue(e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="d-flex gap-md" style={{ marginTop: '24px' }}>
                <button type="submit" className="btn-primary" disabled={createProductMutation.isPending}>
                  {createProductMutation.isPending ? 'Guardando...' : 'Crear Producto'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para ver Detalles de Venta */}
      {isSaleDetailOpen && selectedSale && (
        <div className="modal-overlay">
          <div className="modal-content scale-up" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Detalle de Transacción #{selectedSale.id}</h2>
              <button className="close-btn" onClick={() => setIsSaleDetailOpen(false)}>
                &times;
              </button>
            </div>

            <div className="gap-lg" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)', fontSize: '13px' }}>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block' }}>Fecha y Hora:</span>
                <strong>{new Date(selectedSale.fecha_venta).toLocaleString('es-AR')}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block' }}>Vendedor:</span>
                <strong>{selectedSale.usuario.nombre} ({selectedSale.usuario.email})</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block' }}>Cliente:</span>
                <strong>{selectedSale.nombre_cliente}</strong>
                {selectedSale.id_cliente && <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '11px' }}>ID: {selectedSale.id_cliente}</span>}
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block' }}>Método de Pago:</span>
                <strong>{selectedSale.metodo_pago.replace('_', ' ')}</strong>
              </div>
            </div>

            <h3 className="font-bold" style={{ fontSize: '14px', marginBottom: '10px' }}>Artículos Vendidos</h3>
            <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
              <table className="product-table w-full"   style={{ fontSize: '13px' }}>
                <thead>
                  <tr>
                    <th className="p-sm">Artículo</th>
                    <th className="p-sm text-center">Cant.</th>
                    <th className="p-sm text-right">Unitario</th>
                    <th className="p-sm text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSale.detalles.map((det: any) => {
                    const attrs = det.variante.atributos_extra ? Object.entries(det.variante.atributos_extra)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(', ') : '';
                    const nombreDesc = det.variante.producto.nombre + (attrs ? ` (${attrs})` : '');

                    return (
                      <tr key={det.id}>
                        <td className="p-sm">
                          <span className="font-semibold" style={{ display: 'block' }}>{nombreDesc}</span>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{det.variante.sku}</span>
                        </td>
                        <td className="p-sm text-center">{Number(det.cantidad)}</td>
                        <td className="p-sm text-right">${parseFloat(det.precio_unitario as string).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                        <td className="p-sm text-right font-bold">${parseFloat(det.subtotal as string).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="d-flex justify-between align-center p-md" style={{ background: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Estado de Facturación</span>
                <span className="font-bold" style={{ display: 'block', fontSize: '14px', color: selectedSale.estado_arca === 'APROBADO' ? 'hsl(var(--success))' : 'var(--text-primary)' }}>
                  {selectedSale.estado_arca}
                </span>
              </div>
              <div className="text-right">
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Monto Total Pagado</span>
                <span className="font-bold" style={{ display: 'block', fontSize: '20px', fontFamily: 'monospace', color: 'hsl(var(--primary))' }}>
                  ${parseFloat(selectedSale.total as string).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="d-flex gap-md" style={{ marginTop: '24px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn-secondary" style={{ width: 'auto' }} onClick={() => setIsSaleDetailOpen(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
