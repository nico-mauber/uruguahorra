# UruguAhorra — Blueprint de reconstrucción como PWA

Directorio de especificaciones técnicas para reconstruir desde cero la app actual (React Native/Expo) como **PWA nativa web** (Vite + React + TypeScript + Supabase). Pensado para un agente de codificación sin contexto previo: cada archivo es normativo y autosuficiente.

## Árbol

```
docs/
├── README.md                                  ← este índice
├── architecture/
│   ├── pwa-and-offline-strategy.md            ← stack, manifest, Service Worker, IndexedDB, cola offline, notificaciones, mapa de rutas
│   └── state-management.md                    ← stores Zustand, capa de servicios, patrones (cache-then-network, optimista, flujo compuesto de contribución)
├── api/
│   └── contracts-and-data-mapping.md          ← Supabase: tablas+RLS, RPCs con firmas exactas, Edge Functions (payloads request/response), errores, reglas de XP
├── design-system/
│   └── tokens-and-ui-specs.md                 ← tokens CSS light/dark, tipografía, espaciados, componentes base (Button, Card, Modal, Toasts, Tab bar, FAB)
└── features/
    ├── auth/          {functional-specs, ui-ux}   ← registro/login email+password, creación de perfil con fallbacks, guards
    ├── dashboard/     {functional-specs, ui-ux}   ← resumen, ahorro rápido (flujo compuesto XP+racha), stats
    ├── goals/         {functional-specs, ui-ux}   ← listado, wizard de creación 2 pasos, detalle/editar/eliminar
    ├── transactions/  {functional-specs, ui-ux}   ← balance por período, modal 3-tap, FAB expandible, voz (IA vía Edge Function)
    ├── challenges/    {functional-specs, ui-ux}   ← catálogo por categorías, sesiones con duración, check-in manual diario, progreso real
    ├── pods/          {functional-specs, ui-ux}   ← squads democráticos, invite codes, contribuciones grupales, ranking
    ├── gamification/  {functional-specs, ui-ux}   ← XP, niveles (sqrt), rachas 48h + protección mensual, quests semanales
    ├── analytics/     {functional-specs, ui-ux}   ← insights psicológicos config-driven, patrones, forecast, preferencias auto-guardadas
    ├── billing/       {functional-specs, ui-ux}   ← paywall MercadoPago (preapproval UYU), retorno success/failure/pending
    └── profile/       {functional-specs, ui-ux}   ← perfil, tema, menú cuenta, notificaciones de racha
```

## Orden de implementación recomendado
1. **Fundaciones**: proyecto Vite+React+TS, tokens del design system, componentes base, cliente Supabase, logger, router con guards.
2. **Auth** → **Dashboard (solo lectura)** → **Goals** (crear/contribuir habilita todo el flujo de XP/racha).
3. **Gamificación** (servicios + componentes) — requerida por dashboard.
4. **Transactions** (listado + 3-tap + FAB) → **Challenges** → **Pods**.
5. **Analytics** → **Profile/Notificaciones** → **Billing**.
6. **PWA**: manifest, Service Worker, IndexedDB, cola offline, prompt de instalación (puede desarrollarse en paralelo desde el paso 2).
7. **Voz (IA)**: crear Edge Function `ai-transcribe` primero; la UI al final.

## Invariantes no negociables
- El backend Supabase existente NO se modifica; `complete_database_schema.sql` es la única fuente de verdad de la BD.
- Los agregados (progreso de metas, totales de pods, XP de pods) los calculan TRIGGERS de BD; el cliente nunca los escribe.
- Retos = check-in manual diario; NUNCA ligados a contribuciones de dinero.
- Máx 5 retos activos; racha se rompe a las 48h con 1 protección/mes; fórmulas de XP/nivel en `api/contracts-and-data-mapping.md` §6.
- Ninguna clave privada en el bundle (OpenAI/MercadoPago/service-role → sólo Edge Functions).
- Idioma de UI: español (es-UY); moneda por defecto UYU con símbolo `$` y montos enteros salvo donde se indique.
