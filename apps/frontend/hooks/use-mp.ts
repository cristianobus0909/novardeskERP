import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/api-client';

export interface MpConfig {
  mp_access_token: string | null;
  mp_caja_id: string | null;
  isConfigured: boolean;
}

export function useMpConfig() {
  return useQuery<MpConfig>({
    queryKey: ['mp-config'],
    queryFn: () => apiRequest<MpConfig>('/mp/config'),
  });
}

export function useSaveMpConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (config: { mp_access_token: string; mp_caja_id: string }) =>
      apiRequest<{ success: boolean; message: string }>('/mp/config', {
        method: 'POST',
        body: JSON.stringify(config),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mp-config'] });
    },
  });
}

export function useMpPosIntent() {
  return useMutation({
    mutationFn: (order: { external_reference: string; total_amount: number; title: string }) =>
      apiRequest<any>('/mp/pos/intent', {
        method: 'POST',
        body: JSON.stringify(order),
      }),
  });
}

export function useMpQrIntent() {
  return useMutation({
    mutationFn: (order: { external_reference: string; total_amount: number; title: string }) =>
      apiRequest<any>('/mp/qr/intent', {
        method: 'POST',
        body: JSON.stringify(order),
      }),
  });
}
