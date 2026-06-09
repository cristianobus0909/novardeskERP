import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface User {
  id: number;
  nombre: string;
  email: string;
  role: string;
}

export interface Tenant {
  id: number;
  razon_social: string;
  cuit?: string | null;
  estado_plan: string;
  mp_suscripcion_id?: string | null;
  fin_prueba?: string | null;
  fecha_proximo_cobro?: string | null;
  creado_el?: string | null;
}

interface AuthState {
  token: string | null;
  user: User | null;
  tenant: Tenant | null;
  setAuth: (token: string, user: User, tenant: Tenant) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      tenant: null,
      setAuth: (token, user, tenant) => set({ token, user, tenant }),
      logout: () => set({ token: null, user: null, tenant: null }),
    }),
    {
      name: 'novardesk-auth', // Clave en localStorage
      storage: createJSONStorage(() => localStorage),
    }
  )
);
