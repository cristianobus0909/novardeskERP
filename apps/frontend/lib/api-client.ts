import { useAuthStore } from '../store/use-auth-store';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3000';

export async function apiRequest<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const { token } = useAuthStore.getState();

  const headers = new Headers(options.headers);
  
  // Si no se define otra cosa, asumimos JSON
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // Inyectar el token JWT de la sesión activa de forma automática
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    // Si el servidor devuelve 401, la sesión expiró → limpiar y forzar re-login
    if (response.status === 401) {
      useAuthStore.getState().logout();
      throw new Error('Sesión expirada. Por favor iniciá sesión nuevamente.');
    }
    throw new Error(errorData.message || 'Ocurrió un error en el servidor');
  }

  // Manejo para respuestas sin contenido (204 No Content)
  if (response.status === 204) {
    return null as any;
  }

  return response.json();
}
