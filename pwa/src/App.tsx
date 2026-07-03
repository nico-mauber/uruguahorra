import { RouterProvider } from 'react-router-dom';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { ErrorBoundary, Toaster } from '@/components';
import { router } from '@/app/router';
import { PWAStatus } from '@/features/pwa/PWAStatus';

export function App() {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        {/* Banners PWA: offline, actualización, instalación + detección de red. */}
        <PWAStatus />
        <RouterProvider router={router} />
        <Toaster />
      </ErrorBoundary>
    </ThemeProvider>
  );
}
