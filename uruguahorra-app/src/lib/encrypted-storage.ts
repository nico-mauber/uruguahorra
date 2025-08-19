/**
 * Sistema de almacenamiento cifrado para web
 * Proporciona almacenamiento seguro usando AES-GCM con Web Crypto API
 */

import {
  deriveKeyFromSeed,
  encryptData,
  decryptData,
  arrayBufferToBase64,
  base64ToArrayBuffer,
  generateSalt,
  isWebCryptoAvailable,
  hashString,
} from './crypto-utils';
import { getDeviceSeed } from '@/utils/device-fingerprint';
import { logger, LogModule } from '@/utils/logger';

interface EncryptedData {
  ciphertext: string; // base64
  iv: string; // base64
  salt: string; // base64
  timestamp: number;
  version: number;
  fingerprint: string; // Para detectar cambios de dispositivo
}

interface StorageOptions {
  expirationMs?: number; // Tiempo de expiración en milisegundos
  autoCleanup?: boolean; // Limpiar automáticamente datos expirados
}

export class EncryptedStorage {
  private static instance: EncryptedStorage;
  private encryptionKey: CryptoKey | null = null;
  private keyDerivationSalt: Uint8Array;
  private deviceFingerprint: string | null = null;
  private readonly STORAGE_PREFIX = 'uruguahorra_enc_';
  private readonly KEY_STORAGE_KEY = 'uruguahorra_key_salt';
  private readonly VERSION = 1;
  private readonly DEFAULT_EXPIRATION_MS = 60 * 60 * 1000; // 1 hora por defecto
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    // Obtener o generar salt para derivación de clave
    const storedSalt = localStorage.getItem(this.KEY_STORAGE_KEY);
    if (storedSalt) {
      this.keyDerivationSalt = new Uint8Array(
        JSON.parse(storedSalt) as number[]
      );
    } else {
      this.keyDerivationSalt = generateSalt();
      localStorage.setItem(
        this.KEY_STORAGE_KEY,
        JSON.stringify(Array.from(this.keyDerivationSalt))
      );
    }
  }

  /**
   * Obtiene la instancia singleton
   */
  static getInstance(): EncryptedStorage {
    if (!EncryptedStorage.instance) {
      EncryptedStorage.instance = new EncryptedStorage();
    }
    return EncryptedStorage.instance;
  }

  /**
   * Inicializa el sistema de almacenamiento cifrado
   */
  async initialize(): Promise<void> {
    try {
      // Verificar disponibilidad de Web Crypto API
      if (!isWebCryptoAvailable()) {
        throw new Error('Web Crypto API not available');
      }

      // Generar fingerprint del dispositivo
      this.deviceFingerprint = await hashString(await getDeviceSeed());

      // Derivar clave de cifrado desde seed del dispositivo
      const deviceSeed = await getDeviceSeed();
      this.encryptionKey = await deriveKeyFromSeed(
        deviceSeed,
        this.keyDerivationSalt
      );

      // Verificar integridad de datos existentes
      await this.verifyDataIntegrity();

      // Iniciar limpieza automática
      this.startAutoCleanup();

      logger.success(LogModule.AUTH, 'Encrypted storage initialized');
    } catch (error) {
      logger.error(
        LogModule.AUTH,
        'Failed to initialize encrypted storage',
        error
      );
      throw error;
    }
  }

  /**
   * Almacena datos cifrados
   */
  async setItem(
    key: string,
    value: string,
    options: StorageOptions = {}
  ): Promise<void> {
    if (!this.encryptionKey) {
      await this.initialize();
    }

    if (!this.encryptionKey || !this.deviceFingerprint) {
      throw new Error('Encryption not initialized');
    }

    try {
      // Cifrar los datos
      const encrypted = await encryptData(value, this.encryptionKey);

      // Preparar datos para almacenamiento
      const storageData: EncryptedData = {
        ciphertext: arrayBufferToBase64(encrypted.ciphertext),
        iv: arrayBufferToBase64(encrypted.iv.buffer),
        salt: arrayBufferToBase64(encrypted.salt.buffer),
        timestamp: Date.now(),
        version: this.VERSION,
        fingerprint: this.deviceFingerprint,
      };

      // Almacenar en localStorage
      const storageKey = this.getStorageKey(key);
      localStorage.setItem(storageKey, JSON.stringify(storageData));

      // Configurar expiración si se especifica
      if (options.expirationMs) {
        this.setExpiration(key, options.expirationMs);
      }

      logger.debug(LogModule.AUTH, 'Data encrypted and stored', {
        key: key.substring(0, 10) + '...',
        size: value.length,
      });
    } catch (error) {
      logger.error(LogModule.AUTH, 'Failed to encrypt and store data', error);
      throw error;
    }
  }

  /**
   * Recupera y descifra datos
   */
  async getItem(key: string): Promise<string | null> {
    if (!this.encryptionKey) {
      await this.initialize();
    }

    if (!this.encryptionKey || !this.deviceFingerprint) {
      throw new Error('Encryption not initialized');
    }

    try {
      const storageKey = this.getStorageKey(key);
      const storedData = localStorage.getItem(storageKey);

      if (!storedData) {
        return null;
      }

      const encryptedData: EncryptedData = JSON.parse(storedData);

      // Verificar versión
      if (encryptedData.version !== this.VERSION) {
        logger.warn(LogModule.AUTH, 'Stored data version mismatch', {
          stored: encryptedData.version,
          current: this.VERSION,
        });
        return null;
      }

      // Verificar fingerprint del dispositivo
      if (encryptedData.fingerprint !== this.deviceFingerprint) {
        logger.warn(LogModule.AUTH, 'Device fingerprint mismatch');
        // Por seguridad, eliminar datos si el dispositivo cambió
        this.removeItem(key);
        return null;
      }

      // Verificar expiración
      if (this.isExpired(key)) {
        logger.debug(LogModule.AUTH, 'Data expired', { key });
        this.removeItem(key);
        return null;
      }

      // Descifrar datos
      const ciphertext = base64ToArrayBuffer(encryptedData.ciphertext);
      const iv = new Uint8Array(base64ToArrayBuffer(encryptedData.iv));

      const decrypted = await decryptData(ciphertext, this.encryptionKey, iv);

      return decrypted;
    } catch (error) {
      logger.error(LogModule.AUTH, 'Failed to decrypt data', error);
      // Si falla la desencriptación, eliminar datos corruptos
      this.removeItem(key);
      return null;
    }
  }

  /**
   * Elimina un elemento del almacenamiento
   */
  removeItem(key: string): void {
    const storageKey = this.getStorageKey(key);
    localStorage.removeItem(storageKey);
    this.removeExpiration(key);
  }

  /**
   * Limpia todo el almacenamiento cifrado
   */
  clear(): void {
    // Obtener todas las claves de almacenamiento cifrado
    const keys = Object.keys(localStorage).filter((key) =>
      key.startsWith(this.STORAGE_PREFIX)
    );

    // Eliminar todas las claves
    keys.forEach((key) => {
      localStorage.removeItem(key);
    });

    // Limpiar expiraciones
    localStorage.removeItem('uruguahorra_expirations');

    logger.info(LogModule.AUTH, 'Encrypted storage cleared');
  }

  /**
   * Obtiene la clave de almacenamiento con prefijo
   */
  private getStorageKey(key: string): string {
    return `${this.STORAGE_PREFIX}${key}`;
  }

  /**
   * Configura expiración para una clave
   */
  private setExpiration(key: string, expirationMs: number): void {
    const expirations = this.getExpirations();
    expirations[key] = Date.now() + expirationMs;
    localStorage.setItem(
      'uruguahorra_expirations',
      JSON.stringify(expirations)
    );
  }

  /**
   * Obtiene todas las expiraciones
   */
  private getExpirations(): Record<string, number> {
    const stored = localStorage.getItem('uruguahorra_expirations');
    return stored ? JSON.parse(stored) : {};
  }

  /**
   * Elimina expiración para una clave
   */
  private removeExpiration(key: string): void {
    const expirations = this.getExpirations();
    delete expirations[key];
    localStorage.setItem(
      'uruguahorra_expirations',
      JSON.stringify(expirations)
    );
  }

  /**
   * Verifica si una clave ha expirado
   */
  private isExpired(key: string): boolean {
    const expirations = this.getExpirations();
    const expiration = expirations[key];

    if (!expiration) {
      // Si no hay expiración configurada, usar expiración por defecto
      const storageKey = this.getStorageKey(key);
      const storedData = localStorage.getItem(storageKey);
      if (storedData) {
        const data: EncryptedData = JSON.parse(storedData);
        return Date.now() - data.timestamp > this.DEFAULT_EXPIRATION_MS;
      }
    }

    return expiration ? Date.now() > expiration : false;
  }

  /**
   * Verifica la integridad de todos los datos almacenados
   */
  private async verifyDataIntegrity(): Promise<void> {
    const keys = Object.keys(localStorage).filter((key) =>
      key.startsWith(this.STORAGE_PREFIX)
    );

    for (const storageKey of keys) {
      const key = storageKey.replace(this.STORAGE_PREFIX, '');
      try {
        const storedData = localStorage.getItem(storageKey);
        if (storedData) {
          const data: EncryptedData = JSON.parse(storedData);

          // Verificar versión y fingerprint
          if (
            data.version !== this.VERSION ||
            data.fingerprint !== this.deviceFingerprint
          ) {
            logger.warn(LogModule.AUTH, 'Removing invalid data', { key });
            this.removeItem(key);
          }

          // Verificar expiración
          if (this.isExpired(key)) {
            logger.debug(LogModule.AUTH, 'Removing expired data', { key });
            this.removeItem(key);
          }
        }
      } catch (error) {
        logger.warn(LogModule.AUTH, 'Removing corrupted data', { key });
        localStorage.removeItem(storageKey);
      }
    }
  }

  /**
   * Inicia limpieza automática de datos expirados
   */
  private startAutoCleanup(): void {
    // Limpiar interval existente si hay uno
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Ejecutar limpieza cada 5 minutos
    this.cleanupInterval = setInterval(
      () => {
        this.cleanupExpiredData();
      },
      5 * 60 * 1000
    );

    // Ejecutar limpieza inicial
    this.cleanupExpiredData();
  }

  /**
   * Limpia datos expirados
   */
  private cleanupExpiredData(): void {
    const keys = Object.keys(localStorage).filter((key) =>
      key.startsWith(this.STORAGE_PREFIX)
    );

    let cleanedCount = 0;
    for (const storageKey of keys) {
      const key = storageKey.replace(this.STORAGE_PREFIX, '');
      if (this.isExpired(key)) {
        this.removeItem(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.debug(LogModule.AUTH, 'Cleaned expired data', {
        count: cleanedCount,
      });
    }
  }

  /**
   * Detiene la limpieza automática
   */
  stopAutoCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Migra datos no cifrados existentes
   */
  async migrateUnencryptedData(keys: string[]): Promise<void> {
    for (const key of keys) {
      const value = localStorage.getItem(key);
      if (value) {
        try {
          // Almacenar cifrado
          await this.setItem(key, value);
          // Eliminar versión no cifrada
          localStorage.removeItem(key);
          logger.info(LogModule.AUTH, 'Migrated unencrypted data', { key });
        } catch (error) {
          logger.error(LogModule.AUTH, 'Failed to migrate data', {
            key,
            error,
          });
        }
      }
    }
  }
}
