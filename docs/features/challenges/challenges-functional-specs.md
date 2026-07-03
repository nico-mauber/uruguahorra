# Retos (Challenges) — Especificación Funcional

Ruta `/challenges` (tab "Retos"). Sistema de retos CONDUCTUALES con **check-in manual diario**. Regla de oro: los retos NO están ligados a contribuciones monetarias — el progreso avanza únicamente con check-ins diarios marcados como cumplidos.

## Modelo
- **Catálogo**: 6 categorías activas (Gastos Diarios 🛒, Entretenimiento 🎬, Ropa y Accesorios 👕, Ahorro Sistemático 🐷, Inversiones 📈, Educación Financiera 📚) + ~70 retos sembrados con dificultad easy/medium/hard/expert y `xp_reward` 25–500.
- **Sesión**: instancia de un reto para un usuario con duración elegida (`1_week`=7d, `15_days`, `30_days`, `1_year`=365d), estado `active|completed|expired|renewed|cancelled`, progreso 0–100.
- **Check-in diario**: fila única por (usuario, sesión, fecha) con `completed: boolean` y nota opcional; UPSERT (se puede corregir el mismo día).

## CU-1: Carga inicial
En paralelo: `getActiveCategories()` + `getUserActiveSessions(userId)` (con challenge anidado). Seleccionar la primera categoría y cargar sus retos (`getChallengesByCategory`). Para cada sesión activa, obtener progreso real vía RPC `calculate_challenge_session_progress` → `{currentProgress, daysCompleted, totalDaysRequired, isOnTrack}`.

## CU-2: Iniciar un reto
1. Tap en reto disponible:
   - Si ya está activo → dialog "Reto ya activo / Este reto ya está en tu lista de retos activos…".
   - Si hay 5 sesiones activas → dialog "Límite alcanzado / Ya tienes 5 retos activos. Para agregar uno nuevo, completa o cancela alguno…".
   - Si no → abrir modal selector de duración (1 semana / 15 días / 30 días / 1 año).
2. Confirmar duración → RPC `start_challenge_session(p_user_id, p_challenge_id, p_duration_type)`. La BD valida de nuevo: duración válida, reto existente/activo, límite 5.
3. Éxito → recargar sesiones activas → dialog "¡Reto iniciado! Tu reto ha comenzado. ¡Buena suerte!".
4. Error → mostrar `error.message` ("No se pudo iniciar el reto: {mensaje}").

## CU-3: Check-in diario
1. Tap en card de sesión activa → abrir **ChallengeCheckinModal**.
2. Al abrir: `getTodaysCheckinStatus(userId, sessionId)`:
   - Ya hay check-in hoy → mostrar estado (Cumplido verde / No cumplido naranja + nota) y texto "Ya registraste tu check-in para hoy." (solo lectura).
   - No hay → pregunta "¿Cumpliste con el reto hoy?" + nota opcional + botones "Sí, cumplí" / "No cumplí".
3. Al responder: `performDailyCheckinAndUpdateProgress(userId, sessionId, completed, note?)` que ejecuta en orden:
   a. RPC `record_challenge_daily_checkin` (UPSERT del día).
   b. RPC `calculate_challenge_session_progress` y UPDATE de la sesión (`progress` + entrada en `progress_log` con `{timestamp, progress, days_completed, automated:true, note}`).
   c. Si progreso ≥100 **y** días completados ≥ requeridos → RPC `complete_challenge_session_automatically` (marca completed, asigna `xp_earned = challenge.xp_reward`, inserta en `user_xp_log` evento `challenge_session_complete`, suma a `users.total_xp`).
4. Feedback: cumplido → toast "¡Día completado! 🎉 Progreso: N% (D días)"; no cumplido → "Check-in registrado". Si `wasCompleted` → (+1s) "¡Reto completado! +XP ganado! 🏆".
5. Cerrar modal → recargar sesiones activas + refrescar progreso (doble refresh: inmediato y a 200ms).

## Reglas de negocio
- Progreso = `min(100, díasCompletados / ((end−start)+1) * 100)` — sólo cuentan check-ins `completed=true` entre start y hoy.
- `isOnTrack` = progreso ≥ 80% del progreso esperado por días transcurridos → si false y progreso>0, marcar la sesión con aviso "⚠️ Atraso".
- Máx 5 sesiones activas simultáneas (validado en cliente Y en BD por trigger).
- Expiración: sesiones activas con `end_date < now` pasan a `expired` (RPC batch `expire_challenge_sessions` — invocado por cron del backend; el cliente puede llamarlo al cargar la pantalla como best-effort).
- Renovación: una sesión `completed` puede renovarse con nueva duración (`renewSession`) — crea nueva sesión enlazada por `renewed_from_session_id`, marca la vieja `renewed`. Validar límite de 5.
- Un mismo reto no puede tener dos sesiones activas del mismo usuario.

## Estados / errores
- Sin usuario: mensaje "Debes iniciar sesión para ver los retos".
- Falla de carga: dialog "Error / No se pudieron cargar los retos. Intenta de nuevo." (o "…los retos de esta categoría").
- Falla de check-in: dialog "Error / No se pudo registrar el check-in. Intenta de nuevo."

## Offline
- Ver retos y sesiones: desde caché.
- Check-in offline: PERMITIDO — encolar el RPC `record_challenge_daily_checkin` con `checkin_date` del día actual (importante: fijar la fecha en el momento del gesto, no del flush) y aplicar progreso optimista local (+1 día si completed). Al sincronizar, recalcular progreso real desde el servidor.
- Iniciar reto offline: BLOQUEADO (requiere validación de límite en servidor) — botón deshabilitado con aviso.
