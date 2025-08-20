#!/bin/bash

# Script para configurar el entorno de desarrollo de billing

echo "🚀 Configurando entorno de billing..."

# Verificar que Supabase CLI está instalado
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI no está instalado. Instálalo con:"
    echo "npm i supabase -g"
    exit 1
fi

# Verificar variables de entorno
ENV_FILE=".env.local"
if [ ! -f "$ENV_FILE" ]; then
    echo "⚠️  Creando archivo .env.local..."
    cat > $ENV_FILE << EOL
# MercadoPago
EXPO_PUBLIC_MERCADOPAGO_PUBLIC_KEY=TEST-...
MERCADOPAGO_ACCESS_TOKEN=TEST-...

# Supabase
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
export SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# MercadoPago
export EXPO_PUBLIC_MERCADOPAGO_PUBLIC_KEY=TEST-...
export MERCADOPAGO_ACCESS_TOKEN=TEST-...

# URLs de callback
export EXPO_PUBLIC_BILLING_SUCCESS_URL=uruguahorra://success
export EXPO_PUBLIC_BILLING_CANCEL_URL=uruguahorra://cancel
EOL
    echo "📝 Archivo .env.local creado. Por favor, completa las variables."
fi

# Verificar si está linkeado a un proyecto Supabase
if ! supabase status &> /dev/null; then
    echo "⚠️  No estás conectado a un proyecto Supabase."
    echo "Ejecuta: supabase link --project-ref <tu-project-ref>"
    exit 1
fi

echo "✅ Configuración base completa"

# Crear las tablas necesarias si no existen
echo "📊 Verificando tablas de suscripciones..."

# Aquí podrías agregar comandos SQL para crear las tablas si no existen
# supabase db push

echo "🎉 Configuración de billing completada!"
echo ""
echo "Próximos pasos:"
echo "1. Completa las variables de entorno en .env.local"
echo "2. Configura los webhooks en MercadoPago"
echo "3. Despliega la Edge Function: supabase functions deploy billing-webhooks"
echo "4. Prueba localmente: npm run test:billing"
