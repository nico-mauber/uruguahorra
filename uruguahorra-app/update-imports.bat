@echo off
echo Actualizando imports de useAuthStore masivamente...

:: Buscar y reemplazar en todos los archivos
for /r src %%f in (*.ts *.tsx) do (
    powershell -Command "(Get-Content '%%f') -replace \"import \{ useAuthStore \} from '@store/useAuthStore';\", \"import \{ useAuthStore \} from '@/contexts';\" | Set-Content '%%f'"
    powershell -Command "(Get-Content '%%f') -replace \"import \{ useAuthStore \} from '@/store/useAuthStore';\", \"import \{ useAuthStore \} from '@/contexts';\" | Set-Content '%%f'"
)

echo ✅ Imports actualizados exitosamente
echo Ahora todos los archivos usan el AuthProvider a través del hook de compatibilidad
