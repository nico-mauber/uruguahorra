# 🔔 Sistema de Notificaciones de Racha

## Descripción

Sistema completo de notificaciones locales para recordatorios de racha de microaportes utilizando Expo Notifications.

## Funcionalidades Implementadas

### ✅ Servicios
- **NotificationsService**: Manejo centralizado de notificaciones
- **Permisos**: Solicitud automática de permisos de notificación
- **Registro de token**: Para futuras notificaciones push
- **Programación**: Notificaciones locales recurrentes y puntuales

### ✅ Hook Principal
- **useStreakNotifications**: Hook principal para manejar notificaciones de racha
- **Configuración**: Gestión de ajustes del usuario
- **Estado**: Monitoreo de permisos y notificaciones programadas
- **Lifecycle**: Inicialización y limpieza automática

### ✅ Componente de Configuración  
- **NotificationSettings**: Interfaz para configurar notificaciones
- **Switches**: Habilitar/deshabilitar notificaciones
- **Time picker**: Configuración de hora de recordatorio
- **Alertas**: Configuración de horas antes de ruptura de racha
- **Testing**: Botón para probar notificaciones

### ✅ Tipos de Notificaciones

#### 1. Recordatorio Diario
- **Cuándo**: Hora configurable (por defecto 20:00)
- **Frecuencia**: Diaria
- **Propósito**: Recordar hacer microaporte del día
- **Título**: "🔥 ¡Mantén tu racha viva!"
- **Mensaje**: "¿Ya hiciste tu microaporte de hoy? No dejes que se rompa tu racha de ahorro."

#### 2. Alerta de Racha en Peligro
- **Cuándo**: X horas antes de que se rompa (configurable: 1h, 2h, 4h, 6h)
- **Frecuencia**: Una vez cuando se acerca el límite
- **Propósito**: Advertir sobre racha a punto de romperse
- **Título**: "⚠️ ¡Tu racha está en peligro!"
- **Mensaje**: "Tu racha se romperá en X horas. ¡Haz un microaporte ahora!"

## Uso

### 1. Instalación de Dependencias

```bash
npm install expo-notifications expo-device
```

### 2. Configuración en app.json

```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#6366F1",
          "defaultChannel": "default"
        }
      ]
    ],
    "android": {
      "permissions": [
        "RECEIVE_BOOT_COMPLETED",
        "WAKE_LOCK"
      ]
    }
  }
}
```

### 3. Integración en la App

#### Opción A: Hook Automático (Recomendado)
```tsx
// En _layout.tsx o App.tsx
import { useAutoStreakNotifications } from '@/hooks/useAutoStreakNotifications';

function App() {
  // Se inicializa automáticamente cuando el usuario está logueado
  useAutoStreakNotifications();
  
  return <YourAppContent />;
}
```

#### Opción B: Hook Manual
```tsx
import { useStreakNotifications } from '@/hooks/useStreakNotifications';

function SettingsScreen() {
  const {
    isInitialized,
    permissionsGranted,
    settings,
    initialize,
    requestPermissions,
    setupDailyReminder,
    updateSettings,
  } = useStreakNotifications();
  
  useEffect(() => {
    initialize();
  }, []);
  
  return <NotificationSettings />;
}
```

### 4. Componente de Configuración
```tsx
import { NotificationSettings } from '@/components/NotificationSettings';

function UserSettingsScreen() {
  return (
    <View style={{ flex: 1 }}>
      <NotificationSettings />
    </View>
  );
}
```

## API del Hook

### Estado
- `isInitialized: boolean` - Si el servicio está inicializado
- `permissionsGranted: boolean` - Si los permisos están concedidos
- `settings: StreakNotificationSettings` - Configuración actual
- `scheduledNotifications: number` - Cantidad de notificaciones programadas

### Métodos
- `initialize(): Promise<boolean>` - Inicializar el servicio
- `requestPermissions(): Promise<boolean>` - Solicitar permisos
- `setupDailyReminder(hour, minute): Promise<boolean>` - Configurar recordatorio diario
- `setupStreakWarning(hours): Promise<boolean>` - Configurar alerta de racha
- `cancelAllNotifications(): Promise<void>` - Cancelar todas las notificaciones
- `updateSettings(settings): Promise<void>` - Actualizar configuración
- `sendTestNotification(): Promise<void>` - Enviar notificación de prueba

## Configuración por Defecto

```typescript
const DEFAULT_SETTINGS = {
  enabled: true,
  reminderTime: {
    hour: 20, // 8:00 PM
    minute: 0,
  },
  warningHours: 2, // 2 horas antes de que se rompa
};
```

## Persistencia

Las configuraciones se guardan automáticamente en:
- **AsyncStorage**: Preferencias del usuario
- **Expo Secure Store**: Tokens sensibles (si se implementan push notifications)

## Lógica de Negocio

### Recordatorio Diario
- Se programa todos los días a la hora configurada
- Se reprograma automáticamente si cambia la configuración
- Se cancela si se deshabilitan las notificaciones

### Alerta de Racha
- Se calcula dinámicamente basada en la última actividad del usuario
- Solo se programa si hay una racha activa (> 0 días)
- Se actualiza cuando se detecta actividad nueva
- Se cancela si la racha se rompe o se completa

### Verificación de Estado
- Se ejecuta cada hora para verificar estado de racha
- Se ejecuta después de cada contribución
- Se ejecuta al abrir la app

## Testing

### Notificación de Prueba
```tsx
const { sendTestNotification } = useStreakNotifications();

// Envía notificación en 3 segundos
await sendTestNotification();
```

### Debug
```typescript
// Ver notificaciones programadas
const notifications = await NotificationsService.getScheduledNotifications();
console.log('Programadas:', notifications.length);

// Ver configuración actual
console.log('Settings:', settings);
```

## Plataformas Soportadas

- ✅ **iOS**: Notificaciones nativas con badges
- ✅ **Android**: Notificaciones con canales personalizados
- ⚠️ **Web**: Limitado (no funciona en simulador)

## Limitaciones

1. **Simulador**: Las notificaciones push no funcionan en simulador
2. **Permisos**: El usuario debe conceder permisos explícitamente
3. **Background**: Las notificaciones solo se procesan cuando la app está activa o en background reciente
4. **Precisión**: Las notificaciones pueden tener variaciones de tiempo según el sistema operativo

## Próximas Mejoras

- [ ] **Push Notifications**: Implementar notificaciones push con servidor
- [ ] **Time Picker**: Selector de hora nativo
- [ ] **Analytics**: Tracking de efectividad de notificaciones
- [ ] **Personalización**: Más opciones de personalización de mensajes
- [ ] **Smart Timing**: Análisis de mejor momento para notificar
- [ ] **Do Not Disturb**: Respeto de configuraciones de silencio

## Troubleshooting

### Notificaciones no llegan
1. Verificar permisos en configuración del dispositivo
2. Verificar que la app no esté en modo de ahorro de energía
3. Comprobar que el dispositivo no esté en modo silencioso
4. Verificar logs para errores de programación

### Hook no inicializa
1. Verificar que el usuario esté autenticado
2. Comprobar que sea dispositivo físico (no simulador)
3. Verificar logs de inicialización

### Configuración no se guarda
1. Verificar permisos de AsyncStorage
2. Comprobar logs de almacenamiento
3. Verificar que no haya errores de serialización
