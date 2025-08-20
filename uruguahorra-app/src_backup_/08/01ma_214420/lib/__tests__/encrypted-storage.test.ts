/**
 * Tests para el sistema de almacenamiento cifrado
 */

import { EncryptedStorage } from '../encrypted-storage';
import { isWebCryptoAvailable } from '../crypto-utils';

// Mock de localStorage para tests
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    },
  };
})();

// Reemplazar localStorage global en tests
if (typeof global !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).localStorage = localStorageMock;
}

describe('EncryptedStorage', () => {
  let storage: EncryptedStorage;

  beforeEach(async () => {
    localStorageMock.clear();
    storage = EncryptedStorage.getInstance();

    // Solo ejecutar tests si Web Crypto está disponible
    if (isWebCryptoAvailable()) {
      await storage.initialize();
    }
  });

  afterEach(() => {
    storage.stopAutoCleanup();
  });

  describe('Cifrado y Descifrado', () => {
    test('should encrypt and decrypt data correctly', async () => {
      if (!isWebCryptoAvailable()) {
        console.log('Web Crypto API not available, skipping test');
        return;
      }

      const key = 'test_key';
      const value = 'sensitive_data_123';

      await storage.setItem(key, value);
      const retrieved = await storage.getItem(key);

      expect(retrieved).toBe(value);
    });

    test('should store data encrypted in localStorage', async () => {
      if (!isWebCryptoAvailable()) {
        console.log('Web Crypto API not available, skipping test');
        return;
      }

      const key = 'test_key';
      const value = 'sensitive_data';

      await storage.setItem(key, value);

      // Verificar que los datos en localStorage están cifrados
      const storageKey = `uruguahorra_enc_${key}`;
      const storedData = localStorage.getItem(storageKey);

      expect(storedData).toBeDefined();

      const parsed = JSON.parse(storedData!);
      expect(parsed.ciphertext).toBeDefined();
      expect(parsed.iv).toBeDefined();
      expect(parsed.salt).toBeDefined();
      expect(parsed.version).toBe(1);

      // Los datos cifrados no deben contener el valor original
      expect(storedData).not.toContain(value);
    });

    test('should handle JSON data', async () => {
      if (!isWebCryptoAvailable()) {
        console.log('Web Crypto API not available, skipping test');
        return;
      }

      const key = 'json_data';
      const value = JSON.stringify({
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refresh_token: 'refresh_token_value',
        user: { id: '123', email: 'user@example.com' },
      });

      await storage.setItem(key, value);
      const retrieved = await storage.getItem(key);

      expect(retrieved).toBe(value);

      const parsed = JSON.parse(retrieved!);
      expect(parsed.access_token).toBeDefined();
      expect(parsed.user.email).toBe('user@example.com');
    });
  });

  describe('Expiración de Datos', () => {
    test('should expire data after specified time', async () => {
      if (!isWebCryptoAvailable()) {
        console.log('Web Crypto API not available, skipping test');
        return;
      }

      const key = 'expiring_key';
      const value = 'temporary_data';

      // Establecer con expiración de 100ms
      await storage.setItem(key, value, { expirationMs: 100 });

      // Verificar que existe inmediatamente
      let retrieved = await storage.getItem(key);
      expect(retrieved).toBe(value);

      // Esperar que expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Verificar que ha expirado
      retrieved = await storage.getItem(key);
      expect(retrieved).toBeNull();
    });

    test('should clean up expired data automatically', async () => {
      if (!isWebCryptoAvailable()) {
        console.log('Web Crypto API not available, skipping test');
        return;
      }

      // Crear varios items con expiración corta
      await storage.setItem('exp1', 'data1', { expirationMs: 50 });
      await storage.setItem('exp2', 'data2', { expirationMs: 50 });
      await storage.setItem('permanent', 'data3', { expirationMs: 10000 });

      // Esperar que expiren los primeros dos
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Forzar limpieza
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (storage as any).cleanupExpiredData();

      // Verificar que los expirados se eliminaron
      expect(await storage.getItem('exp1')).toBeNull();
      expect(await storage.getItem('exp2')).toBeNull();
      expect(await storage.getItem('permanent')).toBe('data3');
    });
  });

  describe('Seguridad', () => {
    test('should detect and reject tampered data', async () => {
      if (!isWebCryptoAvailable()) {
        console.log('Web Crypto API not available, skipping test');
        return;
      }

      const key = 'secure_key';
      const value = 'secure_value';

      await storage.setItem(key, value);

      // Manipular los datos cifrados
      const storageKey = `uruguahorra_enc_${key}`;
      const storedData = localStorage.getItem(storageKey);
      const parsed = JSON.parse(storedData!);

      // Modificar el ciphertext
      parsed.ciphertext = parsed.ciphertext.replace('a', 'b');
      localStorage.setItem(storageKey, JSON.stringify(parsed));

      // Intentar recuperar debería fallar
      const retrieved = await storage.getItem(key);
      expect(retrieved).toBeNull();
    });

    test('should reject data with wrong version', async () => {
      if (!isWebCryptoAvailable()) {
        console.log('Web Crypto API not available, skipping test');
        return;
      }

      const key = 'version_test';
      const value = 'test_data';

      await storage.setItem(key, value);

      // Cambiar la versión
      const storageKey = `uruguahorra_enc_${key}`;
      const storedData = localStorage.getItem(storageKey);
      const parsed = JSON.parse(storedData!);
      parsed.version = 999;
      localStorage.setItem(storageKey, JSON.stringify(parsed));

      // Debería rechazar por versión incorrecta
      const retrieved = await storage.getItem(key);
      expect(retrieved).toBeNull();
    });

    test('should clear all encrypted data', async () => {
      if (!isWebCryptoAvailable()) {
        console.log('Web Crypto API not available, skipping test');
        return;
      }

      // Almacenar varios items
      await storage.setItem('key1', 'value1');
      await storage.setItem('key2', 'value2');
      await storage.setItem('key3', 'value3');

      // Verificar que existen
      expect(await storage.getItem('key1')).toBe('value1');
      expect(await storage.getItem('key2')).toBe('value2');

      // Limpiar todo
      storage.clear();

      // Verificar que se eliminaron
      expect(await storage.getItem('key1')).toBeNull();
      expect(await storage.getItem('key2')).toBeNull();
      expect(await storage.getItem('key3')).toBeNull();
    });
  });

  describe('Migración de Datos', () => {
    test('should migrate unencrypted data', async () => {
      if (!isWebCryptoAvailable()) {
        console.log('Web Crypto API not available, skipping test');
        return;
      }

      // Simular datos no cifrados existentes
      localStorage.setItem('legacy_key1', 'legacy_value1');
      localStorage.setItem('legacy_key2', 'legacy_value2');

      // Migrar
      await storage.migrateUnencryptedData(['legacy_key1', 'legacy_key2']);

      // Verificar que se pueden recuperar cifrados
      expect(await storage.getItem('legacy_key1')).toBe('legacy_value1');
      expect(await storage.getItem('legacy_key2')).toBe('legacy_value2');

      // Verificar que los originales se eliminaron
      expect(localStorage.getItem('legacy_key1')).toBeNull();
      expect(localStorage.getItem('legacy_key2')).toBeNull();
    });
  });
});

