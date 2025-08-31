Listo. Acá tenés el archivo **.md** para copiar y pegar:

````markdown
---
applyTo: '**'
---

# Uruguahorra - AI Coding Agent Instructions

## 🏗️ Architecture Overview

**Tech Stack**: React Native 0.79.5 + Expo 53 + TypeScript + Supabase (PostgreSQL)  
**Targets**: iOS / Android (nativo) + PWA web con soporte offline  
**Pattern**: Feature-based + Service layer + Zustand (una store por dominio)

---

## 📋 Development Standards (Obligatorios)

- **Respeta ESLint y Prettier del repo.** Genera código que pase `eslint --fix` y `prettier --check` sin cambios.
- No uses `eslint-disable*` salvo motivo **técnico y documentado**.
- **TypeScript estricto**: evita `any` y corrige tipos en lugar de silenciarlos.
- **Import hygiene**: orden de imports y eliminación de no usados (plugins `import/order`, `unused-imports`).

**TS flags esperados** (implícitos en el proyecto):  
`"strict": true`, `"noImplicitAny": true`, `"noUncheckedIndexedAccess": true`, `"exactOptionalPropertyTypes": true`.

---

## 🔍 Proceso de Trabajo (Calmo y de Raíz)

1. **Entender antes de escribir**: resume problema, arquitectura afectada, reglas de lint/format y tipado.
2. **Causa raíz > parche**: explica por qué ocurre; propone el **cambio mínimo y seguro**.
3. **Pasos pequeños**: aplica cambios acotados, legibles y reversibles; explica supuestos.
4. **Verificación**: agrega/actualiza tests si cambia comportamiento; explica cómo reproducir y cómo el test lo cubre.
5. **Calidad previa al commit**:
   - `npm run lint` / `npx eslint . --ext .js,.jsx,.ts,.tsx --fix`
   - `npx prettier . --check`
   - `npm test` (unidad) y, si procede, e2e (Detox).

---

## 🔑 Database-First (Supabase)

**`supabase/complete_database_schema.sql` es la _fuente de verdad_**. Correrla antes de desarrollar.

Incluye:

- Tablas, RLS y funciones PostgreSQL.
- **Quest system** con `create_user_quest_progress_safe()` (safe-concurrency).
- Triggers de auth y sincronización de perfiles.

**Comandos base**

```bash
supabase start
# Ejecutar complete_database_schema.sql en el SQL Editor de Supabase (dev)
```
````

**Políticas**

- Nunca “simules” permisos en cliente: confía en RLS.
- No exponer Service Keys en cliente. Usa `SecureStore` (móvil) y almacenamiento cifrado en web.
- Preferir **RPCs tipadas** para operaciones críticas (concurrency/consistencia).

---

## 🚀 Workflow & Scripts

```bash
npm start           # Expo dev
npm run web         # PWA dev
npm run build:pwa   # PWA prod
npm run lint:fix    # Autofix lint
npm run test        # Unit tests (Jest + RNTL)
npm run test:e2e    # Optional: Detox
```

**Crítico**: usa los tipos generados en `src/lib/supabase.ts`.

---

## 🎯 Service Layer

Toda la lógica de negocio va en **services** (no componentes).

```ts
// services/example.service.ts
export class ExampleService {
  static async methodName(param: string): Promise<ReturnType> {
    try {
      logger.start(LogModule.DB, 'Operation description', { param });
      const { data, error } = await supabase.from('table').select();
      if (error) throw error;

      logger.success(LogModule.DB, 'Operation completed');
      return data;
    } catch (error) {
      logger.error(LogModule.DB, 'Operation failed', error);
      throw error; // Propagar siempre: no ocultar errores
    }
  }
}
```

**Gamification** (`src/features/gamification/services/`)

```ts
const questSystemReady = await QuestInitializationService.initialize();
if (!questSystemReady) return []; // No continuar sin inicialización
```

---

## 📊 Zustand (Server & UI State)

- Una store por dominio (goals, user, etc.). No mezclar dominios.
- No mutar estado directamente; usar setters y mantener acciones puras.
- Evitar lógica de negocio en la store: llamar a **services** desde acciones.

