# Paso 1 — SPECIFY

> Objetivo: convertir la fase (features/architecture del blueprint) en un **spec ejecutable**: qué se construye y por qué, sin decir cómo. Cero código, cero nombres de librería salvo los ya fijados por la Constitución.

## Entrada
- La fase a especificar (ver tabla de fases en `sdd/README.md`).
- Los docs de insumo de esa fase (columna "Docs de insumo").
- Siempre: `docs/api/contracts-and-data-mapping.md` y `docs/design-system/tokens-and-ui-specs.md`.

## Salida
Archivo `sdd/specs/NN-<fase>/spec.md` con esta estructura EXACTA:

```markdown
# Spec — Fase NN: <nombre>

## 1. Objetivo
Una frase: qué capacidad de usuario entrega esta fase.

## 2. Fuentes (trazabilidad)
Lista de archivos de docs/ consumidos, con las secciones concretas usadas.

## 3. Historias de usuario
US-1 … US-n. Formato: "Como <rol>, quiero <acción>, para <valor>."
Rol casi siempre: usuario autenticado (o anónimo en auth).

## 4. Requisitos funcionales
RF-1 … RF-n. Cada uno:
- Enunciado imperativo y verificable ("El sistema DEBE…").
- Trazado: (US-x) + (doc §y).
- Reglas de negocio exactas (montos, límites, fórmulas) copiadas de docs/, no reinterpretadas.

## 5. Requisitos de datos / API
Tablas, RPCs y Edge Functions que la fase consume — SOLO las que existen en docs/api.
Por cada operación: entidad, tipo (select/insert/update/rpc/edge), campos, y quién calcula qué (cliente vs trigger).

## 6. Estados de UI
Por cada pantalla/componente de la fase: loading, vacío, error, offline, éxito.
Textos en español COPIADOS literal de docs (no inventar copy).

## 7. Criterios de aceptación
CA-1 … CA-n. Verificables por observación del comportamiento (no por implementación).
Formato Given/When/Then. Estos son el gate del Paso 4.

## 8. Fuera de alcance
Qué NO entra en esta fase (features de otras fases, mejoras futuras marcadas como TODO en docs).

## 9. Ambigüedades
[NEEDS CLARIFICATION: …] por cada punto que docs/ no resuelve.
Si la lista NO está vacía, el spec NO pasa el gate hasta resolverla (preguntar al humano o decidir con fundamento y registrar la decisión aquí).
```

## Reglas
1. **Trazabilidad total**: cada RF y CA apunta a una historia y a una sección de docs/. Si algo no tiene fuente en docs/ → va a §9, no al cuerpo.
2. **Prohibido diseñar**: nada de nombres de componentes React, hooks, rutas de archivo, o estructura de código. Eso es Paso 2.
3. **Copiar, no parafrasear**, las reglas duras: fórmulas de XP/nivel, límites (5 retos, 48h racha, 1 protección/mes), montos (UYU $15/$799), validaciones y textos de UI. La fuente canónica de reglas de negocio transversales es `docs/api/contracts-and-data-mapping.md` §6 + el functional-spec de la feature.
4. **Reusar la Constitución**: no re-especificar stack ni invariantes; darlos por dados.

## Gate de salida (todos deben cumplirse)
- [ ] Cada RF es verificable y trazable (US + doc§).
- [ ] §5 solo referencia API/BD existente en docs/api. Cero endpoints inventados.
- [ ] Reglas de negocio idénticas a docs/ (revisar montos, límites, fórmulas).
- [ ] Estados de UI cubren loading/vacío/error/offline con copy literal.
- [ ] §9 vacía (o cada ambigüedad tiene decisión registrada con justificación).
- [ ] Fuera de alcance explícito para no arrastrar scope de otras fases.

Al pasar el gate → avanzar a `02-plan.md`.
