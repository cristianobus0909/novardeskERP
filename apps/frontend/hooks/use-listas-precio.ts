import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/api-client';

export interface ListaPrecioItem {
  id: number;
  lista_precio_id: number;
  variante_id: number;
  precio: string | number;
  variante?: {
    id: number;
    sku: string;
    codigo_barras?: string;
    precio_venta: string | number;
    costo: string | number;
    atributos_extra?: Record<string, any>;
    producto?: {
      id: number;
      nombre: string;
    };
  };
}

export interface ListaPrecio {
  id: number;
  tenant_id: number;
  nombre: string;
  creado_el: string;
  _count?: {
    items: number;
  };
  items?: ListaPrecioItem[];
}

// Obtener todas las listas de precios
export function useListasPrecio() {
  return useQuery<ListaPrecio[]>({
    queryKey: ['listas-precio'],
    queryFn: () => apiRequest<ListaPrecio[]>('/listas-precio'),
  });
}

// Obtener detalles de una lista de precios
export function useListaPrecioDetails(id: number | null) {
  return useQuery<ListaPrecio>({
    queryKey: ['listas-precio', id],
    queryFn: () => apiRequest<ListaPrecio>(`/listas-precio/${id}`),
    enabled: id !== null && id !== undefined,
  });
}

// Crear una lista de precios
export function useCreateListaPrecio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newLista: {
      nombre: string;
      items?: { variante_id: number; precio: number }[];
    }) =>
      apiRequest<ListaPrecio>('/listas-precio', {
        method: 'POST',
        body: JSON.stringify(newLista),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listas-precio'] });
    },
  });
}

// Actualizar una lista de precios
export function useUpdateListaPrecio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      nombre,
      items,
    }: {
      id: number;
      nombre?: string;
      items?: { variante_id: number; precio: number }[];
    }) =>
      apiRequest<ListaPrecio>(`/listas-precio/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ nombre, items }),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['listas-precio'] });
      queryClient.invalidateQueries({ queryKey: ['listas-precio', variables.id] });
    },
  });
}

// Eliminar una lista de precios
export function useDeleteListaPrecio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) =>
      apiRequest<any>(`/listas-precio/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listas-precio'] });
    },
  });
}
