# Perfil y Notificaciones — Especificación Funcional

Rutas: `/profile` (tab "Perfil") y `/notifications` (accesible desde Perfil; NO aparece en el tab bar).

## Perfil — CU
1. **Datos mostrados**: avatar genérico, nombre (email antes de `@`), email; card de nivel (nivel + X/Y XP + barra — usar `getLevelProgress` real); grid de 4 stats: Racha, Experiencia (XP total), Metas Activas (count real de metas activas — la app actual hardcodea "3": CORREGIR usando el store), Retos Completados (count real de sesiones `completed` — la app actual hardcodea "12": CORREGIR usando `getUserStats`).
2. **Tema oscuro**: switch → alterna `light/dark` (persistir en localStorage, aplicar `data-theme`).
3. **Menú Cuenta**:
   - "Premium" (icono diamond warning) → `/paywall`; badge "Upgrade" si no premium. Si premium: mostrar plan y `current_period_end`.
   - "Notificaciones" → `/notifications`.
   - "Privacidad" → `/privacy-policy` (página estática con la política actual).
   - "Ayuda" → sin acción actual (placeholder; dejar deshabilitado o link mailto de soporte).
4. **Cerrar sesión**: botón outline → `signOut()` → limpiar todo → `/onboarding`.

## Notificaciones `/notifications` — CU
Sistema de recordatorios de racha (ver traducción PWA en `architecture/pwa-and-offline-strategy.md` §5).

1. **Estado**: indicador con punto de color + texto: "Inicializando…" (naranja) / "Sin permisos" (rojo) / "Desactivadas" (gris) / "Activas" (verde). Mostrar "N notificación(es) programada(s)" si aplica.
2. **Toggle principal**:
   - Sin permiso → `Notification.requestPermission()`; si deniega → dialog "Permisos Requeridos / Para recibir notificaciones de racha, necesitas conceder permisos en la configuración de tu navegador" con instrucciones.
   - Con permiso → alterna `settings.enabled` (persistido en IndexedDB kv); al desactivar, cancelar avisos pendientes.
3. **Info de alertas automáticas** (solo con permisos): "Sistema escalonado fijo: • 12 horas antes de perder la racha • 6 horas antes • 3 horas antes • 30 minutos antes" + "Se activan automáticamente cuando tienes una racha activa".
4. **Lógica de disparo (Fase 1 web)**: al abrir la app y periódicamente mientras esté abierta (interval 15 min), calcular `deadline = last_activity_at + 48h`; si falta ≤12h/6h/3h/30min y no se mostró ese escalón hoy → `registration.showNotification('UruguAhorra', {body:'🔥 Tu racha de N días está por vencer. ¡Registra un ahorro hoy!', icon, badge})` + banner in-app. Registrar escalones mostrados en kv.
5. Mensaje si el navegador no soporta Notification API: "Las notificaciones no están disponibles en este navegador."

## Robustez
- Logout siempre disponible aunque fallen cargas.
- Stats con fallback a 0 si algún fetch falla (sin romper la página).
