import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/api-client';

export function useGastos() {
  return useQuery({
    queryKey: ['gastos'],
    queryFn: () => apiRequest('/gastos'),
  });
}

export function useCreateGasto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      apiRequest('/gastos', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gastos'] });
      queryClient.invalidateQueries({ queryKey: ['caja', 'estado'] });
      queryClient.invalidateQueries({ queryKey: ['caja', 'libro'] });
    },
  });
}

export function useDeleteGasto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/gastos/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gastos'] });
      queryClient.invalidateQueries({ queryKey: ['caja', 'estado'] });
      queryClient.invalidateQueries({ queryKey: ['caja', 'libro'] });
    },
  });
}
