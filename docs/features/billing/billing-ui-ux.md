# Billing / Premium (Paywall) — Especificación UI/UX

## Pantalla `/paywall`
Columna scrolleable padding 20.
1. **Header centrado**: badge píldora "PREMIUM" (fondo warning 12%, texto warning 14/600) + "Desbloquea todo el potencial" (28/bold centrado) + "Lleva tu ahorro al siguiente nivel con funciones exclusivas" (16 secondary centrado).
2. Badge "Ya eres Premium" (fondo info 12%, texto info 12/600, centrado) si aplica.
3. **Cards de plan** (seleccionable, borde 2px transparente → primary si seleccionada):
   - **Plan Anual** (primero, seleccionado por defecto): "Plan Anual" (18/600) + precio grande "$799" con sufijo "/año" (24/bold primary + 14 secondary) + "Equivale a ~$67/mes" (14 secondary) + badge derecha "Ahorra 33%" (fondo success 12%, texto success 12/600).
   - **Plan Mensual**: "Plan Mensual" + "$15/mes" + "Cancela cuando quieras".
4. **Sección "Todo lo que incluye Premium"**: 5 filas — círculo 40px fondo primary 6% con Ionicon 20 primary + título (16/600) + descripción (14 secondary): Metas ilimitadas/"Crea todas las metas que necesites"; Reportes avanzados/"Análisis detallado de tus gastos"; Pods de ahorro/"Ahorra en grupo con amigos"; Contenido educativo completo/"Acceso a todos los cursos"; Retos exclusivos/"Desafíos especiales con más XP".
5. **Botón principal** (primary large): "Suscribirse por $799/año" o "Suscribirse por $15/mes" según selección; loading spinner; disabled si ya premium.
6. **Footer** (12 secondary centrado): "Puedes cancelar en cualquier momento desde tu perfil.\nLos pagos se procesan de forma segura a través de MercadoPago.\nIncluye 7 días de prueba gratis."
7. Tras iniciar checkout: bloque de estado "🕐 Esperando confirmación de pago…" + botón "Verificar estado" + link "¿Problemas? Reintentar".

## Pantallas de retorno
Layout común: columna centrada vertical, emoji 64px, título 24/bold primary, descripción 16 centrada LH24, botón principal min-width 200.
- **Success**: 🎉 "¡Suscripción Exitosa!" — "Tu suscripción a Uruguahorra Premium ha sido activada correctamente. Ahora tienes acceso a todas las funciones premium." → botón "Continuar" → `/`.
- **Failure**: 😕 "Pago no completado" — "No pudimos procesar tu pago. No se realizó ningún cobro." → botones "Reintentar" (→ /paywall) y "Volver al inicio" (outline).
- **Pending**: ⏳ "Pago en proceso" — "Tu pago está siendo verificado por MercadoPago. Te avisaremos cuando se acredite." → "Volver al inicio".