describe('SecureWebStorageAdapter Integration', () => {
  test('should work with Supabase auth tokens', async () => {
    if (!isWebCryptoAvailable()) {
      console.log('Web Crypto API not available, skipping test');
      return;
    }

    const { SecureWebStorageAdapter } = await import('../secure-web-storage');
    const adapter = new SecureWebStorageAdapter();

    // Simular token de Supabase
    const authData = JSON.stringify({
      access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.signature',
      refresh_token: 'refresh_token_test',
      expires_in: 3600,
      token_type: 'bearer',
      user: {
        id: 'user-123',
        email: 'test@example.com',
      },
    });

    const key = 'supabase.auth.token';

    // Almacenar
    await adapter.setItem(key, authData);

    // Recuperar
    const retrieved = await adapter.getItem(key);
    expect(retrieved).toBe(authData);

    // Verificar que está cifrado en localStorage
    const rawStorage = localStorage.getItem(`uruguahorra_enc_${key}`);
    expect(rawStorage).toBeDefined();
    expect(rawStorage).not.toContain('access_token');
    expect(rawStorage).not.toContain('test@example.com');

    // Eliminar
    await adapter.removeItem(key);
    expect(await adapter.getItem(key)).toBeNull();
  });

  test('should handle storage stats', async () => {
    if (!isWebCryptoAvailable()) {
      console.log('Web Crypto API not available, skipping test');
      return;
    }

    const { SecureWebStorageAdapter } = await import('../secure-web-storage');
    const adapter = new SecureWebStorageAdapter();

    // Almacenar algunos items
    await adapter.setItem('key1', 'value1');
    await adapter.setItem('key2', 'value2');

    // Obtener estadísticas
    const stats = adapter.getStorageStats();
    expect(stats.encryptedItems).toBeGreaterThan(0);
    expect(stats.totalSize).toBeGreaterThan(0);
  });
});
