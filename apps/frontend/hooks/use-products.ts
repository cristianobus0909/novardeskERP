import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/api-client';

export interface ProductoVariante {
  id: number;
  producto_id: number;
  tenant_id: number;
  sku: string;
  codigo_barras?: string;
  precio_venta: string | number; // Recibido como String de Decimal, parseable a number
  stock_actual: string | number;
  atributos_extra: Record<string, any>;
}

export interface Producto {
  id: number;
  tenant_id: number;
  nombre: string;
  descripcion?: string;
  categoria?: string;
  marca?: string;
  es_servicio: boolean;
  variantes: ProductoVariante[];
}

// Hook para listar productos del tenant activo
export function useProducts() {
  return useQuery<Producto[]>({
    queryKey: ['products'],
    queryFn: () => apiRequest<Producto[]>('/productos'),
  });
}

// Hook para crear un producto y sus variantes de forma transaccional
export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newProduct: {
      nombre: string;
      descripcion?: string;
      categoria?: string;
      marca?: string;
      es_servicio?: boolean;
      variantes: Array<{
        sku: string;
        codigo_barras?: string;
        precio_venta: number;
        stock_actual: number;
        atributos_extra?: Record<string, any>;
      }>;
    }) =>
      apiRequest<Producto>('/productos', {
        method: 'POST',
        body: JSON.stringify(newProduct),
      }),
    onSuccess: () => {
      // Invalidar y refrescar la caché de productos de forma inmediata
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

// Hook para búsqueda de variante en el POS (escaneo)
export function useSearchVariant(searchQuery: string, isEnabled = false) {
  return useQuery<ProductoVariante & { producto: Producto }>({
    queryKey: ['variant', searchQuery],
    queryFn: () => apiRequest<ProductoVariante & { producto: Producto }>(`/productos/variante/buscar?q=${searchQuery}`),
    enabled: isEnabled && searchQuery.trim().length > 0,
    retry: false,
  });
}
