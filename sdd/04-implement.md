# Paso 4 — IMPLEMENT

> Objetivo: ejecutar tasks.md hasta que todos los criterios de aceptación del spec pasen y los gates técnicos estén en verde. Único paso que escribe código de producción.

## Entrada
- `sdd/specs/NN-<fase>/tasks.md` (gate del Paso 3 pasado).
- spec.md y plan.md de la fase (referencia constante).
- docs/ (fuente de reglas y contratos; consultar ante cualquier duda).

## Salida
- Código de producción en `src/` según el plan.
- `sdd/specs/NN-<fase>/progress.md` (bitácora de la fase).

```markdown
# Progress — Fase NN: <nombre>

## Estado de tareas
Copia del checklist de tasks.md con [x] los completados.

## Estado de CA (gate de aceptación)
Tabla: CA-n | ✅/❌ | evidencia (cómo se verificó).

## Gates técnicos
- tsc --noEmit: ✅/❌
- eslint: ✅/❌
- vite build: ✅/❌

## Desviaciones respecto a docs/ o plan
Qué cambió, por qué, e impacto en fases siguientes. (Estas notas alimentan el spec de fases futuras.)

## Deuda / TODO
Pendientes conscientes (ej. Web Push fase 2, gating premium).
```

## Protocolo de ejecución
1. Ejecutar tareas en el orden de tasks.md; marcar cada una al terminar con su `Done:` verificado.
2. **Fidelidad al plan**: implementar lo que dice plan.md. Si el plan estaba mal → corregir el plan primero (breve), no divergir en silencio.
3. **Consultar docs/ para reglas exactas**: montos, fórmulas, límites, copy de UI y firmas de API se toman de docs/, no de memoria. Nunca inventar un endpoint.
4. **Capas y Constitución**: UI→store→servicio→supabase/offline; agregados solo por triggers; sin claves privadas; español.
5. **Reusar** componentes base y utilidades ya construidas en fases previas (revisar progress.md de fases anteriores).
6. Commits pequeños, uno por tarea o grupo lógico. Mensajes en imperativo.

## Gate de salida de fase (todos en verde para cerrar)
- [ ] Todas las tareas de tasks.md completadas.
- [ ] **Cada CA del spec verificado ✅** (evidencia en progress.md) — este es el gate duro.
- [ ] `tsc --noEmit` sin errores.
- [ ] `eslint` sin errores.
- [ ] `vite build` exitoso.
- [ ] Estados loading/vacío/error/offline implementados con el copy literal del spec.
- [ ] Sin API/BD fuera de docs/api; sin claves privadas en el bundle.
- [ ] Desviaciones registradas en progress.md.

Al cerrar la fase → volver al Paso 1 con la fase siguiente (ver tabla en `sdd/README.md`). Repetir el ciclo 11 veces.

## Verificación de CA (cómo)
- Preferir prueba real de comportamiento sobre "el código parece correcto".
- Para flujos de usuario: recorrer la ruta en `vite dev` (o e2e con Playwright si está disponible) y observar el resultado que el CA describe.
- Para reglas de negocio (XP, progreso, límites): probar el caso borde exacto del spec (ej. contribución de $6 → 10 XP tope; 6º reto activo → error; racha a las 49h → reset).
```
