# Auth / Onboarding — Especificación UI/UX

Ruta: `/onboarding`. Pantalla única con dos modos (registro/login) conmutables. Mobile-first, columna centrada máx 480px, scroll vertical, padding 20px.

## Estructura (de arriba a abajo)
1. **Header** (centrado, margen vertical 30px):
   - Emoji logo `💰` a 48px.
   - Título "UruguAhorra" — 28px bold, `--color-text-primary`.
   - Subtítulo `body-lg` `--color-text-secondary`: modo registro → "Crea tu cuenta y empieza a ahorrar"; modo login → "Inicia sesión para continuar".
2. **Formulario**:
   - Campo **Email**: label "Email" (`label-md`, secondary, margin-bottom 8), input estándar del design system, placeholder "tu@email.com", `type="email"`, `autocapitalize=off`, `autocomplete="email"`.
   - Campo **Contraseña**: label "Contraseña", `type="password"`, placeholder "Mínimo 6 caracteres", `autocomplete` según modo (`new-password`/`current-password`).
   - Campo **Confirmar Contraseña** (SOLO modo registro): label "Confirmar Contraseña", placeholder "Repite tu contraseña".
   - Separación entre campos 16px.
3. **Botón principal** (margin-top 20): Button primary large full-width con ícono flecha →. Texto: "Crear Cuenta" / "Iniciar Sesión" / "Procesando…" (loading).
4. **Switch de modo** (centrado, margen vertical 20): texto `body-md` secondary "¿Ya tienes cuenta? **Inicia sesión**" / "¿No tienes cuenta? **Regístrate**" — la parte en negrita es link primary subrayado que alterna el modo (limpia el campo confirmación).
5. **Footer** (abajo, centrado): `body-sm` secondary "Al continuar, aceptas nuestros términos y condiciones".

## Estados
- **Loading**: overlay absoluto `rgba(0,0,0,0.5)` con spinner grande primary; inputs `disabled`; botón muestra "Procesando…".
- **Errores de validación**: dialog modal (título "Error", mensaje, botón "OK") — mantener paridad con la app actual; NO inline por ahora.
- **Offline**: banner superior "Sin conexión" + botón principal deshabilitado.
- **Teclado móvil**: el contenedor debe hacer scroll para mantener visible el input enfocado (comportamiento `KeyboardAvoidingView` → en web basta `scroll-margin` + viewport meta `interactive-widget=resizes-content`).

## Interacciones
- Enter en el último campo dispara submit.
- Autofocus en Email al montar.
- Cambiar de modo NO borra email/password ya tipeados.
