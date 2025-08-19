/**
 * Adaptador de almacenamiento seguro para Supabase en plataforma web
 * Implementa la misma interfaz que AsyncStorage pero con cifrado
 */

import { EncryptedStorage } from './encrypted-storage';
import { logger, LogModule } from '@/utils/logger';

/**
 * Adaptador seguro para almacenamiento web
 * Compatible con la interfaz de Supabase Auth Storage
 */
export class SecureWebStorageAdapter {
  private storage: EncryptedStorage;
  private initialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.storage = EncryptedStorage.getInstance();
  }

  /**
   * Inicializa el almacenamiento cifrado
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Si ya hay una inicialización en progreso, esperar
    if (this.initPromise) {
      return this.initPromise;
    }

    // Iniciar nueva inicialización
    this.initPromise = this.initialize();
    return this.initPromise;
  }

  /**
   * Proceso de inicialización
   */
  private async initialize(): Promise<void> {
    try {
      await this.storage.initialize();
      this.initialized = true;

      // Migrar tokens existentes si los hay
      await this.migrateExistingTokens();

      logger.info(LogModule.AUTH, 'Secure web storage adapter initialized');
    } catch (error) {
      logger.error(
        LogModule.AUTH,
        'Failed to initialize secure storage',
        error
      );
      // Fallback a localStorage sin cifrado si falla
      this.initialized = false;
      throw error;
    }
  }

  /**
   * Obtiene un elemento del almacenamiento
   */
  async getItem(key: string): Promise<string | null> {
    try {
      await this.ensureInitialized();

      const value = await this.storage.getItem(key);

      if (value) {
        logger.debug(LogModule.AUTH, 'Retrieved encrypted item', {
          key: this.sanitizeKey(key),
        });
      }

      return value;
    } catch (error) {
      logger.error(LogModule.AUTH, 'Error retrieving item', {
        key: this.sanitizeKey(key),
        error,
      });

      // Fallback a localStorage sin cifrado
      return this.fallbackGetItem(key);
    }
  }

  /**
   * Almacena un elemento
   */
  async setItem(key: string, value: string): Promise<void> {
    try {
      await this.ensureInitialized();

      // Configurar expiración basada en el tipo de token
      const options = this.getStorageOptions(key, value);

      await this.storage.setItem(key, value, options);

      logger.debug(LogModule.AUTH, 'Stored encrypted item', {
        key: this.sanitizeKey(key),
        size: value.length,
      });
    } catch (error) {
      logger.error(LogModule.AUTH, 'Error storing item', {
        key: this.sanitizeKey(key),
        error,
      });

      // Fallback a localStorage sin cifrado
      this.fallbackSetItem(key, value);
    }
  }

  /**
   * Elimina un elemento
   */
  async removeItem(key: string): Promise<void> {
    try {
      await this.ensureInitialized();

      this.storage.removeItem(key);

      logger.debug(LogModule.AUTH, 'Removed encrypted item', {
        key: this.sanitizeKey(key),
      });
    } catch (error) {
      logger.error(LogModule.AUTH, 'Error removing item', {
        key: this.sanitizeKey(key),
        error,
      });

      // Fallback a localStorage
      localStorage.removeItem(key);
    }
  }

  /**
   * Determina opciones de almacenamiento basadas en el contenido
   */
  private getStorageOptions(
    key: string,
    value: string
  ): {
    expirationMs: number;
    autoCleanup: boolean;
  } {
    // Intentar parsear como JSON para detectar tipo de token
    try {
      const data = JSON.parse(value);

      // Si es un token de acceso, expiración corta
      if (data.access_token || key.includes('access_token')) {
        return {
          expirationMs: 60 * 60 * 1000, // 1 hora
          autoCleanup: true,
        };
      }

      // Si es un refresh token, expiración más larga
      if (data.refresh_token || key.includes('refresh_token')) {
        return {
          expirationMs: 7 * 24 * 60 * 60 * 1000, // 7 días
          autoCleanup: true,
        };
      }

      // Si es información de sesión completa
      if (data.access_token && data.refresh_token) {
        return {
          expirationMs: 60 * 60 * 1000, // 1 hora (basado en access token)
          autoCleanup: true,
        };
      }
    } catch {
      // No es JSON válido, usar valores por defecto
    }

    // Por defecto, 1 hora de expiración
    return {
      expirationMs: 60 * 60 * 1000,
      autoCleanup: true,
    };
  }

  /**
   * Migra tokens existentes no cifrados
   */
  private async migrateExistingTokens(): Promise<void> {
    const supabaseKeys = [
      'supabase.auth.token',
      'sb-auth-token',
      'supabase.auth.refreshToken',
      'supabase.auth.user',
    ];

    for (const key of supabaseKeys) {
      const value = localStorage.getItem(key);
      if (value) {
        try {
          // Almacenar versión cifrada
          await this.storage.setItem(key, value);
          // Eliminar versión no cifrada
          localStorage.removeItem(key);

          logger.info(LogModule.AUTH, 'Migrated existing token', {
            key: this.sanitizeKey(key),
          });
        } catch (error) {
          logger.error(LogModule.AUTH, 'Failed to migrate token', {
            key: this.sanitizeKey(key),
            error,
          });
        }
      }
    }
  }

  /**
   * Sanitiza claves para logging (oculta información sensible)
   */
  private sanitizeKey(key: string): string {
    if (key.includes('token') || key.includes('auth')) {
      return key.substring(0, 10) + '...';
    }
    return key;
  }

  /**
   * Fallback: obtiene del localStorage sin cifrado
   */
  private fallbackGetItem(key: string): string | null {
    logger.warn(LogModule.AUTH, 'Using unencrypted fallback for getItem', {
      key: this.sanitizeKey(key),
    });
    return localStorage.getItem(key);
  }

  /**
   * Fallback: almacena en localStorage sin cifrado
   */
  private fallbackSetItem(key: string, value: string): void {
    logger.warn(LogModule.AUTH, 'Using unencrypted fallback for setItem', {
      key: this.sanitizeKey(key),
    });
    localStorage.setItem(key, value);
  }

  /**
   * Limpia todo el almacenamiento
   */
  async clear(): Promise<void> {
    try {
      await this.ensureInitialized();
      this.storage.clear();
      logger.info(LogModule.AUTH, 'Cleared all encrypted storage');
    } catch (error) {
      logger.error(LogModule.AUTH, 'Error clearing storage', error);
      // Intentar limpiar localStorage directamente
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.includes('supabase') || key.includes('auth')) {
          localStorage.removeItem(key);
        }
      });
    }
  }

  /**
   * Verifica si el almacenamiento cifrado está disponible
   */
  async isEncryptionAvailable(): Promise<boolean> {
    try {
      await this.ensureInitialized();
      return this.initialized;
    } catch {
      return false;
    }
  }

  /**
   * Obtiene estadísticas del almacenamiento
   */
  getStorageStats(): {
    encryptedItems: number;
    unencryptedItems: number;
    totalSize: number;
  } {
    const encryptedKeys = Object.keys(localStorage).filter((key) =>
      key.startsWith('uruguahorra_enc_')
    );

    const unencryptedAuthKeys = Object.keys(localStorage).filter(
      (key) =>
        (key.includes('supabase') || key.includes('auth')) &&
        !key.startsWith('uruguahorra_enc_')
    );

    let totalSize = 0;
    [...encryptedKeys, ...unencryptedAuthKeys].forEach((key) => {
      const value = localStorage.getItem(key);
      if (value) {
        totalSize += key.length + value.length;
      }
    });

    return {
      encryptedItems: encryptedKeys.length,
      unencryptedItems: unencryptedAuthKeys.length,
      totalSize,
    };
  }
}

/**
 * Crea una instancia del adaptador seguro
 */
export function createSecureWebStorage() {
  return new SecureWebStorageAdapter();
}
