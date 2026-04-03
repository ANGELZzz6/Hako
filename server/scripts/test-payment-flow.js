const fs = require('fs');
const path = require('path');

/* 
   test-payment-flow.js
   Script para validar el flujo completo de pago:
   Preferencia -> Pago Sandbox -> Webhook -> Creación de Orden -> Reembolso
*/

// --- CONFIGURACIÓN Y COLORES ---
const COLORS = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  bold: "\x1b[1m"
};

function loadEnv() {
  const envPath = path.resolve(__dirname, '../../.env');
  if (!fs.existsSync(envPath)) {
    console.error(`${COLORS.red}ERROR: No se encontró el archivo .env.${COLORS.reset}`);
    process.exit(1);
  }
  const content = fs.readFileSync(envPath, 'utf-8');
  const config = {};
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length > 0) config[key.trim()] = valueParts.join('=').trim();
  });
  return config;
}

const env = loadEnv();
const BASE_URL = env.API_BASE_URL || 'http://localhost:5000';
let MP_ACCESS_TOKEN = env.MP_TEST_SELLER_ACCESS_TOKEN;
let MP_PUBLIC_KEY = env.MP_TEST_SELLER_PUBLIC_KEY;
const WEBHOOK_URL = env.WEBHOOK_URL;
const ADMIN_EMAIL = env.ADMIN_TEST_EMAIL;
const ADMIN_PASS = env.ADMIN_TEST_PASSWORD;
const BUYER_EMAIL = env.MP_TEST_BUYER_EMAIL;

const log = {
  header: (m) => console.log(`\n${COLORS.bold}${COLORS.magenta}=== ${m} ===${COLORS.reset}`),
  step: (m) => process.stdout.write(`${COLORS.cyan}▹ ${m}... ${COLORS.reset}`),
  pass: (status, time) => console.log(`${COLORS.green}PASS${COLORS.reset} [${status}] (${time}ms)`),
  fail: (status, time, msg) => {
    console.log(`${COLORS.red}FAIL${COLORS.reset} [${status}] (${time}ms) -> ${msg}`);
    return false;
  },
  info: (msg) => console.log(`${COLORS.yellow}INFO: ${msg}${COLORS.reset}`)
};

