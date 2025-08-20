@echo off
echo Iniciando migracion de useAuthStore a AuthProvider...

:: Crear backup
set backupName=src_backup_%date:~6,4%%date:~3,2%%date:~0,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set backupName=%backupName: =0%
echo Creando backup en: %backupName%
xcopy /e /i src %backupName%

echo.
echo Archivos que contienen useAuthStore:
findstr /s /m "useAuthStore" src\*.ts src\*.tsx

echo.
echo Para completar la migracion manualmente:
echo 1. Reemplaza "import { useAuthStore } from '@store/useAuthStore'" con "import { useAuth } from '@/contexts'"
echo 2. Reemplaza "import { useAuthStore } from '@/store/useAuthStore'" con "import { useAuth } from '@/contexts'"
echo 3. Reemplaza "useAuthStore()" con "useAuth()"
echo 4. Elimina llamadas a checkSession() - ya no son necesarias
echo.
echo Backup creado en: %backupName%
pause
