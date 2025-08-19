#!/bin/bash
# Script para limpiar archivos basura de documentación

# Navegar al directorio del proyecto
cd "c:\Develop\uruguahorra\uruguahorra-app"

# Eliminar archivos de documentación innecesarios
rm -f "FIX_USER_STREAKS_COLUMN_ERROR.md"
rm -f "SOLUCION_FINAL_UN_SOLO_ARCHIVO.md" 
rm -f "RUNTIME_VALIDATION_IMPLEMENTATION.md"
rm -f "COMO_INICIAR.txt"
rm -f "FIX_SUCCESS_ERROR.md"

echo "✅ Archivos de documentación innecesarios eliminados"
echo "✅ Solo quedan los archivos esenciales: README.md, robots.txt, pwa-assets.md"
