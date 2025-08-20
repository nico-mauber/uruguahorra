# Billing Webhooks Edge Function

Esta función maneja los webhooks de MercadoPago para actualizar el estado de las suscripciones.

## Variables de entorno necesarias

```bash
# MercadoPago
MERCADOPAGO_ACCESS_TOKEN=TEST-...

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Despliegue

```bash
supabase functions deploy billing-webhooks
```

## Configurar webhooks

### MercadoPago
1. Ir a Tu integración > Notificaciones
2. URL: `https://your-project.supabase.co/functions/v1/billing-webhooks`
3. Eventos:
   - preapproval
   - payment

## Pruebas locales

```bash
# Iniciar función local
supabase functions serve billing-webhooks

# Simular webhook de MercadoPago
curl -X POST http://localhost:54321/functions/v1/billing-webhooks \
  -H "Content-Type: application/json" \
  -d '{"type": "preapproval", "action": "created", "data": {"id": "test_123"}}'
```
