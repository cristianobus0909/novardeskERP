import { create } from 'zustand';

export interface CartItem {
  variantId: number;
  sku: string;
  nombre: string; // Nombre del producto padre + atributos descriptivos
  precio_unitario: number;
  cantidad: number;
  subtotal: number;
  stock_actual: number;
  es_servicio: boolean;
}

interface CartState {
  items: CartItem[];
  id_cliente: string;
  nombre_cliente: string;
  metodo_pago: string;
  
  addItem: (variant: any) => void;
  removeItem: (variantId: number) => void;
  updateQuantity: (variantId: number, cantidad: number) => void;
  updatePrice: (variantId: number, precio: number) => void;
  setCliente: (id_cliente: string, nombre_cliente: string) => void;
  setMetodoPago: (metodo_pago: string) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>((set) => ({
  items: [],
  id_cliente: '',
  nombre_cliente: 'Consumidor Final',
  metodo_pago: 'EFECTIVO',

  addItem: (variant) => set((state) => {
    const existingIndex = state.items.findIndex(item => item.variantId === variant.id);
    const itemPrecio = typeof variant.precio_venta === 'string' ? parseFloat(variant.precio_venta) : variant.precio_venta;
    const itemStock = typeof variant.stock_actual === 'string' ? parseFloat(variant.stock_actual) : variant.stock_actual;
    const esServicio = variant.producto?.es_servicio ?? false;

    // Crear descripción legible (ej: "Jean Levi's 511 (Talle: 32, Color: Azul)")
    const attrs = variant.atributos_extra ? Object.entries(variant.atributos_extra)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ') : '';
    const nombreCompleto = variant.producto?.nombre + (attrs ? ` (${attrs})` : '');

    if (existingIndex > -1) {
      const existingItem = state.items[existingIndex];
      if (!existingItem) return state;
      const nuevaCantidad = existingItem.cantidad + 1;

      // Validar stock si no es servicio
      if (!esServicio && nuevaCantidad > itemStock) {
        alert(`No hay stock suficiente. Máximo disponible: ${itemStock}`);
        return state;
      }

      const updatedItems = [...state.items];
      updatedItems[existingIndex] = {
        ...existingItem,
        cantidad: nuevaCantidad,
        subtotal: nuevaCantidad * existingItem.precio_unitario,
      };

      return { items: updatedItems };
    }

    // Validar stock para el primer item si no es servicio
    if (!esServicio && itemStock < 1) {
      alert(`No hay stock disponible para este artículo.`);
      return state;
    }

    const newItem: CartItem = {
      variantId: variant.id,
      sku: variant.sku,
      nombre: nombreCompleto,
      precio_unitario: itemPrecio,
      cantidad: 1,
      subtotal: itemPrecio,
      stock_actual: itemStock,
      es_servicio: esServicio,
    };

    return { items: [...state.items, newItem] };
  }),

  removeItem: (variantId) => set((state) => ({
    items: state.items.filter(item => item.variantId !== variantId)
  })),

  updateQuantity: (variantId, cantidad) => set((state) => {
    const item = state.items.find(i => i.variantId === variantId);
    if (!item) return state;

    if (cantidad <= 0) {
      return { items: state.items.filter(i => i.variantId !== variantId) };
    }

    // Validar stock si no es servicio
    if (!item.es_servicio && cantidad > item.stock_actual) {
      alert(`Cantidad excede el stock disponible (${item.stock_actual})`);
      return state;
    }

    const updatedItems = state.items.map(i => {
      if (i.variantId === variantId) {
        return {
          ...i,
          cantidad,
          subtotal: cantidad * i.precio_unitario
        };
      }
      return i;
    });

    return { items: updatedItems };
  }),

  updatePrice: (variantId, precio) => set((state) => {
    const updatedItems = state.items.map(i => {
      if (i.variantId === variantId) {
        return {
          ...i,
          precio_unitario: precio,
          subtotal: i.cantidad * precio
        };
      }
      return i;
    });

    return { items: updatedItems };
  }),

  setCliente: (id_cliente, nombre_cliente) => set({ 
    id_cliente, 
    nombre_cliente: nombre_cliente.trim() || 'Consumidor Final' 
  }),

  setMetodoPago: (metodo_pago) => set({ metodo_pago }),

  clearCart: () => set({
    items: [],
    id_cliente: '',
    nombre_cliente: 'Consumidor Final',
    metodo_pago: 'EFECTIVO'
  })
}));
