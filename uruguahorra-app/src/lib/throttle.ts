/**
 * Sistema de throttling para evitar múltiples llamadas simultáneas
 */

interface ThrottleState {
  isRunning: boolean;
  lastResult?: any;
  lastRun: number;
}

class CallThrottler {
  private throttleMap = new Map<string, ThrottleState>();
  
  /**
   * Throttlear una función para evitar múltiples ejecuciones simultáneas
   */
  async throttle<T>(
    key: string,
    fn: () => Promise<T>,
    minInterval: number = 1000 // 1 segundo por defecto
  ): Promise<T> {
    const now = Date.now();
    const state = this.throttleMap.get(key);
    
    // Si ya está ejecutándose, esperar
    if (state?.isRunning) {
      // Retornar el último resultado conocido si existe
      if (state.lastResult !== undefined) {
        return state.lastResult;
      }
      // Si no, esperar un poco y reintentar
      await this.sleep(100);
      return this.throttle(key, fn, minInterval);
    }
    
    // Si se ejecutó recientemente, retornar el último resultado
    if (state && (now - state.lastRun) < minInterval && state.lastResult !== undefined) {
      return state.lastResult;
    }
    
    // Marcar como en ejecución
    this.throttleMap.set(key, {
      isRunning: true,
      lastResult: state?.lastResult,
      lastRun: state?.lastRun || 0,
    });
    
    try {
      // Ejecutar la función
      const result = await fn();
      
      // Actualizar el estado
      this.throttleMap.set(key, {
        isRunning: false,
        lastResult: result,
        lastRun: now,
      });
      
      return result;
    } catch (error) {
      // Marcar como no ejecutándose en caso de error
      const currentState = this.throttleMap.get(key);
      this.throttleMap.set(key, {
        isRunning: false,
        lastResult: currentState?.lastResult,
        lastRun: currentState?.lastRun || 0,
      });
      
      throw error;
    }
  }
  
  /**
   * Limpiar el throttle para una clave específica
   */
  clear(key: string): void {
    this.throttleMap.delete(key);
  }
  
  /**
   * Limpiar todos los throttles
   */
  clearAll(): void {
    this.throttleMap.clear();
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Instancia global del throttler
export const callThrottler = new CallThrottler();

/**
 * Decorator para throttlear métodos de clase
 */
export function throttle(minInterval: number = 1000) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = function (...args: any[]) {
      const key = `${target.constructor.name}.${propertyKey}:${JSON.stringify(args)}`;
      return callThrottler.throttle(key, () => originalMethod.apply(this, args), minInterval);
    };
    
    return descriptor;
  };
}
