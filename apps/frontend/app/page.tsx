'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from '../store/use-toast-store';
import { useAuthStore } from '../store/use-auth-store';
import { apiRequest } from '../lib/api-client';
import { NotificationBell } from '../components/notifications/notification-bell';
import { ClientesView } from '../components/clientes/clientes-view';
import { PromocionesView } from '../components/promociones/promociones-view';
import { SettingsView } from '../components/settings/settings-view';
import { CuentasView as FinanzasView } from '../components/finanzas/cuentas-view';
import { MovimientosView } from '../components/finanzas/movimientos-view';
import { GastosView } from '../components/finanzas/gastos-view';
import { ProveedoresView } from '../components/finanzas/proveedores-view';
import { CierreView } from '../components/finanzas/cierre-view';
import { HistorialCajaView } from '../components/finanzas/historial-caja-view';
import { InventarioView } from '../components/inventario/inventario-view';
import { DashboardView } from '../components/dashboard/dashboard-view';
import { ImportCenterView } from '../components/import/import-center-view';
import { SubscriptionView } from '../components/subscription/subscription-view';;
import { ListasPrecioView } from '../components/listas-precio/listas-precio-view';
import { useListasPrecio, useListaPrecioDetails } from '../hooks/use-listas-precio';

import { ClienteSelector } from '../components/pos/cliente-selector';
import { useProducts, useCreateProduct, useUpdateProduct } from '../hooks/use-products';
import { useEstadoCaja } from '../hooks/use-caja';
import { AbrirCajaModal, CerrarCajaModal } from '../components/pos/caja-modal';
import { TicketView } from '../components/pos/ticket-view';
import { PosSimpleView, WeighedItemModal } from '../components/pos/pos-simple-view';
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

  // Estados para la landing page y el registro de nuevos comercios
  const [authView, setAuthView] = useState<'landing' | 'login' | 'register'>('landing');
  const [activeLegalModal, setActiveLegalModal] = useState<'terms' | 'privacy' | 'dpa' | null>(null);
  const [regRazonSocial, setRegRazonSocial] = useState('');
  const [regCuit, setRegCuit] = useState('');
  const [regNombre, setRegNombre] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);

  // Estados del modal de creación de producto
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
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
  const [stockMinimo, setStockMinimo] = useState('0');

  // Atributos dinámicos específicos del rubro
  const [talle, setTalle] = useState('M');
  const [color, setColor] = useState('Azul');
  const [unidadMedida, setUnidadMedida] = useState('unidad');
  const [unidad, setUnidad] = useState('unidad');
  const [fraccionable, setFraccionable] = useState(false);
  const [customKey, setCustomKey] = useState('');
  const [customValue, setCustomValue] = useState('');

  // Nuevos estados para variantes por lote, costos y tipo de venta
  const [tallesInput, setTallesInput] = useState('');
  const [coloresInput, setColoresInput] = useState('');
  const [variantsList, setVariantsList] = useState<any[]>([]);
  const [tipoVentaAlmacen, setTipoVentaAlmacen] = useState<'unidad' | 'fraccionable'>('unidad');
  const [precioCosto, setPrecioCosto] = useState('0');
  const [isSkuManuallyEdited, setIsSkuManuallyEdited] = useState(false);

  // Filtros de búsqueda en catálogo
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('Todos');

  // Zustand Auth Store
  const { token, user, tenant, setAuth, updateTenant, logout } = useAuthStore();

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

  type TabType = 'dashboard' | 'catalog' | 'pos' | 'sales' | 'clientes' | 'promociones' | 'settings' | 'finances' | 'subscription' | 'import-center' | 'inventario' | 'listas-precio';
  type FinanzasTab = 'cuentas' | 'movimientos' | 'gastos' | 'proveedores' | 'cierre' | 'historial-caja';
  // Estado de la pestaña activa en la barra lateral
  const [activeTab, setActiveTab] = useState<TabType>('pos');
  const [finanzasSubTab, setFinanzasSubTab] = useState<FinanzasTab>('cuentas');
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(new Set(['pos']));
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCajaDropdownOpen, setIsCajaDropdownOpen] = useState(false);
  const [isFinanzasDropdownOpen, setIsFinanzasDropdownOpen] = useState(false);
  const [hasPremium, setHasPremium] = useState(false);

  useEffect(() => {
    if (tenant?.plan_tier) {
      setHasPremium(['PREMIUM', 'FULL'].includes(tenant.plan_tier));
    }
  }, [tenant?.plan_tier]);

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
  const { data: productsData, isLoading: isLoadingProducts, error: productsError, refetch: refetchCatalog } = useProducts(productPage, 50);
  const products = productsData?.data || [];
  const productsMeta = productsData?.meta;

  const { data: listasPrecio = [] } = useListasPrecio();
  const [selectedPriceListId, setSelectedPriceListId] = useState<number | 'default'>('default');
  const [weighingVariant, setWeighingVariant] = useState<any>(null);
  const { data: listDetails } = useListaPrecioDetails(
    selectedPriceListId === 'default' ? null : selectedPriceListId
  );

  const overriddenProducts = React.useMemo(() => {
    if (selectedPriceListId === 'default' || !listDetails?.items) {
      return products;
    }
    
    const customPricesMap = new Map<number, number>();
    listDetails.items.forEach((item: any) => {
      customPricesMap.set(item.variante_id, typeof item.precio === 'string' ? parseFloat(item.precio) : item.precio);
    });

    return products.map((prod: any) => ({
      ...prod,
      variantes: prod.variantes?.map((v: any) => {
        if (customPricesMap.has(v.id)) {
          return {
            ...v,
            precio_venta: customPricesMap.get(v.id)
          };
        }
        return v;
      })
    }));
  }, [products, selectedPriceListId, listDetails]);

  const { data: salesData, isLoading: isLoadingSales } = useSales(salesPage, 50);
  const sales = salesData?.data || [];
  const salesMeta = salesData?.meta;
  const createProductMutation = useCreateProduct();
  const updateProductMutation = useUpdateProduct();
  const createSaleMutation = useCreateSale();
  // Generación automática de combinaciones (Talle x Color) para Indumentaria
  useEffect(() => {
    if (editingProduct) return;

    if (categoria !== 'Indumentaria' || esServicio) {
      setVariantsList([]);
      return;
    }

    const tallesList = tallesInput.split(',').map(s => s.trim()).filter(Boolean);
    const coloresList = coloresInput.split(',').map(c => c.trim()).filter(Boolean);

    if (tallesList.length === 0 && coloresList.length === 0) {
      setVariantsList([]);
      return;
    }

    const baseSku = sku || 'PROD';
    const basePrice = precioVenta || '0';
    const baseCost = precioCosto || '0';
    const baseMinStock = stockMinimo || '0';
    const newList: any[] = [];

    const generateVariantObj = (t: string, c: string) => {
      const existing = variantsList.find(v => v.talle === t && v.color === c);
      if (existing) {
        return existing;
      }
      const suffixT = t ? `-${t.toUpperCase()}` : '';
      const suffixC = c ? `-${c.toUpperCase()}` : '';
      return {
        talle: t,
        color: c,
        sku: `${baseSku}${suffixT}${suffixC}`.replace(/\s+/g, ''),
        codigoBarras: '',
        precioVenta: basePrice,
        costo: baseCost,
        stockActual: '0',
        stockMinimo: baseMinStock
      };
    };

    if (tallesList.length > 0 && coloresList.length > 0) {
      tallesList.forEach(t => {
        coloresList.forEach(c => {
          newList.push(generateVariantObj(t, c));
        });
      });
    } else if (tallesList.length > 0) {
      tallesList.forEach(t => {
        newList.push(generateVariantObj(t, ''));
      });
    } else if (coloresList.length > 0) {
      coloresList.forEach(c => {
        newList.push(generateVariantObj('', c));
      });
    }

    setVariantsList(newList);
  }, [tallesInput, coloresInput, categoria, sku, precioVenta, stockMinimo, precioCosto, editingProduct, esServicio]);

  // Sugerencia automática de SKU basada en Nombre y Marca del Producto
  useEffect(() => {
    if (editingProduct || isSkuManuallyEdited) return;

    if (!nombre) {
      setSku('');
      return;
    }

    const clean = (str: string) => {
      return str
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^A-Z0-9]/g, '');
    };

    const nameParts = nombre.split(/\s+/).map(p => clean(p)).filter(Boolean);
    let nameCode = '';
    if (nameParts.length > 0) {
      const firstPart = nameParts[0];
      if (firstPart) {
        if (nameParts.length === 1) {
          nameCode = firstPart.substring(0, 5);
        } else {
          const initials = nameParts.slice(1).map(p => p.charAt(0)).join('');
          nameCode = firstPart.substring(0, 3) + initials.substring(0, 3);
        }
      }
    }

    const brandCode = marca ? clean(marca).substring(0, 3) : '';
    const suggestedSku = brandCode ? `${nameCode}-${brandCode}` : nameCode;

    setSku(suggestedSku);
  }, [nombre, marca, isSkuManuallyEdited, editingProduct]);

  // Asegurar hidratación en el cliente para evitar mismatch de SSR con Zustand Persist
  useEffect(() => {
    setMounted(true);

    // Sincronizar permisos de plan desde el backend al cargar (ej. después del checkout)
    if (token) {
      apiRequest<any>('/tenants/my-plan')
        .then(data => {
          if (data && data.plan_tier) {
            updateTenant({ plan_tier: data.plan_tier, estado_plan: data.estado_plan });
          }
        })
        .catch(console.error);
    }

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
  const globalSubtotal = cartItems.reduce((acc, item) => acc + item.subtotal, 0);
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

  const getLegalModalTitle = () => {
    switch (activeLegalModal) {
      case 'terms': return 'Términos y Condiciones de Uso';
      case 'privacy': return 'Política de Privacidad y Tratamiento de Datos';
      case 'dpa': return 'Acuerdo de Tratamiento de Datos (DPA)';
      default: return '';
    }
  };

  const renderLegalModalContent = () => {
    switch (activeLegalModal) {
      case 'terms':
        return (
          <div>
            <h4>1. Aceptación de los Términos</h4>
            <p>Al registrarse y utilizar la plataforma NovarDesk ERP, usted acepta y se obliga a cumplir con estos Términos y Condiciones de Uso. Si no está de acuerdo con alguna cláusula, le solicitamos que no utilice nuestro servicio.</p>
            
            <h4>2. Descripción del Servicio</h4>
            <p>NovarDesk ERP proporciona un sistema integral de gestión empresarial basado en la nube. Incluye control de inventario, punto de venta (POS), facturación electrónica, administración de listas de precios y cuentas corrientes. El servicio se ofrece bajo modelos de suscripción mensual.</p>
            
            <h4>3. Registro y Cuenta de Usuario</h4>
            <p>Para utilizar el servicio es indispensable registrarse y crear una cuenta de comercio. Usted es responsable de mantener la confidencialidad de sus credenciales de acceso y de todas las actividades que ocurran bajo su cuenta.</p>
            
            <h4>4. Período de Prueba Gratis y Suscripción</h4>
            <p>NovarDesk ERP ofrece un período de prueba gratuito de 14 días para nuevos usuarios. Al finalizar el período, para continuar utilizando el servicio deberá suscribirse a uno de nuestros planes de pago. Los pagos se realizan por adelantado de forma mensual y no son reembolsables.</p>
            
            <h4>5. Limitaciones de Responsabilidad</h4>
            <p>NovarDesk ERP no será responsable por daños indirectos, incidentales, especiales o consecuentes que resulten del uso o la imposibilidad de usar el servicio. El usuario asume toda la responsabilidad por la carga de stock, precios y la emisión de comprobantes ante las entidades fiscales pertinentes.</p>
          </div>
        );
      case 'privacy':
        return (
          <div>
            <h4>1. Información que Recopilamos</h4>
            <p>Recopilamos información relacionada con su comercio (Razón Social, CUIT, correo electrónico del administrador, etc.), así como datos comerciales cargados por el usuario para el funcionamiento del ERP (productos, clientes, listas de precios y registros de ventas).</p>
            
            <h4>2. Uso de la Información</h4>
            <p>La información recopilada se utiliza exclusivamente para proporcionar, mantener y mejorar el servicio de NovarDesk ERP, procesar transacciones y brindar soporte técnico. Bajo ninguna circunstancia vendemos, alquilamos ni compartimos sus datos con terceros con fines comerciales.</p>
            
            <h4>3. Seguridad de los Datos</h4>
            <p>Implementamos medidas de seguridad técnicas y organizativas adecuadas para proteger sus datos personales y comerciales contra el acceso no autorizado, alteración, divulgación o destrucción. Usamos bases de datos cifradas y conexiones SSL seguras.</p>
            
            <h4>4. Derechos del Usuario</h4>
            <p>Usted conserva todos los derechos sobre la propiedad de sus datos comerciales. Puede acceder, rectificar, exportar o eliminar sus datos personales y comerciales en cualquier momento contactando a nuestro soporte.</p>
          </div>
        );
      case 'dpa':
        return (
          <div>
            <h4>1. Objeto y Alcance</h4>
            <p>Este Acuerdo de Tratamiento de Datos (DPA) regula el procesamiento de datos personales y comerciales que realiza NovarDesk ERP en calidad de encargado de tratamiento, por cuenta del cliente (responsable del tratamiento), en el marco del servicio contratado.</p>
            
            <h4>2. Instrucciones del Responsable</h4>
            <p>NovarDesk procesará los datos únicamente de acuerdo con las instrucciones documentadas del Cliente y para las finalidades específicas de gestión comercial del ERP, salvo que la ley aplicable exija lo contrario.</p>
            
            <h4>3. Confidencialidad y Seguridad</h4>
            <p>NovarDesk garantiza que todo el personal autorizado para tratar los datos se compromete a mantener absoluta confidencialidad. Asimismo, implementamos controles de seguridad robustos para prevenir incidentes de datos.</p>
            
            <h4>4. Subcontratación y Transferencias</h4>
            <p>El cliente autoriza a NovarDesk a utilizar subencargados (como proveedores de infraestructura en la nube) que cumplan con estándares de protección de datos equivalentes a los establecidos en este acuerdo.</p>
            
            <h4>5. Auditoría y Colaboración</h4>
            <p>NovarDesk colaborará con el cliente en la medida de lo posible para responder a solicitudes de derechos de los titulares de datos y auditorías de cumplimiento normativo aplicable.</p>
          </div>
        );
      default:
        return null;
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    setRegLoading(true);
    try {
      await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          razon_social: regRazonSocial,
          cuit: regCuit || undefined,
          nombre: regNombre,
          email: regEmail,
          password: regPassword,
        }),
      });
      toast.success('¡Registro exitoso! Iniciando sesión automáticamente...');
      
      // Auto-iniciar sesión transparente
      try {
        const loginData = await apiRequest<{ access_token: string; user: any; tenant: any }>('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email: regEmail, password: regPassword }),
        });
        setAuth(loginData.access_token, loginData.user, loginData.tenant);
        if (loginData.user.role !== 'Vendedor') {
          setActiveTab('dashboard');
        } else {
          setActiveTab('pos');
        }
      } catch (loginErr) {
        setEmail(regEmail);
        setPassword(regPassword);
        setAuthView('login');
        toast.info('Ingresa tu contraseña para iniciar sesión.');
      }
    } catch (err: any) {
      setRegError(err.message || 'Error al registrar tu comercio');
    } finally {
      setRegLoading(false);
    }
  };


  // --- CONTROLADORES DEL FORMULARIO DE PRODUCTOS ---
  const closeProductModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    setNombre('');
    setDescripcion('');
    setMarca('');
    setSku('');
    setCodigoBarras('');
    setPrecioVenta('0');
    setPrecioCosto('0');
    setStockActual('0');
    setStockMinimo('0');
    setTalle('M');
    setColor('Azul');
    setUnidadMedida('unidad');
    setUnidad('unidad');
    setFraccionable(false);
    setCustomKey('');
    setCustomValue('');
    setTallesInput('');
    setColoresInput('');
    setVariantsList([]);
    setTipoVentaAlmacen('unidad');
    setIsSkuManuallyEdited(false);
    setEsServicio(false);
  };

  const openEditProductModal = (product: any) => {
    setIsSkuManuallyEdited(true);
    setEditingProduct(product);
    setNombre(product.nombre);
    setDescripcion(product.descripcion || '');
    setCategoria(product.categoria || 'Indumentaria');
    setMarca(product.marca || '');
    setEsServicio(product.es_servicio);
    setUnidadMedida(product.unidad_medida || 'unidad');
    
    // Configuración específica de Almacén
    if (product.categoria === 'Almacén') {
      const isFrac = product.variantes?.[0]?.atributos_extra?.fraccionable === true || product.variantes?.[0]?.atributos_extra?.fraccionable === 'true';
      setTipoVentaAlmacen(isFrac ? 'fraccionable' : 'unidad');
      setFraccionable(isFrac);
      setUnidad(product.variantes?.[0]?.atributos_extra?.unidad || 'unidad');
    }
    
    // Carga de variantes para edición
    const loadedVariants = product.variantes?.map((v: any) => ({
      id: v.id,
      talle: v.atributos_extra?.talle || '',
      color: v.atributos_extra?.color || '',
      sku: v.sku,
      codigoBarras: v.codigo_barras || '',
      precioVenta: String(v.precio_venta),
      costo: String(v.costo || 0),
      stockActual: String(v.stock_actual),
      stockMinimo: String(v.stock_minimo || 0)
    })) || [];
    setVariantsList(loadedVariants);

    // Extraer talles y colores únicos para prellenar los campos de texto
    const tallesSet = new Set(loadedVariants.map((v: any) => v.talle).filter(Boolean));
    const coloresSet = new Set(loadedVariants.map((v: any) => v.color).filter(Boolean));
    setTallesInput(Array.from(tallesSet).join(', '));
    setColoresInput(Array.from(coloresSet).join(', '));

    // Primera variante (fallback de inputs principales)
    const v = product.variantes?.[0];
    if (v) {
      setSku(v.sku);
      setCodigoBarras(v.codigo_barras || '');
      setPrecioVenta(String(v.precio_venta));
      setPrecioCosto(String(v.costo || 0));
      setStockActual(String(v.stock_actual));
      setStockMinimo(String(v.stock_minimo || 0));
      
      const extras = v.atributos_extra || {};
      if (product.categoria === 'Indumentaria') {
        setTalle(extras.talle || 'M');
        setColor(extras.color || 'Azul');
      } else if (product.categoria === 'Otros') {
        const keys = Object.keys(extras);
        if (keys.length > 0) {
          setCustomKey(keys[0] || '');
          setCustomValue(String(extras[keys[0] || ''] || ''));
        }
      }
    }
    setIsModalOpen(true);
  };

  const handleSubmitProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    // Estructurar atributos extra basados en el rubro/categoría
    let atributos_extra: Record<string, any> = {};
    if (esServicio) {
      atributos_extra = {};
    } else if (categoria === 'Indumentaria') {
      atributos_extra = { talle, color };
    } else if (categoria === 'Almacén') {
      const isFrac = tipoVentaAlmacen === 'fraccionable';
      atributos_extra = { 
        unidad: isFrac ? unidadMedida : 'unidad', 
        fraccionable: isFrac 
      };
    } else if (categoria === 'Otros' && customKey) {
      atributos_extra = { [customKey]: customValue };
    }

    // Construir lista de variantes para el payload
    let variantesPayload: any[] = [];
    if (variantsList.length > 0 && !esServicio) {
      variantesPayload = variantsList.map(v => ({
        id: v.id || undefined,
        sku: v.sku,
        codigo_barras: v.codigoBarras || undefined,
        precio_venta: Number(v.precioVenta),
        costo: Number(v.costo || 0),
        stock_actual: Number(v.stockActual),
        stock_minimo: Number(v.stockMinimo),
        atributos_extra: { talle: v.talle, color: v.color }
      }));
    } else {
      variantesPayload = [
        {
          sku,
          codigo_barras: codigoBarras || undefined,
          precio_venta: Number(precioVenta),
          costo: Number(precioCosto || 0),
          stock_actual: esServicio ? 0 : Number(stockActual),
          stock_minimo: esServicio ? 0 : Number(stockMinimo),
          atributos_extra
        }
      ];
    }

    const payload: any = {
      nombre,
      descripcion: descripcion || undefined,
      categoria: categoria || undefined,
      marca: marca || undefined,
      es_servicio: esServicio,
      unidad_medida: !esServicio && categoria === 'Almacén' && tipoVentaAlmacen === 'fraccionable' ? unidadMedida : 'unidad',
      variantes: variantesPayload,
    };

    try {
      if (editingProduct) {
        await updateProductMutation.mutateAsync({ id: editingProduct.id, product: payload });
        toast.success('Producto actualizado exitosamente');
      } else {
        await createProductMutation.mutateAsync(payload);
        toast.success('Producto creado exitosamente');
      }
      
      closeProductModal();
      refetchCatalog();
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar el producto');
    }
  };

  // Función para abrir el modal con defaults según rubro
  const openProductModal = () => {
    setEditingProduct(null);
    setNombre('');
    setDescripcion('');
    setMarca('');
    setSku('');
    setCodigoBarras('');
    setPrecioVenta('0');
    setPrecioCosto('0');
    setStockActual('0');
    setStockMinimo('0');
    setTalle('M');
    setColor('Azul');
    setUnidad('unidad');
    setFraccionable(false);
    setCustomKey('');
    setCustomValue('');
    setTallesInput('');
    setColoresInput('');
    setVariantsList([]);
    setTipoVentaAlmacen('unidad');
    setIsSkuManuallyEdited(false);

    setIsModalOpen(true);
    if (tenant?.rubro === 'Forrajeria/Semilleria') {
      setUnidadMedida('kg');
      setTipoVentaAlmacen('fraccionable');
    } else {
      setUnidadMedida('unidad');
      setTipoVentaAlmacen('unidad');
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
    const subtotal = cartItems.reduce((acc, item) => acc + item.subtotal, 0);
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

  // --- RENDER VISTA LANDING / LOGIN / REGISTER ---
  if (!token) {
    return (
      <div className="landing-wrapper">
        <style dangerouslySetInnerHTML={{ __html: `
          .landing-wrapper {
            background: var(--bg-primary);
            color: var(--text-primary);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            position: relative;
            font-family: var(--font-sans), system-ui, -apple-system, sans-serif;
          }
          
          /* Top Bar Promocional */
          .promo-topbar {
            background-color: #0c2540;
            color: #ffffff;
            padding: 10px 24px;
            font-size: 13px;
            font-weight: 500;
            text-align: center;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            z-index: 101;
            position: relative;
            letter-spacing: 0.02em;
          }
          .promo-topbar-link {
            color: #38bdf8;
            font-weight: 700;
            cursor: pointer;
            text-decoration: underline;
            margin-left: 4px;
          }
          .promo-topbar-link:hover {
            color: #7dd3fc;
          }

          /* Navigation Bar */
          .landing-navbar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 48px;
            background: rgba(255, 255, 255, 0.85);
            border-bottom: 1px solid rgba(226, 232, 240, 0.8);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            position: sticky;
            top: 0;
            z-index: 100;
            transition: all 0.3s ease;
          }
          [data-theme='dark'] .landing-navbar {
            background: rgba(15, 23, 42, 0.85);
            border-bottom: 1px solid rgba(51, 65, 85, 0.8);
          }
          .navbar-brand {
            font-size: 22px;
            font-weight: 800;
            letter-spacing: -0.03em;
            background: linear-gradient(135deg, hsl(var(--primary)) 0%, #a855f7 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            cursor: pointer;
            transition: opacity 0.2s;
          }
          .navbar-brand:hover {
            opacity: 0.9;
          }
          .navbar-links {
            display: flex;
            gap: 32px;
            align-items: center;
          }
          .navbar-link {
            font-size: 14.5px;
            font-weight: 600;
            color: var(--text-secondary);
            text-decoration: none;
            cursor: pointer;
            transition: color 0.2s ease;
          }
          .navbar-link:hover {
            color: hsl(var(--primary));
          }
          .navbar-actions {
            display: flex;
            gap: 12px;
            align-items: center;
          }

          /* Hero Section */
          .hero-section {
            padding: 96px 24px 80px 24px;
            background: linear-gradient(135deg, rgba(239, 246, 255, 0.5) 0%, rgba(249, 250, 251, 0.9) 50%, rgba(243, 232, 255, 0.3) 100%);
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 24px;
            position: relative;
            overflow: hidden;
          }
          [data-theme='dark'] .hero-section {
            background: linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.8) 50%, rgba(24, 24, 37, 0.8) 100%);
          }
          .hero-badge {
            background: rgba(59, 130, 246, 0.08);
            border: 1px solid rgba(59, 130, 246, 0.2);
            color: #2563eb;
            font-size: 13px;
            font-weight: 700;
            padding: 6px 18px;
            border-radius: 99px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            box-shadow: 0 2px 8px rgba(37, 99, 235, 0.05);
          }
          [data-theme='dark'] .hero-badge {
            background: rgba(56, 189, 248, 0.1);
            border: 1px solid rgba(56, 189, 248, 0.3);
            color: #38bdf8;
          }
          .hero-title {
            font-size: 56px;
            font-weight: 800;
            line-height: 1.15;
            letter-spacing: -0.03em;
            max-width: 900px;
            color: #0f172a;
            margin: 0;
          }
          [data-theme='dark'] .hero-title {
            color: #f8fafc;
          }
          .hero-subtitle {
            font-size: 18px;
            color: #475569;
            max-width: 750px;
            line-height: 1.6;
            margin: 0;
          }
          [data-theme='dark'] .hero-subtitle {
            color: #cbd5e1;
          }
          .hero-actions {
            display: flex;
            gap: 16px;
            margin-top: 8px;
          }
          .video-container {
            width: 100%;
            max-width: 860px;
            margin: 48px auto 0 auto;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
            border: 1px solid rgba(226, 232, 240, 0.8);
            background: #000;
            aspect-ratio: 16/9;
          }
          [data-theme='dark'] .video-container {
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4);
            border: 1px solid rgba(51, 65, 85, 0.8);
          }

          /* Marquesina Infinita */
          .marquee-section {
            background: var(--bg-secondary);
            border-top: 1px solid var(--border-color);
            border-bottom: 1px solid var(--border-color);
            padding: 32px 0;
            overflow: hidden;
            position: relative;
          }
          .marquee-title {
            font-size: 13px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            color: var(--text-muted);
            text-align: center;
            margin-bottom: 20px;
          }
          .marquee-wrapper {
            display: flex;
            overflow: hidden;
            width: 100%;
            mask-image: linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%);
            -webkit-mask-image: linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%);
          }
          .marquee-track {
            display: flex;
            gap: 64px;
            animation: scroll-marquee 25s linear infinite;
            min-width: max-content;
          }
          @keyframes scroll-marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .marquee-item {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 17px;
            font-weight: 700;
            color: var(--text-secondary);
            white-space: nowrap;
          }
          .marquee-icon {
            font-size: 20px;
          }

          /* Secciones Generales */
          .landing-section {
            padding: 96px 24px;
            max-width: 1200px;
            margin: 0 auto;
            width: 100%;
          }
          .section-header {
            text-align: center;
            margin-bottom: 64px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 16px;
          }
          .section-title {
            font-size: 38px;
            font-weight: 800;
            letter-spacing: -0.03em;
            color: #0f172a;
            margin: 0;
          }
          [data-theme='dark'] .section-title {
            color: #f8fafc;
          }
          .section-desc {
            font-size: 17px;
            color: var(--text-secondary);
            max-width: 650px;
            line-height: 1.6;
            margin: 0;
          }

          /* Dolores vs Soluciones */
          .pain-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
            gap: 32px;
          }
          .pain-card {
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: 16px;
            padding: 36px;
            display: flex;
            flex-direction: column;
            gap: 24px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .pain-card:hover {
            transform: translateY(-6px);
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.08);
            border-color: rgba(59, 130, 246, 0.3);
          }
          .pain-item {
            display: flex;
            gap: 16px;
          }
          .pain-icon-red {
            color: #a855f7; /* Violeta/Púrpura del Logo */
            font-weight: 900;
            flex-shrink: 0;
            font-size: 20px;
            line-height: 1.2;
          }
          .pain-icon-green {
            color: #2563eb; /* Azul del Logo */
            font-weight: 900;
            flex-shrink: 0;
            font-size: 20px;
            line-height: 1.2;
          }
          .pain-text h4 {
            font-size: 16px;
            font-weight: 700;
            margin: 0 0 6px 0;
          }
          .pain-text p {
            font-size: 14px;
            color: var(--text-secondary);
            line-height: 1.5;
            margin: 0;
          }

          /* Funcionalidades */
          .features-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 32px;
          }
          .feature-card {
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: 16px;
            padding: 32px;
            display: flex;
            align-items: flex-start;
            gap: 20px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
            transition: all 0.3s ease;
          }
          .feature-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 20px -8px rgba(0, 0, 0, 0.08);
          }
          .feature-icon-wrapper {
            background: rgba(59, 130, 246, 0.08);
            color: #2563eb;
            padding: 14px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }
          [data-theme='dark'] .feature-icon-wrapper {
            background: rgba(56, 189, 248, 0.1);
            color: #38bdf8;
          }
          .feature-info h4 {
            font-size: 17px;
            font-weight: 700;
            margin: 0 0 8px 0;
          }
          .feature-info p {
            font-size: 14px;
            color: var(--text-secondary);
            line-height: 1.5;
            margin: 0;
          }

          /* Planes y Pricing */
          .pricing-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 24px;
            margin-top: 16px;
          }
          
          @media (max-width: 1024px) and (min-width: 769px) {
            .pricing-grid {
              grid-template-columns: repeat(2, 1fr);
              gap: 24px;
            }
          }
          .price-card {
            background: var(--bg-primary);
            border: 1px solid var(--border-color);
            border-radius: 20px;
            padding: 40px 32px;
            display: flex;
            flex-direction: column;
            position: relative;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .price-card:hover {
            transform: translateY(-8px);
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.08);
          }
          .price-card.recommended {
            border: 2px solid #2563eb;
            box-shadow: 0 20px 40px -10px rgba(59, 130, 246, 0.15);
            background: linear-gradient(180deg, var(--bg-primary) 0%, rgba(59, 130, 246, 0.02) 100%);
          }
          [data-theme='dark'] .price-card.recommended {
            border: 2px solid #38bdf8;
            box-shadow: 0 20px 40px -10px rgba(56, 189, 248, 0.15);
          }
          .recommended-badge {
            position: absolute;
            top: -14px;
            right: 28px;
            background: #2563eb;
            color: #fff;
            font-size: 11px;
            font-weight: 800;
            padding: 6px 14px;
            border-radius: 99px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
          }
          [data-theme='dark'] .recommended-badge {
            background: #38bdf8;
            color: #0f172a;
          }
          .price-title {
            font-size: 19px;
            font-weight: 700;
            margin: 0 0 16px 0;
          }
          .price-val {
            font-size: 38px;
            font-weight: 800;
            line-height: 1;
            color: #0f172a;
          }
          [data-theme='dark'] .price-val {
            color: #f8fafc;
          }
          .price-period {
            font-size: 14px;
            color: var(--text-muted);
            font-weight: 500;
          }
          .price-desc {
            font-size: 14px;
            color: var(--text-secondary);
            margin: 12px 0 28px 0;
            min-height: 42px;
          }
          .price-features {
            list-style: none;
            padding: 0;
            margin: 0 0 32px 0;
            display: flex;
            flex-direction: column;
            gap: 14px;
            flex: 1;
          }
          .price-feature {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 14px;
            color: var(--text-primary);
          }
          .price-feature.disabled {
            color: var(--text-muted);
            text-decoration: line-through;
            opacity: 0.6;
          }

          /* Floating WhatsApp */
          .floating-whatsapp {
            position: fixed;
            bottom: 32px;
            right: 32px;
            z-index: 9999;
            background: #25d366;
            color: #fff;
            width: 64px;
            height: 64px;
            border-radius: 50%;
            box-shadow: 0 8px 24px rgba(37, 211, 102, 0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            text-decoration: none;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .floating-whatsapp:hover {
            transform: scale(1.1) translateY(-2px);
            box-shadow: 0 12px 30px rgba(37, 211, 102, 0.6);
          }
          .floating-whatsapp::after {
            content: 'Chatea con un asesor';
            position: absolute;
            right: 80px;
            background: var(--bg-secondary);
            color: var(--text-primary);
            border: 1px solid var(--border-color);
            font-size: 13px;
            font-weight: 600;
            padding: 10px 18px;
            border-radius: 10px;
            white-space: nowrap;
            opacity: 0;
            transform: translateX(10px);
            pointer-events: none;
            transition: all 0.3s ease;
            box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05);
          }
          .floating-whatsapp:hover::after {
            opacity: 1;
            transform: translateX(0);
          }
          .whatsapp-pulse {
            position: absolute;
            width: 100%;
            height: 100%;
            background: #25d366;
            border-radius: 50%;
            z-index: -1;
            animation: pulse-ring 2s infinite;
            opacity: 0.4;
          }
          @keyframes pulse-ring {
            0% { transform: scale(1); opacity: 0.4; }
            100% { transform: scale(1.4); opacity: 0; }
          }

          /* Modal Legal Styling */
          .legal-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.4);
            backdrop-filter: blur(4px);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          .legal-modal-card {
            background: var(--bg-primary);
            border: 1px solid var(--border-color);
            border-radius: 16px;
            width: 100%;
            max-width: 720px;
            max-height: 80vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            animation: modal-enter 0.2s ease-out;
          }
          @keyframes modal-enter {
            from { opacity: 0; transform: scale(0.95) translateY(10px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }
          .legal-modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px 24px;
            border-bottom: 1px solid var(--border-color);
          }
          .legal-modal-header h3 {
            margin: 0;
            font-size: 18px;
            font-weight: 800;
            color: var(--text-primary);
          }
          .legal-modal-close {
            background: none;
            border: none;
            color: var(--text-muted);
            font-size: 18px;
            cursor: pointer;
            padding: 4px;
            transition: color 0.2s;
          }
          .legal-modal-close:hover {
            color: var(--text-primary);
          }
          .legal-modal-body {
            padding: 24px;
            overflow-y: auto;
            font-size: 14px;
            line-height: 1.6;
            color: var(--text-secondary);
            text-align: left;
          }
          .legal-modal-body h4 {
            font-size: 15px;
            font-weight: 700;
            color: var(--text-primary);
            margin: 20px 0 8px 0;
          }
          .legal-modal-body h4:first-child {
            margin-top: 0;
          }
          .legal-modal-body p {
            margin: 0 0 12px 0;
          }

          /* Footer links */
          .footer-links-container {
            display: flex;
            gap: 24px;
            justify-content: center;
            flex-wrap: wrap;
            margin-bottom: 16px;
          }
          .footer-link {
            cursor: pointer;
            color: var(--text-secondary);
            font-weight: 600;
            transition: color 0.2s ease;
          }
          .footer-link:hover {
            color: #2563eb;
            text-decoration: underline;
          }
          [data-theme='dark'] .footer-link:hover {
            color: #38bdf8;
          }

          @media (max-width: 768px) {
            .landing-navbar {
              padding: 16px 24px;
              flex-direction: column;
              gap: 16px;
            }
            .navbar-links {
              gap: 20px;
              flex-wrap: wrap;
              justify-content: center;
            }
            .navbar-actions {
              width: 100%;
              justify-content: center;
              flex-wrap: wrap;
            }
            .hero-title {
              font-size: 36px;
            }
            .hero-section {
              padding: 64px 20px;
            }
            .landing-section {
              padding: 64px 20px;
            }
            .hero-actions {
              flex-direction: column;
              width: 100%;
              gap: 12px;
            }
            .hero-actions button, .hero-actions a {
              width: 100% !important;
            }
            .pricing-grid {
              grid-template-columns: 1fr;
              gap: 24px;
            }
          }
        ` }} />

        {authView === 'landing' && (
          <>
            {/* Top Bar Promocional */}
            <div className="promo-topbar">
              <span>🚀 ¡Probá el sistema de gestión completo por solo $29000! Sin tarjetas ni contratos.</span>
              <span className="promo-topbar-link" onClick={() => setAuthView('register')}>Empezar hoy mismo &rarr;</span>
            </div>

            {/* Navigation Bar */}
            <header className="landing-navbar">
              <div className="navbar-brand" onClick={() => setAuthView('landing')}>NovarDesk ERP</div>
              <nav className="navbar-links">
                <a href="#soluciones" className="navbar-link">Soluciones</a>
                <a href="#funciones" className="navbar-link">Funcionalidades</a>
                <a href="#planes" className="navbar-link">Planes</a>
              </nav>
              <div className="navbar-actions">
                <button 
                  className="btn-secondary" 
                  style={{ width: 'auto', height: '38px', padding: '0 16px', fontSize: '13px', margin: 0 }} 
                  onClick={() => setAuthView('login')}
                >
                  Iniciar Sesión
                </button>
                <a 
                  href="https://wa.me/5491123456789?text=Hola!%20Me%20gustaria%20solicitar%20una%20demo%20guiada%20de%20NovarDesk%20ERP"
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn-secondary d-flex align-center justify-center" 
                  style={{ width: 'auto', height: '38px', padding: '0 16px', fontSize: '13px', margin: 0, textDecoration: 'none', borderColor: 'hsl(var(--primary))', color: 'hsl(var(--primary))', gap: '8px' }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#25d366' }}>
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.623-1.023-5.086-2.885-6.948C16.2 2.016 13.75 1.006 11.75 1.006c-5.437 0-9.863 4.37-9.866 9.801 0 1.768.47 3.49 1.362 5.022L2.245 21.5l5.89-1.53c.026.002.049.006.074.006.01 0 .02 0 .03-.001.01 0 .02.001.03.001.031-.001.054-.003.084-.006l.114-.015zM17.33 14.39c-.287-.144-1.702-.84-1.965-.936-.263-.096-.456-.144-.648.144-.192.288-.744.936-.912 1.128-.168.192-.336.216-.624.072-1.352-.677-2.28-1.21-3.188-2.77-.24-.412.24-.383.687-1.272.072-.144.036-.271-.018-.38-.054-.107-.456-1.104-.624-1.51-.164-.397-.333-.343-.456-.349-.12-.006-.26-.007-.4-.007-.14 0-.368.052-.56.26-.192.208-.732.716-.732 1.745s.748 2.023.852 2.164c.104.14 1.472 2.248 3.566 3.149 2.094.9 2.094.6 2.454.564.36-.036 1.702-.696 1.942-1.368.24-.672.24-1.248.168-1.368-.072-.12-.264-.216-.552-.36z"/>
                  </svg>
                  Solicitar Demo
                </a>
                <button 
                  className="btn-primary" 
                  style={{ width: 'auto', height: '38px', padding: '0 16px', fontSize: '13px', margin: 0 }} 
                  onClick={() => setAuthView('register')}
                >
                  Crear Cuenta
                </button>
              </div>
            </header>

            {/* Hero Section */}
            <section className="hero-section">
              <div className="hero-badge">Revolucionando Comercios</div>
              <h1 className="hero-title">El sistema de gestión que ordena tu negocio</h1>
              <p className="hero-subtitle">
                Centralizá ventas, facturación electrónica, stock en tiempo real, múltiples listas de precios y cuentas corrientes en una sola plataforma en la nube. Simple, veloz y sin instalaciones.
              </p>
              <div className="hero-actions">
                <button 
                  className="btn-primary shadow-lg" 
                  style={{ width: 'auto', height: '48px', padding: '0 32px', fontSize: '15px' }} 
                  onClick={() => setAuthView('register')}
                >
                  Crear Cuenta Gratis (14 días)
                </button>
                <a 
                  href="https://wa.me/5491123456789?text=Hola!%20Me%20gustaria%20recibir%20una%20demo%20de%20NovarDesk%20ERP" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary d-flex align-center justify-center" 
                  style={{ width: 'auto', height: '48px', padding: '0 32px', fontSize: '15px', textDecoration: 'none', gap: '10px' }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#25d366' }}>
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.623-1.023-5.086-2.885-6.948C16.2 2.016 13.75 1.006 11.75 1.006c-5.437 0-9.863 4.37-9.866 9.801 0 1.768.47 3.49 1.362 5.022L2.245 21.5l5.89-1.53c.026.002.049.006.074.006.01 0 .02 0 .03-.001.01 0 .02.001.03.001.031-.001.054-.003.084-.006l.114-.015zM17.33 14.39c-.287-.144-1.702-.84-1.965-.936-.263-.096-.456-.144-.648.144-.192.288-.744.936-.912 1.128-.168.192-.336.216-.624.072-1.352-.677-2.28-1.21-3.188-2.77-.24-.412.24-.383.687-1.272.072-.144.036-.271-.018-.38-.054-.107-.456-1.104-.624-1.51-.164-.397-.333-.343-.456-.349-.12-.006-.26-.007-.4-.007-.14 0-.368.052-.56.26-.192.208-.732.716-.732 1.745s.748 2.023.852 2.164c.104.14 1.472 2.248 3.566 3.149 2.094.9 2.094.6 2.454.564.36-.036 1.702-.696 1.942-1.368.24-.672.24-1.248.168-1.368-.072-.12-.264-.216-.552-.36z"/>
                  </svg>
                  Contactar Asesor
                </a>
              </div>

              {/* Video Demostrativo */}
              <div className="video-container">
                <iframe 
                  id="hero-youtube-player" 
                  src="https://www.youtube.com/embed/kkKBJ8tWW5M?enablejsapi=1" 
                  title="Demostración de NovarDesk ERP" 
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                  allowFullScreen
                ></iframe>
              </div>
            </section>

            {/* Marquesina de Marcas / Rubros (Social Proof) */}
            <section className="marquee-section">
              <div className="marquee-title">Soportamos todo tipo de negocios y rubros</div>
              <div className="marquee-wrapper">
                <div className="marquee-track">
                  {[
                    { text: 'Minimercados y Almacenes', icon: '🏪' },
                    { text: 'Tiendas de Ropa y Calzado', icon: '👕' },
                    { text: 'Ferreterías y Corralones', icon: '🔨' },
                    { text: 'Forrajerías y Petshops', icon: '🐕' },
                    { text: 'Kioscos y Maxikioscos', icon: '🍬' },
                    { text: 'Distribuidoras y Mayoristas', icon: '📦' },
                    { text: 'Fiambrerías y Carnicerías', icon: '🥩' },
                    { text: 'Bazares y Librerías', icon: '📚' }
                  ].concat([
                    { text: 'Minimercados y Almacenes', icon: '🏪' },
                    { text: 'Tiendas de Ropa y Calzado', icon: '👕' },
                    { text: 'Ferreterías y Corralones', icon: '🔨' },
                    { text: 'Forrajerías y Petshops', icon: '🐕' },
                    { text: 'Kioscos y Maxikioscos', icon: '🍬' },
                    { text: 'Distribuidoras y Mayoristas', icon: '📦' },
                    { text: 'Fiambrerías y Carnicerías', icon: '🥩' },
                    { text: 'Bazares y Librerías', icon: '📚' }
                  ]).map((item, idx) => (
                    <div key={idx} className="marquee-item">
                      <span className="marquee-icon">{item.icon}</span>
                      <span>{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Dolores vs Soluciones Section */}
            <section id="soluciones" className="landing-section" style={{ borderTop: '1px solid var(--border-color)' }}>
              <div className="section-header">
                <div className="hero-badge">Gestión Inteligente</div>
                <h2 className="section-title">¿Cansado del desorden en tu administración?</h2>
                <p className="section-desc">Entendemos los problemas del comercio diario. Por eso diseñamos soluciones efectivas y directas.</p>
              </div>
              
              <div className="pain-grid">
                {/* Card 1 */}
                <div className="pain-card">
                  <div className="pain-item">
                    <span className="pain-icon-red">✕</span>
                    <div className="pain-text">
                      <h4 style={{ color: '#a855f7' }}>Pérdidas de Stock y Descontrol</h4>
                      <p>No saber qué mercadería queda, sufrir diferencias de stock y frustrar a tus clientes por quiebres de inventario.</p>
                    </div>
                  </div>
                  <div className="pain-item" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                    <span className="pain-icon-green">✓</span>
                    <div className="pain-text">
                      <h4 style={{ color: '#2563eb' }}>Control de Depósito Inteligente</h4>
                      <p>Inventario exacto en tiempo real, alertas automáticas de stock mínimo y registro detallado de cada movimiento.</p>
                    </div>
                  </div>
                </div>
                {/* Card 2 */}
                <div className="pain-card">
                  <div className="pain-item">
                    <span className="pain-icon-red">✕</span>
                    <div className="pain-text">
                      <h4 style={{ color: '#a855f7' }}>Filas Interminables en Mostrador</h4>
                      <p>Colas largas debido a un sistema lento, demora en la búsqueda manual de artículos y facturación engorrosa.</p>
                    </div>
                  </div>
                  <div className="pain-item" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                    <span className="pain-icon-green">✓</span>
                    <div className="pain-text">
                      <h4 style={{ color: '#2563eb' }}>POS Ultra-rápido compatible con Barras</h4>
                      <p>Punto de venta simple y dinámico. Buscá por lectora o nombre en milisegundos y emití facturas en un solo clic.</p>
                    </div>
                  </div>
                </div>
                {/* Card 3 */}
                <div className="pain-card">
                  <div className="pain-item">
                    <span className="pain-icon-red">✕</span>
                    <div className="pain-text">
                      <h4 style={{ color: '#a855f7' }}>Precios Desactualizados y Pérdida de Margen</h4>
                      <p>Actualizar precios uno a uno es agotador, lo que destruye tus márgenes de ganancia sin que te des cuenta.</p>
                    </div>
                  </div>
                  <div className="pain-item" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                    <span className="pain-icon-green">✓</span>
                    <div className="pain-text">
                      <h4 style={{ color: '#2563eb' }}>Costos Exactos y Listas de Precios</h4>
                      <p>Actualización ágil. Definí una lista predeterminada y cargá precios diferentes por canal de venta de forma masiva.</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Funcionalidades */}
            <section id="funciones" className="landing-section" style={{ borderTop: '1px solid var(--border-color)' }}>
              <div className="section-header">
                <h2 className="section-title">Herramientas creadas para crecer</h2>
                <p className="section-desc">Todo el ecosistema administrativo que tu comercio necesita, sin complejidades innecesarias.</p>
              </div>
              <div className="features-grid">
                <div className="feature-card">
                  <div className="feature-icon-wrapper">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect><line x1="6" y1="20" x2="18" y2="20"></line></svg>
                  </div>
                  <div className="feature-info">
                    <h4>Punto de Venta Simple (POS)</h4>
                    <p>Facturación de múltiples medios de pago, compatibilidad con lectora de barras y calculadora inteligente de peso para productos fraccionables.</p>
                  </div>
                </div>
                <div className="feature-card">
                  <div className="feature-icon-wrapper">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
                  </div>
                  <div className="feature-info">
                    <h4>Múltiples Listas de Precios</h4>
                    <p>Crea listas de precios personalizadas (Minorista, Mayorista, Promoción) y asígnaselas a tus clientes para automatizar el cobro en mostrador.</p>
                  </div>
                </div>
                <div className="feature-card">
                  <div className="feature-icon-wrapper">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                  </div>
                  <div className="feature-info">
                    <h4>Contabilidad y Caja Diaria</h4>
                    <p>Aperturas y cierres de turno, arqueo de caja con desglose de efectivo, transferencias y tarjetas para que las cuentas cierren a la perfección.</p>
                  </div>
                </div>
                <div className="feature-card">
                  <div className="feature-icon-wrapper">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                  </div>
                  <div className="feature-info">
                    <h4>Importador Masivo de Excel</h4>
                    <p>Actualiza o migra tu catálogo de miles de artículos, marcas, precios de venta, costos y stock en segundos mediante archivos Excel.</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Planes */}
            <section id="planes" className="landing-section" style={{ borderTop: '1px solid var(--border-color)', marginBottom: '80px' }}>
              <div className="section-header">
                <h2 className="section-title">Planes adaptados a tu escala</h2>
                <p className="section-desc">Elegí el plan ideal para tu negocio. Empezá gratis hoy mismo y escalá cuando lo necesites.</p>
              </div>
              
              <div className="pricing-grid">
                {/* Trial */}
                <div className="price-card">
                  <h3 className="price-title">Prueba Gratuita</h3>
                  <div style={{ marginBottom: '16px' }}>
                    <span className="price-val">$0</span>
                    <span className="price-period"> / 14 días</span>
                  </div>
                  <p className="price-desc">Ideal para explorar y conocer la plataforma completa.</p>
                  <ul className="price-features">
                    <li className="price-feature">✓ Hasta 50 ventas/mes</li>
                    <li className="price-feature">✓ Catálogo: Máx 100 variantes</li>
                    <li className="price-feature">✓ Hasta 1 usuario (empleado)</li>
                    <li className="price-feature font-semibold">✓ Punto de venta básico</li>
                    <li className="price-feature disabled">✕ Facturación Electrónica</li>
                    <li className="price-feature disabled">✕ Listas de Precios & Finanzas</li>
                  </ul>
                  <button className="btn-secondary w-full" onClick={() => setAuthView('register')}>Contratar</button>
                </div>
                
                {/* Básico */}
                <div className="price-card">
                  <h3 className="price-title">Básico</h3>
                  <div style={{ marginBottom: '16px' }}>
                    <span className="price-val">$19.000</span>
                    <span className="price-period"> / mes</span>
                  </div>
                  <p className="price-desc">Para pequeños comercios que recién empiezan.</p>
                  <ul className="price-features">
                    <li className="price-feature">✓ Hasta 250 ventas/mes</li>
                    <li className="price-feature">✓ Catálogo: Máx 1.000 variantes</li>
                    <li className="price-feature">✓ Hasta 2 usuarios simultáneos</li>
                    <li className="price-feature font-semibold">✓ Facturación Electrónica</li>
                    <li className="price-feature disabled">✕ Listas de Precios & Finanzas</li>
                  </ul>
                  <button className="btn-primary w-full" onClick={() => setAuthView('register')}>Contratar</button>
                </div>

                {/* Premium */}
                <div className="price-card recommended">
                  <div className="recommended-badge">Recomendado</div>
                  <h3 className="price-title">Premium</h3>
                  <div style={{ marginBottom: '16px' }}>
                    <span className="price-val">$29.000</span>
                    <span className="price-period"> / mes</span>
                  </div>
                  <p className="price-desc">Acceso total para hacer crecer tu negocio.</p>
                  <ul className="price-features">
                    <li className="price-feature font-semibold">✓ Hasta 1.500 ventas/mes</li>
                    <li className="price-feature font-semibold">✓ Catálogo: Máx 10.000 variantes</li>
                    <li className="price-feature">✓ Hasta 3 usuarios simultáneos</li>
                    <li className="price-feature">✓ Facturación Electrónica</li>
                    <li className="price-feature font-semibold">✓ Listas de Precios Múltiples</li>
                    <li className="price-feature font-semibold">✓ Contabilidad y Caja Diaria</li>
                    <li className="price-feature font-semibold">✓ Importación Masiva Excel</li>
                  </ul>
                  <button className="btn-primary w-full" onClick={() => setAuthView('register')}>Contratar</button>
                </div>

                {/* Full */}
                <div className="price-card">
                  <h3 className="price-title">Full</h3>
                  <div style={{ marginBottom: '16px' }}>
                    <span className="price-val">$44.900</span>
                    <span className="price-period"> / mes</span>
                  </div>
                  <p className="price-desc">Sin límites para empresas consolidadas.</p>
                  <ul className="price-features">
                    <li className="price-feature font-semibold">✓ Ventas Ilimitadas</li>
                    <li className="price-feature font-semibold">✓ Catálogo Ilimitado</li>
                    <li className="price-feature font-semibold">✓ Hasta 4 usuarios simultáneos</li>
                    <li className="price-feature">✓ Facturación Electrónica</li>
                    <li className="price-feature">✓ Todas las funcionalidades</li>
                    <li className="price-feature font-semibold">✓ Soporte técnico prioritario</li>
                  </ul>
                  <button className="btn-primary w-full" onClick={() => setAuthView('register')}>Contratar</button>
                </div>
              </div>
            </section>

            {/* Footer */}
            <footer style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)', padding: '40px 24px', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
              <div className="footer-links-container">
                <span className="footer-link" onClick={() => setActiveLegalModal('terms')}>Términos y Condiciones</span>
                <span className="footer-link" onClick={() => setActiveLegalModal('privacy')}>Política de Privacidad</span>
                <span className="footer-link" onClick={() => setActiveLegalModal('dpa')}>Acuerdo de Tratamiento de Datos (DPA)</span>
              </div>
              <p style={{ margin: 0 }}>© {new Date().getFullYear()} NovarDesk ERP. Todos los derechos reservados.</p>
            </footer>

            {/* Floating WhatsApp Widget */}
            <a 
              href="https://wa.me/5491123456789?text=Hola!%20Me%20gustaria%20recibir%20asesoramiento%20sobre%20NovarDesk%20ERP.%20Vengo%20desde%20la%20Home."
              target="_blank"
              rel="noopener noreferrer"
              className="floating-whatsapp"
              title="Chatear con un asesor"
            >
              <div className="whatsapp-pulse"></div>
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#fff' }}>
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.623-1.023-5.086-2.885-6.948C16.2 2.016 13.75 1.006 11.75 1.006c-5.437 0-9.863 4.37-9.866 9.801 0 1.768.47 3.49 1.362 5.022L2.245 21.5l5.89-1.53c.026.002.049.006.074.006.01 0 .02 0 .03-.001.01 0 .02.001.03.001.031-.001.054-.003.084-.006l.114-.015zM17.33 14.39c-.287-.144-1.702-.84-1.965-.936-.263-.096-.456-.144-.648.144-.192.288-.744.936-.912 1.128-.168.192-.336.216-.624.072-1.352-.677-2.28-1.21-3.188-2.77-.24-.412.24-.383.687-1.272.072-.144.036-.271-.018-.38-.054-.107-.456-1.104-.624-1.51-.164-.397-.333-.343-.456-.349-.12-.006-.26-.007-.4-.007-.14 0-.368.052-.56.26-.192.208-.732.716-.732 1.745s.748 2.023.852 2.164c.104.14 1.472 2.248 3.566 3.149 2.094.9 2.094.6 2.454.564.36-.036 1.702-.696 1.942-1.368.24-.672.24-1.248.168-1.368-.072-.12-.264-.216-.552-.36z"/>
              </svg>
            </a>

          </>
        )}

        {authView === 'login' && (
          <div className="auth-wrapper fade-in relative">
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

              <div style={{ textAlign: 'center', marginTop: '20px', borderTop: '1px dashed var(--border-color)', paddingTop: '16px' }}>
                <a href="#" onClick={(e) => { e.preventDefault(); setAuthView('landing'); }} style={{ color: 'hsl(var(--primary))', fontSize: '13px', fontWeight: '600', textDecoration: 'none' }}>
                  ← Volver al Inicio
                </a>
              </div>
              <div style={{ textAlign: 'center', marginTop: '12px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>¿No tienes una cuenta? </span>
                <a href="#" onClick={(e) => { e.preventDefault(); setAuthView('register'); }} style={{ color: 'hsl(var(--primary))', fontSize: '13px', fontWeight: '700', textDecoration: 'none' }}>
                  Regístrate gratis
                </a>
              </div>
            </div>
          </div>
        )}

        {authView === 'register' && (
          <div className="auth-wrapper fade-in relative">
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
                <h1 className="auth-title">Crea tu Comercio</h1>
                <p className="auth-subtitle">Prueba NovarDesk ERP gratis por 14 días</p>
              </div>

              <form onSubmit={handleRegister}>
                <div className="form-group">
                  <label className="form-label">Nombre del Comercio (Razón Social)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej: Minimercado El Sol"
                    value={regRazonSocial}
                    onChange={(e) => setRegRazonSocial(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">CUIT (Opcional)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej: 20123456789"
                    value={regCuit}
                    onChange={(e) => setRegCuit(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '16px', marginTop: '16px' }}>
                  <label className="form-label">Tu Nombre Completo</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej: Juan Pérez"
                    value={regNombre}
                    onChange={(e) => setRegNombre(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Correo Electrónico de Administrador</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="admin@comercio.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Contraseña</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Mínimo 6 caracteres"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    required
                  />
                </div>

                {regError && (
                  <p className="text-center" style={{ color: 'red', fontSize: '13px', marginBottom: '16px' }}>
                    {regError}
                  </p>
                )}

                <button type="submit" className="btn-primary" disabled={regLoading}>
                  {regLoading ? 'Registrando comercio...' : 'Crear Cuenta y Comenzar'}
                </button>
              </form>

              <div style={{ textAlign: 'center', marginTop: '20px', borderTop: '1px dashed var(--border-color)', paddingTop: '16px' }}>
                <a href="#" onClick={(e) => { e.preventDefault(); setAuthView('landing'); }} style={{ color: 'hsl(var(--primary))', fontSize: '13px', fontWeight: '600', textDecoration: 'none' }}>
                  ← Volver al Inicio
                </a>
              </div>
              <div style={{ textAlign: 'center', marginTop: '12px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>¿Ya tienes una cuenta? </span>
                <a href="#" onClick={(e) => { e.preventDefault(); setAuthView('login'); }} style={{ color: 'hsl(var(--primary))', fontSize: '13px', fontWeight: '700', textDecoration: 'none' }}>
                  Inicia Sesión
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Modal Legal */}
        {activeLegalModal && (
          <div className="legal-modal-overlay" onClick={() => setActiveLegalModal(null)}>
            <div className="legal-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="legal-modal-header">
                <h3>{getLegalModalTitle()}</h3>
                <button className="legal-modal-close" onClick={() => setActiveLegalModal(null)}>✕</button>
              </div>
              <div className="legal-modal-body">
                {renderLegalModalContent()}
              </div>
            </div>
          </div>
        )}
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
                    {item.unidad_medida === 'unidad' ? (
                      <>
                        <button 
                          type="button"
                          className="p-0 d-flex align-center justify-center" style={{ width: '24px', height: '24px', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
                          onClick={() => updateQuantity(item.variantId, item.cantidad - 1)}
                        >
                          -
                        </button>
                        <input
                          type="number"
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
                      </>
                    ) : (
                      <div className="d-flex align-center gap-xs" style={{ padding: '0 8px' }}>
                        <input
                          type="number"
                          step="0.001"
                          min="0.001"
                          className="text-center p-0 font-semibold" style={{ width: '65px', height: '24px', background: 'transparent', border: 'none', fontSize: '13px', color: 'var(--text-primary)' }}
                          value={item.cantidad}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val)) updateQuantity(item.variantId, val);
                          }}
                        />
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{item.unidad_medida}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="font-bold" style={{ fontSize: '16px', color: 'var(--text-primary)' }}>
                      ${item.subtotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
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
        <div className="sidebar-top flex-1 overflow-y-auto d-flex flex-col" style={{ paddingBottom: '16px' }}>
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
                onClick={() => setActiveTab('dashboard')}
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
                    setActiveTab('pos');
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
              onClick={() => setActiveTab('sales')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
              <span>Historial de Ventas</span>
            </li>
            <li 
              className={`nav-item d-flex align-center gap-md ${activeTab === 'catalog' ? 'active' : ''}`} style={{ cursor: 'pointer' }}
              onClick={() => setActiveTab('catalog')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
              <span>Catálogo de Productos</span>
            </li>
            <li 
              className={`nav-item d-flex align-center gap-md ${activeTab === 'listas-precio' ? 'active' : ''}`} 
              style={{ cursor: 'pointer', opacity: !hasPremium ? 0.5 : 1, order: !hasPremium ? 99 : 0 }}
              onClick={() => {
                if (!hasPremium) {
                  toast.error('Esta función es exclusiva para planes Premium y Full. ¡Actualiza tu plan!');
                  setActiveTab('subscription');
                  return;
                }
                setActiveTab('listas-precio');
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
              <span>Listas de Precios</span>
            </li>
            <li 
              className={`nav-item d-flex align-center gap-md ${activeTab === 'inventario' ? 'active' : ''}`} style={{ cursor: 'pointer' }}
              onClick={() => setActiveTab('inventario')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"></path><path d="m3.3 7 8.7 5 8.7-5"></path><path d="M12 22V12"></path></svg>
              <span>Depósito</span>
            </li>
            <li 
              className={`nav-item d-flex align-center gap-md ${activeTab === 'clientes' ? 'active' : ''}`} style={{ cursor: 'pointer' }}
              onClick={() => setActiveTab('clientes')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              <span>Clientes</span>
            </li>
            {!isVendedor && (
              <>
                <li 
                  className={`nav-item d-flex align-center gap-md ${activeTab === 'promociones' ? 'active' : ''}`} style={{ cursor: 'pointer' }}
                  onClick={() => setActiveTab('promociones')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
                  <span>Promociones</span>
                </li>
                <li 
                  className={`nav-item d-flex align-center gap-md justify-between ${activeTab === 'finances' ? 'active' : ''}`} 
                  style={{ cursor: 'pointer', opacity: !hasPremium ? 0.5 : 1, order: !hasPremium ? 99 : 0 }}
                  onClick={() => {
                    if (!hasPremium) {
                      toast.error('Esta función es exclusiva para planes Premium y Full. ¡Actualiza tu plan!');
                      setActiveTab('subscription');
                      return;
                    }
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
                <div className={`sidebar-dropdown ${isFinanzasDropdownOpen ? 'open' : ''}`} style={{ order: !hasPremium ? 99 : 0 }}>
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
                        onClick={() => { setActiveTab('finances'); setFinanzasSubTab(item.id); }}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </li>
                  ))}
                </div>
                <li 
                  className={`nav-item d-flex align-center gap-md ${activeTab === 'settings' ? 'active' : ''}`} style={{ cursor: 'pointer' }}
                  onClick={() => setActiveTab('settings')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                  <span>Configuración</span>
                </li>
                <li 
                  className={`nav-item d-flex align-center gap-md ${activeTab === 'import-center' ? 'active' : ''}`} 
                  style={{ cursor: 'pointer', opacity: !hasPremium ? 0.5 : 1, order: !hasPremium ? 99 : 0 }}
                  onClick={() => {
                    if (!hasPremium) {
                      toast.error('Esta función es exclusiva para planes Premium y Full. ¡Actualiza tu plan!');
                      setActiveTab('subscription');
                      return;
                    }
                    setActiveTab('import-center');
                  }}
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
              <span className="badge-plan" style={{ marginTop: '4px', display: 'inline-block', marginLeft: 0, cursor: 'pointer', transition: 'transform 0.2s' }} onClick={() => setActiveTab('subscription')} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'} title="Gestionar Plan">Plan: {tenant?.estado_plan}</span>
            </div>
          </div>

          {/* Acciones */}
          <div className="hide-on-collapse d-flex flex-col gap-xs"  >
              
            {/* Mi Suscripción */}
            <button
              onClick={() => setActiveTab('subscription')}
              className="d-flex align-center w-full text-left" style={{ gap: '10px', padding: '8px 10px', background: activeTab === 'subscription' ? 'rgba(var(--primary-rgb), 0.08)' : 'none', border: 'none', borderRadius: '8px', cursor: 'pointer', color: activeTab === 'subscription' ? 'hsl(var(--primary))' : 'var(--text-secondary)', fontSize: '13px', fontWeight: activeTab === 'subscription' ? '700' : '550', transition: 'background 0.2s' }}
              onMouseEnter={e => { if (activeTab !== 'subscription') e.currentTarget.style.background = 'var(--bg-tertiary)'; }}
              onMouseLeave={e => { if (activeTab !== 'subscription') e.currentTarget.style.background = 'none'; }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
              <span>Mi Suscripción</span>
            </button>

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
              {activeTab === 'inventario' && 'Gestión de Depósito'}
              {activeTab === 'import-center' && 'Centro de Importación'}
              {activeTab === 'pos' && 'Punto de Venta (POS)'}
              {activeTab === 'sales' && 'Historial de Transacciones'}
              {activeTab === 'clientes' && 'Gestión de Clientes'}
              {activeTab === 'promociones' && 'Motor de Promociones'}
              {activeTab === 'finances' && 'Gestión de Contabilidad'}
              {activeTab === 'settings' && 'Configuración de la Empresa'}
              {activeTab === 'subscription' && 'Mi Suscripción'}
              {activeTab === 'listas-precio' && 'Listas de Precios'}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
              {activeTab === 'dashboard' && 'Monitorea el rendimiento de ventas y productos en tiempo real.'}
              {activeTab === 'catalog' && 'Administra tus productos, variantes y niveles de stock.'}
              {activeTab === 'inventario' && 'Gestiona existencias, entradas, salidas y auditoría de stock.'}
              {activeTab === 'sales' && 'Consulta y audita las ventas registradas y estados fiscales.'}
              {activeTab === 'clientes' && 'Gestiona tu base de clientes y sus historiales de compra.'}
              {activeTab === 'promociones' && 'Crea reglas automáticas de descuento para el Punto de Venta.'}
              {activeTab === 'finances' && 'Administra tus cuentas, gastos y balances financieros.'}
              {activeTab === 'settings' && 'Administra la información de tu empresa y cuentas de empleados.'}
              {activeTab === 'import-center' && 'Importa masivamente clientes y productos desde planillas de cálculo.'}
              {activeTab === 'subscription' && 'Gestiona tu plan, facturación y estados de cuenta.'}
              {activeTab === 'listas-precio' && 'Administra precios diferenciados para tus productos.'}
            </p>
          </div>
          
          {/* Opciones Superiores Derecha — solo acciones contextuales */}
          <div className="d-flex align-center gap-md" style={{ flexShrink: 0 }}>
            
            <NotificationBell />

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
                    <button onClick={openProductModal} className="btn-primary" style={{ width: 'auto' }}>
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
                                    ({p.es_servicio ? 'Servicio' : `Stock: ${v.stock_actual}`} | ${parseFloat(v.precio_venta as string).toLocaleString('es-AR')})
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
                              <div className="d-flex gap-xs flex-wrap">
                                <button
                                  onClick={() => openEditProductModal(p)}
                                  className="btn-secondary"
                                  style={{
                                    padding: '6px 12px',
                                    color: 'hsl(var(--primary))',
                                    borderColor: 'rgba(var(--primary-rgb), 0.2)',
                                    background: 'rgba(var(--primary-rgb), 0.05)',
                                    width: 'auto',
                                    height: 'auto',
                                    fontSize: '12px'
                                  }}
                                >
                                  Editar
                                </button>
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
                              </div>
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

        {/* --- VISTA INVENTARIO --- */}
        {activeTab === 'inventario' && <InventarioView />}

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
        {activeTab === 'subscription' && <SubscriptionView />}
        {activeTab === 'listas-precio' && <ListasPrecioView />}

        {/* --- VISTA POS --- */}
        {activeTab === 'pos' && (
          estadoCaja?.status === 'CERRADA' ? (
            <AbrirCajaModal />
          ) : (
            <>
              {weighingVariant && (
                <WeighedItemModal
                  variant={weighingVariant}
                  onClose={() => setWeighingVariant(null)}
                  onConfirm={(weight) => {
                    addItem(weighingVariant, weight);
                    setWeighingVariant(null);
                  }}
                />
              )}
              {posLayout === 'simple' ? (
                <PosSimpleView
                  products={overriddenProducts}
                  discountMonto={discountMonto}
                  discountMotivo={discountMotivo}
                  pagosAgregados={pagosAgregados}
                  setPagosAgregados={setPagosAgregados}
                  setDiscountMonto={setDiscountMonto}
                  setDiscountMotivo={setDiscountMotivo}
                  setIsDescuentoModalOpen={setIsDescuentoModalOpen}
                  tenant={tenant}
                  isVendedor={isVendedor}
                  hasPremium={hasPremium}
                  listasPrecio={listasPrecio}
                  selectedPriceListId={selectedPriceListId}
                  setSelectedPriceListId={setSelectedPriceListId}
                />
              ) : (
              <div className="pos-grid">
            {/* Columna Izquierda: Catálogo Visual */}
            <div className="pos-catalog-panel">
              <div className="pos-catalog-header flex gap-md align-center" style={{ display: 'flex', gap: '12px' }}>
                <input className="form-input flex-1"
                  type="text"
                  placeholder="Buscar por nombre, SKU o marca..."
                  style={{ fontSize: '15px' }}
                  value={posSearchQuery}
                  onChange={(e) => setPosSearchQuery(e.target.value)}
                  autoFocus
                />
                {hasPremium && listasPrecio.length > 0 && (
                  <div className="d-flex align-center gap-xs" style={{ minWidth: '220px' }}>
                    <select
                      className="form-input"
                      style={{ padding: '6px 12px', fontSize: '13px' }}
                      value={selectedPriceListId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedPriceListId(val === 'default' ? 'default' : Number(val));
                      }}
                    >
                      <option value="default">Precio Base (Estándar)</option>
                      {listasPrecio?.map((l: any) => (
                        <option key={l.id} value={l.id}>{l.nombre}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="pos-catalog-grid">
                {overriddenProducts.flatMap((prod: any) => prod.variantes?.map((v: any) => ({ ...v, producto: prod })) || [])
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
                        onClick={() => {
                          const isFraccionable = variante.producto?.unidad_medida !== 'unidad' || variante.atributos_extra?.fraccionable === true || variante.atributos_extra?.fraccionable === 'true';
                          if (isFraccionable) {
                            setWeighingVariant(variante);
                          } else {
                            addItem(variante);
                          }
                        }}
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
                    ${cartItems.reduce((acc, item) => acc + item.subtotal, 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
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
          )}
          </>
          )
          )
        }

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



      </main>

      {/* Modal para Crear Producto */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content scale-up">
            <div className="modal-header">
              <h2 className="modal-title">{editingProduct ? 'Editar Producto' : 'Cargar Nuevo Producto'}</h2>
              <button className="close-btn" onClick={closeProductModal}>
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmitProduct}>
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
                  {esServicio ? 'Datos del Servicio (SKU)' : (variantsList.length > 0 ? 'Gestión de Variantes Múltiples' : 'Datos de la Variante Principal (SKU)')}
                </h3>

                {/* Si hay variantes en la lista (creadas por talles/colores), se muestra aviso y se ocultan los campos base */}
                {variantsList.length === 0 ? (
                  <div className="variant-form-card">
                    <div className="form-group">
                      <label className="form-label">SKU (Identificador Único)</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Ej: JEAN-LEV-M-BLU"
                        value={sku}
                        onChange={(e) => {
                          setSku(e.target.value);
                          setIsSkuManuallyEdited(true);
                        }}
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

                    <div className="gap-lg" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                      <div className="form-group">
                        <label className="form-label">Precio de Venta Predet. (Lista por Defecto) ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          className="form-input"
                          value={precioVenta}
                          onChange={(e) => setPrecioVenta(e.target.value)}
                          required
                        />
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                          * Lista predeterminada. Puedes configurar otras listas después.
                        </span>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Precio de Costo ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          className="form-input"
                          value={precioCosto}
                          onChange={(e) => setPrecioCosto(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    {!esServicio ? (
                      <>
                        <div className="gap-lg" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
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

                          <div className="form-group">
                            <label className="form-label">Stock Mínimo (Alerta)</label>
                            <input
                              type="number"
                              step="0.001"
                              className="form-input"
                              value={stockMinimo}
                              onChange={(e) => setStockMinimo(e.target.value)}
                              required
                            />
                          </div>
                        </div>

                        {categoria !== 'Almacén' && (
                          <div className="form-group">
                            <label className="form-label">Unidad de Medida</label>
                            <select
                              className="form-input"
                              value={unidadMedida}
                              onChange={(e) => setUnidadMedida(e.target.value)}
                            >
                              <option value="unidad">Unidad / Pieza</option>
                              <option value="kg">Kilos (kg)</option>
                              <option value="g">Gramos (g)</option>
                              <option value="litro">Litros (L)</option>
                              <option value="mt">Metros (m)</option>
                            </select>
                          </div>
                        )}
                      </>
                    ) : (
                      <div style={{ padding: '12px', background: 'var(--bg-secondary)', border: '1px dashed var(--border-color)', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>ℹ️</span>
                        <span>Los servicios no requieren control de stock físico ni unidad de medida.</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ padding: '16px', background: 'rgba(var(--primary-rgb), 0.03)', borderRadius: '12px', border: '1px dashed hsl(var(--primary))', marginBottom: '16px' }}>
                    <p className="font-semibold text-center" style={{ margin: 0, fontSize: '13px', color: 'hsl(var(--primary))' }}>
                      ✓ Variantes múltiples detectadas. Por favor ingresa los datos correspondientes en la tabla de abajo.
                    </p>
                  </div>
                )}

                {!esServicio && (
                  <div className="variant-form-card" style={{ marginTop: '16px' }}>
                    {/* Carga dinámica de atributos según el rubro */}
                    <div className="variant-full-row" style={{ paddingTop: '0' }}>
                      <h4 className="font-bold" style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px' }}>
                        Atributos Extra de Rubro ({categoria})
                      </h4>

                    {categoria === 'Indumentaria' && (
                      <>
                        <div className="gap-lg" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', marginBottom: '16px' }}>
                          <div className="form-group">
                            <label className="form-label">Talles (separados por coma, ej: S, M, L)</label>
                            <input 
                              type="text" 
                              className="form-input" 
                              placeholder="S, M, L, XL" 
                              value={tallesInput} 
                              onChange={e => setTallesInput(e.target.value)}
                              disabled={!!editingProduct}
                            />
                            {editingProduct && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>No se pueden regenerar combinaciones en edición.</span>}
                          </div>
                          <div className="form-group">
                            <label className="form-label">Colores (separados por coma, ej: Rojo, Azul)</label>
                            <input 
                              type="text" 
                              className="form-input" 
                              placeholder="Rojo, Azul, Negro" 
                              value={coloresInput} 
                              onChange={e => setColoresInput(e.target.value)}
                              disabled={!!editingProduct}
                            />
                          </div>
                        </div>

                        {variantsList.length > 0 && (
                          <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px', marginTop: '12px' }}>
                            <table className="product-table" style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                              <thead>
                                <tr style={{ background: 'var(--bg-tertiary)' }}>
                                  <th style={{ padding: '8px', textAlign: 'left' }}>Variante</th>
                                  <th style={{ padding: '8px', textAlign: 'left' }}>SKU</th>
                                  <th style={{ padding: '8px', textAlign: 'left' }}>Código Barras</th>
                                  <th style={{ padding: '8px', textAlign: 'center', width: '85px' }}>Costo ($)</th>
                                  <th style={{ padding: '8px', textAlign: 'center', width: '90px' }}>Precio Predet. ($)</th>
                                  <th style={{ padding: '8px', textAlign: 'center', width: '75px' }}>Stock</th>
                                  <th style={{ padding: '8px', textAlign: 'center', width: '75px' }}>Stock Mín</th>
                                </tr>
                              </thead>
                              <tbody>
                                {variantsList.map((v, index) => (
                                  <tr key={index} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <td style={{ padding: '8px', fontWeight: 'bold' }}>
                                      {v.talle || '-'} / {v.color || '-'}
                                    </td>
                                    <td style={{ padding: '4px' }}>
                                      <input 
                                        type="text" 
                                        className="form-input" 
                                        style={{ padding: '4px 8px', fontSize: '12px', height: '30px' }}
                                        value={v.sku} 
                                        onChange={e => {
                                          const newList = [...variantsList];
                                          newList[index].sku = e.target.value;
                                          setVariantsList(newList);
                                        }}
                                        required
                                      />
                                    </td>
                                    <td style={{ padding: '4px' }}>
                                      <input 
                                        type="text" 
                                        className="form-input" 
                                        style={{ padding: '4px 8px', fontSize: '12px', height: '30px' }}
                                        placeholder="Opcional"
                                        value={v.codigoBarras} 
                                        onChange={e => {
                                          const newList = [...variantsList];
                                          newList[index].codigoBarras = e.target.value;
                                          setVariantsList(newList);
                                        }}
                                      />
                                    </td>
                                    <td style={{ padding: '4px' }}>
                                      <input 
                                        type="number" 
                                        className="form-input text-center" 
                                        style={{ padding: '4px', fontSize: '12px', height: '30px' }}
                                        value={v.costo} 
                                        onChange={e => {
                                          const newList = [...variantsList];
                                          newList[index].costo = e.target.value;
                                          setVariantsList(newList);
                                        }}
                                        required
                                      />
                                    </td>
                                    <td style={{ padding: '4px' }}>
                                      <input 
                                        type="number" 
                                        className="form-input text-center" 
                                        style={{ padding: '4px', fontSize: '12px', height: '30px' }}
                                        value={v.precioVenta} 
                                        onChange={e => {
                                          const newList = [...variantsList];
                                          newList[index].precioVenta = e.target.value;
                                          setVariantsList(newList);
                                        }}
                                        required
                                      />
                                    </td>
                                    <td style={{ padding: '4px' }}>
                                      <input 
                                        type="number" 
                                        className="form-input text-center" 
                                        style={{ padding: '4px', fontSize: '12px', height: '30px' }}
                                        value={v.stockActual} 
                                        onChange={e => {
                                          const newList = [...variantsList];
                                          newList[index].stockActual = e.target.value;
                                          setVariantsList(newList);
                                        }}
                                        required
                                        disabled={!!editingProduct && v.id !== undefined}
                                      />
                                    </td>
                                    <td style={{ padding: '4px' }}>
                                      <input 
                                        type="number" 
                                        className="form-input text-center" 
                                        style={{ padding: '4px', fontSize: '12px', height: '30px' }}
                                        value={v.stockMinimo} 
                                        onChange={e => {
                                          const newList = [...variantsList];
                                          newList[index].stockMinimo = e.target.value;
                                          setVariantsList(newList);
                                        }}
                                        required
                                      />
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </>
                    )}

                    {categoria === 'Almacén' && (
                      <div className="gap-lg" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                        <div className="form-group">
                          <label className="form-label">Tipo de Venta</label>
                          <select 
                            className="form-input" 
                            value={tipoVentaAlmacen} 
                            onChange={(e) => {
                              const val = e.target.value as 'unidad' | 'fraccionable';
                              setTipoVentaAlmacen(val);
                              if (val === 'unidad') {
                                setUnidadMedida('unidad');
                              } else {
                                setUnidadMedida('kg');
                              }
                            }}
                          >
                            <option value="unidad">Por Unidad / Pieza entera</option>
                            <option value="fraccionable">Fraccionable / Por Peso</option>
                          </select>
                        </div>
                        
                        {tipoVentaAlmacen === 'fraccionable' && (
                          <div className="form-group">
                            <label className="form-label">Unidad de Medida de Peso</label>
                            <select 
                              className="form-input" 
                              value={unidadMedida} 
                              onChange={(e) => setUnidadMedida(e.target.value)}
                            >
                              <option value="kg">Kilogramo (kg)</option>
                              <option value="g">Gramo (g)</option>
                              <option value="litro">Litro (l)</option>
                              <option value="mt">Metro (m)</option>
                            </select>
                          </div>
                        )}
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
              )}
            </div>

              <div className="d-flex gap-md" style={{ marginTop: '24px' }}>
                <button type="submit" className="btn-primary" disabled={createProductMutation.isPending || updateProductMutation.isPending}>
                  {createProductMutation.isPending || updateProductMutation.isPending ? 'Guardando...' : (editingProduct ? 'Guardar Cambios' : 'Crear Producto')}
                </button>
                <button type="button" className="btn-secondary" onClick={closeProductModal}>
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
