import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './theme/reset.css';
import './theme/tokens.css';
import { App } from './App';
import { useAuthStore } from '@/store/useAuthStore';

// Iniciar resolución de sesión antes del render (no bloqueante; el router
// muestra spinner mientras isLoading). Fuente: docs/architecture/state-management §2.1.
void useAuthStore.getState().initialize();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
