# 📱 Implementación Completa de Notificaciones de Racha

## ✅ Resumen de la Implementación

### 🏗️ Arquitectura Implementada

1. **Servicio de Notificaciones** (`NotificationsService`)
   - Setup de permisos y registro de tokens
   - Programación de notificaciones locales
   - Funciones de testing para desarrollo

2. **Hook Personalizado** (`useStreakNotifications`)
   - Gestión del estado de notificaciones
   - Integración con el servicio de rachas
   - Funciones de testing y desarrollo

3. **Componentes de UI**
   - `NotificationSettings`: Configuración de usuario
   - `NotificationTesting`: Herramientas de desarrollo

4. **Configuración de la App**
   - Permisos en `app.json`
   - Plugin de Expo Notifications

## 🧪 ¿Cómo Probar Sin Esperar 24 Horas?

### Método 1: Funciones de Testing Rápido

```tsx
import { useStreakNotifications } from '@/hooks/useStreakNotifications';

const TestComponent = () => {
  const { 
    sendTestNotification,      // 5 segundos
    sendTestStreakReminder,    // X segundos configurables
    sendTestStreakWarning,     // X segundos configurables
    scheduleQuickTest,         // 3 notificaciones: 5s, 15s, 25s
    startDevReminder,          // Cada X minutos (repetitivo)
    stopDevReminder            // Detener repetitivos
  } = useStreakNotifications();

  return (
    <View>
      {/* Prueba inmediata */}
      <Button 
        title="🚀 Prueba Rápida (25 segundos total)"
        onPress={scheduleQuickTest} 
      />
      
      {/* Prueba simple */}
      <Button 
        title="🧪 Notificación en 5s"
        onPress={sendTestNotification} 
      />
      
      {/* Recordatorio personalizado */}
      <Button 
        title="🔥 Recordatorio en 30s"
        onPress={() => sendTestStreakReminder(30)} 
      />
      
      {/* Para desarrollo activo */}
      <Button 
        title="🔄 Recordatorio cada 2 min"
        onPress={() => startDevReminder(2)} 
      />
      
      <Button 
        title="🛑 Detener repetitivos"
        onPress={stopDevReminder} 
      />
    </View>
  );
};
```

### Método 2: Componente de Testing Visual

```tsx
import { NotificationTesting } from '@/components';

// En cualquier pantalla de desarrollo:
const DevScreen = () => {
  const [showTesting, setShowTesting] = useState(false);

  if (__DEV__ && showTesting) {
    return <NotificationTesting onClose={() => setShowTesting(false)} />;
  }

  return (
    <View>
      <Button 
        title="🧪 Abrir Testing de Notificaciones"
        onPress={() => setShowTesting(true)} 
      />
    </View>
  );
};
```

### Método 3: Comandos de Desarrollo

```javascript
// En la consola de desarrollo o React DevTools:

// Notificación inmediata
await NotificationsService.scheduleTestNotification(5);

// Recordatorio de racha
await NotificationsService.scheduleTestStreakReminder(10);

// Alerta de racha en peligro
await NotificationsService.scheduleTestStreakWarning(15);

// Recordatorio repetitivo (CUIDADO: se repite)
await NotificationsService.scheduleDevReminder(1); // Cada 1 minuto

// Detener repetitivos
await NotificationsService.cancelDevReminder();
```

## 📊 Tiempos de Testing

| Tipo de Notificación | Tiempo Real | Tiempo de Prueba |
|----------------------|-------------|------------------|
| Recordatorio diario  | 8:00 PM siguiente día | 5-30 segundos |
| Alerta de racha      | 22 horas después | 15-60 segundos |
| Secuencia completa   | 2+ días | 25 segundos |
| Desarrollo continuo  | N/A | 1-5 minutos |

## 🛠️ Integración en tu App

### Paso 1: Inicializar en el Layout Principal

```tsx
// En tu _layout.tsx o App.tsx
import { useStreakNotifications } from '@/hooks/useStreakNotifications';

export default function RootLayout() {
  const { initialize } = useStreakNotifications();

  useEffect(() => {
    initialize();
  }, []);

  return (
    // Tu layout
  );
}
```

