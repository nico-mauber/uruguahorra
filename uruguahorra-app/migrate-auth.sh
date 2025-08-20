#!/bin/bash

# Script de migración automática de useAuthStore a useAuth

echo "🚀 Iniciando migración de useAuthStore a AuthProvider..."

# Crear backup
echo "📦 Creando backup..."
cp -r src src_backup_$(date +%Y%m%d_%H%M%S)

# Lista de archivos a migrar (excluyendo el store original)
FILES=$(find src -name "*.ts" -o -name "*.tsx" | grep -v "useAuthStore.ts" | grep -v "contexts/")

echo "📋 Archivos encontrados para migrar:"
echo "$FILES"

echo ""
echo "🔄 Iniciando migración automática..."

for file in $FILES; do
    if grep -q "useAuthStore" "$file"; then
        echo "  📝 Migrando: $file"
        
        # Reemplazar import
        sed -i.bak "s|import { useAuthStore } from '@store/useAuthStore'|import { useAuth } from '@/contexts'|g" "$file"
        sed -i.bak "s|import { useAuthStore } from '@/store/useAuthStore'|import { useAuth } from '@/contexts'|g" "$file"
        
        # Reemplazar uso del hook
        sed -i.bak "s|useAuthStore()|useAuth()|g" "$file"
        
        # Limpiar archivos .bak
        rm -f "$file.bak"
        
        echo "  ✅ Migrado: $file"
    fi
done

echo ""
echo "⚠️  MIGRACIÓN MANUAL REQUERIDA:"
echo ""
echo "1. Revisa los archivos migrados para verificar que no haya problemas"
echo "2. Busca llamadas a checkSession() y elimínalas (ya no son necesarias)"
echo "3. Actualiza cualquier lógica que dependía de checkSession manual"
echo "4. Verifica que el AuthProvider esté correctamente wrapeando tu app en _layout.tsx"
echo ""
echo "🔍 Para encontrar llamadas a checkSession que necesitas revisar:"
echo "  grep -r 'checkSession' src/ --include='*.ts' --include='*.tsx'"
echo ""
echo "✨ Migración automática completada!"
echo "💾 Backup creado en: src_backup_$(date +%Y%m%d_%H%M%S)/"
