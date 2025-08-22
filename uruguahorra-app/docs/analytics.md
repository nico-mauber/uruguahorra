# Analytics Integration - PostHog

Este documento describe la integración de analytics con PostHog en la aplicación Uruguahorra.

## Configuración

### Variables de Entorno

Las siguientes variables de entorno necesitan ser configuradas:

```bash
# PostHog API Key (requerido para tracking)
EXPO_PUBLIC_POSTHOG_KEY=your_posthog_api_key_here
# o alternativamente:
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_api_key_here
VITE_POSTHOG_KEY=your_posthog_api_key_here

# Versión de la app (opcional, default: 1.0.0)
EXPO_PUBLIC_APP_VERSION=1.0.0
# o alternativamente:
NEXT_PUBLIC_APP_VERSION=1.0.0
VITE_APP_VERSION=1.0.0
```

### Inicialización

El cliente de analytics se inicializa automáticamente en `src/app/_layout.tsx` al cargar la aplicación. Solo funciona en plataforma web debido a las limitaciones de React Native/Expo.

```typescript
import { posthogClient, AnalyticsEvents } from '@/lib/analytics';

// En useEffect de la app
useEffect(() => {
  posthogClient.init();
  posthogClient.track(AnalyticsEvents.APP_OPENED);
}, []);
```

## Eventos Principales

### Eventos de Aplicación

- `app_opened` - Usuario abre la aplicación
- `app_backgrounded` - Usuario pone la aplicación en segundo plano

### Eventos de Autenticación

- `user_signed_up` - Usuario se registra
- `user_signed_in` - Usuario inicia sesión
- `user_signed_out` - Usuario cierra sesión

### Eventos de Metas

- `goal_created` - Usuario crea una nueva meta
- `goal_updated` - Usuario actualiza una meta existente
- `goal_completed` - Usuario completa una meta
- `goal_deleted` - Usuario elimina una meta

### Eventos de Contribuciones

- `micro_contribution` - Usuario hace una micro contribución
- `contribution_created` - Se crea una nueva contribución

### Eventos de Gamificación

- `challenge_started` - Usuario inicia un reto
- `challenge_completed` - Usuario completa un reto
- `challenge_failed` - Usuario falla un reto
- `level_up` - Usuario sube de nivel
- `xp_earned` - Usuario gana XP
- `streak_updated` - Racha del usuario se actualiza

### Eventos de Suscripción

- `paywall_viewed` - Usuario ve la pantalla de paywall
- `checkout_started` - Usuario inicia proceso de compra
- `checkout_completed` - Usuario completa la compra
- `subscription_active` - Suscripción se activa
- `subscription_cancelled` - Suscripción se cancela

### Eventos de Errores

- `error_occurred` - Error en la aplicación

## Propiedades Comunes

Todas las propiedades se envían automáticamente con cada evento:

```typescript
interface CommonProps {
  country?: string; // País del usuario (ISO code, ej: "UY")
  currency?: string; // Moneda del usuario (ISO code, ej: "UYU")
  plan?: string; // Plan de suscripción ("free" | "premium")
  app_version?: string; // Versión de la aplicación
  platform?: string; // Plataforma ("web" | "ios" | "android")
  timestamp: string; // Timestamp del evento (ISO string)
}
```

## Propiedades Específicas por Evento

### Eventos de Metas

```typescript
interface GoalEventProps {
  goal_id: string; // ID único de la meta
  goal_type?: string; // Categoría de la meta
  target_amount?: number; // Monto objetivo
  current_amount?: number; // Monto actual ahorrado
  category?: string; // Categoría de la meta
}
```

### Eventos de Contribuciones

```typescript
interface ContributionEventProps {
  contribution_id: string; // ID único de la contribución
  goal_id: string; // ID de la meta asociada
  amount: number; // Monto de la contribución
  method?: string; // Método ("manual", "automatic", etc.)
}
```

### Eventos de Suscripción

```typescript
interface SubscriptionEventProps {
  plan_id: string; // ID del plan
  plan_type: 'premium_monthly' | 'premium_yearly'; // Tipo de plan
  amount: number; // Precio del plan
  currency: string; // Moneda del plan
  period: 'monthly' | 'yearly'; // Período de facturación
  source?: string; // Fuente del evento
  coupon?: string; // Código de cupón si existe
}
```

