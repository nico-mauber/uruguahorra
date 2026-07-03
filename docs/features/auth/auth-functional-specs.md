# Auth / Onboarding — Especificación Funcional

## Alcance
Registro e inicio de sesión con email+password (Supabase Auth), creación garantizada del perfil, y guard de navegación. NO hay OTP, NO hay verificación de email, NO hay social login, NO hay recuperación de contraseña en la versión actual (no agregar sin pedido explícito).

## Casos de uso

### CU-1: Registro
1. Usuario ingresa email, password y confirmación en `/onboarding` (modo "nuevo usuario", default).
2. Validaciones cliente (bloqueantes, con dialog de error):
   - email contiene `@` → si no: "Por favor ingresa un email válido".
   - password ≥ 6 chars → "La contraseña debe tener al menos 6 caracteres".
   - password === confirmación → "Las contraseñas no coinciden".
3. Throttle: mínimo 2s desde la última operación de auth (esperar silenciosamente la diferencia).
4. `supabase.auth.signUp({email, password, options:{data:{country:'UY', currency:'UYU'}}})`.
5. Si `user.identities.length === 0` → el email ya existía → ejecutar el flujo de Login con las mismas credenciales (transparente al usuario).
6. Esperar ~1s (el trigger de BD crea el perfil) → `select` del perfil → si no existe, INSERT directo con defaults → si falla, RPC `get_or_create_user_profile`.
7. Éxito → navegar a `/` con `replace` (sin dialog intermedio). Fallo → "No se pudo crear la cuenta. Es posible que el email ya esté registrado."

### CU-2: Login
1. Modo "ya tengo cuenta": mismos campos sin confirmación.
2. Validaciones 2a y 2b de CU-1.
3. `signInWithPassword`. Errores:
   - `Email not confirmed` → "Tu email aún no está confirmado. Por favor revisa tu correo o contacta soporte."
   - mensaje contiene `rate_limit` → "Por favor espera unos segundos antes de intentar nuevamente."
   - otro → "Email o contraseña incorrectos".
4. Obtener/crear perfil (mismo fallback de CU-1 paso 6).
5. Éxito → `/` con replace.

### CU-3: Sesión persistente
Al cargar la app: `getSession()`. Con sesión → cargar perfil → router deja pasar a rutas privadas. Sin sesión → redirect a `/onboarding`. Mientras resuelve: pantalla de carga (spinner) — NUNCA flash de onboarding para usuarios logueados.

### CU-4: Logout
Desde Perfil. `signOut()` → limpiar todos los stores, IndexedDB y caché API del SW → redirect `/onboarding`.

## Reglas de negocio
- Perfil default: `country 'UY'`, `currency 'UYU'`, `premium false`, `total_xp 0`, `current_level 1`, rachas 0.
- La creación de perfil tiene 3 mecanismos en cascada (trigger BD → INSERT cliente → RPC). Un fallo de perfil NO bloquea la sesión (log warn y continuar; el dashboard reintenta con `refreshProfile`).
- El ID canónico del usuario SIEMPRE es el de `auth.users` (nunca confiar en el id del perfil para operaciones).

## Robustez / offline
- Login y registro requieren red. Si `!isOnline`: deshabilitar botón principal y mostrar aviso "Necesitas conexión para iniciar sesión".
- Si la red cae a mitad del registro (post-signup, pre-perfil): al siguiente arranque CU-3 repara el perfil vía fallbacks.
- Doble-submit: botón deshabilitado + overlay de loading durante toda la operación.
