# 🏦 Uruguahorra App

**App móvil de ahorro gamificada para ayudar a personas en LATAM a desarrollar hábitos de ahorro mediante gamificación, metas y retos divertidos.**

[![React Native](https://img.shields.io/badge/React%20Native-0.79.5-blue.svg)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-~53.0.0-lightgrey.svg)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-~5.8.3-blue.svg)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-2.39.0-green.svg)](https://supabase.com/)

## 🚀 Inicio Rápido

### Prerrequisitos

- Node.js 18+
- npm o yarn
- Expo CLI
- Cuenta en Supabase

### Instalación

```bash
# Clonar repositorio
git clone https://github.com/nico-mauber/uruguahorra.git
cd uruguahorra-app

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales de Supabase

# Iniciar servidor de desarrollo
npm start
```

### Configuración de Base de Datos

```bash
# 1. Crear proyecto en Supabase
# 2. Ejecutar el esquema completo en SQL Editor:
```

Copia el contenido de `supabase/complete_database_schema.sql` y ejecútalo en el SQL Editor de Supabase.

## 📱 Características Principales

### 🎯 **Sistema de Metas**

- Define objetivos de ahorro personalizados
- Seguimiento de progreso en tiempo real
- Categorización inteligente de gastos
- Visualización de avance con gráficos

### 🎮 **Gamificación Completa**

- **Sistema XP**: Gana experiencia por cada acción
  - Contribución: +2 XP por cada $1 (máx 10 XP por evento)
  - Completar reto: +30 XP
  - Racha diaria: +5 XP
- **Niveles**: Sistema dinámico basado en XP total
- **Rachas**: Mantén tu consistencia diaria
  - Protecciones de racha mensuales
  - Estadísticas de racha más larga
  - Recompensas por constancia

### 🏆 **Desafíos y Retos**

- Retos semanales personalizados
- Catálogo diverso de challenges
- Recompensas XP por completar
- Progreso gamificado

### 👥 **Sistema Social**

- Squads de ahorro
- Compartir logros

### 💳 **Gestión Financiera**

- Importación de CSV bancarios
- Análisis automático de gastos
- Categorización inteligente
- Reportes mensuales

### 📱 **Experiencia Multiplataforma**

- **iOS**: App nativa con Expo
- **Android**: App nativa con Expo
- **Web**: PWA completa con funcionalidades offline
- Sincronización cross-platform

## 🛠️ Stack Tecnológico

### Frontend

- **React Native 0.79.5** - Framework principal
- **Expo ~53.0.0** - Herramientas de desarrollo
- **TypeScript 5.8.3** - Tipado estático
- **Expo Router** - Navegación file-based
- **Zustand** - State management
- **React Native Reanimated** - Animaciones

### Backend & Database

- **Supabase** - Backend as a Service
- **PostgreSQL** - Base de datos principal
- **Row Level Security (RLS)** - Seguridad de datos
- **Real-time subscriptions** - Actualizaciones en tiempo real

### Herramientas de Desarrollo

- **ESLint + Prettier** - Linting y formateo
- **Husky** - Git hooks
- **Jest** - Testing framework
- **TypeScript** - Tipado estático
- **Metro** - Bundler React Native

### PWA & Web

- **Workbox** - Service Worker
- **Web App Manifest** - Instalación PWA
- **Cross-platform compatibility** - iOS/Android/Web

## 📂 Estructura del Proyecto

```
uruguahorra-app/
├── src/
│   ├── app/                    # Rutas con Expo Router
│   │   ├── (auth)/            # Rutas de autenticación
│   │   ├── (tabs)/            # Navegación principal
│   │   ├── _layout.tsx        # Layout root
│   │   └── paywall.tsx        # Pantalla premium
│   ├── components/            # Componentes reutilizables
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── ProgressBar.tsx
│   │   └── index.ts
│   ├── features/              # Funcionalidades por módulo
│   │   └── gamification/      # Sistema de gamificación
│   │       ├── components/    # UI de gamificación
│   │       ├── services/      # Lógica de negocio
│   │       ├── types/         # Tipos TypeScript
│   │       └── utils/         # Utilidades
│   ├── hooks/                 # Custom hooks
│   ├── lib/                   # Configuraciones
│   ├── services/              # Servicios de API
│   ├── store/                 # Estado global
│   ├── theme/                 # Tema y estilos
│   ├── types/                 # Tipos compartidos
│   └── utils/                 # Utilidades generales
├── supabase/                  # Esquemas de BD
├── web/                       # Archivos PWA
└── assets/                    # Recursos estáticos
```

## 🎨 Componentes Principales

### Gamificación

- **`LevelBadge`** - Insignia de nivel del usuario
- **`StreakDisplay`** - Visualización de racha actual
- **`XPProgressBar`** - Barra de progreso XP

### UI Base

- **`Button`** - Botón reutilizable con variantes
- **`Card`** - Container con sombras y bordes
- **`ProgressBar`** - Barra de progreso genérica

### Modales

- **`GoalDetailModal`** - Detalles de meta de ahorro
- **`GoalSelectionModal`** - Selector de metas

## 📋 Scripts Disponibles

```bash
# Desarrollo
npm start           # Iniciar Expo dev server
npm run ios         # Abrir en iOS simulator
npm run android     # Abrir en Android emulator
npm run web         # Abrir en navegador web

# Código
npm run lint        # Ejecutar ESLint
npm run lint:fix    # Fix automático de ESLint
npm run format      # Formatear con Prettier
npm test            # Ejecutar tests con Jest

# Build
npm run build:ios      # Build para iOS (EAS)
npm run build:android  # Build para Android (EAS)
npm run build:web      # Build estático web
npm run build:pwa      # Build PWA completa
```

## 🔧 Configuración

### Variables de Entorno

```bash
# .env
EXPO_PUBLIC_SUPABASE_URL=tu_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key
EXPO_PUBLIC_ENVIRONMENT=development
```

### Configuración Supabase

1. Crear proyecto en [Supabase](https://supabase.com)
2. Obtener URL y API Key del proyecto
3. Ejecutar `supabase/complete_database_schema.sql` en SQL Editor
4. Configurar políticas RLS según necesidades

### Configuración Expo

```json
// app.json
{
  "expo": {
    "name": "Uruguahorra",
    "slug": "uruguahorra-app",
    "scheme": "uruguahorra"
  }
}
```

## 🏗️ Build para Producción

### App Stores (EAS Build)

```bash
# Configurar EAS
npm install -g @expo/cli eas-cli
eas login
eas build:configure

# Build iOS
npm run build:ios

# Build Android
npm run build:android
```

### PWA Deployment

```bash
# Build optimizado
npm run build:pwa

# Archivos en web-build/ listos para deploy
# Compatible con Netlify, Vercel, GitHub Pages
```

## 🧪 Testing

```bash
# Ejecutar suite completa
npm test

# Tests en modo watch
npm test -- --watch

# Coverage report
npm test -- --coverage
```

### Tipos de Test

- **Unit Tests**: Servicios y utilidades
- **Component Tests**: Componentes React
- **Integration Tests**: Flujos de usuario
- **E2E Tests**: Casos de uso completos

## 🔐 Seguridad

### Autenticación

- **Magic Links**: Login sin contraseña
- **OTP Verification**: Código por email
- **Secure Storage**: Tokens encriptados
- **Session Management**: Auto-refresh tokens

### Datos

- **Row Level Security (RLS)**: Políticas de acceso
- **Data Encryption**: Encriptación en tránsito y reposo
- **Input Validation**: Validación con Zod schemas
- **Rate Limiting**: Protección contra abuso

## 🚀 Funcionalidades por Pantalla

### 🏠 **Dashboard (`index.tsx`)**

- Resumen de progreso de metas
- Estadísticas de gamificación
- Accesos rápidos
- Notificaciones importantes

### 🎯 **Metas (`goals.tsx`)**

- Lista de metas activas
- Crear nueva meta
- Editar metas existentes
- Progreso detallado

### 🏆 **Challenges (`challenges.tsx`)**

- Catálogo de retos disponibles
- Progreso de retos activos
- Historial de completados
- Recompensas ganadas

###  **Profile (`profile.tsx`)**

- Información de usuario
- Estadísticas personales
- Configuración de app
- Gestión de suscripción

## 🎮 Sistema de Gamificación Detallado

### XP y Niveles

```typescript
// Fórmula de niveles
nivel = Math.floor(Math.sqrt(totalXP) / 2)

// Fuentes de XP
- Contribución: +2 XP por cada $1 (máx 10 XP)
- Completar reto: +30 XP
- Racha diaria: +5 XP
- Bonus por racha larga: XP adicional
```

### Sistema de Rachas

```typescript
// Reglas de racha
- Actividad diaria: Mantiene racha
- 1 día perdido: Racha se rompe (con protección)
- Protecciones: 3 por mes
- Reset protecciones: Cada 1er día del mes
```

### Quests y Challenges

- **Weekly Quests**: Renovación semanal
- **Progress Tracking**: Seguimiento automático
- **Reward System**: XP y badges
- **Difficulty Scaling**: Progresión de dificultad

## 🔄 Estado del Proyecto

### ✅ Completado

- [x] Estructura base con Expo Router
- [x] Componentes UI reutilizables
- [x] Sistema de gamificación completo
- [x] Integración Supabase
- [x] Autenticación con magic links
- [x] PWA funcional cross-platform
- [x] Sistema de rachas con protecciones
- [x] Metas y seguimiento de progreso
- [x] Tests unitarios básicos
- [x] CI/CD con GitHub Actions

### 🔄 En Desarrollo

- [ ] Challenges dinámicos
- [ ] Sistema de notificaciones push
- [ ] Análisis avanzado de gastos
- [ ] Integración bancaria API
- [ ] Modo offline completo

### 📋 Roadmap

- [ ] Machine Learning para recomendaciones
- [ ] Widget iOS/Android
- [ ] Apple Pay / Google Pay integration
- [ ] Exportación de datos
- [ ] API pública para desarrolladores

## 📱 Plataformas Soportadas

| Plataforma  | Estado        | Características                |
| ----------- | ------------- | ------------------------------ |
| **iOS**     | ✅ Producción | App Store, notificaciones push |
| **Android** | ✅ Producción | Play Store, widgets            |
| **Web PWA** | ✅ Producción | Offline, instalable            |
| **Desktop** | 🔄 Desarrollo | Electron wrapper               |

## 🤝 Contribuir

### Setup de Desarrollo

```bash
# Fork del repositorio
git clone https://github.com/tu-usuario/uruguahorra.git
cd uruguahorra-app

# Crear rama feature
git checkout -b feature/nueva-funcionalidad

# Instalar dependencias
npm install

# Configurar pre-commit hooks
npx husky install
```

### Guías de Contribución

1. **Code Style**: Seguir ESLint + Prettier
2. **Commits**: Conventional commits
3. **Testing**: Incluir tests para nuevas features
4. **Documentation**: Actualizar README cuando sea necesario
5. **Review**: Pull request con descripción detallada

## 📄 Licencia

MIT License - ver [LICENSE](LICENSE) para más detalles.

## 👥 Equipo

**Desarrollado para Uruguahorra** - Fintech enfocada en democratizar el ahorro en LATAM.

- **Arquitectura**: React Native + Supabase
- **Gamificación**: Sistema XP, niveles, rachas
- **Seguridad**: RLS, encriptación, rate limiting
- **Multiplataforma**: iOS, Android, Web PWA

---

## 🔗 Enlaces Útiles

- [Documentación Expo](https://docs.expo.dev/)
- [Supabase Docs](https://supabase.com/docs)
- [React Native Guide](https://reactnative.dev/docs/getting-started)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## 📞 Soporte

¿Encontraste un bug o tienes una sugerencia?

- 🐛 [Reportar Bug](https://github.com/nico-mauber/uruguahorra/issues)
- 💡 [Feature Request](https://github.com/nico-mauber/uruguahorra/discussions)
- 📧 Email: support@uruguahorra.com

---

**¡Juntos construyamos mejores hábitos de ahorro! 💚**
