# UruguAhorra PWA

PWA (Vite + React 19 + TypeScript) que reconstruye la app Expo actual. Construida por fases con el pipeline SDD (`../sdd/`). Blueprint de referencia: `../docs/`.

## Requisitos
- Node ≥ 18 (probado con v20).

## Setup
```bash
npm install
cp .env.example .env.local   # completar VITE_SUPABASE_ANON_KEY (solo claves públicas)
```

## Scripts
```bash
npm run dev        # servidor de desarrollo (http://localhost:5173)
npm run build      # tsc --noEmit + vite build
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
npm run preview    # sirve el build de dist/
```

## Estado
- **Fase 01 (fundaciones)**: ✅ andamiaje — tokens, componentes base, supabase, stores (auth/ui), router con guards, tema claro/oscuro, ErrorBoundary, toasts, manifest base. Rutas = placeholders.
- Fases 02–11: ver `../sdd/README.md`.

## Notas
- Backend Supabase compartido con la app actual; no se modifica.
- Ninguna clave privada en el bundle (solo `VITE_*` públicas).
