# Transacciones — Especificación Funcional

Rutas/entradas: `/transactions` (listado + balance), **TransactionFAB** (global en dashboard y transacciones), **QuickTransactionModal** (flujo 3-tap), **VoiceTransactionModal** (entrada por voz con IA).

## Modelo
Transacción = ingreso/gasto/transferencia con categoría, metadata psicológica opcional (mood_before/after 1-5, regret_level 0-10, necessity_level 1-5), soft delete, y `xp_earned` (5 XP por registrar).

## CU-1: Listado con balance por período
1. Rango por defecto: últimos 30 días (`DateRangeSelector` permite cambiar inicio/fin; histórico máx 2 años).
2. Fetch: `TransactionsService.getUserTransactions({user_id, start_date, end_date, offset:0, limit:1000})` — filtro por `created_at` entre `T00:00:00Z` y `T23:59:59Z`, `deleted_at IS NULL`, orden `transaction_date desc, created_at desc`, join de categoría.
3. Balance calculado en cliente: `income = Σ amount type=income`, `expenses = Σ type=expense`, `balance = income − expenses`.
4. Agrupar por fecha (día) para render; encabezado de grupo con fecha relativa: "Hoy" / "Ayer" / "N días" (si <7) / "d MMM" (`es-UY`).
5. Refresh: recarga el rango vigente; cambio de fechas recarga automáticamente.

## CU-2: Crear transacción rápida (3-tap)
Paso 1 **Monto**: input decimal (regex sólo dígitos y un punto, máx 2 decimales), validar >0 ("El monto debe ser mayor a 0") y ≤999999.99 ("El monto es demasiado grande").
Paso 2 **Categoría**: grid de categorías filtradas por el tipo inicial (expense/income; default expense) — emoji grande + nombre.
Paso 3 **Confirmación**: muestra monto y categoría; descripción opcional (máx 100 chars); botón "Crear Transacción".
Persistencia: `createQuickTransaction(userId, {amount, category_id, description?, type})` → INSERT con `transaction_date` = hoy y `xp_earned: 5`; el `type` se infiere de la categoría si no viene. Feedback éxito: "¡Listo! 💚 Transacción de $X registrada correctamente". Tras crear: callback refresca listado/dashboard (delay 500ms) y toast "Transacción registrada exitosamente".

## CU-3: FAB expandible
- Botón principal 64px: al tocar alterna expandido (rotación 135° del "+", overlay oscuro).
- Quick actions (de abajo hacia arriba): **Gasto** (rojo, abre QuickTransactionModal type=expense), **Ingreso** (verde, type=income), **Voz** (abre VoiceTransactionModal).
- Encima, hasta 3 **transacciones frecuentes** (`getFrequentTransactions(userId, 5)`: agrupa últimas 100 expenses por descripción+categoría, ≥2 ocurrencias, orden por frecuencia; muestra descripción + monto promedio) — tap abre el modal (pre-llenado: TODO en la app actual; implementar pre-llenado en la PWA).

## CU-4: Eliminar transacción
Botón basura en cada ítem → soft delete (`deleted_at = now`) → toast "Transacción eliminada" → refetch. (La BD purga definitivamente a los 30 días vía `cleanup_deleted_transactions` — no responsabilidad del cliente.)

## CU-5: Entrada por voz (IA)
1. Usuario abre modal de voz → pedir permiso de micrófono (`getUserMedia({audio:true})`).
2. Grabar con `MediaRecorder` (webm/opus), máx 30s, con indicador de nivel/tiempo.
3. Enviar a Edge Function `POST /ai-transcribe` (ver contrato en `api/contracts-and-data-mapping.md` §4.4). **NUNCA llamar a OpenAI desde el cliente.**
4. Respuesta `{transcript, parsed:{amount, description, type, category_hint, confidence}}`:
   - confidence ≥ 0.8 → precargar formulario de confirmación completo.
   - 0.6–0.8 → precargar y resaltar campos dudosos.
   - < 0.3 → "No entendí el audio, intenta de nuevo".
5. Usuario confirma → CU-2 paso de persistencia con los datos parseados (mapear `category_hint` a categoría por nombre; si no matchea → dejar sin categoría y que el trigger auto-categorice).
6. Estados de error: sin permiso de micrófono → instrucciones para habilitarlo; sin conexión → deshabilitar voz (requiere red); timeout 15s transcripción → reintentar.

## Reglas de negocio
- Montos siempre positivos; el signo lo da `type`.
- Categorías: 21 sembradas, lectura pública, cachear 24h.
- Búsqueda (si se implementa filtro de texto): `or(description.ilike, notes.ilike, location.ilike)`.
- Este sistema es INDEPENDIENTE de metas y retos (una transacción puede opcionalmente referenciar `goal_id`/`squad_id` pero no crea contribuciones).

## Offline
- Crear transacción rápida offline: permitido (encolar + optimista con `_pending`).
- Eliminar offline: permitido (encolar update de `deleted_at`).
- Voz offline: bloqueado con mensaje.
- Listado offline: últimas 500 transacciones desde `cache-transactions`; balance calculado sobre lo cacheado con etiqueta "datos locales".
