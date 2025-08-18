# Instrucciones para solucionar los problemas de registro y creación de metas

## Cambios realizados

### 1. **Arreglados los botones de selección (Crear cuenta/Ya tengo cuenta)**
   - Cambiado de `View` con `onTouchEnd` a `TouchableOpacity` con `onPress`
   - Esto permite que funcionen correctamente en web y móvil

### 2. **Mejorado el manejo de errores y debugging**
   - Añadidos logs de consola para debugging en:
     - `onboarding.tsx`: Para rastrear el flujo de registro y creación de metas
     - `auth.service.ts`: Para verificar la creación del usuario y perfil
     - `useAuthStore.ts`: Para monitorear el estado de autenticación
     - `goals.service.ts`: Para verificar la inserción de metas

### 3. **Corregido el servicio de autenticación**
   - El servicio ahora verifica si existe el perfil del usuario después del registro
   - Si no existe, lo crea manualmente
   - Maneja mejor los errores de duplicación

## Pasos para completar la configuración

### 1. Ejecutar el script de verificación en Supabase

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Ve a la sección **SQL Editor**
3. Copia y pega el contenido del archivo `supabase/verify-setup.sql`
4. Ejecuta el script
5. Verifica que no haya errores

### 2. Verificar las variables de entorno

Asegúrate de que tu archivo `.env` tenga las siguientes variables correctamente configuradas:

```env
EXPO_PUBLIC_SUPABASE_URL=tu_url_de_supabase
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_de_supabase
```

### 3. Probar la funcionalidad

1. **Reinicia el servidor de desarrollo:**
   ```bash
   # Detén el servidor actual (Ctrl+C)
   npm start -- --web
   ```

2. **Abre la consola del navegador** (F12) para ver los logs de debugging

3. **Prueba el registro:**
   - Haz clic en "Crear cuenta"
   - Ingresa un email y contraseña (mínimo 6 caracteres)
   - Haz clic en el botón "Crear cuenta"
   - Observa los logs en la consola

4. **Prueba la creación de metas:**
   - Después del registro exitoso, selecciona un tipo de meta
   - Personaliza los detalles
   - Haz clic en "Crear meta y comenzar"
   - Observa los logs en la consola

## Debugging

### Si el registro falla:

1. Verifica en la consola del navegador los mensajes de error
2. Revisa en Supabase Dashboard > Authentication > Users si el usuario se creó
3. Revisa en Supabase Dashboard > Table Editor > users si el perfil se creó

### Si la creación de metas falla:

1. Verifica que el usuario esté autenticado (debe aparecer en los logs)
2. Revisa los permisos RLS en la tabla `goals`
3. Verifica que todos los campos requeridos se estén enviando

### Mensajes de log esperados:

Durante el registro exitoso deberías ver:
```
handleAuth llamado - isNewUser: true email: [email]
Intentando registrar nuevo usuario...
AuthService.signUp - Iniciando registro para: [email]
Usuario creado en Auth con ID: [uuid]
Perfil creado exitosamente: [profile data]
Usuario registrado exitosamente
```

Durante la creación de meta exitosa:
```
handleCreateGoal llamado - goalName: [nombre] goalAmount: [monto]
Obteniendo usuario actual...
Usuario encontrado: [uuid]
Creando meta con datos: [goal data]
GoalsService.createGoal - Datos a insertar: [goal data]
Meta creada exitosamente en Supabase: [created goal]
Meta creada exitosamente: [created goal]
```

## Posibles problemas y soluciones

### Error: "User already registered"
- El email ya está registrado. Usa "Ya tengo cuenta" para iniciar sesión

### Error: "Invalid login credentials"
- Email o contraseña incorrectos al iniciar sesión

### Error: "No se encontró el usuario"
- El usuario no está autenticado. Intenta cerrar sesión y volver a iniciar

### Error de políticas RLS
- Ejecuta el script `verify-setup.sql` en Supabase
- Verifica que RLS esté habilitado en las tablas

## Contacto

Si los problemas persisten después de seguir estas instrucciones:

1. Revisa los logs de la consola del navegador
2. Verifica los logs en Supabase Dashboard > Logs > API Logs
3. Comparte los mensajes de error específicos para obtener ayuda adicional