import { create } from 'zustand';
import { toast } from './use-toast-store';

export interface CartItem {
  variantId: number;
  sku: string;
  nombre: string; 
  precio_unitario: number;
  cantidad: number;
  subtotal: number;
  stock_actual: number;
  es_servicio: boolean;
  producto_id?: number;
  categoria?: string;
  unidad_medida?: string;
}

interface CartState {
  items: CartItem[];
  cliente_id?: number;
  id_cliente: string;
  nombre_cliente: string;
  metodo_pago: string;
  cuenta_contable_id?: number;
  plan_pago_id?: number;
  recargo_monto: number;
  solicita_factura: boolean;
  
  addItem: (variant: any, customQuantity?: number) => void;
  removeItem: (variantId: number) => void;
  updateQuantity: (variantId: number, cantidad: number) => void;
  updatePrice: (variantId: number, precio: number) => void;
  setCliente: (cliente_id: number | undefined, id_cliente: string, nombre_cliente: string) => void;
  setMetodoPago: (metodo_pago: string, cuentaId?: number, planId?: number, recargo?: number) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>((set) => ({
  items: [],
  cliente_id: undefined,
  id_cliente: '',
  nombre_cliente: 'Consumidor Final',
  metodo_pago: 'EFECTIVO',
  cuenta_contable_id: undefined,
  plan_pago_id: undefined,
  recargo_monto: 0,
  solicita_factura: false,

  addItem: (variant, customQuantity) => set((state) => {
    const existingIndex = state.items.findIndex(item => item.variantId === variant.id);
    const itemPrecio = typeof variant.precio_venta === 'string' ? parseFloat(variant.precio_venta) : variant.precio_venta;
    const itemStock = typeof variant.stock_actual === 'string' ? parseFloat(variant.stock_actual) : variant.stock_actual;
    const esServicio = variant.producto?.es_servicio ?? false;

    const attrs = variant.atributos_extra ? Object.entries(variant.atributos_extra)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ') : '';
    const nombreCompleto = variant.producto?.nombre + (attrs ? ` (${attrs})` : '');

    const addedQty = customQuantity !== undefined ? customQuantity : 1;

    if (existingIndex > -1) {
      const existingItem = state.items[existingIndex];
      if (!existingItem) return state;
      const nuevaCantidad = existingItem.cantidad + addedQty;

      if (!esServicio && nuevaCantidad > itemStock) {
        toast.error(`No hay stock suficiente. Máximo disponible: ${itemStock}`);
        return state;
      }

      const updatedItems = [...state.items];
      updatedItems[existingIndex] = {
        ...existingItem,
        cantidad: nuevaCantidad,
        subtotal: nuevaCantidad * existingItem.precio_unitario,
      };

      toast.success('Producto agregado al carrito');
      return { items: updatedItems };
    }

    if (!esServicio && itemStock < addedQty) {
      toast.error(`No hay stock disponible para este artículo.`);
      return state;
    }

    const newItem: CartItem = {
      variantId: variant.id,
      sku: variant.sku,
      nombre: nombreCompleto,
      precio_unitario: itemPrecio,
      cantidad: addedQty,
      subtotal: addedQty * itemPrecio,
      stock_actual: itemStock,
      es_servicio: esServicio,
      producto_id: variant.producto?.id,
      categoria: variant.producto?.categoria?.nombre,
      unidad_medida: variant.producto?.unidad_medida || 'unidad'
    };

    toast.success('Producto agregado al carrito');
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

    if (!item.es_servicio && cantidad > item.stock_actual) {
      toast.error(`Cantidad excede el stock disponible (${item.stock_actual})`);
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

  setCliente: (cliente_id, id_cliente, nombre_cliente) => set({ 
    cliente_id,
    id_cliente, 
    nombre_cliente: nombre_cliente.trim() || 'Consumidor Final' 
  }),

  setMetodoPago: (metodo_pago, cuentaId, planId, recargo) => set({ 
    metodo_pago,
    cuenta_contable_id: cuentaId,
    plan_pago_id: planId,
    recargo_monto: recargo || 0
  }),

  clearCart: () => set({
    items: [],
    cliente_id: undefined,
    id_cliente: '',
    nombre_cliente: 'Consumidor Final',
    metodo_pago: 'EFECTIVO',
    cuenta_contable_id: undefined,
    plan_pago_id: undefined,
    recargo_monto: 0,
    solicita_factura: false
  })
}));
