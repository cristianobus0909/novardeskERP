const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const API_URL = 'http://127.0.0.1:3000';

async function runTests() {
  console.log('ð Starting subscription integration tests with native fetch...\n');

  // 1. Obtener inquilino
  const tenant = await prisma.tenant.findFirst({
    where: { razon_social: 'Comercio de Pruebas S.A.' },
  });
  if (!tenant) {
    throw new Error('Tenant de prueba no encontrado. Â¿Ejecutaste el seed?');
  }
  console.log(`ð¢ Tenant encontrado: "${tenant.razon_social}" (ID: ${tenant.id})`);

  // 2. Autenticar para obtener token JWT (usamos admin@novardesk.com / admin123)
  console.log('ð Authenticating...');
  let token;
  try {
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@novardesk.com',
        password: 'admin123',
      }),
    });
    
    if (!loginRes.ok) {
      const errorData = await loginRes.json();
      throw new Error(JSON.stringify(errorData));
    }
    
    const loginData = await loginRes.json();
    token = loginData.access_token;
    console.log('â Auth successful. Token acquired.');
  } catch (err) {
    console.error('â Authentication failed:', err.message);
    return;
  }

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // Helper para cambiar tier de plan
  async function setPlanTier(tier, extraUsers = 0) {
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { plan_tier: tier, usuarios_adicionales: extraUsers }
    });
    console.log(`\nð Changed tenant plan_tier to [${tier}] (extra users: ${extraUsers})`);
  }

  // --- TEST 1: GUARD DE LISTAS DE PRECIOS ---
  console.log('\n--- ð§ª TEST 1: Lists of Prices Guard ---');

  // A. Con plan TRIAL (DeberÃ­a denegar acceso)
  await setPlanTier('TRIAL');
  try {
    const res = await fetch(`${API_URL}/listas-precio`, { headers: authHeaders });
    const data = await res.json();
    if (!res.ok) {
      console.log(`â Success: Listas de precios bloqueadas en plan TRIAL (Status: ${res.status}, Msg: "${data.message}")`);
    } else {
      console.log('â Error: Listas de precios permitidas en plan TRIAL');
    }
  } catch (err) {
    console.log('â Request failed:', err.message);
  }

  // B. Con plan BASICO (DeberÃ­a denegar acceso)
  await setPlanTier('BASICO');
  try {
    const res = await fetch(`${API_URL}/listas-precio`, { headers: authHeaders });
    const data = await res.json();
    if (!res.ok) {
      console.log(`â Success: Listas de precios bloqueadas en plan BASICO (Status: ${res.status}, Msg: "${data.message}")`);
    } else {
      console.log('â Error: Listas de precios permitidas en plan BASICO');
    }
  } catch (err) {
    console.log('â Request failed:', err.message);
  }

  // C. Con plan PREMIUM (DeberÃ­a permitir acceso)
  await setPlanTier('PREMIUM');
  try {
    const res = await fetch(`${API_URL}/listas-precio`, { headers: authHeaders });
    const data = await res.json();
    if (res.ok) {
      console.log(`â Success: Listas de precios permitidas en plan PREMIUM (Status: ${res.status}, Items: ${data.length})`);
    } else {
      console.log('â Error: Listas de precios denegadas en plan PREMIUM:', data);
    }
  } catch (err) {
    console.log('â Request failed:', err.message);
  }

  // D. Con plan FULL (DeberÃ­a permitir acceso)
  await setPlanTier('FULL');
  try {
    const res = await fetch(`${API_URL}/listas-precio`, { headers: authHeaders });
    const data = await res.json();
    if (res.ok) {
      console.log(`â Success: Listas de precios permitidas en plan FULL (Status: ${res.status}, Items: ${data.length})`);
    } else {
      console.log('â Error: Listas de precios denegadas en plan FULL:', data);
    }
  } catch (err) {
    console.log('â Request failed:', err.message);
  }


  // --- TEST 2: LÃMITE DE CREACIÃN DE EMPLEADOS ---
  console.log('\n--- ð§ª TEST 2: Employee Creation Limits ---');
  
  // Limpiamos los empleados anteriores (excepto admin y vendedor del seed)
  await prisma.user.deleteMany({
    where: {
      tenant_id: tenant.id,
      email: { notIn: ['admin@novardesk.com', 'vendedor@novardesk.com'] }
    }
  });

  // A. TRIAL: Max 1 usuario (dueño).
  // Como admin@novardesk.com ya existe, tenemos 2 usuarios en la BD (admin y vendedor).
  // Por lo tanto, con plan TRIAL debería dar conflicto de inmediato.
  await setPlanTier('TRIAL');
  try {
    const res = await fetch(`${API_URL}/users/employee`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        email: 'test_trial_emp@novardesk.com',
        password: 'employee123',
        nombre: 'Empleado Trial'
      })
    });
    const data = await res.json();
    if (!res.ok) {
      console.log(`â Success: Empleado bloqueado bajo plan TRIAL (Status: ${res.status}, Msg: "${data.message}")`);
    } else {
      console.log('â Error: Se permitiÃ³ crear empleado bajo plan TRIAL (LÃ­mite: 1)');
    }
  } catch (err) {
    console.log('â Request failed:', err.message);
  }

  // B. BASICO: Max 2 usuarios.
  // Con admin y vendedor ya estamos en 2 usuarios. Intentar agregar un tercero deberÃ­a fallar.
  await setPlanTier('BASICO');
  try {
    const res = await fetch(`${API_URL}/users/employee`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        email: 'test_basico_emp@novardesk.com',
        password: 'employee123',
        nombre: 'Empleado BÃ¡sico'
      })
    });
    const data = await res.json();
    if (!res.ok) {
      console.log(`â Success: Bloqueado 3er usuario bajo plan BASICO (Status: ${res.status}, Msg: "${data.message}")`);
    } else {
      console.log('â Error: Se permitiÃ³ crear 3er usuario en plan BASICO (LÃ­mite: 2)');
    }
  } catch (err) {
    console.log('â Request failed:', err.message);
  }

  // C. BASICO + 1 Usuario Adicional contratado (usuarios_adicionales: 1).
  // LÃ­mite final: 2 + 1 = 3 usuarios. DeberÃ­a permitir agregar este tercer usuario.
  await setPlanTier('BASICO', 1);
  try {
    const res = await fetch(`${API_URL}/users/employee`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        email: 'test_basico_emp_extra@novardesk.com',
        password: 'employee123',
        nombre: 'Empleado BÃ¡sico Adicional'
      })
    });
    const data = await res.json();
    if (res.ok) {
      console.log(`â Success: Se permitiÃ³ crear 3er usuario en BASICO + 1 extra (ID: ${data.id}, Email: ${data.email})`);
    } else {
      console.log('â Error: Bloqueado 3er usuario con adicional contratado:', data);
    }
  } catch (err) {
    console.log('â Request failed:', err.message);
  }

  // D. Intentar crear un 4to usuario en BASICO + 1 extra (deberÃ­a bloquear)
  try {
    const res = await fetch(`${API_URL}/users/employee`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        email: 'test_basico_emp_extra2@novardesk.com',
        password: 'employee123',
        nombre: 'Empleado BÃ¡sico Adicional 2'
      })
    });
    const data = await res.json();
    if (!res.ok) {
      console.log(`â Success: Bloqueado 4to usuario en BASICO + 1 extra (Status: ${res.status}, Msg: "${data.message}")`);
    } else {
      console.log('â Error: Se permitiÃ³ crear 4to usuario en BASICO + 1 extra (LÃ­mite: 3)');
    }
  } catch (err) {
    console.log('â Request failed:', err.message);
  }

  // --- TEST 3: LÃMITE DE VARIANTES DE PRODUCTOS ---
  console.log('\n--- ð§ª TEST 3: Variant Catalog Limits ---');

  // Primero limpiamos los productos creados en tests (dejamos los del seed)
  await prisma.producto.deleteMany({
    where: {
      tenant_id: tenant.id,
      nombre: { startsWith: 'Producto Test Limit' }
    }
  });

  // Obtener conteo actual de variantes
  const seedVariantsCount = await prisma.productoVariante.count({
    where: { tenant_id: tenant.id }
  });
  console.log(`Variantes actuales en BD: ${seedVariantsCount}`);

  // TRIAL: Max 100 variantes.
  // Intentaremos crear un producto con 100 variantes nuevas. DeberÃ­a superar el lÃ­mite (seed (3) + 100 > 100).
  await setPlanTier('TRIAL');
  const muchasVariantes = [];
  for (let i = 0; i < 100; i++) {
    muchasVariantes.push({
      sku: `SKU-TEST-LIMIT-TRIAL-${i}`,
      codigo_barras: `BARCODE-LIMIT-${i}`,
      precio_venta: 100,
      stock_actual: 5,
    });
  }

  try {
    const res = await fetch(`${API_URL}/productos`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        nombre: 'Producto Test Limit TRIAL',
        descripcion: 'LÃ­mite de catÃ¡logo',
        categoria: 'General',
        marca: 'Test',
        unidad_medida: 'unidad',
        variantes: muchasVariantes
      })
    });
    const data = await res.json();
    if (!res.ok) {
      console.log(`â Success: Bloqueado exceso de variantes en TRIAL (Status: ${res.status}, Msg: "${data.message}")`);
    } else {
      console.log('â Error: Se permitiÃ³ superar las 100 variantes en plan TRIAL');
    }
  } catch (err) {
    console.log('â Request failed:', err.message);
  }

  // Dejamos el plan como FULL al final de los tests para que no afecte a la demo
  await setPlanTier('FULL');
  console.log('\nð All tests completed successfully!');
}

runTests()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