### Paso 2: Verificar Estado de Racha

```tsx
// En tu servicio de contribuciones, después de crear una contribución:
import { StreaksService } from '@/features/gamification';
import { useStreakNotifications } from '@/hooks/useStreakNotifications';

const afterContribution = async (userId: string) => {
  // Actualizar racha
  await StreaksService.updateStreak(userId);
  
  // Verificar si necesita configurar alertas
  const { checkUserStreakStatus } = useStreakNotifications();
  await checkUserStreakStatus();
};
```

### Paso 3: UI de Configuración

```tsx
// En tu pantalla de configuración:
import { NotificationSettings } from '@/components';

const SettingsScreen = () => {
  return (
    <View>
      {/* Otras configuraciones */}
      <NotificationSettings />
    </View>
  );
};
```

## 🎯 Casos de Uso Implementados

### ✅ Recordatorio Diario
- **Trigger**: Usuario no hizo microaporte hoy
- **Tiempo**: 8:00 PM (configurable)
- **Prueba**: `sendTestStreakReminder(10)` // 10 segundos

### ✅ Alerta de Racha en Peligro
- **Trigger**: Racha se romperá en 2 horas (configurable)
- **Tiempo**: 22 horas después de último microaporte
- **Prueba**: `sendTestStreakWarning(15)` // 15 segundos

### ✅ Configuración de Usuario
- Habilitar/deshabilitar notificaciones
- Configurar hora del recordatorio
- Configurar tiempo de alerta (1-6 horas antes)

### ✅ Testing y Desarrollo
- Notificaciones inmediatas
- Secuencias de prueba
- Recordatorios repetitivos para desarrollo
- Interfaz visual para testing

## 📁 Archivos Creados/Modificados

```
src/
├── services/
│   └── notifications.service.ts          # ✨ Nuevo
├── hooks/
│   └── useStreakNotifications.ts         # ✨ Nuevo
├── components/
│   ├── NotificationSettings.tsx          # ✨ Nuevo
│   ├── NotificationTesting.tsx           # ✨ Nuevo
│   └── index.ts                          # ✏️ Actualizado
├── examples/
│   └── SettingsScreenWithNotifications.tsx # ✨ Nuevo
└── docs/
    └── NOTIFICATION-TESTING-GUIDE.md     # ✨ Nuevo

app.json                                  # ✏️ Actualizado
package.json                              # ✏️ Actualizado
```

## 🚨 Importante para Desarrollo

### ⚠️ Siempre Limpia las Notificaciones
```tsx
// Al cerrar tu sesión de desarrollo:
const { stopDevReminder, cancelAllNotifications } = useStreakNotifications();

// Detener repetitivos
await stopDevReminder();

// O limpiar todo
await cancelAllNotifications();
```

### 🔍 Verificar Estado
```tsx
const { scheduledNotifications, permissionsGranted } = useStreakNotifications();

console.log('Notificaciones programadas:', scheduledNotifications);
console.log('Permisos concedidos:', permissionsGranted);
```

### 📱 Testing en Dispositivo Real
- **Simulador**: Notificaciones limitadas
- **Dispositivo físico**: Funcionalidad completa
- **Navegador**: Solo PWA con HTTPS

## 🎉 ¡Todo Listo!

Con esta implementación puedes:

1. **✅ Probar notificaciones en segundos** en lugar de esperar días
2. **✅ Configurar recordatorios diarios** para mantener rachas
3. **✅ Alertar cuando las rachas están en peligro**
4. **✅ Dar control total al usuario** sobre sus notificaciones
5. **✅ Desarrollar y iterar rápidamente** con herramientas de testing

### Comandos de Prueba Rápida:

```tsx
// Prueba todo el flujo en 25 segundos:
await scheduleQuickTest();

// O prueba individual:
await sendTestNotification();     // 5 segundos
await sendTestStreakReminder(10); // 10 segundos  
await sendTestStreakWarning(20);  // 20 segundos
```

¡Ahora puedes probar y desarrollar el sistema de notificaciones sin esperar tiempos reales! 🚀
