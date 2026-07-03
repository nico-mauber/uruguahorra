import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { ErrorBoundary, Toaster } from '@/components';
import { router } from '@/app/router';
import { useUIStore } from '@/store/useUIStore';
import styles from './App.module.css';

function OfflineBanner() {
  const isOnline = useUIStore((s) => s.isOnline);
  if (isOnline) return null;
  return <div className={styles.offlineBanner}>Sin conexión</div>;
}

export function App() {
  const setOnline = useUIStore((s) => s.setOnline);

  // Detector de conectividad. Fuente: docs/architecture/pwa §4.1.
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, [setOnline]);

  return (
    <ThemeProvider>
      <ErrorBoundary>
        <OfflineBanner />
        <RouterProvider router={router} />
        <Toaster />
      </ErrorBoundary>
    </ThemeProvider>
  );
}
