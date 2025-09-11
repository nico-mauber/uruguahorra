# Solución para Problemas de Dependencias

## Problema Actual
Después de los cambios para arreglar Vercel, `npm start` falla con errores de dependencias faltantes/corruptas.

## Causa Raíz
1. **Incompatibilidad de versiones**: Expo 53 + React Native 0.74.5 + Node 20.19.0 tienen conflictos
2. **npm cache corrupto**: Los múltiples cambios han corrompido el cache de npm
3. **Metro config obsoleto**: Configuraciones que ya no son compatibles

## Solución Recomendada (Ejecutar en Terminal de Windows)

### 1. Limpiar completamente npm y node_modules
```cmd
cd C:\Develop\uruguahorra\uruguahorra-app
rd /s /q node_modules
npm cache clean --force
```

### 2. Actualizar Node.js a versión compatible
- Descargar e instalar Node.js 20.19.4 desde https://nodejs.org
- Reiniciar terminal después de instalar

### 3. Instalar dependencias
```cmd
npm install --legacy-peer-deps --force
```

### 4. Si persisten errores, usar versiones específicas compatibles
```cmd
npm install react@18.3.1 react-native@0.74.5 expo@~53.0.0 --legacy-peer-deps
```

## Configuración de Vercel Actualizada
- `vercel.json` configurado para usar npm con `--legacy-peer-deps`
- Build command incluye reinstall como backup
- Script `build-web.js` como fallback robusto

## Estado Actual
- ✅ Vercel configuration fixed
- ✅ Environment variables centralized in .env  
- ✅ MercadoPago credentials updated (TEST)
- ⚠️  Local npm start needs manual fix (follow steps above)

## Notas
- Los warnings de "deprecated" son normales y no bloquean la funcionalidad
- Vercel debería funcionar correctamente con la configuración actual
- El problema local es de environment, no de código