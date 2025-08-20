# Migración a AuthProvider

## ¿Por qué migrar de useAuthStore a AuthProvider?

### Problemas del sistema anterior:
1. **Múltiples llamadas innecesarias** - `checkSession` se ejecutaba 3+ veces al recargar la página
2. **Ineficiencia** - Cada componente que usaba `useAuthStore` podía triggear llamadas a la DB
3. **Inseguro** - La lógica de autenticación estaba distribuida por toda la app
4. **Difficult to debug** - Era difícil rastrear cuándo y por qué se hacían las llamadas

### Beneficios del nuevo sistema:
1. **Una sola inicialización** - AuthProvider se inicializa una vez al cargar la app
2. **Centralizado y seguro** - Toda la lógica está en un solo lugar
3. **Mejor rendimiento** - Evita llamadas repetitivas e innecesarias
4. **Más fácil de debuggear** - Logs centralizados y control de estado claro
5. **React patterns** - Usa Context API siguiendo las mejores prácticas de React

## Cómo migrar

### 1. Componentes que usan useAuthStore

**Antes:**
```tsx
import { useAuthStore } from '@store/useAuthStore';

function MyComponent() {
  const { user, isAuthenticated, login } = useAuthStore();
  // ...
}
```

**Después:**
```tsx
import { useAuth } from '@/contexts';

function MyComponent() {
  const { user, isAuthenticated, login } = useAuth();
  // ...
}
```

### 2. Migración gradual con hook de compatibilidad

Si no quieres cambiar todos los componentes de una vez, puedes usar el hook de compatibilidad:

```tsx
// Los componentes existentes seguirán funcionando
import { useAuthStore } from '@/contexts'; // <- ahora apunta al hook de compatibilidad

function MyComponent() {
  const { user, isAuthenticated, login } = useAuthStore(); // <- funciona igual
  // ...
}
```

**Nota:** El hook de compatibilidad mostrará warnings para `checkSession` ya que ahora es automático.

### 3. Cambios en _layout.tsx

El `_layout.tsx` ya fue actualizado para:
- Usar `AuthProvider` como wrapper principal
- Usar `useAuth` en lugar de `useAuthStore`
- Remover la lógica manual de `checkSession`

### 4. Métodos deprecados

- `checkSession()` - Ya no es necesario, el AuthProvider maneja esto automáticamente
- Si necesitas forzar una recarga de datos de usuario, usa `refreshUser()`

## API del AuthProvider

### Estados disponibles:
- `user: User | null` - Datos completos del usuario
- `supabaseUser: SupabaseUser | null` - Usuario de Supabase auth
- `isAuthenticated: boolean` - Estado de autenticación
- `isLoading: boolean` - Cargando datos
- `isPremium: boolean` - Usuario premium
- `rateLimitError: string | null` - Errores de rate limiting

### Métodos disponibles:
- `login(email, password)` - Iniciar sesión
- `signup(email, password, metadata?)` - Registrar usuario
- `logout()` - Cerrar sesión
- `updateUserXP(xp)` - Actualizar XP del usuario
- `updateStreak(streak)` - Actualizar racha
- `updateProfile(updates)` - Actualizar perfil
- `refreshUser()` - Refrescar datos del usuario
- `clearRateLimitError()` - Limpiar errores de rate limit

## Logging y Debug

El AuthProvider incluye logs detallados:

```
[AUTH] Inicializando AuthProvider
[AUTH] Usuario autenticado
[AUTH] Datos del usuario cargados exitosamente
[AUTH] Auth state changed: SIGNED_IN
```

Para debuggear problemas, busca logs con `LogModule.AUTH` en la consola.

## Optimizaciones implementadas

1. **Debouncing automático** - Evita llamadas repetitivas
2. **Carga inteligente** - Solo carga datos cuando es necesario
3. **Cache de usuario** - No recarga si el usuario no cambió
4. **Manejo de errores** - Rate limiting y otros errores manejados centralmente
5. **Inicialización única** - Se ejecuta una sola vez al cargar la app

## Ejemplo completo de migración

**Componente típico ANTES:**
```tsx
import { useAuthStore } from '@store/useAuthStore';

export function ProfileScreen() {
  const { 
    user, 
    isAuthenticated, 
    isLoading, 
    logout,
    checkSession 
  } = useAuthStore();

  useEffect(() => {
    checkSession(); // <- Innecesario y problemático
  }, []);

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return <UserProfile user={user} onLogout={logout} />;
}
```

**Componente típico DESPUÉS:**
```tsx
import { useAuth } from '@/contexts';

export function ProfileScreen() {
  const { 
    user, 
    isAuthenticated, 
    isLoading, 
    logout 
  } = useAuth();

  // No necesitamos useEffect ni checkSession
  // El AuthProvider maneja todo automáticamente

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return <UserProfile user={user} onLogout={logout} />;
}
```

¡Mucho más simple y eficiente!
