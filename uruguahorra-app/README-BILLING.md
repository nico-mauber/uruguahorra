# Sistema de Paywall y Suscripciones

Esta implementación incluye un sistema completo ### 2.### 2.### 3. Configurar webhooks

#### MercadoPago Dashboard
1. URL: `https://your-project.supabase.co/functions/v1/billing-webhooks`
2. Eventos:
   - `preapproval`
   - `payment`oks

#### MercadoPago Dashboard
1. URL: `https://your-project.supabase.co/functions/v1/billing-webhooks`
2. Eventos:
   - `preapproval`
   - `payment`oks

#### MercadoPago Dashboard
1. URL: `https://your-project.supabase.co/functions/v1/billing-webhooks`
2. Eventos:
   - `preapproval`
   - `payment`ripciones para la aplicación Uruguahorra, con soporte para **MercadoPago** (optimizado para Uruguay).

## 🚀 Características implementadas

### ✅ UI - Pantalla Paywall
- **Ubicación**: `src/app/paywall.tsx`
- Dos planes: Mensual ($4.99) y Anual ($39.99) con 33% descuento
- Detección automática de usuarios premium
- Integración con MercadoPago para el mercado uruguayo
- Estados de carga y manejo de errores

### ✅ Servicios de Billing
- **BillingService**: Lógica principal de suscripciones
- **MercadoPagoService**: Integración específica con MercadoPago
- Optimizado para usuarios en Uruguay

### ✅ Edge Function de Webhooks
- **Ubicación**: `supabase/functions/billing-webhooks/index.ts`
- Maneja webhooks de MercadoPago
- Validación de eventos para seguridad
- Actualización automática de estado de suscripciones

### ✅ Tipos y Interfaces
- **Ubicación**: `src/types/billing/index.ts`
- Tipos TypeScript para MercadoPago
- Interfaces para checkout y webhooks

### ✅ Componente de Gestión
- **SubscriptionManager**: Componente para usuarios premium
- Cancelación y reactivación de suscripciones
- Información detallada del plan activo

## 📋 Estructura de archivos

```
src/
├── app/
│   └── paywall.tsx                    # Pantalla principal del paywall
├── components/
│   └── SubscriptionManager.tsx        # Gestor de suscripciones
├── services/
│   ├── billing/
│   │   ├── BillingService.ts          # Servicio principal
│   │   ├── MercadoPagoService.ts      # Integración MercadoPago
│   │   └── index.ts                   # Exportaciones
│   └── subscriptions.service.ts       # Servicio mejorado
├── types/
│   └── billing/
│       └── index.ts                   # Tipos TypeScript
└── ...

supabase/
└── functions/
    └── billing-webhooks/
        ├── index.ts                   # Edge Function principal
        └── README.md                  # Documentación de webhooks

scripts/
├── setup-billing.sh                  # Configuración Unix
└── setup-billing.bat                 # Configuración Windows

docs/
└── billing-testing.md                # Guía de testing
```

## 🔧 Configuración

### 1. Variables de entorno
Crea un archivo `.env.local` con:

```bash
# MercadoPago
EXPO_PUBLIC_MERCADOPAGO_PUBLIC_KEY=TEST-...
MERCADOPAGO_ACCESS_TOKEN=TEST-...

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2. Despliegue de Edge Function
```bash
supabase functions deploy billing-webhooks
```

### 3. Configurar webhooks

#### MercadoPago Dashboard
1. URL: `https://your-project.supabase.co/functions/v1/billing-webhooks`
2. Eventos:
   - `preapproval`
   - `payment`

## 🛠️ Scripts npm

```bash
# Configuración inicial
npm run billing:setup

# Desarrollar functions localmente
npm run functions:serve

# Desplegar functions
npm run functions:deploy

# Iniciar/parar Supabase local
npm run supabase:start
npm run supabase:stop
```

## 🌍 Mercado Objetivo

### Uruguay - MercadoPago
- Optimizado para usuarios uruguayos
- Soporte completo para peso uruguayo (UYU)
- Métodos de pago locales disponibles
- Sin restricciones geográficas

## 💳 Flujo de Suscripción

### MercadoPago:
1. Usuario selecciona plan → `BillingService.createCheckout()`
2. Redirect a MercadoPago  
3. Webhook `preapproval` → crea/actualiza suscripción
4. Webhooks de pago → tracking de pagos

## 🧪 Testing

### Testing local de webhooks:
```bash
# MercadoPago - Simulación manual
curl -X POST http://localhost:54321/functions/v1/billing-webhooks \
  -H "Content-Type: application/json" \
  -d '{"type": "preapproval", "action": "created", "data": {"id": "test_123"}}'
```

Ver más detalles en `docs/billing-testing.md`

## 🔒 Seguridad

- ✅ Validación de eventos de webhook de MercadoPago
- ✅ Autenticación por usuario ID
- ✅ Rate limiting en Edge Functions
- ✅ Logs seguros sin información sensible
- ✅ Variables de entorno para claves secretas

## 📈 Estado de la Implementación

| Funcionalidad | Estado | Observaciones |
|---------------|--------|---------------|
| **UI Paywall** | ✅ | Completa con 2 planes |
| **MercadoPago Integration** | ✅ | Preapproval + Webhooks |
| **Edge Function** | ✅ | Solo MercadoPago |
| **Database Schema** | ✅ | Tabla suscripciones |
| **Testing Local** | ✅ | Scripts y documentación |
| **Security** | ✅ | Validación eventos |
| **Error Handling** | ✅ | Comprehensive |

## 🚀 Próximos pasos

1. **Configurar cuenta de producción** en MercadoPago
2. **Completar variables de entorno** de producción
3. **Configurar webhooks** en production  
4. **Pruebas end-to-end** con pagos reales
5. **Monitoreo y analytics** de conversión

---

## 📞 Soporte

Para preguntas sobre la implementación:
- Revisar `docs/billing-testing.md` para testing
- Consultar logs en Supabase Dashboard
- Verificar configuración en archivos `.env.local`
