# SDD — Spec-Driven Development para UruguAhorra PWA

Pipeline de 4 pasos para desarrollar la PWA por fases. **Insumo único de verdad: `docs/`** (blueprint de ingeniería inversa). Este directorio NO contiene código: contiene el proceso.

## Los 4 pasos

```
docs/ (blueprint) ──► 1. SPECIFY ──► 2. PLAN ──► 3. TASKS ──► 4. IMPLEMENT
                        spec.md       plan.md      tasks.md     código + progress.md
                      (qué y por qué) (cómo)       (en qué orden) (hecho y verificado)
```

| Paso | Archivo de instrucciones | Produce | Gate de salida |
|---|---|---|---|
| 1. Specify | `01-specify.md` | `sdd/specs/NN-<fase>/spec.md` | Requisitos 100% trazables a docs/; 0 ambigüedades abiertas |
| 2. Plan | `02-plan.md` | `sdd/specs/NN-<fase>/plan.md` | Cumple Constitución; no inventa API/BD |
| 3. Tasks | `03-tasks.md` | `sdd/specs/NN-<fase>/tasks.md` | Tareas atómicas, ordenadas, verificables |
| 4. Implement | `04-implement.md` | código + `sdd/specs/NN-<fase>/progress.md` | Criterios de aceptación del spec ✅ + gates técnicos |

## Fases (una pasada completa de los 4 pasos por fase)

Orden tomado de `docs/README.md` §"Orden de implementación":

| # | Fase | Docs de insumo principales |
|---|---|---|
| 01 | fundaciones | architecture/* , design-system/* |
| 02 | auth | features/auth/* |
| 03 | goals-dashboard | features/dashboard/*, features/goals/* |
| 04 | gamification | features/gamification/* |
| 05 | transactions | features/transactions/* |
| 06 | challenges | features/challenges/* |
| 07 | pods | features/pods/* |
| 08 | analytics | features/analytics/* |
| 09 | profile-notifications | features/profile/* |
| 10 | billing | features/billing/* |
| 11 | pwa-offline | architecture/pwa-and-offline-strategy.md |

(api/contracts-and-data-mapping.md y design-system aplican a TODAS las fases.)

## Constitución (innegociable — se valida en cada gate)

1. `docs/` manda. Ante conflicto código-vs-docs, ganan los docs. Ante vacío en docs, se marca `[NEEDS CLARIFICATION]` en el spec — nunca se inventa.
2. Backend Supabase intocable: solo se consumen tablas/RPCs/Edge Functions listadas en `docs/api/contracts-and-data-mapping.md`.
3. Agregados (saved_amount, totales de pods, XP de pods) los calculan triggers de BD; el cliente nunca los escribe.
4. Prohibido: Expo, React Native, claves privadas en bundle.
5. Stack fijo: Vite + React 19 + TS strict + React Router v7 + Zustand + supabase-js + vite-plugin-pwa + idb.
6. UI en español (es-UY), tokens del design system, mobile-first máx 480px.
7. Cada fase termina compilando: `tsc --noEmit` + `eslint` + `vite build` en verde.

## Regla de flujo

- No se avanza de paso sin pasar el gate del paso anterior.
- Un cambio de alcance a mitad de fase → volver al paso 1 de esa fase (actualizar spec), no parchar en caliente.
- `progress.md` de cada fase registra desviaciones y decisiones para las fases siguientes.