```ts
export const useFeatureStore = create<FeatureStore>((set, get) => ({
  data: [],
  isLoading: false,
  lastFetchUserId: undefined,

  fetchData: async (userId: string, force = false) => {
    if (!force && get().lastFetchUserId === userId) return;
    set({ isLoading: true });
    try {
      const data = await FeatureService.getData(userId);
      set({ data, lastFetchUserId: userId });
    } finally {
      set({ isLoading: false });
    }
  },
}));
```

---

## 🔒 Auth & RLS

- **Auth Context**: `src/contexts/SimpleAuthContext.tsx`.
- **Seguridad**: validación por RLS, no en cliente.
- Funciones clave:
  - `create_user_quest_progress_safe()` – concurrencia segura
  - `get_or_create_user_profile()` – perfiles consistentes

---

## 📱 Componentes & Routing (Expo Router)

Estructura en `src/app/`:

- `(auth)/*` flujos de autenticación
- `(tabs)/*` navegación principal
- `_layout.tsx` layout raíz + guards

Patrón componente:

```tsx
export const Component = () => {
  const { user } = useAuth();
  if (!user) return <LoadingScreen />;
  return <View>{/* UI */}</View>;
};
```

---

## 🔧 Logging & Debugging

Usar siempre `logger`:

```ts
import { logger, LogModule } from '@/utils/logger';
logger.start(LogModule.API, 'Starting operation', { userId });
logger.success(LogModule.DB, 'Operation completed');
logger.error(LogModule.AUTH, 'Auth failed', error);
```

En dev, `_layout.tsx` intercepta requests para visibilidad.

---

## 🌐 PWA & Cross-Platform

- Build: `npm run build:pwa` (Workbox).
- Storage: `SecureStore` (móvil) / **localStorage cifrado** (web).
- `Platform.OS` para ramas específicas. Evita bifurcaciones fuera de utilidades.

**Rendimiento**

- Listas grandes: usar **FlashList** o virtualización adecuada.
- Memoiza handlers y selects de Zustand para evitar renders.
- Logs mínimos en producción.

---

## 🧪 Testing

- **Unidad/UI**: Jest + React Native Testing Library.
- **E2E (opcional)**: Detox.
- **Servicios**: tests con _fakes_ de Supabase o MSW para requests web/PWA.
- Añade pruebas cuando cambie comportamiento observable.

---

## 🧹 Estilo y Prácticas

- Consistencia con patrones existentes (nombres, estructura, utilidades).
- **Legibilidad > ingenio**: funciones cortas y comentarios donde el contexto no sea obvio.
- Manejo explícito de errores (sin “silent catch”).
- Evitar dependencias nuevas salvo necesidad real y documentada.

---

## ⚠️ Cuando choque con ESLint/Prettier

- Ajusta la solución para cumplir reglas.
- Solo como último recurso, propone modificar **la regla específica** con razones y ejemplos.

---

## ✅ Checklist por Cambio

- [ ] Problema entendido y **resumido**.
- [ ] Causa raíz identificada.
- [ ] Solución mínima y segura.
- [ ] Tests añadidos/actualizados y pasan.
- [ ] ESLint y Prettier pasan sin desactivar reglas.
- [ ] Commit con explicación breve (Conventional Commits recomendado).

---

## 🚫 Anti-Patterns

- Checks de auth del lado cliente (confiar en **RLS**).
- INSERT directos para `user_quest_progress` (usar funciones seguras).
- Capturar errores y devolver defaults silenciosos.
- Lógica de negocio en componentes.
- Código específico de plataforma fuera de utilidades.

---

## 📁 Referencias Clave

- `src/lib/supabase.ts` – cliente DB y tipos generados
- `src/utils/logger.ts` – logging centralizado
- `supabase/complete_database_schema.sql` – fuente de verdad de BD
- `src/app/_layout.tsx` – layout raíz + auth/debug
- `src/features/gamification/` – quests/XP + inicialización

```

> No incluye ningún `git add` ni `git commit`. ¿Querés que lo guarde como `.github/copilot-instructions.md` o preferís otra ruta?
::contentReference[oaicite:0]{index=0}
```
