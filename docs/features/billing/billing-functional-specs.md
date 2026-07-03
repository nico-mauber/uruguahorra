# Billing / Premium (Paywall) — Especificación Funcional

Rutas: `/paywall`, `/subscription-success`, `/subscription-failure`, `/subscription-pending`. **En la PWA el ÚNICO proveedor es MercadoPago** (suscripciones preapproval en UYU). RevenueCat es exclusivo de las apps de tienda y NO se porta.

## Planes (mostrados en UI)
| Plan | id | Precio UI | Cobro real (Edge Function, UYU) | Trial |
|---|---|---|---|---|
| Premium Mensual | `premium_monthly` | $15/mes | $15 UYU/mes | 7 días |
| Premium Anual | `premium_yearly` | $39.99/año → mostrar "Equivale a $3.33/mes" + badge "Ahorra 33%" | $799 UYU/año | 7 días |

> Nota de coherencia: la UI actual mezcla USD/UYU. En la PWA mostrar los montos REALES de cobro en UYU ($15/mes, $799/año) para no inducir a error. Mantener el badge "Ahorra 33%".

Features listadas en el paywall (con iconos): Metas ilimitadas (infinite), Reportes avanzados (analytics), Pods de ahorro (people), Contenido educativo completo (school), Retos exclusivos (flash).

## CU-1: Ver paywall
1. Track analytics `PAYWALL_VIEWED {user_id, source}`.
2. Cargar planes (constantes de `BillingService.SUBSCRIPTION_PLANS`).
3. `isPremiumUser(userId)`: consultar `subscriptions` con `status IN ('active','trial')` y período vigente → si true, badge "Ya eres Premium" y botón de suscripción deshabilitado. **(Implementar de verdad — la app actual devuelve false en web.)**
4. Selección default: plan anual.

## CU-2: Suscribirse
1. Validar sesión ("Debes iniciar sesión para suscribirte") y no-premium ("Ya tienes una suscripción activa").
2. Track `CHECKOUT_STARTED {plan_id, plan_type, amount, currency, period, provider:'mercadopago'}`.
3. `POST /functions/v1/create-subscription` con JWT y `{planType: 'monthly'|'annual'}`.
4. Respuestas:
   - 200 → abrir `checkout_url` en **nueva pestaña** (`window.open(url,'_blank')`). Mostrar en la página estado "Esperando confirmación de pago… Si ya pagaste, la activación puede demorar unos minutos." con botón "Verificar estado" (re-consulta `subscriptions`).
   - 400 `User already has an active subscription` → refrescar estado premium + info.
   - Error → dialog "No se pudo procesar el pago. Inténtalo nuevamente.".
5. La activación llega por webhook (server→server): `subscriptions.status` pasa a `active` cuando MP autoriza el preapproval. El cliente NO crea filas de suscripción.

## CU-3: Retorno de MercadoPago
- `/subscription-success`: página de confirmación → botón "Continuar" → `/` (replace). Al montar: `refreshProfile()` + reconsultar suscripción (puede tardar; si aún no está activa, mostrar nota "La activación puede demorar unos minutos").
- `/subscription-failure`: mensaje de fallo + botones "Reintentar" (→ `/paywall`) y "Volver al inicio".
- `/subscription-pending`: pago en revisión + "Te avisaremos cuando se acredite" + botón al inicio.
- Estas tres rutas son públicas (MP puede redirigir sin sesión activa en esa pestaña); si no hay sesión, mostrar CTA de login.

## CU-4: Estado premium global
`useAuthStore.isPremium` = `profile.premium === true` **o** suscripción activa/trial vigente. Refrescar al: login, entrar al paywall, volver de success, y cada carga de app.

## Gating de features premium
La app actual NO bloquea features por premium (los textos lo prometen). En la PWA: mantener el mismo comportamiento (sin gating duro) salvo pedido explícito; el paywall es informativo/aspiracional.

## Cancelación
No hay UI de cancelación en la app actual (`cancelPreapproval` existe en servicio pero sin pantalla). En PWA: en Perfil, si premium, mostrar estado de suscripción (plan, próxima renovación `current_period_end`) + enlace "Gestionar suscripción" que instruye cancelar desde MercadoPago (o implementar cancel vía Edge Function como mejora futura — dejar TODO).

## Offline
Paywall funcional en lectura (planes son constantes) pero botón de suscripción deshabilitado sin conexión.
