# Paso 3 — TASKS

> Objetivo: descomponer el plan en tareas atómicas, ordenadas y verificables. Cada tarea es un commit pequeño con criterio de "hecho" objetivo.

## Entrada
- `sdd/specs/NN-<fase>/plan.md` (gate del Paso 2 pasado).
- `sdd/specs/NN-<fase>/spec.md` (para trazar CA).

## Salida
Archivo `sdd/specs/NN-<fase>/tasks.md`:

```markdown
# Tasks — Fase NN: <nombre>

## Orden de ejecución
Grupos en secuencia (un grupo depende del anterior). Dentro de un grupo, tareas paralelizables marcadas [P].

### Grupo A — Andamiaje (tipos, esquemas, servicios)
- [ ] T-A1 · <acción concreta> · archivo(s) · cubre RF-x · Done: <verificación>
- [ ] T-A2 [P] · …

### Grupo B — Estado (stores)
- [ ] T-B1 · …

### Grupo C — UI (componentes + páginas)
- [ ] T-C1 · …

### Grupo D — Integración y flujos compuestos
- [ ] T-D1 · …

### Grupo E — Errores, offline, estados vacíos
- [ ] T-E1 · …

### Grupo F — Verificación de fase
- [ ] T-F1 · tsc --noEmit en verde
- [ ] T-F2 · eslint sin errores
- [ ] T-F3 · vite build en verde
- [ ] T-F4 · Recorrer cada CA del spec manualmente/e2e y marcar ✅

## Matriz de cobertura
Tabla: CA del spec → tareas que lo satisfacen. Toda CA debe tener ≥1 tarea.

## Dependencias externas
Precondiciones fuera de la fase (ej: Edge Function ai-transcribe desplegada antes de la UI de voz; variables de entorno; datos semilla de BD ya presentes).
```

## Reglas de granularidad
1. **Atómica**: una tarea = un cambio coherente y testeable en aislamiento. Si una tarea necesita "y" para describirse, probablemente son dos.
2. **Verificable**: cada tarea tiene un `Done:` observable (compila, render X aparece, llamada Y devuelve Z, CA-n pasa).
3. **Ordenada por dependencia**: tipos/servicios antes que stores; stores antes que UI; UI antes que flujos; flujos antes que pulido offline/error.
4. **Trazable**: cada tarea cita el/los RF que ayuda a cumplir; el grupo F traza los CA.
5. **[P] solo si independiente**: sin estado compartido ni dependencia de orden.

## Reglas de contenido
- Ninguna tarea introduce API/BD fuera de docs/api (heredado del gate del Paso 2).
- El grupo F es obligatorio y cierra la fase con los 3 gates técnicos de la Constitución + verificación de CA.
- Si una tarea revela un hueco en el plan → no improvisar: anotar y, si es de alcance, volver al Paso 1/2.

## Gate de salida
- [ ] Matriz CA→tareas completa (0 CA sin cubrir).
- [ ] Toda tarea tiene `Done:` objetivo.
- [ ] Orden respeta dependencias (andamiaje → estado → UI → flujos → pulido → verificación).
- [ ] Grupo F presente con los 4 checks.
- [ ] Dependencias externas listadas y agendadas antes de las tareas que las necesitan.

Al pasar el gate → avanzar a `04-implement.md`.
