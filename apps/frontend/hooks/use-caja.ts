import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/api-client';

export function useEstadoCaja() {
  return useQuery({
    queryKey: ['caja', 'estado'],
    queryFn: async () => {
      const data = await apiRequest('/caja/estado');
      return data;
    },
  });
}

export function useAbrirCaja() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (monto_apertura: number) => {
      return apiRequest('/caja/abrir', {
        method: 'POST',
        body: JSON.stringify({ monto_apertura }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caja', 'estado'] });
    },
  });
}

export function useCerrarCaja() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (datosCierre: any) => {
      return apiRequest('/caja/cerrar', {
        method: 'POST',
        body: JSON.stringify(datosCierre),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caja', 'estado'] });
      queryClient.invalidateQueries({ queryKey: ['caja', 'historial'] });
    },
  });
}

export function useHistorialCaja(page = 1, limit = 20) {
  return useQuery({
    queryKey: ['caja', 'historial', page, limit],
    queryFn: () => apiRequest(`/caja/historial?page=${page}&limit=${limit}`),
  });
}

export function useLibroCaja(fechaDesde?: string, fechaHasta?: string) {
  return useQuery({
    queryKey: ['caja', 'libro', fechaDesde, fechaHasta],
    queryFn: () => {
      const params = new URLSearchParams();
      if (fechaDesde) params.append('fecha_desde', fechaDesde);
      if (fechaHasta) params.append('fecha_hasta', fechaHasta);
      return apiRequest(`/caja/libro?${params.toString()}`);
    },
  });
}

export function useCierreResumen() {
  return useQuery({
    queryKey: ['caja', 'cierre-resumen'],
    queryFn: () => apiRequest('/caja/cierre-resumen'),
  });
}
