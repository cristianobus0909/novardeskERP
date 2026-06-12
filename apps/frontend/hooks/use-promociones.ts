import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/api-client';

export function usePromocionesActivas() {
  return useQuery({
    queryKey: ['promociones', 'activas'],
    queryFn: () => apiRequest<any[]>('/promociones/activas'),
    staleTime: 1000 * 60 * 5 // 5 minutos
  });
}

export function usePromociones() {
  return useQuery({
    queryKey: ['promociones'],
    queryFn: () => apiRequest<any[]>('/promociones'),
  });
}

export function useCreatePromocion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiRequest('/promociones', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promociones'] });
      queryClient.invalidateQueries({ queryKey: ['promociones', 'activas'] });
    }
  });
}

export function useTogglePromocion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiRequest(`/promociones/${id}/toggle`, {
      method: 'PATCH'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promociones'] });
      queryClient.invalidateQueries({ queryKey: ['promociones', 'activas'] });
    }
  });
}

export function useDeletePromocion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiRequest(`/promociones/${id}`, {
      method: 'DELETE'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promociones'] });
      queryClient.invalidateQueries({ queryKey: ['promociones', 'activas'] });
    }
  });
}
