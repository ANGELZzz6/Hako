const fs = require('fs');
const path = require('path');

/* 
   test-admin-edge-cases.js
   Script para validar el manejo de errores, seguridad y límites de Hako.
*/

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
const ADMIN_EMAIL = env.ADMIN_TEST_EMAIL;
const ADMIN_PASS = env.ADMIN_TEST_PASSWORD;

let adminToken = '';
let serverWarnings = [];

async function loginAsAdmin() {
  try {
    const res = await fetch(`${BASE_URL}/api/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, contraseña: ADMIN_PASS })
    });
    const data = await res.json();
    if (data.token) { adminToken = data.token; return true; }
    return false;
  } catch (err) { return false; }
}

async function runEdgeTests() {
  const startTime = Date.now();
  let results = { pass: 0, fail: 0, errors: [] };

  console.log(`${COLORS.cyan}Obteniendo token inicial...${COLORS.reset}`);
  await loginAsAdmin();

  async function testCase(desc, url, expectedStatus, options = {}) {
    const start = Date.now();
    let retried = false;
    if (!options.headers) options.headers = {};
    if (options.headers['Authorization'] === undefined && adminToken) {
      options.headers['Authorization'] = `Bearer ${adminToken}`;
    }

    try {
      let res = await fetch(`${BASE_URL}${url}`, options);
      if (res.status === 500) serverWarnings.push(`[500] en ${url} (${desc})`);

      if (res.status === 401 && expectedStatus !== 401) {
        await loginAsAdmin();
        options.headers['Authorization'] = `Bearer ${adminToken}`;
        res = await fetch(`${BASE_URL}${url}`, options);
        retried = true;
      }

      const pass = res.status === expectedStatus;
      const label = pass ? `${COLORS.green}PASS${COLORS.reset}` : `${COLORS.red}FAIL${COLORS.reset}`;
      console.log(`${label} | ${res.status} esperado ${expectedStatus} | ${Date.now() - start}ms | ${desc}${retried ? ' [RETRY]' : ''}`);
      
      if (pass) results.pass++;
      else {
        results.fail++;
        results.errors.push({ desc, received: res.status, expected: expectedStatus });
      }
    } catch (err) {
      console.log(`${COLORS.red}FAIL${COLORS.reset} | ERR | ${expectedStatus} | 0ms | ${desc} (${err.message})`);
      results.fail++;
    }
  }

  // 1. SEGURIDAD BÁSICA
  logHeader("AUTENTICACIÓN & SEGURIDAD");
  await testCase("Login - Contraseña incorrecta", "/api/users/login", 401, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, contraseña: 'wrong' })
  });
  await testCase("Login - Email inexistente", "/api/users/login", 404, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'no_existo@hako.com', contraseña: 'any' })
  });
  await testCase("Admin - Acceso sin token", "/api/users/all", 401, { headers: { 'Authorization': '' } });

  // 2. CITAS
  logHeader("CITAS");
  await testCase("Citas - Fecha pasada", "/api/appointments/available-slots/2020-01-01", 400);
  await testCase("Slots - Hora sin casilleros disponibles no retorna available", "/api/appointments/available-slots/" + new Date().toISOString().split('T')[0], 200);

  // 3. IDs & EXISTENCIA
  const validNoId = "000000000000000000000000";
  logHeader("FORMATOS DE ID & EXISTENCIA");
  await testCase("Órdenes - ID malformado", "/api/orders/bad-id", 400);
  await testCase("QR - Generar ID malformado", "/api/qr/generate/bad-id", 400, { method: 'POST' });
  await testCase("Productos - ID malformado", "/api/products/bad-id", 400, { headers: { 'Authorization': '' } });

  // 4. BLOQUEO DE CUENTA (AL FINAL PARA EVITAR PERDER EL TOKEN ANTES)
  logHeader("TEST DE BLOQUEO (USANDO EMAIL ADMIN)");
  console.log(`${COLORS.yellow}⚠️  Advertencia: Esto bloqueará el acceso al admin de pruebas por 15 min.${COLORS.reset}`);
  for(let i=1; i<=6; i++) {
    const isLockedAttempt = i === 6;
    const expected = isLockedAttempt ? 423 : 400;
    await testCase(`Bloqueo - Intento ${i}`, "/api/users/login", expected, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, contraseña: 'pass_incorrecta_test' })
    });
  }

  // RESUMEN
  logHeader("RESUMEN FINAL");
  console.log(`Total: ${results.pass + results.fail} | PASS: ${COLORS.green}${results.pass}${COLORS.reset} | FAIL: ${COLORS.red}${results.fail}${COLORS.reset}`);
  if (serverWarnings.length > 0) {
    logHeader("WARNINGS DEL SERVIDOR");
    serverWarnings.forEach(w => console.log(`⚠️  ${w}`));
  }
}

function logHeader(m) { console.log(`\n${COLORS.bold}${COLORS.magenta}=== ${m} ===${COLORS.reset}`); }

runEdgeTests();
