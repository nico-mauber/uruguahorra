# 📱 Guía de Testing para Notificaciones de Racha

Esta guía te explica cómo probar el sistema de notificaciones sin esperar tiempos reales (24 horas).

## 🚀 Setup Inicial

### 1. Instalar Dependencias
```bash
npm install expo-notifications expo-device
```

### 2. Configurar Permisos (app.json)
```json
{
  "expo": {
    "android": {
      "permissions": [
        "RECEIVE_BOOT_COMPLETED",
        "WAKE_LOCK"
      ]
    },
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#6366F1",
          "defaultChannel": "default"
        }
      ]
    ]
  }
}
```

### 3. Usar el Hook
```tsx
import { useStreakNotifications } from '@/hooks/useStreakNotifications';

const MyComponent = () => {
  const {
    permissionsGranted,
    sendTestNotification,
    sendTestStreakReminder,
    // ... otras funciones
  } = useStreakNotifications();

  // Resto del componente...
};
```

## 🧪 Funciones de Testing Disponibles

### Notificaciones Inmediatas

#### 1. `sendTestNotification()`
```tsx
// Envía una notificación básica en 5 segundos
await sendTestNotification();
```

#### 2. `sendTestStreakReminder(delaySeconds)`
```tsx
// Recordatorio de racha en X segundos
await sendTestStreakReminder(10); // En 10 segundos
await sendTestStreakReminder(30); // En 30 segundos
```

#### 3. `sendTestStreakWarning(delaySeconds)`
```tsx
// Alerta de racha en peligro en X segundos
await sendTestStreakWarning(15); // En 15 segundos
```

#### 4. `scheduleQuickTest()`
```tsx
// Serie de 3 notificaciones: 5s, 15s, 25s
await scheduleQuickTest();
```

### Notificaciones Repetitivas (Para Desarrollo)

#### 5. `startDevReminder(intervalMinutes)`
```tsx
// ⚠️ CUIDADO: Se repite cada X minutos
await startDevReminder(1); // Cada 1 minuto
await startDevReminder(5); // Cada 5 minutos

// ¡IMPORTANTE! Siempre detenerlo cuando termines:
await stopDevReminder();
```

## 🛠️ Escenarios de Prueba

### Escenario 1: Prueba Básica de Funcionamiento
```tsx
const testBasicFlow = async () => {
  // 1. Verificar permisos
  if (!permissionsGranted) {
    await requestPermissions();
  }

  // 2. Enviar notificación de prueba
  await sendTestNotification();
  
  console.log('✅ Notificación programada para 5 segundos');
};
```

### Escenario 2: Simular Secuencia de Recordatorios
```tsx
const testReminderSequence = async () => {
  // Simula el flujo real pero en minutos en lugar de días
  
  // 1. Recordatorio inicial (como si fuera 8:00 PM)
  await sendTestStreakReminder(10);
  
  // 2. Alerta de racha en peligro (como si fuera 22:00 del día siguiente)
  await sendTestStreakWarning(60); // 1 minuto después
  
  console.log('✅ Secuencia de recordatorios programada');
};
```

### Escenario 3: Testing de Desarrollo Continuo
```tsx
const testContinuousDevelopment = async () => {
  // Para desarrollo activo - recordatorio cada 2 minutos
  await startDevReminder(2);
  
  console.log('🔄 Recordatorio cada 2 minutos iniciado');
  console.log('⚠️  Recuerda detenerlo con stopDevReminder()');
};

// Al terminar el desarrollo:
const stopDevelopmentTesting = async () => {
  await stopDevReminder();
  console.log('🛑 Recordatorios de desarrollo detenidos');
};
```

## 📊 Componente de Testing

Usa el componente `NotificationTesting` para una interfaz visual:

```tsx
import { NotificationTesting } from '@/components/NotificationTesting';

const SettingsScreen = () => {
  const [showTesting, setShowTesting] = useState(false);

  if (__DEV__ && showTesting) {
    return <NotificationTesting onClose={() => setShowTesting(false)} />;
  }

  return (
    <View>
      {/* Tu UI normal */}
      {__DEV__ && (
        <Button 
          title="🧪 Testing de Notificaciones" 
          onPress={() => setShowTesting(true)} 
        />
      )}
    </View>
  );
};
```

## 🎯 Casos de Uso Específicos

### Caso 1: Probar Recordatorio Diario
```tsx
// En lugar de esperar hasta las 8:00 PM del día siguiente
const testDailyReminder = async () => {
  // Programa para dentro de 30 segundos
  await sendTestStreakReminder(30);
};
```

### Caso 2: Probar Alerta de Racha en Peligro
```tsx
// En lugar de esperar 22 horas después de la última actividad
const testStreakWarning = async () => {
  // Programa para dentro de 1 minuto
  await sendTestStreakWarning(60);
};
```

### Caso 3: Probar Múltiples Notificaciones
```tsx
const testMultipleNotifications = async () => {
  // Programa varias notificaciones con diferentes delays
  await sendTestNotification(5);          // 5 segundos
  await sendTestStreakReminder(15);       // 15 segundos
  await sendTestStreakWarning(25);        // 25 segundos
  
  console.log('📅 3 notificaciones programadas en secuencia');
};
```

## 🔧 Tips y Mejores Prácticas

### 1. Verificar Estado del Sistema
```tsx
const checkNotificationStatus = () => {
  console.log('📊 Estado de notificaciones:', {
    initialized: isInitialized,
    permissions: permissionsGranted,
    scheduled: scheduledNotifications,
  });
};
```

### 2. Limpiar Notificaciones en Desarrollo
```tsx
// Al final de cada sesión de desarrollo
const cleanupDevelopment = async () => {
  await stopDevReminder();        // Detener repetitivas
  await cancelAllNotifications(); // Limpiar todas
  console.log('🧹 Limpieza de desarrollo completada');
};
```

### 3. Testing en Diferentes Dispositivos

#### Android
- Las notificaciones aparecen en la barra de notificaciones
- Se pueden personalizar con canales de notificación
- Soporta acciones en notificaciones

#### iOS
- Las notificaciones aparecen como banners o alertas
- Se integran con el Centro de Notificaciones
- Respetan la configuración de "No Molestar"

#### Web/PWA
- Se muestran como notificaciones del navegador
- Requieren HTTPS en producción
- Limitadas en funcionalidad comparado con móvil

## 🚨 Importante: Limpieza

**¡SIEMPRE limpia las notificaciones de desarrollo!**

```tsx
// Antes de cerrar tu sesión de desarrollo:
useEffect(() => {
  return () => {
    // Cleanup al desmontar
    if (__DEV__) {
      stopDevReminder();
    }
  };
}, []);
```

## 📝 Log de Testing

Todas las acciones se registran en los logs. Busca en la consola:

```
[API] Notificación de prueba programada
[API] Recordatorio de prueba programado  
[API] Alerta de prueba programada
```

## ⚡ Comandos Rápidos

Para usar en la consola de desarrollo:

```javascript
// En React DevTools o consola del navegador:

// Prueba básica
window.testNotifications = async () => {
  const { sendTestNotification } = useStreakNotifications();
  await sendTestNotification();
};

// Prueba completa
window.testFullSequence = async () => {
  const hooks = useStreakNotifications();
  await hooks.scheduleQuickTest();
};
```

---

¡Con estas herramientas puedes probar todo el flujo de notificaciones en segundos/minutos en lugar de días! 🎉
