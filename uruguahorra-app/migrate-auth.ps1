# Script de migración automática de useAuthStore a useAuth para Windows
Write-Host "Iniciando migración de useAuthStore a AuthProvider..." -ForegroundColor Green

# Crear backup
$backupName = "src_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
Write-Host "Creando backup en: $backupName" -ForegroundColor Yellow
Copy-Item -Path "src" -Destination $backupName -Recurse

# Encontrar archivos a migrar
$files = Get-ChildItem -Path "src" -Include "*.ts", "*.tsx" -Recurse | 
         Where-Object { $_.Name -ne "useAuthStore.ts" -and $_.DirectoryName -notlike "*contexts*" }

Write-Host "Archivos encontrados para migrar:" -ForegroundColor Cyan
$files | ForEach-Object { Write-Host "  - $($_.FullName)" }

Write-Host ""
Write-Host "Iniciando migración automática..." -ForegroundColor Green

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    
    if ($content -match "useAuthStore") {
        Write-Host "  Migrando: $($file.FullName)" -ForegroundColor Blue
        
        # Reemplazar imports
        $content = $content -replace "import \{ useAuthStore \} from '@store/useAuthStore'", "import { useAuth } from '@/contexts'"
        $content = $content -replace "import \{ useAuthStore \} from '@/store/useAuthStore'", "import { useAuth } from '@/contexts'"
        
        # Reemplazar uso del hook
        $content = $content -replace "useAuthStore\(\)", "useAuth()"
        
        # Guardar archivo
        Set-Content -Path $file.FullName -Value $content
        
        Write-Host "  Migrado: $($file.FullName)" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "MIGRACIÓN MANUAL REQUERIDA:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Revisa los archivos migrados para verificar que no haya problemas"
Write-Host "2. Busca llamadas a checkSession() y elimínalas (ya no son necesarias)"
Write-Host "3. Actualiza cualquier lógica que dependía de checkSession manual"  
Write-Host "4. Verifica que el AuthProvider esté correctamente wrapeando tu app en _layout.tsx"
Write-Host ""
Write-Host "Para encontrar llamadas a checkSession que necesitas revisar:"
Write-Host "  Get-ChildItem -Path 'src' -Include '*.ts','*.tsx' -Recurse | Select-String 'checkSession'"
Write-Host ""
Write-Host "Migración automática completada!" -ForegroundColor Green
Write-Host "Backup creado en: $backupName" -ForegroundColor Cyan
