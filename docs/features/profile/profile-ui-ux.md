# Perfil y Notificaciones — Especificación UI/UX

## Pantalla `/profile`
1. **Header centrado**: avatar círculo 100px (fondo primary 12%, icono person 48 primary) + nombre (24/bold) + email (16 secondary).
2. **Card de nivel**: fila "Nivel N" (18/600) | "X / Y XP" (14 secondary) + ProgressBar primary sin label.
3. **Grid 2×2 de stat-cards** (min-height 70): valor 20/bold + label 11 secondary centrado — "Racha", "Experiencia", "Metas\nActivas", "Retos\nCompletados".
4. **Sección "Configuración"** (Card): fila "Tema oscuro" (16) + Switch (track primary cuando on).
5. **Sección "Cuenta"** (Card sin padding, filas con borde inferior): cada fila = Ionicon 24 + label 16 + [badge/estado] + chevron-forward:
   - 💎 diamond (color warning) "Premium" + badge "Upgrade" (píldora primary, texto blanco 12/600) si no premium.
   - notifications "Notificaciones".
   - shield-checkmark "Privacidad".
   - help-circle "Ayuda".
6. **Botón "Cerrar sesión"** (outline, full-width, margen inferior 32).

## Pantalla `/notifications`
- Header: back (arrow-back) + "Notificaciones" (20/bold).
- **Card de estado**: fila punto de color 12px + "Estado de Notificaciones" (18/600); subtítulo con el estado textual; "N notificación(es) programada(s)" si hay; fila inferior: label ("Activar Notificaciones" o "Solicitar Permisos") + Switch (disabled durante loading).
- **Card "Configuración"** (solo con permisos): label "Alertas Automáticas de Racha" + caja informativa (fondo background, radius 8): "Sistema escalonado fijo:" + bullets 12h/6h/3h/30min + nota cursiva "Se activan automáticamente cuando tienes una racha activa".
- **Texto informativo final** (14 secondary centrado): "Las notificaciones te ayudarán a mantener tu racha de ahorro activa. Recibirás recordatorios diarios y alertas cuando tu racha esté en riesgo." (variante si el navegador no soporta: mensaje de no disponibilidad).
