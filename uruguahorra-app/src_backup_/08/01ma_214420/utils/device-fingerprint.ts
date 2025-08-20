/**
 * Generación de fingerprint único del dispositivo/navegador
 * Usado para derivar claves de cifrado únicas por dispositivo
 */

interface DeviceFingerprint {
  userAgent: string;
  language: string;
  platform: string;
  screenResolution: string;
  timezone: string;
  hardwareConcurrency: number;
  colorDepth: number;
  pixelRatio: number;
  touchSupport: boolean;
  webGLVendor?: string;
  webGLRenderer?: string;
}

/**
 * Obtiene información del dispositivo para generar fingerprint
 */
function getDeviceInfo(): DeviceFingerprint {
  const nav = navigator;
  const screen = window.screen;

  // Información básica del navegador
  const fingerprint: DeviceFingerprint = {
    userAgent: nav.userAgent || '',
    language: nav.language || '',
    platform: nav.platform || '',
    screenResolution: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
    hardwareConcurrency: nav.hardwareConcurrency || 0,
    colorDepth: screen.colorDepth || 0,
    pixelRatio: window.devicePixelRatio || 1,
    touchSupport: 'ontouchstart' in window,
  };

  // Intentar obtener información de WebGL
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

    if (gl && 'getParameter' in gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        fingerprint.webGLVendor = gl.getParameter(
          debugInfo.UNMASKED_VENDOR_WEBGL
        );
        fingerprint.webGLRenderer = gl.getParameter(
          debugInfo.UNMASKED_RENDERER_WEBGL
        );
      }
    }
  } catch {
    // WebGL no disponible o bloqueado
  }

  return fingerprint;
}

/**
 * Genera un fingerprint único y estable del dispositivo
 */
export async function generateDeviceFingerprint(): Promise<string> {
  const deviceInfo = getDeviceInfo();

  // Crear string determinístico del fingerprint
  const fingerprintString = JSON.stringify(
    deviceInfo,
    Object.keys(deviceInfo).sort()
  );

  // Generar hash SHA-256 del fingerprint
  const encoder = new TextEncoder();
  const data = encoder.encode(fingerprintString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);

  // Convertir a string hexadecimal
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return hashHex;
}

/**
 * Obtiene o genera un ID de instalación persistente
 */
export function getInstallationId(): string {
  const INSTALLATION_ID_KEY = 'uruguahorra_installation_id';

  // Intentar obtener ID existente
  let installationId = localStorage.getItem(INSTALLATION_ID_KEY);

  if (!installationId) {
    // Generar nuevo ID único
    installationId = generateUniqueId();
    localStorage.setItem(INSTALLATION_ID_KEY, installationId);
  }

  return installationId;
}

/**
 * Genera un ID único usando crypto.randomUUID o fallback
 */
function generateUniqueId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback para navegadores más antiguos
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Combina fingerprint del dispositivo con ID de instalación
 * para crear una semilla única y estable
 */
export async function getDeviceSeed(): Promise<string> {
  const fingerprint = await generateDeviceFingerprint();
  const installationId = getInstallationId();

  // Combinar ambos identificadores
  return `${fingerprint}-${installationId}`;
}

/**
 * Verifica si el dispositivo ha cambiado significativamente
 */
export async function hasDeviceChanged(
  previousFingerprint: string
): Promise<boolean> {
  const currentFingerprint = await generateDeviceFingerprint();
  return currentFingerprint !== previousFingerprint;
}

/**
 * Obtiene información resumida del dispositivo para logging
 */
export function getDeviceSummary(): {
  browser: string;
  platform: string;
  screen: string;
} {
  const ua = navigator.userAgent;
  let browser = 'Unknown';

  if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Edge')) browser = 'Edge';

  return {
    browser,
    platform: navigator.platform || 'Unknown',
    screen: `${window.screen.width}x${window.screen.height}`,
  };
}
