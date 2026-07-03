# Pods de Ahorro (Squads) — Especificación Funcional

Entradas: sección **PodsList** en el dashboard + pantalla `/squad/:id`. Grupos de ahorro colaborativo con código de invitación. **Sistema democrático: TODOS los miembros tienen rol `admin` con permisos iguales** (owner existe sólo como metadato del creador).

## CU-1: Listar mis pods (PodsList)
`fetchUserSquads(userId)` → por cada pod: `memberRole`, `memberCount` (count de squad_members), `totalSquadSaved` (Σ squad_contributions; fallback Σ total_saved de miembros), `goalAmount` (default 10000 si null).

## CU-2: Crear pod (CreateSquadModal)
Campos: nombre (obligatorio), descripción (opcional), máx. miembros (default 10). Flujo: generar `invite_code` de 6 chars (A-Z0-9) en cliente → INSERT squad `{name, description, max_members, owner_id: uid, created_by: uid, invite_code, goal_amount default 1000}` → INSERT membresía propia rol `admin`. Éxito → refetch lista + mostrar el código para compartir.

## CU-3: Unirse por código (JoinSquadModal)
Input de código (6 chars, uppercase automático). Validaciones en orden con mensajes:
1. Squad con ese `invite_code` + `is_active` → si no: "Código de invitación inválido o squad inactivo".
2. No ser ya miembro → "Ya eres miembro de este squad".
3. `memberCount < max_members` → "El squad está lleno".
4. INSERT membresía rol `admin`. Éxito → refetch + navegar al detalle (opcional) o toast.

## CU-4: Detalle `/squad/:id`
- El squad se busca en `userSquads` del store (si no está → toast "Squad no encontrado" + volver). Cargar `fetchSquadMembers(id, force)` con datos de usuario (email, premium).
- **Invitar**: dialog con el código: "Comparte este código para invitar nuevos miembros:\n\n{CODE}" + acciones Cerrar / Copiar (`navigator.clipboard` + toast "Código copiado"). Adicional web: botón compartir con `navigator.share` si disponible.
- **Contribuir**: modal con Monto (obligatorio >0, si no "Ingresa un monto válido") y Descripción opcional → `addSquadContribution({squadId, userId, amount, description?, source:'manual'})`. El servicio verifica membresía ("Solo los miembros del squad pueden contribuir"). El trigger de BD actualiza `total_saved` del pod y del miembro (+monthly) y otorga **15 XP**. Éxito → toast "¡Contribución agregada! / $N agregados al pod" + recargar.
- **Editar meta del pod**: modal con "Meta de Ahorro" (>0; "Ingresa una meta válida") → `updateSquadGoal(squadId, amount, userId)` → toast "¡Meta actualizada! / Nueva meta: $N". Disponible para todos los miembros.
- **Salir**: confirm. Si `role === 'owner'`: dialog "Transferir grupo / Como creador… necesitas transferir el liderazgo antes de salir" (acción Transferir → toast "Función próximamente"). Si no: "¿Estás seguro que quieres salir de «{name}»?" → DELETE de membresía → toast "Has salido de «{name}»" → volver.
- **Ranking**: miembros ordenados por `totalSaved` desc; posiciones 1-3 con trofeo/medalla/cinta (oro #FFD700, plata #C0C0C0, bronce #CD7F32); nombre = email antes de `@` (fallback "Usuario {últimos4 del id}"); marcar "(Tú)"; mostrar total y "$N este mes".
- **Stats del pod** (SquadStatsCard): total ahorrado vs `goalAmount` con ProgressBar, % de avance, cantidad de miembros.

## Reglas
- Sincronización con contribuciones a metas personales: al agregar una `micro_contribution`, recalcular best-effort `total_saved/monthly_saved` del usuario en todos sus pods (no bloquea el flujo si falla).
- Eliminar pod = soft delete `is_active=false` (cualquier miembro puede, según RLS actual — exponer sólo tras confirmación fuerte).
- Búsqueda pública de pods por nombre existe en el servicio (`searchSquads`) pero NO tiene UI actualmente — no implementar UI.

## Offline
- Ver pods/miembros: caché. Crear/unirse: BLOQUEADO offline (requiere validaciones de servidor). Contribuir al pod: permitido con cola (el trigger recalcula al sincronizar).
