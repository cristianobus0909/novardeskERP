import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/api-client';

export interface Movimiento {
  id: number;
  tipo_movimiento: 'CARGO' | 'ABONO';
  monto: string | number;
  concepto: string;
  fecha_movimiento: string;
}

export interface CuentaCorriente {
  id: number;
  limite_credito: string | number;
  saldo_actual: string | number;
  activa: boolean;
  movimientos: Movimiento[];
}

export function useCuentaCorriente(clienteId: number | null) {
  return useQuery<CuentaCorriente>({
    queryKey: ['cuenta-corriente', clienteId],
    queryFn: () => apiRequest<CuentaCorriente>(`/clientes/${clienteId}/cuenta-corriente`),
    enabled: !!clienteId,
  });
}

export function useEnableCuentaCorriente() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ clienteId, limite }: { clienteId: number; limite: number }) =>
      apiRequest(`/clientes/${clienteId}/cuenta-corriente`, {
        method: 'POST',
        body: JSON.stringify({ limite_credito: limite }),
      }),
    onSuccess: (_, { clienteId }) => {
      queryClient.invalidateQueries({ queryKey: ['cuenta-corriente', clienteId] });
    },
  });
}

export function useRegistrarAbono() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ clienteId, monto, concepto }: { clienteId: number; monto: number; concepto: string }) =>
      apiRequest(`/clientes/${clienteId}/cuenta-corriente/abono`, {
        method: 'POST',
        body: JSON.stringify({ monto, concepto }),
      }),
    onSuccess: (_, { clienteId }) => {
      queryClient.invalidateQueries({ queryKey: ['cuenta-corriente', clienteId] });
    },
  });
}
