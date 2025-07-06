# Diagnóstico y Solución del Error "internal_error" en PSE

## Problema
Estás experimentando un error "internal_error" (500) al procesar pagos PSE en Mercado Pago.

## ✅ SOLUCIÓN IDENTIFICADA

**Error 4058**: `callback_url cant be null`

**Causa**: Mercado Pago requiere que se envíen las URLs de callback y notification para los pagos PSE.

**Solución Implementada**: Se han agregado las URLs requeridas en todos los endpoints de PSE:
- `callback_url: 'https://httpbin.org/status/200'` (URL pública para desarrollo)
- `notification_url: 'https://webhook.site/your-unique-url'` (Obligatoria según documentación oficial)

## Posibles Causas

### 1. Access Token Inválido o Expirado
- **Síntoma**: Error 2034 o 401
- **Solución**: 
  1. Ve a https://www.mercadopago.com/developers/panel
  2. Inicia sesión con tu cuenta
  3. Ve a "Credenciales" → "Credenciales de prueba"
  4. Copia el nuevo Access Token
  5. Actualiza la variable de entorno `MERCADOPAGO_ACCESS_TOKEN`

### 2. URLs de Callback Faltantes (SOLUCIONADO ✅)
- **Síntoma**: Error 4058 - "callback_url cant be null"
- **Solución**: ✅ Implementada - URLs agregadas automáticamente

### 3. Institución Financiera No Disponible
- **Síntoma**: Error 4063
- **Solución**: 
  - Prueba con otro banco
  - Verifica que el código del banco sea correcto
  - Algunos bancos pueden no estar disponibles en modo de pruebas

### 4. Datos del Formulario Incompletos o Inválidos
- **Síntoma**: Error de validación
- **Solución**: 
  - Verifica que todos los campos requeridos estén completos
  - Asegúrate de que el email tenga formato válido
  - El número de identificación debe contener solo números

### 5. Problema Temporal en Servidores de Mercado Pago
- **Síntoma**: Error interno sin código específico
- **Solución**: 
  - Espera unos minutos e intenta nuevamente
  - Verifica el estado de los servicios de Mercado Pago

## Scripts de Diagnóstico

### 1. Probar Configuración General
```bash
cd server
node test-mercadopago-config.js
```

### 2. Probar Bancos PSE Disponibles
```bash
cd server
node test-pse-banks.js
```

### 3. Probar desde la Interfaz Web
1. Ve a http://localhost:5173/payment-test
2. Haz clic en "Probar Configuración PSE"
3. Revisa los resultados

## Mejoras Implementadas

### Validaciones Adicionales
- ✅ Validación de formato de email
- ✅ Validación de número de identificación (solo números)
- ✅ Validación de monto mínimo ($1,600) y máximo ($340,000,000) para PSE
- ✅ Validación de campos requeridos

### Mejor Manejo de Errores
- ✅ Logs detallados para debugging
- ✅ Mapeo de códigos de error específicos
- ✅ Mensajes de error más informativos
- ✅ Sugerencias de solución

### Scripts de Diagnóstico
- ✅ Script para probar configuración general
- ✅ Script para probar bancos disponibles
- ✅ Interfaz web para pruebas

### URLs Requeridas para PSE
- ✅ `callback_url` agregada automáticamente
- ✅ `notification_url` agregada automáticamente (obligatoria según documentación)

## Pasos para Solucionar

### Paso 1: Verificar Access Token
```bash
cd server
node test-mercadopago-config.js
```

### Paso 2: Si el Access Token está bien, probar bancos
```bash
cd server
node test-pse-banks.js
```

### Paso 3: Usar un banco que funcione
- Si encuentras bancos que funcionan, usa uno de esos
- Si ningún banco funciona, puede ser un problema de configuración

### Paso 4: Verificar datos del formulario
- Asegúrate de que el email sea válido
- El número de identificación debe ser numérico
- Todos los campos requeridos deben estar completos

### Paso 5: Probar desde la aplicación
1. Ve al carrito
2. Selecciona PSE como método de pago
3. Completa el formulario con datos válidos
4. Intenta el pago

## Códigos de Error Comunes

| Código | Descripción | Solución |
|--------|-------------|----------|
| 2034 | Access Token inválido | Renovar token |
| 401 | Error de autenticación | Verificar token |
| 4058 | URLs de callback faltantes | ✅ SOLUCIONADO |
| 4020 | URL de notificación inválida | ✅ SOLUCIONADO |
| 4037 | Monto de transacción inválido | Monto mínimo: $1,600, máximo: $340,000,000 |
| 4063 | URL de callback inválida o institución financiera no disponible | Usar URL pública válida |
| 325/326/322 | Fondos insuficientes | Error simulado en pruebas |
| 4061 | Error de configuración | Verificar datos |

## Contacto
Si el problema persiste después de seguir estos pasos, verifica:
1. La documentación oficial de Mercado Pago
2. El estado de los servicios de Mercado Pago
3. Que estés usando la versión más reciente del SDK

## Requisitos Específicos de PSE

### Montos Permitidos
- **Mínimo**: $1,600 pesos colombianos
- **Máximo**: $340,000,000 pesos colombianos

### Campos Obligatorios
- `payer.address.zip_code` (exactamente 5 posiciones)
- `payer.address.street_name` (1-18 posiciones)
- `payer.address.street_number` (1-5 posiciones)
- `payer.address.neighborhood` (1-18 posiciones)
- `payer.address.city` (1-18 posiciones)
- `payer.phone.area_code` (exactamente 3 posiciones)
- `payer.phone.number` (1-7 posiciones, solo números)
- `payer.first_name` (1-32 posiciones)
- `payer.last_name` (1-32 posiciones)
- `payer.identification.number` (1-15 posiciones, numérico excepto pasaporte)

## Notas Importantes
- En modo de pruebas, algunos bancos pueden no estar disponibles
- Los errores de fondos insuficientes son simulados en pruebas
- El Access Token de pruebas puede expirar, renóvalo si es necesario
- **Las URLs de callback son OBLIGATORIAS para PSE** ✅
- **El monto mínimo de $1,600 es OBLIGATORIO para PSE** ✅ 