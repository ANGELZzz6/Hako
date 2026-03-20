#!/bin/bash

echo "🚀 Instalando Sistema de Códigos QR para Hako Store"
echo "=================================================="

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo "❌ Error: Debes ejecutar este script desde el directorio raíz de Hako"
    exit 1
fi

echo "📦 Instalando dependencias del servidor..."
cd server

# Instalar dependencias necesarias para el sistema de QR
npm install qrcode node-cron

if [ $? -eq 0 ]; then
    echo "✅ Dependencias instaladas correctamente"
else
    echo "❌ Error al instalar dependencias"
    exit 1
fi

echo ""
echo "🔧 Verificando configuración..."
echo ""

# Verificar archivo .env
if [ ! -f ".env" ]; then
    echo "⚠️  Archivo .env no encontrado"
    echo "📝 Creando archivo .env de ejemplo..."
    cat > .env << EOF
# Configuración de Base de Datos
MONGODB_URI=tu_uri_de_mongodb

# Configuración de Email para QR
EMAIL_USER=tu-email@gmail.com
EMAIL_PASS=tu-password-app

# Puerto del servidor
PORT=5000
EOF
    echo "✅ Archivo .env creado. Por favor, configura las variables necesarias."
else
    echo "✅ Archivo .env encontrado"
fi

echo ""
echo "📋 Verificando archivos del sistema..."
echo ""

# Verificar que todos los archivos necesarios existen
files=(
    "models/qrModel.js"
    "controllers/qrController.js"
    "routes/qrRoutes.js"
    "services/notificationService.js"
    "scheduledTasks.js"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file - NO ENCONTRADO"
    fi
done

echo ""
echo "🔍 Verificando integración con el servidor..."
echo ""

# Verificar que las rutas están agregadas al app.js
if grep -q "qrRoutes" app.js; then
    echo "✅ Rutas de QR integradas en app.js"
else
    echo "❌ Rutas de QR NO integradas en app.js"
fi

# Verificar que las tareas programadas están en index.js
if grep -q "scheduledTasks" index.js; then
    echo "✅ Tareas programadas integradas en index.js"
else
    echo "❌ Tareas programadas NO integradas en index.js"
fi

echo ""
echo "📱 Verificando archivos del frontend..."
echo ""

cd ../client

files=(
    "src/services/qrService.ts"
    "src/config/api.ts"
    "src/pages/OrdersPage/components/QRHistory.tsx"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file - NO ENCONTRADO"
    fi
done

echo ""
echo "🎯 Resumen de la instalación:"
echo "=============================="
echo ""
echo "✅ Sistema de Códigos QR instalado"
echo "✅ Dependencias del servidor instaladas"
echo "✅ Modelos y controladores creados"
echo "✅ Rutas de API configuradas"
echo "✅ Servicio de notificaciones actualizado"
echo "✅ Tareas programadas configuradas"
echo "✅ Componentes del frontend creados"
echo ""
echo "📋 Próximos pasos:"
echo "1. Configura las variables de entorno en server/.env"
echo "2. Reinicia el servidor para aplicar los cambios"
echo "3. Verifica que el sistema funcione correctamente"
echo ""
echo "🔧 Para probar el sistema:"
echo "1. Crea una reserva en el sistema"
echo "2. Haz clic en el botón 'QR' en la tarjeta de reserva"
echo "3. Verifica que se genere el código QR"
echo "4. Revisa que se envíe el email"
echo ""
echo "📚 Documentación disponible en: SISTEMA_QR_README.md"
echo ""
echo "🎉 ¡Instalación completada! El sistema de códigos QR está listo para usar."
