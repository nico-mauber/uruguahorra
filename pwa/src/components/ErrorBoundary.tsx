import { Component, type ErrorInfo, type ReactNode } from 'react';
import styles from './ErrorBoundary.module.css';
import { Icon } from './Icon';
import { Button } from './Button';
import { logger, LogModule } from '@/lib/logger';

/** ErrorBoundary global. Fuente: docs/architecture/state-management §3.6. */
interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logger.error(LogModule.UI, 'ErrorBoundary capturó un error', {
      message: error.message,
      componentStack: info.componentStack,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className={styles.wrap}>
          <div className={styles.icon}>
            <Icon name="warning" size={56} />
          </div>
          <h1 className={styles.title}>Algo salió mal</h1>
          <p className={styles.text}>
            Ocurrió un error inesperado. Puedes intentar recargar la aplicación.
          </p>
          <Button
            variant="primary"
            size="large"
            onClick={() => location.reload()}
            style={{ maxWidth: 240 }}
          >
            Reintentar
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
