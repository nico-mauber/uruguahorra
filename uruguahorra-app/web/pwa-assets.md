# PWA Assets - Archivo de configuración para generación de iconos

# Este archivo define los tamaños de iconos necesarios para PWA
# Los iconos deben generarse desde el archivo base assets/icon.png

# Iconos necesarios para PWA:
# - 72x72 (Android density-ldpi)
# - 96x96 (Android density-mdpi)  
# - 128x128 (Android density-hdpi)
# - 144x144 (Android density-xhdpi)
# - 152x152 (iOS)
# - 192x192 (Android density-xxhdpi, PWA standard)
# - 384x384 (Android density-xxxhdpi)
# - 512x512 (PWA standard)

# Screenshots para app stores:
# - Mobile: 390x844 (iPhone 12 Pro)
# - Desktop: 1280x800

# Apple Touch Icons:
# - 57x57, 60x60, 72x72, 76x76, 114x114, 120x120, 144x144, 152x152, 180x180

# Comando para generar todos los tamaños:
# convert assets/icon.png -resize 192x192 web/icons/icon-192x192.png
# convert assets/icon.png -resize 512x512 web/icons/icon-512x512.png
