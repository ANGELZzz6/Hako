const fs = require('fs');
const path = require('path');

/* 
   test-admin-endpoints.js
   Script para validar la integridad de los endpoints administrativos de Hako.
   Node.js nativo (v18+).
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

// --- CARGA DE VARIABLES DE ENTORNO (NATIVO) ---
function loadEnv() {
  const envPath = path.resolve(__dirname, '../../.env');
  if (!fs.existsSync(envPath)) {
    console.error(`${COLORS.red}ERROR: No se encontró el archivo .env en la raíz.${COLORS.reset}`);
    process.exit(1);
  }
  
  const content = fs.readFileSync(envPath, 'utf-8');
  const config = {};
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length > 0) {
      config[key.trim()] = valueParts.join('=').trim();
    }
  });
  return config;
}

const env = loadEnv();
const BASE_URL = env.API_BASE_URL || 'http://localhost:5000';
const ADMIN_EMAIL = env.ADMIN_TEST_EMAIL;
const ADMIN_PASS = env.ADMIN_TEST_PASSWORD;

if (!ADMIN_EMAIL || !ADMIN_PASS) {
  console.error(`${COLORS.red}ERROR: ADMIN_TEST_EMAIL o ADMIN_TEST_PASSWORD no definidos en .env${COLORS.reset}`);
  process.exit(1);
}

// --- UTILIDADES DE LOGGING ---
const log = {
  pass: (url, status, time) => console.log(`${COLORS.green}PASS${COLORS.reset} | ${status} | ${time}ms | ${url}`),
  fail: (url, status, time, msg) => console.log(`${COLORS.red}FAIL${COLORS.reset} | ${status} | ${time}ms | ${url} -> ${msg}`),
  info: (msg) => console.log(`${COLORS.cyan}${msg}${COLORS.reset}`),
  header: (msg) => console.log(`\n${COLORS.bold}${COLORS.magenta}=== ${msg} ===${COLORS.reset}`)
};

// --- CORE DEL TESTER ---
async function runTests() {
  const startTime = Date.now();
  let token = '';
  let results = { pass: 0, fail: 0, errors: [] };

  log.info(`Iniciando pruebas en ${BASE_URL}...`);

  // 1. LOGIN (POST)
  try {
    const loginStart = Date.now();
    const loginRes = await fetch(`${BASE_URL}/api/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, contraseña: ADMIN_PASS })
    });
    
    const loginData = await loginRes.json();
    if (loginRes.ok && loginData.token) {
      token = loginData.token;
      log.pass('/api/users/login', 200, Date.now() - loginStart);
      results.pass++;
    } else {
      throw new Error(loginData.error || 'Credenciales inválidas');
    }
  } catch (err) {
    log.fail('/api/users/login', 'CRITICAL_FAIL', 0, err.message);
    console.error(`\n${COLORS.red}Abortando: El login de administrador falló.${COLORS.reset}`);
    process.exit(1);
  }

  const headers = { 'Authorization': `Bearer ${token}` };

  /**
   * Ejecuta un test contra un endpoint
   */
  async function test(name, url, options = {}) {
    const start = Date.now();
    try {
      const res = await fetch(`${BASE_URL}${url}`, { headers, ...options });
      const time = Date.now() - start;
      let data;
      try {
        data = await res.json();
      } catch (e) {
        data = { error: 'Respuesta no es JSON' };
      }

      if (res.ok) {
        log.pass(url, res.status, time);
        results.pass++;
        return data;
      } else {
        log.fail(url, res.status, time, data.error || data.message || 'Error desconocido');
        results.fail++;
        results.errors.push({ url, status: res.status });
        return null;
      }
    } catch (err) {
      log.fail(url, 'FETCH_ERR', Date.now() - start, err.message);
      results.fail++;
      results.errors.push({ url, status: 'FETCH_ERROR' });
      return null;
    }
  }

  // --- EJECUCIÓN SECUENCIAL DE TESTS ---
  
  log.header("HEALTH CHECKS");
  await test("Health Básico", "/api/health");
  await test("Health Detallado", "/api/health/detailed");
  await test("Health Base de Datos", "/api/health/database");
  await test("Health Servicios Externos", "/api/health/services");

  log.header("PRODUCTOS");
  const products = await test("Lista Admin de Productos", "/api/products/admin/all");
  if (products && products.productos && products.productos.length > 0) {
    // Probar detalle con el primer ID encontrado
    await test("Detalle de Producto Individual", `/api/products/${products.productos[0]._id}`);
  } else {
    console.log(`${COLORS.yellow}INFO: No hay productos para el test de detalle.${COLORS.reset}`);
  }

  log.header("ÓRDENES & PAGOS");
  await test("Lista Admin de Órdenes", "/api/orders");
  const payments = await test("Lista Admin de Pagos", "/api/payment/admin/all");
  if (payments && payments.payments && payments.payments.length > 0) {
    // Probar detalle con el primer ID encontrado
    const pId = payments.payments[0]._id || payments.payments[0].id;
    await test("Detalle de Pago Individual", `/api/payment/admin/${pId}`);
  } else {
    console.log(`${COLORS.yellow}INFO: No hay pagos para el test de detalle.${COLORS.reset}`);
  }

  log.header("CITAS & USUARIOS");
  const testDate = new Date();
  testDate.setDate(testDate.getDate() + 3);
  const dateStr = testDate.toISOString().split('T')[0];
  await test("Citas Disponibles (Slot Test)", `/api/appointments/available-slots/${dateStr}`);
  await test("Lista Admin de Citas", "/api/appointments/admin");
  await test("Lista Admin de Usuarios", "/api/users/all");

  log.header("QR & HISTORIAL");
  await test("Historial de QRs del Usuario Admin", "/api/qr/user");

  // --- RESUMEN FINAL ---
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
  log.header("RESUMEN FINAL DE LA PRUEBA");
  console.log(`Total endpoints probados: ${results.pass + results.fail}`);
  console.log(`${COLORS.green}PASS: ${results.pass}${COLORS.reset}`);
  console.log(`${COLORS.red}FAIL: ${results.fail}${COLORS.reset}`);
  
  if (results.errors.length > 0) {
    console.log(`\n${COLORS.yellow}Lista de Fallos:${COLORS.reset}`);
    results.errors.forEach(e => {
      let color = e.status >= 500 ? COLORS.red : COLORS.yellow;
      console.log(` - [${color}${e.status}${COLORS.reset}] ${e.url}`);
    });
  }
  
  console.log(`\nTiempo total de ejecución: ${totalTime}s`);
}

runTests();