### Eventos de Retos

```typescript
interface ChallengeEventProps {
  challenge_id: string; // ID único del reto
  challenge_type: string; // Tipo de reto ("daily", "weekly", "pod", etc.)
  difficulty?: string; // Dificultad del reto
  reward_xp?: number; // XP de recompensa
}
```

## Uso en Componentes

### Tracking Manual de Eventos

```typescript
import {
  posthogClient,
  AnalyticsEvents,
  trackGoalEvent,
} from '@/lib/analytics';

// Evento simple
posthogClient.track(AnalyticsEvents.PAYWALL_VIEWED, {
  source: 'dashboard',
  user_id: user.id,
});

// Usando helpers tipados
trackGoalEvent(AnalyticsEvents.GOAL_CREATED, {
  goal_id: newGoal.id,
  goal_type: newGoal.category,
  target_amount: newGoal.target_amount,
  current_amount: 0,
  category: newGoal.category,
});
```

### Identificación de Usuario

```typescript
// Identificar usuario al hacer login
posthogClient.identify(user.id, {
  email: user.email,
  country: user.country,
  currency: user.currency,
  is_premium: user.is_premium,
  level: user.level,
});
```

### Configuración de Contexto

```typescript
// Actualizar contexto cuando cambian los datos del usuario
posthogClient.setContext({
  country: user.country || 'UY',
  currency: user.currency || 'UYU',
  plan: user.is_premium ? 'premium' : 'free',
});
```

## Feature Flags

### Hook para Feature Flag de Pods

```typescript
import { useFlagPodsAhorro } from '@/hooks/useFeatureFlags';

function MyComponent() {
  const isPodsEnabled = useFlagPodsAhorro();

  return (
    <div>
      {isPodsEnabled && <PodsSection />}
    </div>
  );
}
```

### Hook Genérico para Feature Flags

```typescript
import { useFeatureFlag } from '@/hooks/useFeatureFlags';

function MyComponent() {
  const isNewFeatureEnabled = useFeatureFlag('new_feature_key');

  return (
    <div>
      {isNewFeatureEnabled && <NewFeature />}
    </div>
  );
}
```

## Implementación Actual

### Archivos Principales

- `src/lib/analytics.ts` - Cliente principal de analytics
- `src/hooks/useFeatureFlags.ts` - Hooks para feature flags
- `src/contexts/AuthContext.tsx` - Integración con autenticación
- `src/services/goals.service.ts` - Tracking de eventos de metas
- `src/app/paywall.tsx` - Tracking de eventos de suscripción
- `src/app/(tabs)/index.tsx` - Ejemplo de feature flag y tracking

### Lugares de Tracking Actual

1. **AuthContext**: Login, signup, logout
2. **GoalsService**: Creación de metas, micro contribuciones
3. **Paywall**: Vista de paywall, inicio de checkout
4. **Dashboard**: Apertura de app, interacciones con pods (si habilitado)

## Mejores Prácticas

1. **Usar eventos consistentes**: Utiliza las constantes en `AnalyticsEvents`
2. **Propiedades tipadas**: Usa los helpers tipados (`trackGoalEvent`, etc.)
3. **Contexto actualizado**: Mantén el contexto actualizado con `setContext()`
4. **Identificación temprana**: Identifica usuarios inmediatamente después del login
5. **Error tracking**: Usa `trackErrorEvent()` para errores importantes

## Limitaciones

- **Solo web**: PostHog solo funciona en plataforma web debido a limitaciones de React Native
- **Inicialización**: Requiere configurar la variable de entorno `POSTHOG_KEY`
- **Feature flags**: Se actualizan cada 30 segundos

## Configuración de PostHog Dashboard

Para configurar el dashboard de PostHog:

1. Crear cuenta en PostHog
2. Obtener API key del proyecto
3. Configurar feature flag "pods_ahorro" en el dashboard
4. Establecer la variable de entorno correspondiente

## Próximos Pasos

- [ ] Implementar tracking en más servicios (challenges, subscriptions)
- [ ] Agregar más feature flags
- [ ] Configurar funnels para conversión de suscripción
- [ ] Implementar A/B testing para funcionalidades clave
- [ ] Agregar cohort analysis para retención de usuarios