async function run() {
  // -1. OBTENER TOLKENS TEST
  log.header("OBTENCIÓN DE CREDENCIALES TEST");
  if (!env.MP_CLIENT_ID || !env.MP_CLIENT_SECRET) {
      log.info("Omitiendo OAuth (MP_CLIENT_ID/SECRET no configurados). Usando credenciales del .env");
  } else {
    log.step("Solicitando TEST- credentials (OAuth)");
    try {
        const oauthRes = await fetch('https://api.mercadopago.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            client_id: env.MP_CLIENT_ID,
            client_secret: env.MP_CLIENT_SECRET,
            grant_type: 'client_credentials',
            test_token: 'true'
        })
        });
        const oauthData = await oauthRes.json();
        if (!oauthRes.ok || !oauthData.access_token) {
            log.fail(oauthRes.status, 0, oauthData.message || "No se pudo obtener el token TEST");
            log.info("Continuando con credenciales estáticas...");
        } else {
            MP_ACCESS_TOKEN = oauthData.access_token;
            MP_PUBLIC_KEY = oauthData.public_key;
            log.pass(200, 0);
            log.info(`Token TEST obtenido: ${MP_ACCESS_TOKEN.substring(0, 10)}... (Public: ${MP_PUBLIC_KEY.substring(0, 10)}...)`);
        }
    } catch (e) {
        log.fail("ERR", 0, e.message);
        log.info("Continuando con credenciales estáticas...");
    }
  }

  // 0. VERIFICACIÓN INICIAL
  log.header("VERIFICACIÓN DE ENTORNO");
  if (!WEBHOOK_URL) {
    console.error(`${COLORS.red}ERROR: WEBHOOK_URL no configurada. Mercado Pago no podrá notificar el pago. Asegúrate de que ngrok esté corriendo.${COLORS.reset}`);
    process.exit(1);
  }
  log.info(`API Base: ${BASE_URL}`);
  log.info(`Webhook: ${WEBHOOK_URL}`);

  const results = { total: 0, pass: 0, fail: 0, errors: [] };
  const startTime = Date.now();
  let token = "";
  let testProductId = "";
  let preferenceData = null;
  let mpPaymentId = "";
  let hakoPaymentId = "";

  const track = (name, success) => {
    results.total++;
    if (success) results.pass++; 
    else { 
      results.fail++; 
      results.errors.push(name); 
    }
    return success;
  };

  try {
    log.header("FLUJO DE COMPRA");

    // 1. LOGIN
    log.step("Login como Admin");
    const loginStart = Date.now();
    const loginRes = await fetch(`${BASE_URL}/api/users/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: ADMIN_EMAIL, contraseña: ADMIN_PASS })
    });
    const loginJson = await loginRes.json();
    if (!track("Login Admin", loginRes.ok && loginJson.token)) {
      return log.fail(loginRes.status, Date.now() - loginStart, loginJson.error || "Fallo el login");
    }
    token = loginJson.token;
    const headers = { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" };
    log.pass(200, Date.now() - loginStart);

    // 2. OBTENER PRODUCTO
    log.step("Buscando producto disponible");
    const pRes = await fetch(`${BASE_URL}/api/products`);
    const pJsonRaw = await pRes.json();
    const pJson = pJsonRaw.products || pJsonRaw; // Handle different response formats
    if (!track("Obtener Producto", pRes.ok && pJson.length > 0)) {
      return log.fail(pRes.status, 0, "No hay productos en DB");
    }
    testProductId = pJson[0]._id;
    log.pass(200, 0);

    // 3. AGREGAR AL CARRITO (Paso necesario para validar limpieza)
    log.step("Agregando producto al carrito");
    const cartAddRes = await fetch(`${BASE_URL}/api/cart`, {
      method: "POST",
      headers,
      body: JSON.stringify({ productId: testProductId, quantity: 1 })
    });
    if (!track("Agregar Carrito", cartAddRes.ok)) {
      return log.fail(cartAddRes.status, 0, "No se pudo agregar al carrito");
    }
    log.pass(200, 0);

    // 4. CREAR PREFERENCIA
    log.step("Creando preferencia de pago");
    const prefStart = Date.now();
    const externalRef = `TEST_FLOW_${Date.now()}`;
    const prefRes = await fetch(`${BASE_URL}/api/payment/create_preference`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        items: [{ 
          title: pJson[0].nombre, 
          unit_price: 1000, 
          quantity: 1, 
          id: testProductId 
        }],
        payer: { email: BUYER_EMAIL, name: "Test", surname: "Buyer" },
        external_reference: externalRef
      })
    });
    preferenceData = await prefRes.json();
    if (!track("Crear Preferencia", prefRes.ok && preferenceData.preference_id)) {
      return log.fail(prefRes.status, Date.now() - prefStart, "Preferencia fallida");
    }
    log.pass(200, Date.now() - prefStart);

    // 5. SIMULAR PAGO EN SANDBOX
    log.header("SIMULACIÓN MERCADO PAGO");
    log.step("Tokenización y Pago Sandbox");
    const mpStart = Date.now();
    
    // a. Tokenizar tarjeta test
    const cardRes = await fetch(`https://api.mercadopago.com/v1/card_tokens?public_key=${MP_PUBLIC_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        card_number: "4444444444444444", 
        expiration_month: 12, 
        expiration_year: 2029, 
        security_code: "123", 
        cardholder: { name: "TEST BUYER" } 
      })
    });
    const cardData = await cardRes.json();
    if (!cardData.id) return log.fail(cardRes.status, 0, "Error en tokenización MP");

    // b. Crear Pago
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${MP_ACCESS_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        transaction_amount: 1000,
        token: cardData.id,
        description: "Prueba Integración Hako",
        installments: 1,
        payment_method_id: "visa",
        payer: { email: BUYER_EMAIL },
        external_reference: externalRef
      })
    });
    const mpJson = await mpRes.json();
    if (!track("Simulación Pago Approved", mpRes.ok && mpJson.status === "approved")) {
      return log.fail(mpRes.status, Date.now() - mpStart, mpJson.message || "Pago no aprobado");
    }
    mpPaymentId = mpJson.id.toString();
    log.pass(201, Date.now() - mpStart);

    // 6. POLLING HAKO
    log.header("SINCRONIZACIÓN HAKO");
    log.step("Esperando aprobación via Webhook (Max 30s)");
    const pollStart = Date.now();
    let isApproved = false;
    let lastStatus = "pending";
    for (let i = 0; i < 10; i++) {
        const checkRes = await fetch(`${BASE_URL}/api/payment/admin/all`, { headers });
        const payments = await checkRes.json();
        // El controller devuelve array directamente
        const found = payments.find(p => p.mp_payment_id === mpPaymentId);
        if (found) {
            lastStatus = found.status;
            if (found.status === "approved") {
                isApproved = true;
                hakoPaymentId = found._id || found.id;
                break;
            }
        }
        await new Promise(r => setTimeout(r, 3000));
    }
    const pollTime = Date.now() - pollStart;
    if (!track("Aprobación en Hako", isApproved)) {
        return log.fail("TIMEOUT", pollTime, `Estado final en Hako: ${lastStatus}`);
    }
    log.pass("OK", pollTime);

    // 7. VERIFICAR INTEGRIDAD
    log.step("Verificando que el carrito esté limpio");
    const cartCheckRes = await fetch(`${BASE_URL}/api/cart`, { headers });
    const cartCheckJson = await cartCheckRes.json();
    const isClean = !cartCheckJson.items || !cartCheckJson.items.some(i => i.id_producto === testProductId);
    track("Carrito Limpio", isClean);
    if (!isClean) log.fail("FAIL", 0, "El producto no fue removido del carrito"); else log.pass("OK", 0);

    // 8. REEMBOLSO (CASOS LÍMITE)
    log.header("CANAL DE REEMBOLSOS");
    
    log.step("Ejecutando reembolso administrativo");
    const rfStart = Date.now();
    const rfRes = await fetch(`${BASE_URL}/api/payment/admin/${hakoPaymentId}/refund`, { method: "POST", headers });
    if (!track("Reembolso Exitoso", rfRes.ok)) {
      log.fail(rfRes.status, Date.now() - rfStart, "Error al reembolsar");
    } else {
      log.pass(200, Date.now() - rfStart);
    }

    log.step("Reembolso duplicado (Edge Case 400)");
    const rf2Res = await fetch(`${BASE_URL}/api/payment/admin/${hakoPaymentId}/refund`, { method: "POST", headers });
    track("Edge Case Reembolsado", rf2Res.status === 400);
    log.pass(rf2Res.status, 0);

    log.step("Verificando orden cancelada");
    const orderRes = await fetch(`${BASE_URL}/api/orders`, { headers });
    const orders = await orderRes.json();
    const finalOrder = orders.find(o => o.payment?.mp_payment_id === mpPaymentId);
    if (!track("Estado Cancelado", finalOrder && finalOrder.status === "cancelled")) {
      log.fail("FAIL", 0, `Estado actual de la orden: ${finalOrder?.status}`);
    } else {
      log.pass("OK", 0);
    }

  } catch (err) {
    console.error(`\n${COLORS.red}ERROR CRÍTICO: ${err.message}${COLORS.reset}`);
  } finally {
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    log.header("RESUMEN FINAL");
    console.log(`Puntos probados: ${results.total}`);
    console.log(`${COLORS.green}PASS: ${results.pass}${COLORS.reset}`);
    console.log(`${COLORS.red}FAIL: ${results.fail}${COLORS.reset}`);
    if (results.errors.length > 0) {
      console.log(`${COLORS.yellow}Pasos fallidos: ${results.errors.join(", ")}${COLORS.reset}`);
    }
    console.log(`\nTiempo total de ejecución: ${totalTime}s`);
  }
}

run();
