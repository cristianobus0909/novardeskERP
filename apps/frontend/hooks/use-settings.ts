import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/api-client';

export interface Employee {
  id: number;
  nombre: string;
  email: string;
  activo: boolean;
  role: {
    nombre: string;
  };
}

export function useEmployees() {
  return useQuery({
    queryKey: ['employees'],
    queryFn: () => apiRequest<Employee[]>('/users'),
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) =>
      apiRequest('/users/employee', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

export function useUpdateTenantProfile() {
  return useMutation({
    mutationFn: (data: { 
      razon_social?: string; 
      cuit?: string; 
      domicilio_fiscal?: string;
      condicion_iva?: string;
      afip_crt?: string;
      afip_key?: string;
      afip_punto_venta?: number;
    }) =>
      apiRequest('/tenants/profile', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
  });
}
