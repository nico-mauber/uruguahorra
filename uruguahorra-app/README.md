# 🏦 Uruguahorra App

App móvil de ahorro gamificada para ayudar a personas en LATAM a desarrollar hábitos de ahorro mediante gamificación, metas y retos divertidos.

## 🚀 Inicio Rápido

### Prerrequisitos
- Node.js 18+ 
- npm o yarn
- Expo Go app en tu dispositivo móvil

### Instalación

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/uruguahorra-app.git
cd uruguahorra-app

# Instalar dependencias
npm install

# Iniciar el proyecto
npm start
```

### Ejecutar en dispositivo

1. Instala Expo Go en tu dispositivo móvil
2. Escanea el código QR que aparece en la terminal
3. La app se abrirá automáticamente

## 📱 Características

- ✅ **Onboarding con metas** - Define tu objetivo de ahorro
- ✅ **Dashboard personalizado** - Visualiza tu progreso
- ✅ **Sistema de gamificación** - XP, niveles y rachas
- ✅ **Retos semanales** - Completa desafíos y gana puntos
- ✅ **Ranking social** - Compite con amigos
- ✅ **Importación CSV** - Analiza tus gastos
- ✅ **Tema claro/oscuro** - Adaptable a tus preferencias
- ✅ **Suscripción Premium** - Funciones avanzadas

## 🛠️ Stack Tecnológico

- **Framework:** React Native + Expo SDK 50
- **Lenguaje:** TypeScript
- **Navegación:** Expo Router
- **Estado:** Zustand
- **Estilo:** StyleSheet nativo + tema personalizado
- **Calidad:** ESLint + Prettier + Husky

## 📂 Estructura del Proyecto

```
src/
├── app/                # Páginas y navegación (Expo Router)
│   ├── (auth)/        # Rutas de autenticación
│   ├── (tabs)/        # Tab navigator principal
│   ├── import-csv.tsx # Modal importación
│   └── paywall.tsx    # Modal premium
├── components/        # Componentes reutilizables
├── features/         # Módulos de funcionalidad
├── lib/             # Utilidades
├── store/           # Stores de Zustand
└── theme/           # Sistema de temas
```

## 🎨 Componentes Base

- **Button** - Botón con variantes (primary, secondary, outline)
- **Card** - Contenedor con sombra o borde
- **ProgressBar** - Barra de progreso animada

## 📋 Scripts Disponibles

```bash
npm start          # Inicia Expo en modo desarrollo
npm run android    # Ejecuta en Android
npm run ios        # Ejecuta en iOS  
npm run lint       # Ejecuta ESLint
npm run format     # Formatea con Prettier
npm test           # Ejecuta tests
```

## 🔧 Configuración

### Variables de Entorno (.env)

```env
EXPO_PUBLIC_API_URL=https://api.uruguahorra.com
EXPO_PUBLIC_POSTHOG_KEY=phc_your_key_here
```

### Configuración de Husky

```bash
npx husky-init
npm install
```

## 🏗️ Build para Producción

```bash
# Instalar EAS CLI
npm install -g eas-cli

# Configurar proyecto
eas build:configure

# Build para Android
eas build --platform android

# Build para iOS
eas build --platform ios
```

## 🧪 Testing

```bash
# Ejecutar tests
npm test

# Tests con coverage
npm run test:coverage
```

## 🚦 Estado del Proyecto

- [x] Estructura base
- [x] Componentes UI
- [x] Navegación con tabs
- [x] Pantallas principales
- [x] State management
- [x] Tema claro/oscuro
- [ ] Integración con Supabase
- [ ] Sistema de notificaciones
- [ ] Analítica con PostHog

## 📄 Licencia

MIT

## 👥 Equipo

Desarrollado para el proyecto Uruguahorra - App de ahorro gamificada para LATAM.