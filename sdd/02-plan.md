# Paso 2 — PLAN

> Objetivo: decidir el CÓMO técnico del spec. Arquitectura de código de la fase: archivos, stores, servicios, componentes, rutas. Aún no se escribe código de producción.

## Entrada
- `sdd/specs/NN-<fase>/spec.md` (con gate del Paso 1 pasado).
- `docs/architecture/state-management.md` (capas, stores, patrones).
- `docs/architecture/pwa-and-offline-strategy.md` §7 (estructura de proyecto y rutas).
- `docs/design-system/tokens-and-ui-specs.md` (componentes base disponibles).
- `docs/api/contracts-and-data-mapping.md` (firmas exactas a consumir).

## Salida
Archivo `sdd/specs/NN-<fase>/plan.md`:

```markdown
# Plan — Fase NN: <nombre>

## 1. Enfoque
Resumen de 3-5 líneas de la estrategia técnica.

## 2. Archivos (crear/editar)
Tabla: ruta | tipo (page/component/store/service/lib/schema/type) | responsabilidad | RF que cubre.
Rutas ALINEADAS con la estructura de docs/architecture/pwa-and-offline-strategy.md §7.

## 3. Stores (Zustand)
Por store nuevo/tocado: estado, acciones (firma), reglas de dedup/caché/optimista.
Reutilizar los stores definidos en docs/architecture/state-management.md §2 — no crear duplicados.

## 4. Servicios
Por servicio: clase, métodos estáticos con firma EXACTA de docs/api. Mapeo BD→local (snake→camel).
Marcar qué escrituras pasan por OfflineQueueService.

## 5. Componentes UI
Por componente: props, estados que renderiza, tokens/design-system que usa.
Reusar componentes base (Button, Card, ProgressBar, Modal, Toast, TabBar, FAB). No reinventarlos.

## 6. Rutas y navegación
Rutas nuevas + guards (RequireAuth / público). Modales vs páginas (desktop dialog / mobile full-page).

## 7. Flujos compuestos
Diagrama de pasos para flujos multi-servicio (ej. contribución = addContribution→XP→racha→refetch→toasts).
Copiar el orden de docs/architecture/state-management.md §3.4 cuando aplique.

## 8. Contratos de datos
Tipos TS / esquemas Zod nuevos. Alinear con Row types de docs/api.

## 9. Manejo de errores y offline
Mapeo de errores (23505/42501/PGRST116/rate_limit) a copy del spec.
Qué opera offline (cola optimista) vs bloqueado, según el functional-spec de la fase.

## 10. Riesgos / decisiones
Trade-offs tomados. Desviaciones respecto a docs/ (si las hay) con justificación → también van a progress.md.
```

## Reglas
1. **No inventar API**: toda llamada a Supabase debe existir en `docs/api`. Si el plan necesita algo no listado → parar, volver al Paso 1, marcar `[NEEDS CLARIFICATION]`.
2. **Respetar capas**: UI → store → servicio → supabase/offline-queue. Componentes nunca llaman a `supabase` directo.
3. **Reusar antes de crear**: componentes base, stores y servicios ya definidos en docs/ se reutilizan; solo se crean los nuevos que la fase requiera.
4. **Agregados = BD**: el plan nunca calcula saved_amount, totales de pod ni XP de pod en cliente.
5. **Mobile-first**: layout máx 480px; modales adaptan desktop(dialog)/mobile(page) según design-system.

## Gate de salida
- [ ] Cada RF del spec tiene ≥1 archivo en §2 que lo cubre (matriz RF→archivo completa).
- [ ] Cada método de servicio coincide en firma con docs/api (nombre, params, retorno).
- [ ] Stores no duplican los de docs/architecture; reusan y extienden.
- [ ] Flujos compuestos replican el orden documentado.
- [ ] Cero llamadas a API/BD fuera de docs/api.
- [ ] Cumple Constitución (stack, capas, no-claves, español).

Al pasar el gate → avanzar a `03-tasks.md`.
