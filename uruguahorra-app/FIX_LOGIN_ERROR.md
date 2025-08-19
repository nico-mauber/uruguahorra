# 🔧 Solución para Error de Login

## Problema Identificado

Al intentar hacer login, el usuario puede recibir errores relacionados con:
1. Error 403 Forbidden por políticas RLS
2. Errores de validación Zod en el cliente
3. Usuarios sin perfiles en la base de datos

## Solución Implementada

### Paso 1: Ejecutar Script de Base de Datos

Ve a **Supabase Dashboard → SQL Editor** y ejecuta:

```sql
-- Copiar y ejecutar el contenido completo de:
-- supabase/database_setup.sql
```

**Este script:**
- ✅ Crea todas las tablas necesarias
- ✅ Configura políticas RLS seguras
- ✅ Sincroniza usuarios existentes
- ✅ Configura triggers para usuarios futuros

### Paso 2: Verificar la Corrección

Después de ejecutar los scripts, verifica:

1. **Todos los usuarios tienen perfil:**
```sql
SELECT COUNT(*) as usuarios_sin_perfil
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;
-- Debe retornar 0
```

2. **Las políticas RLS están correctas:**
```sql
SELECT policyname, cmd 
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'users';
-- Debe mostrar solo políticas para SELECT y UPDATE
```

### Paso 3: Actualizar el Código (Ya Hecho)

El código ya fue actualizado para:
- NO intentar INSERT directo en la tabla users durante login
- Usar reintentos si el perfil no se encuentra inmediatamente
- Mostrar mensajes de error claros si el perfil no existe

## Cambios Realizados en el Código

### `src/store/useAuthStore.ts`

**Antes (Problemático):**
```typescript
if (!profile) {
  // Intentaba hacer INSERT directo - VIOLA RLS
  const { data: newProfile } = await supabase
    .from('users')
    .insert({...})
}
```

**Después (Correcto):**
```typescript
if (!profile) {
  // Solo reintentar obtener el perfil
  profile = await AuthService.getUserProfile(authUser.id);
  if (!profile) {
    throw new Error('No se pudo encontrar el perfil del usuario');
  }
}
```

## Prevención Futura

### Para Nuevos Usuarios
El trigger en la base de datos creará automáticamente el perfil cuando se registre un nuevo usuario.

### Para Usuarios Existentes
El script SQL ya creó los perfiles faltantes.

### Monitoreo
Puedes monitorear si hay usuarios sin perfil con:
```sql
-- Crear una vista para monitoreo
CREATE OR REPLACE VIEW public.users_without_profile AS
SELECT 
    au.id,
    au.email,
    au.created_at
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;

-- Consultar la vista
SELECT * FROM public.users_without_profile;
```

## Seguridad

Las políticas RLS ahora están configuradas correctamente:
- ✅ Los usuarios pueden VER su propio perfil
- ✅ Los usuarios pueden ACTUALIZAR su propio perfil
- ❌ Los usuarios NO pueden CREAR perfiles (solo el trigger/backend)
- ❌ Los usuarios NO pueden ELIMINAR perfiles

Esto previene:
- Creación de perfiles duplicados
- Manipulación de IDs de usuario
- Ataques de inyección de datos

## Testing

Después de aplicar los cambios:

1. **Test de Login:**
   - Intenta hacer login con un usuario existente
   - Debe funcionar sin errores

2. **Test de Registro:**
   - Crea un nuevo usuario
   - El perfil debe crearse automáticamente

3. **Test de Actualización:**
   - Intenta actualizar el perfil del usuario logueado
   - Debe funcionar correctamente

## Contacto para Soporte

Si el problema persiste después de seguir estos pasos:
1. Verifica los logs en Supabase Dashboard > Logs > API
2. Revisa que el usuario tenga un registro en auth.users
3. Contacta al equipo de desarrollo con el ID del usuario afectado

---

*Documento creado el 19 de Agosto, 2025*