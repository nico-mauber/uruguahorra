# 📊 PostHog Analytics - Guía de Implementación

## 🎯 ¿Qué es PostHog en este proyecto?

PostHog es nuestro sistema de **analytics y feature flags** que nos permite:

- Saber qué hacen los usuarios en la app
- Hacer A/B testing de nuevas funcionalidades
- Optimizar conversión a premium
- Detectar problemas antes de que los usuarios se vayan

## 🏗️ Arquitectura Implementada

### **1. PostHogProvider (Root Level)**

```typescript
// src/app/_layout.tsx
<PostHogProvider
  apiKey="phc_Bpl5uyxSSfEXZelS6NlzphDCTwrhI1mhbGoItaoriTx"
  options={{ host: 'https://us.i.posthog.com' }}
>
  <App />
</PostHogProvider>
```

### **2. Hook para Componentes React**

```typescript
// src/hooks/useAnalytics.ts
import { useAnalytics } from '@/hooks/useAnalytics';

function MyComponent() {
  const analytics = useAnalytics();

  analytics.track('button_clicked', { button_name: 'save' });
  analytics.identify(userId, { email, country });
}
```

### **3. Servicio para Contextos/Servicios**

```typescript
// src/services/analytics.service.ts
import { AnalyticsService } from '@/services/analytics.service';

// En AuthContext, GoalsService, etc.
AnalyticsService.track('user_logged_in', { method: 'email' });
```

## 🎯 Eventos que Trackeamos

### **Autenticación (AuthContext)**

- `user_signed_up` - Usuario se registra
- `user_signed_in` - Usuario hace login
- `user_signed_out` - Usuario hace logout
- `Identify` - Identificamos usuario con email, país, premium status

### **Gamificación (AuthContext)**

- `xp_earned` - Usuario gana experiencia
- `level_up` - Usuario sube de nivel
- `streak_updated` - Racha de ahorro actualizada

### **Monetización (Paywall)**

- `paywall_viewed` - Usuario ve pantalla premium
- `checkout_started` - Usuario inicia proceso de pago

### **Funcionalidades (Dashboard)**

- `challenge_started` - Usuario interactúa con pods de ahorro
- `app_opened` - App se abre

## 🏁 Feature Flags (Opcional)

### **Infraestructura lista para A/B testing:**

```typescript
// src/hooks/useFeatureFlags.ts
const showNewFeature = useFeatureFlag('feature_name');

if (showNewFeature) {
  return <NewFeatureComponent />;
}
```

**Actualmente:** Los pods de ahorro están siempre habilitados (sin A/B testing).

## 📊 Dashboard de PostHog

### **Acceso:**

- **URL**: https://us.posthog.com/project/210226
- **Account**: Usar credenciales del propietario del proyecto

### **Secciones importantes:**

- **Events**: Ver eventos en tiempo real
- **Insights**: Crear gráficos y análisis personalizados
- **Dashboards**: KPIs ejecutivos
- **Feature Flags**: A/B testing (si se necesita)

## 🧪 Testing Local

Los eventos se logean en consola para debugging:

```
[Analytics] Event tracked: user_signed_in { method: 'email', user_id: '123' }
[Analytics] User identified: user123 { email: 'test@example.com' }
```

## 🔧 Mantenimiento

### **Agregar nuevo evento:**

1. **Definir evento en useAnalytics.ts:**

```typescript
export const AnalyticsEvents = {
  // ... eventos existentes
  NEW_FEATURE_USED: 'new_feature_used',
};
```

2. **Trackear en el componente:**

```typescript
analytics.track(AnalyticsEvents.NEW_FEATURE_USED, {
  feature_name: 'cool_feature',
  user_level: user.level,
});
```

### **Agregar feature flag:**

1. **Crear en PostHog dashboard**
2. **Usar en componente:**

```typescript
const showFeature = analytics.isFeatureEnabled('feature_key');
```

## 🚨 Troubleshooting

### **Los eventos no llegan a PostHog:**

- Verificar API key en `_layout.tsx`
- Verificar host URL (US vs EU)
- Revisar logs de consola por errores

### **Feature flags no funcionan:**

- Verificar que la flag esté creada en PostHog dashboard
- Verificar que esté activada
- Usar `console.log` para debug

### **TypeScript errors:**

- Verificar imports de hooks
- Verificar que PostHogProvider esté en root level

## 📈 KPIs Recomendados

### **Para crear en PostHog Insights:**

**Usuarios Activos:**

- Evento: `user_signed_in` agrupado por día/semana

**Funnel de Conversión:**

1. `app_opened`
2. `user_signed_up`
3. `goal_created`
4. `paywall_viewed`
5. `checkout_started`

**Retención:**

- Usuarios que regresan después de X días

**Feature Adoption:**

- `challenge_started` (pods de ahorro)
- Comparar con usuarios totales

## 📞 Para Nuevos Desarrolladores

### **¿Por dónde empezar?**

1. **Lee este documento** completo
2. **Abre PostHog dashboard** para ver eventos actuales
3. **Revisa `useAnalytics.ts`** para entender la API
4. **Mira `AuthContext.tsx`** para ver ejemplo de implementación

### **¿Cómo agregar tracking a nueva feature?**

1. Identificar **eventos clave** de la feature
2. **Definir propiedades** importantes (IDs, montos, etc.)
3. **Agregar tracking** usando `analytics.track()`
4. **Verificar en PostHog** que lleguen los eventos

### **¿Dudas comunes?**

- **¿Cuándo usar el hook vs el servicio?** Hook en componentes React, servicio en contextos/servicios
- **¿Qué eventos trackear?** Acciones importantes del usuario + puntos de conversión
- **¿Cuántas propiedades?** Las necesarias para entender el contexto, sin saturar

---

**📋 Última actualización:** Agosto 2025  
**🧑‍💻 Implementado por:** GitHub Copilot  
**📊 Dashboard:** https://us.posthog.com/project/210226
