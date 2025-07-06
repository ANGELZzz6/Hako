# Configuración de Cuentas de Prueba - Mercado Pago

## 🔍 Problema Identificado

El error "Una de las partes con la que intentas hacer el pago es de prueba" ocurre cuando:
- Usas credenciales de prueba pero intentas pagar con cuentas reales
- Usas credenciales reales pero intentas pagar con cuentas de prueba
- Las cuentas de prueba no están configuradas correctamente

## ✅ Solución: Configurar Cuentas de Prueba Correctamente

### Paso 1: Crear Cuentas de Prueba

#### 1.1 Ir al Panel de Desarrollador
1. Ve a [Mercado Pago Developers](https://www.mercadopago.com.co/developers/panel)
2. Inicia sesión con tu cuenta principal de Mercado Pago
3. Ve a tu aplicación

#### 1.2 Crear Cuenta Vendedor de Prueba
1. Busca la sección "Cuentas de prueba"
2. Haz clic en "+ Crear cuenta de prueba"
3. Configuración:
   - **Descripción**: "Vendedor Prueba"
   - **País**: Colombia
   - **Saldo**: $0 (no es necesario para vendedor)
4. Guarda el usuario y contraseña generados

#### 1.3 Crear Cuenta Comprador de Prueba
1. Haz clic en "+ Crear cuenta de prueba" nuevamente
2. Configuración:
   - **Descripción**: "Comprador Prueba"
   - **País**: Colombia (debe ser el mismo que el vendedor)
   - **Saldo**: $1,000,000 (mayor al valor de tus productos)
4. Guarda el usuario y contraseña generados

### Paso 2: Obtener Credenciales de Prueba

#### 2.1 Abrir Ventana de Incógnito
1. Abre una ventana de incógnito en tu navegador
2. Ve a [Mercado Pago Developers](https://www.mercadopago.com.co/developers/panel)

#### 2.2 Iniciar Sesión con Cuenta Vendedor
1. **Inicia sesión con tu cuenta de prueba vendedor** (no tu cuenta principal)
2. Usa las credenciales que guardaste en el Paso 1.2

#### 2.3 Crear Aplicación de Prueba
1. Haz clic en "Crear aplicación"
2. Sigue los pasos para crear una aplicación de prueba
3. Una vez creada, ve a "Credenciales"
4. **Copia las credenciales de prueba** (deben empezar con `TEST-`)

### Paso 3: Configurar Credenciales en el Proyecto

#### 3.1 Actualizar Variables de Entorno
Crea o actualiza el archivo `.env` en la carpeta `server`:

```env
MERCADOPAGO_ACCESS_TOKEN=TEST-TU-TOKEN-DE-PRUEBA-AQUI
FRONTEND_URL=http://localhost:5173
```

#### 3.2 Verificar Configuración
El archivo `server/config/mercadopago.js` ya está configurado para usar credenciales de prueba.

### Paso 4: Probar el Pago

#### 4.1 Usar Cuenta Comprador de Prueba
1. Inicia tu aplicación
2. Agrega productos al carrito
3. Ve al checkout
4. Cuando seas redirigido a Mercado Pago:
   - **NO uses tu cuenta real**
   - **Inicia sesión con tu cuenta de prueba comprador**
   - Usa las credenciales del Paso 1.3

#### 4.2 Métodos de Pago de Prueba

##### Tarjetas de Prueba
- **Visa**: 4509 9535 6623 3704
- **Mastercard**: 5031 4332 1540 6351
- **American Express**: 3711 8030 3257 522
- **CVV**: 123
- **Fecha**: Cualquier fecha futura
- **Nombre**: Cualquier nombre

##### PSE de Prueba
- **Banco**: Cualquier banco disponible
- **Tipo de documento**: CC
- **Número de documento**: 12345678
- **Nombre**: Cualquier nombre

##### Efectivo de Prueba
- **Efecty**: Usar cualquier código de referencia

## 🧪 Script de Verificación

Ejecuta este script para verificar que todo esté configurado correctamente:

```bash
node test-checkout-debug.js
```

## 🔧 Solución de Problemas Comunes

### Error: "Una de las partes con la que intentas hacer el pago es de prueba"

**Causa**: Mezcla de cuentas reales y de prueba

**Solución**:
1. Verifica que uses credenciales de prueba (`TEST-`)
2. Usa solo cuentas de prueba para pagar
3. No uses tu cuenta real de Mercado Pago

### Error: "Access Token inválido"

**Causa**: Token expirado o incorrecto

**Solución**:
1. Genera un nuevo token de prueba
2. Actualiza la variable de entorno
3. Reinicia el servidor

### Error: "No se pueden procesar pagos"

**Causa**: Configuración incorrecta

**Solución**:
1. Verifica que ambas cuentas sean del mismo país
2. Asegúrate de que la cuenta comprador tenga saldo
3. Usa métodos de pago válidos para Colombia

## 📋 Checklist de Verificación

- [ ] Cuenta vendedor de prueba creada
- [ ] Cuenta comprador de prueba creada
- [ ] Credenciales de prueba obtenidas
- [ ] Variables de entorno configuradas
- [ ] Servidor reiniciado
- [ ] Prueba con cuenta comprador de prueba
- [ ] Métodos de pago funcionando

## 🚀 Próximos Pasos

1. **Configura las cuentas de prueba** siguiendo esta guía
2. **Prueba el flujo completo** con la cuenta comprador de prueba
3. **Verifica todos los métodos de pago** (tarjetas, PSE, efectivo)
4. **Una vez que todo funcione**, puedes pasar a producción

## ⚠️ Importante

- **Nunca uses cuentas reales** durante el desarrollo
- **Siempre usa credenciales de prueba** (`TEST-`)
- **Mantén las credenciales seguras** y no las compartas
- **Para producción**, usa credenciales reales y cuentas reales 