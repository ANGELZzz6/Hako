# Instrucciones para Configurar Pruebas de Mercado Pago con Checkout Pro - COLOMBIA

## ⚠️ IMPORTANTE: Usar credenciales de PRUEBA para desarrollo

**Para realizar pruebas con Checkout Pro, debes usar credenciales de PRUEBA, no las de producción.**

## Solución: Usar Credenciales de Prueba + Cuentas de Prueba

### Paso 1: Crear Cuentas de Prueba en Mercado Pago

1. Ve a [Panel de Desarrollador de Mercado Pago](https://www.mercadopago.com.co/developers/panel)
2. Inicia sesión con tu cuenta principal
3. Ve a tu aplicación
4. Busca la sección "Cuentas de prueba"
5. Haz clic en "+ Crear cuenta de prueba"

#### Crear Cuenta Vendedor:
- Descripción: "Vendedor"
- País: Colombia
- **NO** agregar dinero disponible (no es necesario para vendedor)
- Guarda el usuario y contraseña generados

#### Crear Cuenta Comprador:
- Descripción: "Comprador"
- País: Colombia (debe ser el mismo que el vendedor)
- Saldo ficticio: $1000000 (mayor al valor de tus productos)
- Guarda el usuario y contraseña generados

### Paso 2: Crear Aplicación de Prueba

1. **Abre una ventana de incógnito**
2. Ve a [Mercado Pago Developers](https://www.mercadopago.com.co/developers/panel)
3. **Inicia sesión con tu cuenta de prueba vendedor** (no tu cuenta principal)
4. Haz clic en "Crear aplicación"
5. Sigue los pasos para crear una aplicación de prueba
6. Una vez creada, ve a "Credenciales de producción"
7. **Copia las credenciales de esa aplicación de prueba**

### Paso 3: Configurar Credenciales de Prueba

1. Reemplaza las credenciales en `server/config/mercadopago.js`:
   ```js
   development: {
     accessToken: 'TEST-XXXXX-XXXXX-XXXXX-XXXXX' // Tus credenciales de prueba reales
   }
   ```

### Paso 4: Configurar el Entorno

El archivo ya está configurado para usar credenciales de prueba en desarrollo.

Para ejecutar:
```bash
npm start
```

### Paso 5: Probar el Pago

1. Inicia tu aplicación
2. Agrega productos al carrito
3. Ve al checkout
4. **IMPORTANTE**: Usa tu cuenta de prueba comprador para hacer el pago
5. Usa una de estas tarjetas de prueba **PARA COLOMBIA**:
   - **Mastercard**: 5031 1111 1111 6351
   - **Visa**: 4509 9535 6623 3704
   - **American Express**: 3711 8030 3257 522
   - **Visa Débito**: 4915 1120 5524 6507
6. **CVV**: 123 (1234 para American Express)
7. **Fecha**: 11/25
8. **Nombre**: APRO
9. **DNI**: 12345678

### Paso 6: Iniciar Sesión con Cuenta de Prueba

Si necesitas iniciar sesión con una cuenta de prueba:
1. Ve a [mercadopago.com.co](https://www.mercadopago.com.co)
2. Inicia sesión con el usuario de la cuenta comprador
3. Si te pide verificación por email, usa los últimos 6 dígitos del User ID de la cuenta de prueba

## Flujo Correcto para Pruebas

1. **Tu cuenta principal** → Crea las cuentas de prueba
2. **Cuenta de prueba vendedor** → Crea la aplicación de prueba y obtiene credenciales
3. **Cuenta de prueba comprador** → Hace los pagos con tarjetas de prueba

## Notas Importantes

- ✅ **Usar credenciales de PRUEBA** para desarrollo
- ✅ **Usar cuentas de prueba separadas** para vendedor y comprador
- ✅ **Usar tarjetas de prueba para Colombia**
- ✅ **Cerrar sesión en Mercado Pago** antes de probar
- ❌ **NO usar credenciales de producción** para desarrollo
- ❌ **NO usar la misma cuenta** para vender y comprar

## Verificación

Para verificar que todo funciona:
1. El servidor debe mostrar "Mercado Pago configurado para entorno: development"
2. Debe mostrar "Usando credenciales: PRUEBA"
3. Al hacer una compra de prueba, no debe dar el error "You cannot pay yourself"
4. Los pagos deben procesarse correctamente con las tarjetas de prueba

## Resolución del Error "You cannot pay yourself"

Este error se soluciona cuando:
- Usas credenciales de prueba (ya configurado)
- Tienes cuentas de prueba separadas para vendedor y comprador
- Usas las tarjetas de prueba proporcionadas
- El comprador y vendedor son cuentas diferentes
- Cierras sesión en Mercado Pago antes de probar 