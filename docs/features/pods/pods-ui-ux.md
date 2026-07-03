# Pods de Ahorro (Squads) — Especificación UI/UX

## PodsList (sección del dashboard)
- Header: "🏛️ Pods de Ahorro (N)" (`headline-sm`) + subtítulo "Ahorra junto a otros usuarios" + botón add-circle-outline 24 primary a la derecha (abre CreateSquadModal).
- **Loading**: card con "Cargando tus pods…".
- **Empty**: card centrada: people-outline 48 secondary + "¡Únete a un Pod de Ahorro!" (título) + "Ahorra junto a tus amigos y motívense mutuamente para alcanzar sus metas." + fila de botones: "Crear Pod" (primary small) y "Unirse con Código" (outline small).
- **Con pods**: carrusel horizontal de cards: nombre (16/600) + indicador de rol (👑 owner / ⭐ admin / 👤 member), descripción (2 líneas), "N miembros", ProgressBar `totalSquadSaved/goalAmount` + "$X de $Y", botón "Ver detalle" → `/squad/:id`.

## CreateSquadModal
Dialog: título "Crear Pod de Ahorro" + X. Inputs: "Nombre *", "Descripción" (textarea), "Máximo de miembros" (numérico, default 10). Botones Cancelar / Crear (loading spinner). Al crear con éxito: vista de éxito con el código de invitación en grande (mono, 6 chars, letter-spacing amplio) + botón Copiar.

## JoinSquadModal
Dialog: título "Unirse a un Pod" + X. Input código (6 chars, auto-uppercase, centrado, mono 24px). Botones Cancelar / Unirse. Errores como texto rojo bajo el input (mensajes en functional-specs).

## Pantalla `/squad/:id`
### Header: back (chevron-back) + "Detalle del Grupo" centrado.
### Card principal
- Nombre (24/bold), descripción (16, LH22), fila de metadatos: "👥 N/M miembros" + "🛡️ Creador/Admin/Miembro" (14 secondary).
- Fila de botones-acción (píldoras outline 13px, gap 8): "➕ Invitar" (primary) · "👛 Contribuir" (primary) · "🚩 Meta" (info) · "🚪 Salir" (error, borde rojizo; spinner mientras sale).
### SquadStatsCard
Total ahorrado del pod (money-md), ProgressBar hacia `goalAmount`, "% completado", miembros.
### Card "🏆 Ranking de Ahorros"
Lista: [rank: 🏆/🥈(medal)/🎗️(ribbon) para top-3 con colores oro/plata/bronce; "#N" para el resto] + [nombre (16/500) con sufijo "(Tú)" en primary + rol (14 secondary)] + [derecha: "$total" (16/600) y "$N este mes" (12 secondary)]. Empty: people-outline 48 + "No hay miembros para mostrar". Loading: spinner pequeño + "Cargando ranking…".

## Modal Contribuir
Dialog máx 400: header "Contribuir al Pod" + X; body: "Monto *" (input numérico, placeholder "Ej: 100") y "Descripción (opcional)" (textarea 2 líneas, placeholder "Ej: Ahorro semanal"); footer: Cancelar (outline) / "Contribuir" (primary, spinner con `isAddingContribution`).

## Modal Editar Meta
Dialog: header "Editar Meta del Pod" + X; "Meta de Ahorro *" (numérico, pre-cargado con la meta actual, placeholder "Ej: 10000"); Cancelar / "Actualizar" (spinner en `isUpdatingGoal`).
