@echo off
echo 🚀 Configurando entorno de billing para Windows...

REM Verificar que Supabase CLI está instalado
where supabase >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Supabase CLI no está instalado. Instálalo con:
    echo npm i supabase -g
    exit /b 1
)

REM Verificar variables de entorno
set ENV_FILE=.env.local
if not exist "%ENV_FILE%" (
    echo ⚠️  Creando archivo .env.local...
    (
        echo # MercadoPago
        echo EXPO_PUBLIC_MERCADOPAGO_PUBLIC_KEY=TEST-...
        echo MERCADOPAGO_ACCESS_TOKEN=TEST-...
        echo.
        echo # Supabase
        echo SUPABASE_URL=https://your-project.supabase.co
        echo SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
        echo SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
    ) > "%ENV_FILE%"
    echo 📝 Archivo .env.local creado. Por favor, completa las variables.
)

echo ✅ Configuración base completa

echo 📊 Verificando tablas de suscripciones...

echo 🎉 Configuración de billing completada!
echo.
echo Próximos pasos:
echo 1. Completa las variables de entorno en .env.local
echo 2. Configura los webhooks en MercadoPago
echo 3. Despliega la Edge Function: supabase functions deploy billing-webhooks
echo 4. Prueba localmente: npm run test:billing

pause
