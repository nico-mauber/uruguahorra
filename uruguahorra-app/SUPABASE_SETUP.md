# 🚀 Configuración de Supabase - Uruguahorra

## ✅ Pasos Completados

### 1. Variables de Entorno Configuradas
Las credenciales de tu proyecto Supabase ya están configuradas en `.env`:
- **URL**: `https://ebkzqfmppdntmynfjehh.supabase.co`
- **Anon Key**: Configurada correctamente

### 2. Cliente de Supabase Integrado
- Cliente configurado en `src/lib/supabase.ts`
- Autenticación con persistencia segura usando `expo-secure-store`
- Tipos TypeScript generados para todas las tablas

### 3. Servicios Creados
- **AuthService** (`src/services/auth.service.ts`): Manejo completo de autenticación
- **GoalsService** (`src/services/goals.service.ts`): CRUD de metas y contribuciones

### 4. Store de Zustand Actualizado
- `useAuthStore` ahora usa Supabase para autenticación real
- Manejo de sesiones persistentes
- Verificación de estado premium

## 📋 Siguiente Paso: Ejecutar la Migración en Supabase

### Opción A: Usando el Dashboard de Supabase (Más Simple) ⭐

1. **Accede a tu proyecto en Supabase**:
   - Ve a [https://app.supabase.com](https://app.supabase.com)
   - Selecciona tu proyecto: `ebkzqfmppdntmynfjehh`

2. **Ve al SQL Editor**:
   - En el menú lateral, haz clic en **SQL Editor**
   - Clic en **New Query**

3. **Ejecuta la migración**:
   - Copia TODO el contenido del archivo `supabase/migrations/001_initial_schema.sql`
   - Pégalo en el editor SQL
   - Haz clic en **Run** (botón verde)

4. **Verifica que todo esté correcto**:
   - Deberías ver un mensaje de éxito
   - Ve a **Table Editor** en el menú lateral
   - Verifica que se crearon las 13 tablas
   - Verifica que hay 10 challenges y 10 learnings

### Opción B: Usando Supabase CLI

```bash
# 1. Instalar Supabase CLI (si no lo tienes)
npm install -g supabase

# 2. Inicializar Supabase en el proyecto
cd uruguahorra-app
supabase init

# 3. Vincular con tu proyecto
supabase link --project-ref ebkzqfmppdntmynfjehh

# 4. Ejecutar la migración
supabase db push
```

## 🔍 Verificación Post-Migración

### 1. Verificar Tablas
En el SQL Editor, ejecuta:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

Deberías ver 13 tablas:
- audit_logs
- challenges
- goals
- learnings
- micro_contributions
- paywall_events
- squad_members
- squads
- subscriptions
- transactions_raw
- user_challenges
- user_progress
- users

### 2. Verificar RLS
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

Todas las tablas deberían tener `rowsecurity = true`

### 3. Verificar Datos Semilla
```sql
-- Verificar challenges
SELECT COUNT(*) as total_challenges FROM challenges;
-- Debe retornar: 10

-- Verificar learnings
SELECT COUNT(*) as total_learnings FROM learnings;
-- Debe retornar: 10
```

## 🔐 Configurar Autenticación en Supabase

1. **Ve a Authentication → Settings** en el dashboard
2. **Configura los proveedores**:
   - Email/Password: Ya habilitado por defecto
   - Configura el sitio URL: `exp://localhost:19000` (para desarrollo)
   
3. **Configura las políticas de contraseña**:
   - Mínimo 6 caracteres (recomendado)
   - Requiere confirmación por email (opcional para desarrollo)

## 📱 Instalar Dependencias en la App

Debido a los problemas de permisos que tuviste, ejecuta esto en **PowerShell como Administrador** en Windows:

```powershell
# En PowerShell como Admin
cd C:\Users\nmauber\Downloads\Uruguahorra\uruguahorra-app
npm install
```

O si prefieres, puedes eliminar `node_modules` y reinstalar:
```powershell
# Eliminar node_modules y package-lock
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json

# Reinstalar
npm install
```

## 🎯 Próximos Pasos

Una vez que hayas ejecutado la migración y instalado las dependencias:

1. **Inicia la app**:
   ```bash
   npm start
   ```

2. **Prueba la autenticación**:
   - La pantalla de onboarding ahora puede crear usuarios reales
   - Los datos se guardarán en tu base de datos Supabase

3. **Funcionalidades disponibles**:
   - ✅ Registro y login de usuarios
   - ✅ Creación de metas de ahorro
   - ✅ Sistema de desafíos gamificados
   - ✅ Rankings y squads
   - ✅ Educación financiera

## 🆘 Troubleshooting

### Error: "permission denied for schema public"
Ejecuta en el SQL Editor:
```sql
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO anon;
GRANT ALL ON SCHEMA public TO authenticated;
GRANT ALL ON SCHEMA public TO service_role;
```

### Error: La app no se conecta a Supabase
1. Verifica que las variables en `.env` sean correctas
2. Reinicia el servidor de Expo: `npm start --clear`
3. Verifica que tu proyecto Supabase esté activo

### Error al instalar dependencias
Ejecuta PowerShell como Administrador y navega al proyecto:
```powershell
cd C:\Users\nmauber\Downloads\Uruguahorra\uruguahorra-app
npm install --force
```

## 📚 Recursos

- [Documentación de Supabase](https://supabase.com/docs)
- [Supabase + React Native Guide](https://supabase.com/docs/guides/getting-started/quickstarts/reactnative)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)

---

**¡Tu app está lista para usar Supabase!** 🎉

Solo necesitas:
1. Ejecutar la migración SQL en el dashboard
2. Instalar las dependencias con npm
3. Iniciar la app con `npm start`