#!/bin/bash

# ====================================================
# Script de limpieza y mantenimiento - Uruguahorra App
# ====================================================
# Uso: ./scripts/cleanup.sh [--dry-run] [--verbose]
#
# Opciones:
#   --dry-run   Simula la ejecución sin hacer cambios
#   --verbose   Muestra información detallada
# ====================================================

set -e  # Salir si hay errores

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # Sin color

# Configuración
DRY_RUN=false
VERBOSE=false

# Procesar argumentos
while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=true
      echo -e "${YELLOW}Modo dry-run activado - no se harán cambios${NC}"
      shift
      ;;
    --verbose)
      VERBOSE=true
      shift
      ;;
    *)
      echo "Argumento desconocido: $1"
      exit 1
      ;;
  esac
done

log() {
  if [ "$VERBOSE" = true ]; then
    echo -e "${BLUE}[INFO]${NC} $1"
  fi
}

execute() {
  if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}[DRY-RUN]${NC} $1"
  else
    log "Ejecutando: $1"
    eval $1
  fi
}

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Script de Limpieza - Uruguahorra App  ${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 1. Backup antes de limpieza
echo -e "${BLUE}1. Creando backup...${NC}"
if [ "$DRY_RUN" = false ]; then
  BACKUP_NAME="backup-cleanup-$(date +%Y%m%d-%H%M%S)"
  git stash save "$BACKUP_NAME" 2>/dev/null || echo "No hay cambios para backup"
  echo -e "${GREEN}✓${NC} Backup creado: $BACKUP_NAME"
fi

# 2. Buscar archivos TypeScript/JavaScript no utilizados
echo -e "${BLUE}2. Buscando código muerto...${NC}"

# Lista de archivos potencialmente muertos (actualizar según necesidad)
DEAD_FILES=(
  "src/services/learnings.service.ts"
  "src/services/contributions.service.ts"
  "src/services/profile-sync.service.ts"
  "src/components/RateLimitAlert.tsx"
  "src/components/PWAInstallPrompt.tsx"
  "src/components/NotificationTesting.tsx"
  "src/components/NotificationsBanner.tsx"
  "src/components/SubscriptionManager.tsx"
  "src/utils/categorizer.ts"
  "src/utils/device-fingerprint.ts"
  "src/utils/error-monitor.ts"
  "src/utils/throttle.ts"
)

REMOVED_COUNT=0
for file in "${DEAD_FILES[@]}"; do
  if [ -f "$file" ]; then
    # Verificar si el archivo es importado en algún lugar
    FILENAME=$(basename "$file" .ts | sed 's/.tsx$//')
    if ! grep -r --include="*.ts" --include="*.tsx" --include="*.js" "$FILENAME" src/ --quiet 2>/dev/null; then
      execute "rm \"$file\""
      echo -e "${GREEN}✓${NC} Eliminado: $file"
      ((REMOVED_COUNT++))
    else
      log "Archivo en uso: $file"
    fi
  fi
done

echo -e "${GREEN}✓${NC} Archivos muertos eliminados: $REMOVED_COUNT"

# 3. Limpiar directorios vacíos
echo -e "${BLUE}3. Limpiando directorios vacíos...${NC}"
if [ "$DRY_RUN" = false ]; then
  find src -type d -empty -delete 2>/dev/null || true
  echo -e "${GREEN}✓${NC} Directorios vacíos eliminados"
fi

# 4. Limpiar dependencias npm
echo -e "${BLUE}4. Limpiando dependencias npm...${NC}"

# Verificar dependencias no utilizadas
if command -v npx &> /dev/null; then
  log "Analizando dependencias con depcheck..."
  if [ "$VERBOSE" = true ]; then
    npx depcheck --json | jq '.dependencies' 2>/dev/null || echo "depcheck no disponible"
  fi
fi

# Limpiar y optimizar node_modules
execute "npm prune"
execute "npm dedupe"
echo -e "${GREEN}✓${NC} Dependencias optimizadas"

# 5. Limpiar archivos temporales y cache
echo -e "${BLUE}5. Limpiando archivos temporales...${NC}"

TEMP_PATTERNS=(
  "*.log"
  ".DS_Store"
  "*.orig"
  "*.swp"
  "*.swo"
  "*~"
  ".metro-cache"
  ".expo/.cache"
)

TEMP_COUNT=0
for pattern in "${TEMP_PATTERNS[@]}"; do
  while IFS= read -r -d '' file; do
    execute "rm \"$file\""
    ((TEMP_COUNT++))
  done < <(find . -name "$pattern" -type f -print0 2>/dev/null)
done

echo -e "${GREEN}✓${NC} Archivos temporales eliminados: $TEMP_COUNT"

# 6. Análisis de bundle size (si está disponible)
echo -e "${BLUE}6. Analizando tamaño del bundle...${NC}"
if [ -f "web-build" ]; then
  BUNDLE_SIZE=$(du -sh web-build 2>/dev/null | cut -f1)
  echo -e "   Tamaño actual del bundle: ${YELLOW}$BUNDLE_SIZE${NC}"
fi

# 7. Verificar vulnerabilidades
echo -e "${BLUE}7. Verificando vulnerabilidades...${NC}"
if [ "$DRY_RUN" = false ]; then
  npm audit --audit-level=moderate 2>/dev/null || echo -e "${YELLOW}⚠${NC} Hay vulnerabilidades pendientes"
fi

# 8. Estadísticas finales
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}        Limpieza Completada             ${NC}"
echo -e "${GREEN}========================================${NC}"

# Mostrar estadísticas de código
if [ "$VERBOSE" = true ]; then
  echo ""
  echo -e "${BLUE}Estadísticas del proyecto:${NC}"
  echo -n "  TypeScript/TSX files: "
  find src -name "*.ts" -o -name "*.tsx" | wc -l
  echo -n "  Total líneas de código: "
  find src -name "*.ts" -o -name "*.tsx" | xargs wc -l | tail -1 | awk '{print $1}'
fi

# Recomendaciones
echo ""
echo -e "${YELLOW}Recomendaciones:${NC}"
echo "  1. Ejecutar 'npm test' para verificar que todo funciona"
echo "  2. Revisar los cambios con 'git status'"
echo "  3. Commit los cambios si todo está correcto"
echo ""

# Si es dry-run, recordar al usuario
if [ "$DRY_RUN" = true ]; then
  echo -e "${YELLOW}Nota: Este fue un dry-run. Ejecuta sin --dry-run para aplicar cambios.${NC}"
fi

exit 0