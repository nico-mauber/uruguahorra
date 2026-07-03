import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './theme/reset.css';
import './theme/tokens.css';
import { App } from './App';
import { useAuthStore } from '@/store/useAuthStore';
import { initPWA } from '@/lib/pwa';

// Iniciar resolución de sesión antes del render (no bloqueante; el router
// muestra spinner mientras isLoading). Fuente: docs/architecture/state-management §2.1.
void useAuthStore.getState().initialize();

// Registrar Service Worker (sólo en producción). Fuente: docs/architecture/pwa §3.3.
initPWA();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
