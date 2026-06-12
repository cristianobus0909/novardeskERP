import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/api-client';

export interface VentaDetalle {
  id: number;
  venta_id: number;
  variante_id: number;
  cantidad: string | number;
  precio_unitario: string | number;
  subtotal: string | number;
  variante: {
    id: number;
    sku: string;
    atributos_extra: Record<string, any> | null;
    producto: {
      nombre: string;
      categoria: string | null;
    };
  };
}

export interface Venta {
  id: number;
  tenant_id: number;
  user_id: number;
  id_cliente: string | null;
  nombre_cliente: string;
  total: string | number;
  metodo_pago: string;
  fecha_venta: string;
  estado_arca: string;
  cae?: string | null;
  vto_cae?: string | null;
  tipo_comprobante?: string | null;
  arca_error?: string | null;
  usuario: {
    id: number;
    nombre: string;
    email: string;
  };
  detalles: VentaDetalle[];
}

export interface CreateVentaPayload {
  id_cliente?: string;
  nombre_cliente?: string;
  metodo_pago: string;
  total: number;
  detalles: Array<{
    variante_id: number;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
  }>;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export function useSales(page: number = 1, limit: number = 50) {
  return useQuery<PaginatedResponse<Venta>>({
    queryKey: ['sales', page, limit],
    queryFn: () => apiRequest<PaginatedResponse<Venta>>(`/ventas?page=${page}&limit=${limit}`),
  });
}

export function useCreateSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newSale: CreateVentaPayload) =>
      apiRequest<Venta>('/ventas', {
        method: 'POST',
        body: JSON.stringify(newSale),
      }),
    onSuccess: () => {
      // Al registrar una venta, invalidamos tanto el historial de ventas
      // como la lista de productos para actualizar el stock en el catálogo.
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
