'use client';

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export default function Providers({ children }: { children: React.ReactNode }) {
  // Inicializamos el QueryClient en un estado para evitar compartir el caché entre requests en SSR
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // Caché fresco por 1 minuto
            refetchOnWindowFocus: false, // No re-consultar al cambiar de ventana en desarrollo
            retry: 1, // Reintentar consultas fallidas 1 vez
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
