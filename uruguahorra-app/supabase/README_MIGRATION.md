# Migración de Base de Datos - Uruguahorra

## 📋 Descripción General

Este esquema de base de datos incluye todas las tablas necesarias para la aplicación Uruguahorra:
- **13 tablas** con relaciones y constraints
- **RLS (Row Level Security)** habilitado en todas las tablas
- **Políticas de seguridad** para acceso basado en usuario
- **Índices optimizados** para consultas frecuentes
- **Datos semilla** (10 challenges y 10 learnings)

## 🏗️ Estructura de Tablas

### Tablas Principales
- `users` - Usuarios del sistema (vinculado con Supabase Auth)
- `goals` - Metas de ahorro
- `micro_contributions` - Aportes a las metas

### Gamificación
- `challenges` - Catálogo de desafíos
- `user_challenges` - Progreso en desafíos
- `squads` - Grupos de ahorro
- `squad_members` - Miembros de los grupos

### Datos y Análisis
- `transactions_raw` - Transacciones importadas
- `learnings` - Contenido educativo
- `user_progress` - Progreso educativo

### Monetización
- `subscriptions` - Suscripciones premium
- `paywall_events` - Eventos del paywall
- `audit_logs` - Registro de auditoría

## 🚀 Cómo Ejecutar la Migración

### Opción 1: Usando Supabase CLI (Recomendado)

```bash
# 1. Instalar Supabase CLI si no lo tienes
npm install -g supabase

# 2. Inicializar Supabase en el proyecto
supabase init

# 3. Vincular con tu proyecto de Supabase
supabase link --project-ref tu-project-ref

# 4. Ejecutar la migración
supabase db push

# O ejecutar en desarrollo local
supabase start
supabase db reset
```

### Opción 2: Directamente en Supabase Dashboard

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Navega a **SQL Editor**
3. Crea una nueva query
4. Copia y pega el contenido de `001_initial_schema.sql`
5. Ejecuta la query

### Opción 3: Usando psql

```bash
# Conectar a tu base de datos
psql -h db.tuproyecto.supabase.co -p 5432 -d postgres -U postgres

# Ejecutar el archivo SQL
\i supabase/migrations/001_initial_schema.sql
```

## 🔒 Seguridad (RLS)

Todas las tablas tienen RLS habilitado con políticas que aseguran que:
- Los usuarios solo pueden ver/modificar **sus propios datos**
- Las tablas públicas (`challenges`, `learnings`) son de **solo lectura**
- Los squads tienen políticas especiales para **colaboración**

### Políticas Implementadas

| Tabla | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| users | Propio | Propio | Propio | ❌ |
| goals | Propio | Propio | Propio | Propio |
| micro_contributions | Propio | Propio | Propio | ❌ |
| challenges | Todos | ❌ | ❌ | ❌ |
| user_challenges | Propio | Propio | Propio | ❌ |
| squads | Miembros | Owner | Owner | Owner |
| squad_members | Miembros | Propio | Propio | Propio |
| transactions_raw | Propio | Propio | Propio | Propio |
| learnings | Todos | ❌ | ❌ | ❌ |
| user_progress | Propio | Propio | Propio | ❌ |
| subscriptions | Propio | Propio | Propio | ❌ |
| paywall_events | Propio | Propio | ❌ | ❌ |
| audit_logs | Propio | Sistema | ❌ | ❌ |

## 🎯 Índices de Optimización

Se han creado índices para optimizar las siguientes consultas frecuentes:
- Búsquedas por `user_id`
- Ordenamiento por `created_at` y fechas
- Filtros por estado (`active`, `status`)
- Búsquedas compuestas (ej: `user_id + goal_id`)

## 🌱 Datos Semilla

La migración incluye:
- **10 Challenges** variados (daily, weekly, monthly, achievement)
- **10 Learnings** de educación financiera (diferentes niveles y categorías)

## 🔄 Actualizaciones Automáticas

Se incluyen triggers para actualizar automáticamente `updated_at` en:
- `users`
- `goals`
- `squads`
- `subscriptions`

## 📊 Vistas Útiles

Se crean 2 vistas para consultas comunes:
- `user_dashboard` - Resumen del dashboard del usuario
- `squad_rankings` - Ranking de squads por ahorro total

## ⚠️ Consideraciones Importantes

1. **Supabase Auth**: La tabla `users` usa `auth.uid()` como ID principal
2. **UUIDs**: Todas las tablas usan UUID v4 para IDs
3. **Montos**: Usar `NUMERIC(12,2)` para precisión monetaria
4. **Cascada**: Las foreign keys tienen `ON DELETE CASCADE`
5. **Timezone**: Todos los timestamps son `TIMESTAMPTZ`

## 🛠️ Troubleshooting

### Error: "permission denied for schema public"
```sql
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO anon;
GRANT ALL ON SCHEMA public TO authenticated;
GRANT ALL ON SCHEMA public TO service_role;
```

### Error: "role 'authenticated' does not exist"
Esto es normal en desarrollo local. Las políticas RLS funcionarán cuando se despliegue en Supabase.

### Error: "extension uuid-ossp does not exist"
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

## 📝 Próximos Pasos

Después de ejecutar la migración:

1. **Verificar tablas**: 
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public';
   ```

2. **Verificar RLS**:
   ```sql
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'public';
   ```

3. **Verificar políticas**:
   ```sql
   SELECT tablename, policyname 
   FROM pg_policies 
   WHERE schemaname = 'public';
   ```

4. **Configurar Auth**: Asegurarse de que Supabase Auth esté configurado

5. **Conectar la app**: Actualizar las variables de entorno con las credenciales de Supabase

## 📚 Documentación Adicional

- [Supabase Docs](https://supabase.com/docs)
- [RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Migrations Guide](https://supabase.com/docs/guides/cli/local-development#database-migrations)