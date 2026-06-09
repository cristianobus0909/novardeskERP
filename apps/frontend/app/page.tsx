'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/use-auth-store';
import { apiRequest } from '../lib/api-client';
import { useProducts, useCreateProduct } from '../hooks/use-products';
import { useCartStore } from '../store/use-cart-store';
import { useSales, useCreateSale } from '../hooks/use-sales';

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

  // Estado de la pestaña activa en la barra lateral
  const [activeTab, setActiveTab] = useState<'catalog' | 'pos' | 'sales' | 'subscription'>('catalog');

  // Estado de búsqueda en POS
  const [posSearchQuery, setPosSearchQuery] = useState('');

  // Estado de modal para detalle de venta
  const [selectedSale, setSelectedSale] = useState<any | null>(null);
  const [isSaleDetailOpen, setIsSaleDetailOpen] = useState(false);

  // Zustand Auth Store
  const { token, user, tenant, setAuth, logout } = useAuthStore();

  // React Query Hooks
  const { data: products = [], isLoading: isLoadingProducts, error: productsError } = useProducts();
  const createProductMutation = useCreateProduct();

  // React Query Hooks para Ventas
  const { data: sales = [], isLoading: isLoadingSales } = useSales();
  const createSaleMutation = useCreateSale();

  // Zustand Cart Store
  const {
    items: cartItems,
    id_cliente,
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
    } catch (err: any) {
      setAuthError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoEmail: string) => {
    setAuthError(null);
    setLoading(true);
    try {
      const data = await apiRequest<{ access_token: string; user: any; tenant: any }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: demoEmail, password: 'admin123' }),
      });
      setAuth(data.access_token, data.user, data.tenant);
    } catch (err: any) {
      setAuthError(err.message || 'Error al iniciar sesión demo');
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
      alert(err.message || 'Error al guardar el producto');
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
      alert(err.message || 'Error al eliminar el producto');
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
      alert(err.message || 'Variante no encontrada');
    }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cartItems.length === 0) {
      alert('El carrito está vacío');
      return;
    }

    const total = cartItems.reduce((acc, item) => acc + item.subtotal, 0);
    const payload = {
      id_cliente: id_cliente || undefined,
      nombre_cliente: nombre_cliente || undefined,
      metodo_pago,
      total,
      detalles: cartItems.map((item) => ({
        variante_id: item.variantId,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        subtotal: item.subtotal,
      })),
    };

    try {
      const result = await createSaleMutation.mutateAsync(payload);
      alert(`Venta #${result.id} registrada exitosamente.`);
      clearCart();
    } catch (err: any) {
      alert(err.message || 'Error al procesar la venta');
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
      <div className="auth-wrapper fade-in" style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', top: '24px', right: '24px', zIndex: 10 }}>
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
              <p style={{ color: 'red', fontSize: '13px', marginBottom: '16px', textAlign: 'center' }}>
                {authError}
              </p>
            )}

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Validando...' : 'Iniciar Sesión'}
            </button>
          </form>

          <div className="demo-box">
            <h3 className="demo-title">Accesos de Demostración</h3>
            <div className="demo-buttons">
              <button onClick={() => handleDemoLogin('admin@novardesk.com')} className="btn-secondary" style={{ fontSize: '12px' }}>
                Admin (Trial)
              </button>
              <button onClick={() => handleDemoLogin('vendedor@novardesk.com')} className="btn-secondary" style={{ fontSize: '12px' }}>
                Vendedor (POS)
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER VISTA DASHBOARD PANEL ---
  return (
    <div className="app-container fade-in">
      {/* Sidebar de Navegación */}
      <aside className="sidebar">
        <div>
          <div className="logo-section">
            <div className="avatar">ND</div>
            <span className="logo-text">NovarDesk</span>
          </div>

          <ul className="nav-links">
            <li 
              className={`nav-item ${activeTab === 'catalog' ? 'active' : ''}`}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}
              onClick={() => setActiveTab('catalog')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
              <span>Catálogo de Productos</span>
            </li>
            <li 
              className={`nav-item ${activeTab === 'pos' ? 'active' : ''}`}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}
              onClick={() => setActiveTab('pos')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
              <span>Punto de Venta (POS)</span>
            </li>
            <li 
              className={`nav-item ${activeTab === 'sales' ? 'active' : ''}`}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}
              onClick={() => setActiveTab('sales')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
              <span>Historial de Ventas</span>
            </li>
            <li 
              className={`nav-item ${activeTab === 'subscription' ? 'active' : ''}`}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}
              onClick={() => setActiveTab('subscription')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
              <span>Suscripción Premium</span>
            </li>
            <li className="nav-item" style={{ opacity: 0.5, cursor: 'not-allowed', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
              <span>Configuración</span>
            </li>
          </ul>
        </div>

        <div className="user-profile-section">
          <div className="profile-card">
            <div className="avatar">
              {user?.nombre.substring(0, 2).toUpperCase()}
            </div>
            <div className="profile-info">
              <span className="profile-name">{user?.nombre}</span>
              <span className="profile-role">{user?.role}</span>
            </div>
          </div>
          <button onClick={logout} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '12px' }}>
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Panel de Contenido Principal */}
      <main className="main-content">
        <header className="top-bar">
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: '700' }}>
              {activeTab === 'catalog' && 'Inventario de Comercio'}
              {activeTab === 'pos' && 'Punto de Venta (POS)'}
              {activeTab === 'sales' && 'Historial de Transacciones'}
              {activeTab === 'subscription' && 'Plan y Facturación'}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
              {activeTab === 'catalog' && 'Administra tus productos, variantes y niveles de stock.'}
              {activeTab === 'pos' && 'Busca productos por SKU o código de barras, arma el carrito y registra cobros.'}
              {activeTab === 'sales' && 'Consulta y audita las ventas registradas y estados fiscales.'}
              {activeTab === 'subscription' && 'Gestiona tu plan de suscripción a NovarDesk y estado de pagos.'}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="tenant-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><line x1="9" y1="22" x2="9" y2="16"></line><line x1="15" y1="22" x2="15" y2="16"></line><line x1="9" y1="16" x2="15" y2="16"></line><path d="M9 6h6M9 10h6"></path></svg>
              {tenant?.razon_social}
            </span>
            <span className="badge-plan">
              Plan: {tenant?.estado_plan}
            </span>
            <div
              onClick={toggleTheme}
              className="theme-switch-container"
              title={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
              style={{ marginLeft: '8px' }}
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
        </header>

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
                  <button onClick={() => setIsModalOpen(true)} className="btn-primary" style={{ width: 'auto' }}>
                    + Cargar Producto
                  </button>
                </div>
              </div>

              {/* Filtros de Categoría */}
              <div style={{ padding: '12px 24px', display: 'flex', gap: '8px', flexWrap: 'wrap', borderBottom: '1px solid var(--border-color)' }}>
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
                        <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                          Cargando catálogo...
                        </td>
                      </tr>
                    ) : filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                          No se encontraron productos en este comercio.
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map((p) => (
                        <tr key={p.id}>
                          <td style={{ fontWeight: '600' }}>{p.nombre}</td>
                          <td>{p.marca || '-'}</td>
                          <td>
                            <span className="variant-tag" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>
                              {p.categoria || 'Sin Categoría'}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {p.variantes.map((v) => (
                                <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                  <span style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '13px' }}>
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
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {activeTab === 'pos' && (
          <div className="pos-grid" style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: '24px', padding: '24px' }}>
            {/* Columna Izquierda: Búsqueda y Artículos del Carrito */}
            <div className="pos-cart-panel" style={{ background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <form onSubmit={handlePosSearch} style={{ display: 'flex', gap: '12px' }}>
                <input
                  type="text"
                  placeholder="Escanear código de barras o ingresar SKU..."
                  className="form-input"
                  style={{ flex: 1 }}
                  value={posSearchQuery}
                  onChange={(e) => setPosSearchQuery(e.target.value)}
                  autoFocus
                />
                <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '0 24px' }}>
                  Agregar
                </button>
              </form>

              <div className="cart-items-wrapper" style={{ overflowY: 'auto', maxHeight: '450px', flex: 1 }}>
                {cartItems.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 16px auto', display: 'block', color: 'var(--text-muted)' }}><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                    El carrito está vacío. Escanea un producto o ingresa su SKU para comenzar.
                  </div>
                ) : (
                  <table className="product-table" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th style={{ padding: '10px' }}>Producto / Variante</th>
                        <th style={{ padding: '10px', textAlign: 'center' }}>Cant.</th>
                        <th style={{ padding: '10px', textAlign: 'right' }}>Unitario ($)</th>
                        <th style={{ padding: '10px', textAlign: 'right' }}>Subtotal</th>
                        <th style={{ padding: '10px', textAlign: 'center' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {cartItems.map((item) => (
                        <tr key={item.variantId}>
                          <td style={{ padding: '12px 10px', verticalAlign: 'middle' }}>
                            <span style={{ fontWeight: '600', display: 'block' }}>{item.nombre}</span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{item.sku}</span>
                          </td>
                          <td style={{ padding: '12px 10px', textAlign: 'center', verticalAlign: 'middle' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                              <button 
                                type="button"
                                className="btn-secondary"
                                style={{ width: '28px', height: '28px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }}
                                onClick={() => updateQuantity(item.variantId, item.cantidad - 1)}
                              >
                                -
                              </button>
                              <input
                                type="number"
                                step={item.es_servicio ? '1' : '0.001'}
                                className="form-input"
                                style={{ width: '60px', height: '28px', textAlign: 'center', padding: '0 4px', margin: 0 }}
                                value={item.cantidad}
                                onChange={(e) => updateQuantity(item.variantId, parseFloat(e.target.value) || 0)}
                              />
                              <button 
                                type="button"
                                className="btn-secondary"
                                style={{ width: '28px', height: '28px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }}
                                onClick={() => updateQuantity(item.variantId, item.cantidad + 1)}
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td style={{ padding: '12px 10px', textAlign: 'right', verticalAlign: 'middle' }}>
                            <input
                              type="number"
                              step="0.01"
                              className="form-input"
                              style={{ width: '80px', height: '28px', textAlign: 'right', padding: '0 6px', display: 'inline-block', margin: 0 }}
                              value={item.precio_unitario}
                              onChange={(e) => updatePrice(item.variantId, parseFloat(e.target.value) || 0)}
                            />
                          </td>
                          <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: '600', verticalAlign: 'middle' }}>
                            ${item.subtotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: '12px 10px', textAlign: 'center', verticalAlign: 'middle' }}>
                            <button 
                              type="button"
                              style={{ background: 'none', border: 'none', color: 'hsl(var(--danger))', cursor: 'pointer', fontSize: '18px' }}
                              onClick={() => removeItem(item.variantId)}
                            >
                              &times;
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Columna Derecha: Panel de Cobro */}
            <div className="pos-checkout-panel" style={{ background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px' }}>Total a Cobrar</h3>
                <div style={{ background: 'rgba(var(--primary-rgb), 0.05)', border: '1px solid rgba(var(--primary-rgb), 0.1)', borderRadius: '8px', padding: '24px', textAlign: 'center' }}>
                  <span style={{ fontSize: '14px', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Monto Final</span>
                  <span style={{ fontSize: '36px', fontWeight: '800', color: 'hsl(var(--primary))', fontFamily: 'monospace' }}>
                    ${cartItems.reduce((acc, item) => acc + item.subtotal, 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <form onSubmit={handleCheckout} style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
                <div className="form-group">
                  <label className="form-label">Método de Pago</label>
                  <select 
                    className="form-input"
                    value={metodo_pago}
                    onChange={(e) => setMetodoPago(e.target.value)}
                  >
                    <option value="EFECTIVO">Efectivo</option>
                    <option value="TARJETA_DEBITO">Tarjeta de Débito</option>
                    <option value="TARJETA_CREDITO">Tarjeta de Crédito</option>
                    <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                    <option value="MERCADO_PAGO">Mercado Pago</option>
                  </select>
                </div>

                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '12px', color: 'var(--text-secondary)' }}>Cliente (Opcional)</h4>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                    <div className="form-group">
                      <label className="form-label">DNI / CUIT</label>
                      <input 
                        type="text"
                        className="form-input"
                        placeholder="Ej: 20-35..."
                        value={id_cliente}
                        onChange={(e) => setCliente(e.target.value, nombre_cliente)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Nombre o Razón Social</label>
                      <input 
                        type="text"
                        className="form-input"
                        placeholder="Ej: Juan Pérez"
                        value={nombre_cliente}
                        onChange={(e) => setCliente(id_cliente, e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 'auto', display: 'flex', gap: '12px' }}>
                  <button 
                    type="submit" 
                    className="btn-primary" 
                    style={{ flex: 1 }}
                    disabled={cartItems.length === 0 || createSaleMutation.isPending}
                  >
                    {createSaleMutation.isPending ? 'Procesando...' : 'Confirmar Venta'}
                  </button>
                  <button 
                    type="button" 
                    className="btn-secondary" 
                    style={{ width: 'auto', padding: '0 16px' }}
                    onClick={clearCart}
                  >
                    Vaciar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'sales' && (
          <div style={{ padding: '24px' }}>
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
                      <th style={{ textAlign: 'right' }}>Total</th>
                      <th style={{ textAlign: 'center' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingSales ? (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                          Cargando historial de ventas...
                        </td>
                      </tr>
                    ) : sales.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                          No se han registrado ventas en este comercio aún.
                        </td>
                      </tr>
                    ) : (
                      sales.map((sale) => (
                        <tr key={sale.id}>
                          <td style={{ fontWeight: 'bold' }}>#{sale.id}</td>
                          <td>{new Date(sale.fecha_venta).toLocaleString('es-AR')}</td>
                          <td>
                            <span style={{ fontWeight: '600', display: 'block' }}>{sale.nombre_cliente}</span>
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
                          <td style={{ textAlign: 'right', fontWeight: 'bold', fontFamily: 'monospace' }}>
                            ${parseFloat(sale.total as string).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ textAlign: 'center' }}>
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
            </div>
          </div>
        )}

        {activeTab === 'subscription' && (
          <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
            <div className="auth-card scale-up" style={{ textAlign: 'center', padding: '40px 24px', margin: '0' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(var(--primary-rgb), 0.1)', color: 'hsl(var(--primary))', marginBottom: '24px' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
              </div>
              
              <h2 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '8px' }}>
                Plan Actual: <span style={{ color: tenant?.estado_plan === 'ACTIVE' ? 'hsl(var(--success))' : 'inherit' }}>{tenant?.estado_plan}</span>
              </h2>
              
              <p style={{ color: 'var(--text-secondary)', fontSize: '16px', marginBottom: '32px' }}>
                {tenant?.estado_plan === 'TRIAL' && 'Estás utilizando la versión de prueba. Pásate al plan Premium para desbloquear todas las funciones sin límites.'}
                {tenant?.estado_plan === 'ACTIVE' && '¡Gracias por ser Premium! Tienes acceso a todas las funcionalidades del sistema.'}
                {tenant?.estado_plan === 'PAST_DUE' && 'Tu último pago fue rechazado. Por favor, regulariza tu situación para seguir usando el sistema.'}
                {tenant?.estado_plan === 'CANCELED' && 'Tu suscripción ha sido cancelada. Renueva tu plan para recuperar el acceso.'}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px', textAlign: 'left' }}>
                <div style={{ padding: '20px', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                  <span style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700', marginBottom: '4px' }}>Empresa</span>
                  <strong style={{ fontSize: '16px' }}>{tenant?.razon_social}</strong>
                  <div style={{ marginTop: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>CUIT: {tenant?.cuit}</div>
                </div>
                <div style={{ padding: '20px', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                  <span style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700', marginBottom: '4px' }}>Próximo Vencimiento</span>
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
                      alert('Error al generar la suscripción: ' + err.message);
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
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
                  <div style={{ display: 'flex', alignItems: 'center', height: '42px', gap: '8px' }}>
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
                <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px', color: 'hsl(var(--primary))' }}>
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
                    <h4 style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px' }}>
                      Atributos Extra de Rubro ({categoria})
                    </h4>

                    {categoria === 'Indumentaria' && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
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
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
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
                          <div style={{ display: 'flex', alignItems: 'center', height: '42px', gap: '8px' }}>
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
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
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

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)', fontSize: '13px' }}>
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

            <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '10px' }}>Artículos Vendidos</h3>
            <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
              <table className="product-table" style={{ width: '100%', fontSize: '13px' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '8px' }}>Artículo</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>Cant.</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Unitario</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Subtotal</th>
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
                        <td style={{ padding: '8px' }}>
                          <span style={{ fontWeight: '600', display: 'block' }}>{nombreDesc}</span>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{det.variante.sku}</span>
                        </td>
                        <td style={{ padding: '8px', textAlign: 'center' }}>{Number(det.cantidad)}</td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>${parseFloat(det.precio_unitario as string).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>${parseFloat(det.subtotal as string).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-tertiary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Estado de Facturación</span>
                <span style={{ display: 'block', fontWeight: 'bold', fontSize: '14px', color: selectedSale.estado_arca === 'APROBADO' ? 'hsl(var(--success))' : 'var(--text-primary)' }}>
                  {selectedSale.estado_arca}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Monto Total Pagado</span>
                <span style={{ display: 'block', fontWeight: 'bold', fontSize: '20px', fontFamily: 'monospace', color: 'hsl(var(--primary))' }}>
                  ${parseFloat(selectedSale.total as string).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
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
