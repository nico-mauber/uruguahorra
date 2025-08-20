/**
 * Utilidades de cifrado usando Web Crypto API
 * Proporciona cifrado AES-GCM de 256 bits para almacenamiento seguro
 */

/**
 * Genera una clave de cifrado AES-GCM de 256 bits
 */
export async function generateEncryptionKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true, // extractable
    ['encrypt', 'decrypt']
  );
}

/**
 * Deriva una clave de cifrado desde una contraseña/semilla
 */
export async function deriveKeyFromSeed(
  seed: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  // Convertir la semilla a clave base
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(seed),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  // Derivar la clave de cifrado usando PBKDF2
  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000, // Alto número de iteraciones para seguridad
      hash: 'SHA-256',
    },
    keyMaterial,
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Cifra datos usando AES-GCM
 */
export async function encryptData(
  data: string,
  key: CryptoKey
): Promise<{
  ciphertext: ArrayBuffer;
  iv: Uint8Array;
  salt: Uint8Array;
}> {
  // Generar IV único (12 bytes para AES-GCM)
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Generar salt único para cada operación
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Convertir datos a ArrayBuffer
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);

  // Cifrar los datos
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
      tagLength: 128, // Máxima longitud de tag para seguridad
    },
    key,
    dataBuffer
  );

  return {
    ciphertext,
    iv,
    salt,
  };
}

/**
 * Descifra datos usando AES-GCM
 */
export async function decryptData(
  ciphertext: ArrayBuffer,
  key: CryptoKey,
  iv: Uint8Array
): Promise<string> {
  try {
    // Descifrar los datos
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        tagLength: 128,
      },
      key,
      ciphertext
    );

    // Convertir ArrayBuffer a string
    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (error) {
    // Si falla la desencriptación, los datos fueron manipulados
    throw new Error('Failed to decrypt data - integrity check failed');
  }
}

/**
 * Exporta una clave a formato JSON Web Key
 */
export async function exportKey(key: CryptoKey): Promise<JsonWebKey> {
  return await crypto.subtle.exportKey('jwk', key);
}

/**
 * Importa una clave desde formato JSON Web Key
 */
export async function importKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    'jwk',
    jwk,
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Convierte ArrayBuffer a string base64
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convierte string base64 a ArrayBuffer
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Genera un salt aleatorio
 */
export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16));
}

/**
 * Verifica si Web Crypto API está disponible
 */
export function isWebCryptoAvailable(): boolean {
  return (
    typeof crypto !== 'undefined' &&
    crypto.subtle !== undefined &&
    typeof crypto.subtle.encrypt === 'function'
  );
}

/**
 * Genera un hash SHA-256 de un string
 */
export async function hashString(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  return arrayBufferToBase64(hashBuffer);
}

/**
 * Valida la integridad de datos usando HMAC
 */
export async function generateHMAC(
  data: string,
  key: CryptoKey
): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);

  // Importar clave para HMAC
  const hmacKey = await crypto.subtle.importKey(
    'raw',
    await crypto.subtle.exportKey('raw', key),
    {
      name: 'HMAC',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', hmacKey, dataBuffer);
  return arrayBufferToBase64(signature);
}

/**
 * Verifica HMAC
 */
export async function verifyHMAC(
  data: string,
  signature: string,
  key: CryptoKey
): Promise<boolean> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const signatureBuffer = base64ToArrayBuffer(signature);

  // Importar clave para HMAC
  const hmacKey = await crypto.subtle.importKey(
    'raw',
    await crypto.subtle.exportKey('raw', key),
    {
      name: 'HMAC',
      hash: 'SHA-256',
    },
    false,
    ['verify']
  );

  return await crypto.subtle.verify(
    'HMAC',
    hmacKey,
    signatureBuffer,
    dataBuffer
  );
}
