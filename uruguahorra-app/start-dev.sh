#!/bin/bash

# Script para iniciar Expo con configuración de red mejorada

echo "🚀 Iniciando servidor de desarrollo Expo..."
echo "📱 Configurando para conectividad móvil..."

# Obtener IP local
LOCAL_IP=$(hostname -I | awk '{print $1}')
echo "🌐 IP del servidor: $LOCAL_IP"

# Exportar variables de entorno
export REACT_NATIVE_PACKAGER_HOSTNAME=$LOCAL_IP
export EXPO_DEVTOOLS_LISTEN_ADDRESS=0.0.0.0

# Limpiar caché
echo "🧹 Limpiando caché..."
npx expo start --clear --host 0.0.0.0

# Alternativas de inicio:
# Para usar túnel (más lento pero más confiable):
# npx expo start --tunnel

# Para usar LAN (más rápido pero requiere misma red):
# npx expo start --lan