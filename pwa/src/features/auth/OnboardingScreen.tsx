import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Input } from '@/components';
import { useTheme } from '@/theme/useTheme';
import { useAuthStore } from '@/store/useAuthStore';
import { ToastService } from '@/lib/toast';

/**
 * Onboarding — registro/login con email + contraseña.
 * Fuente: docs/api/contracts-and-data-mapping §1.
 * Fase 02 (features/auth).
 */
type Mode = 'login' | 'signup';

const MIN_PASSWORD = 6; // Coincide con Supabase Auth (Minimum password length).

export function OnboardingScreen() {
  const { isDark, toggle } = useTheme();
  const navigate = useNavigate();

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const signUp = useAuthStore((s) => s.signUp);
  const signIn = useAuthStore((s) => s.signIn);

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Si ya hay sesión, no mostrar onboarding: ir al dashboard.
  useEffect(() => {
    if (!isLoading && isAuthenticated) navigate('/', { replace: true });
  }, [isLoading, isAuthenticated, navigate]);

  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
  const passwordOk = password.length >= MIN_PASSWORD;
  const canSubmit = emailOk && passwordOk && !submitting;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const fn = mode === 'signup' ? signUp : signIn;
      const ok = await fn(email.trim(), password);
      if (ok) {
        ToastService.success(
          mode === 'signup' ? '¡Cuenta creada!' : '¡Bienvenido de vuelta!'
        );
        navigate('/', { replace: true });
      } else {
        ToastService.warning(
          'Revisa tu email',
          'Tu cuenta necesita confirmación antes de entrar.'
        );
      }
    } catch (error) {
      ToastService.handleError(error);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        maxWidth: 'var(--content-max-width)',
        margin: '0 auto',
        padding: 'var(--space-xl)',
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 'var(--space-lg)',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48 }}>💰</div>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginTop: 8 }}>
          UruguAhorra
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', marginTop: 4 }}>
          {mode === 'signup'
            ? 'Creá tu cuenta y empezá a ahorrar'
            : 'Ingresá para seguir ahorrando'}
        </p>
      </div>

      <Card>
        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}
        >
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Email</span>
            <Input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Contraseña</span>
            <Input
              type="password"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {password.length > 0 && !passwordOk && (
              <span style={{ fontSize: 12, color: 'var(--color-danger, #EF4444)' }}>
                La contraseña debe tener al menos {MIN_PASSWORD} caracteres.
              </span>
            )}
          </label>

          <Button type="submit" loading={submitting} disabled={!canSubmit}>
            {mode === 'signup' ? 'Crear cuenta' : 'Ingresar'}
          </Button>
        </form>
      </Card>

      <div style={{ textAlign: 'center' }}>
        <Button
          variant="ghost"
          onClick={() => setMode((m) => (m === 'login' ? 'signup' : 'login'))}
        >
          {mode === 'login'
            ? '¿No tenés cuenta? Registrate'
            : '¿Ya tenés cuenta? Ingresá'}
        </Button>
      </div>

      <div style={{ textAlign: 'center' }}>
        <Button variant="outline" size="small" onClick={toggle}>
          Tema: {isDark ? 'Oscuro' : 'Claro'}
        </Button>
      </div>
    </div>
  );
}
