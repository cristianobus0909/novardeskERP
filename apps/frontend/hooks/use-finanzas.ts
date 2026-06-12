import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/api-client';

export interface PlanPago {
  id: number;
  nombre: string;
  cuotas: number;
  recargo_porcentaje: number;
  comision_porcentaje: number;
  activo: boolean;
}

export interface CuentaContable {
  id: number;
  nombre: string;
  tipo: string;
  activa: boolean;
  planes_pago: PlanPago[];
}

export function useCuentasContables() {
  return useQuery<CuentaContable[]>({
    queryKey: ['cuentas-contables'],
    queryFn: () => apiRequest<CuentaContable[]>('/finanzas/cuentas'),
  });
}

export function useCreateCuenta() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { nombre: string; tipo: string }) =>
      apiRequest<{ id: number }>('/finanzas/cuentas', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cuentas-contables'] });
    },
  });
}

export function useCreatePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { cuentaId: number; nombre: string; cuotas: number; recargo_porcentaje: number; comision_porcentaje: number }) =>
      apiRequest<{ id: number }>(`/finanzas/cuentas/${data.cuentaId}/planes`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cuentas-contables'] });
    },
  });
}

export function useDeletePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (planId: number) =>
      apiRequest(`/finanzas/planes/${planId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cuentas-contables'] });
    },
  });
}
