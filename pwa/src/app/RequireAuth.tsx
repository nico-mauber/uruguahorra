import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { Spinner } from '@/components';

/** Guard de rutas privadas. Fuente: docs/architecture/pwa §7. */
export function RequireAuth() {
  const isLoading = useAuthStore((s) => s.isLoading);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (isLoading) return <Spinner fullscreen label="Verificando sesión…" />;
  if (!isAuthenticated) return <Navigate to="/onboarding" replace />;
  return <Outlet />;
}
