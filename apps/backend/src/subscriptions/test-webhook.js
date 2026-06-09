const crypto = require('crypto');

// Utilidad simple para fetch nativo en Node.js (utiliza global.fetch)
async function request(url, options = {}) {
  const response = await fetch(url, options);
  const isJson = response.headers.get('content-type')?.includes('application/json');
  const body = isJson ? await response.json() : await response.text();
  
  if (!response.ok) {
    throw { status: response.status, body };
  }
  return { status: response.status, body };
}

// Configuración de firmas para Mercado Pago
function generateSignature(secret, resourceId, requestId, timestamp) {
  const manifest = `id:${resourceId};request-id:${requestId || ''};ts:${timestamp};`;
  const v1 = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
  return `ts=${timestamp},v1=${v1}`;
}

async function runTests() {
  console.log('=== INICIANDO PRUEBAS DE SUSCRIPCIONES Y WEBHOOKS ===\n');

  const BASE_URL = 'http://localhost:3000';
  const WEBHOOK_SECRET = 'test_webhook_secret_key'; // Valor por defecto en development

  try {
    // 1. Iniciar sesión como administrador para obtener token y datos
    console.log('1. Autenticando usuario administrador...');
    const loginRes = await request(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@novardesk.com',
        password: 'admin123',
      }),
    });
    
    const token = loginRes.body.access_token;
    const initialTenant = loginRes.body.tenant;
    console.log(`   Autenticado con éxito. Tenant ID: ${initialTenant.id}, Plan Inicial: ${initialTenant.estado_plan}`);

    // 2. Obtener detalles de plan actual
    console.log('\n2. Consultando plan mediante endpoint protegido /tenants/my-plan...');
    const planRes = await request(`${BASE_URL}/tenants/my-plan`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    console.log('   Plan retornado:', JSON.stringify(planRes.body, null, 2));

    // 3. Crear preferencia de cobro
    console.log('\n3. Creando preferencia de suscripción con Mercado Pago...');
    const subscribeRes = await request(`${BASE_URL}/tenants/subscribe`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    console.log('   Suscripción creada en backend:', JSON.stringify(subscribeRes.body, null, 2));
    if (!subscribeRes.body.init_point.includes('mock-checkout')) {
      console.warn('   ¡Advertencia! init_point no es simulado. ¿Está configurado el token de desarrollo?');
    }

    // 4. Test Webhook: Simular Pago Exitoso (Firma Válida)
    console.log('\n4. Enviando Webhook de cobro Aprobado con firma HMAC válida...');
    const subscriptionId = `sub_active_${initialTenant.id}_999`;
    const requestId = 'req_' + Math.random().toString(36).substring(7);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = generateSignature(WEBHOOK_SECRET, subscriptionId, requestId, timestamp);

    const webhookPayload = {
      type: 'preapproval',
      action: 'preapproval.updated',
      data: { id: subscriptionId },
    };

    const webhookRes = await request(`${BASE_URL}/webhooks/mercadopago`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-signature': signature,
        'x-request-id': requestId,
      },
      body: JSON.stringify(webhookPayload),
    });
    console.log('   Respuesta del Webhook:', JSON.stringify(webhookRes.body, null, 2));

    // Verificar si el plan se actualizó a ACTIVE
    const planRes2 = await request(`${BASE_URL}/tenants/my-plan`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    console.log(`   Plan del Tenant en base de datos tras Webhook: ${planRes2.body.estado_plan} (Próximo cobro: ${planRes2.body.fecha_proximo_cobro})`);
    if (planRes2.body.estado_plan !== 'ACTIVE') {
      throw new Error('Error: El plan del inquilino debió actualizarse a ACTIVE.');
    }
    console.log('   ¡Éxito! El plan pasó a ACTIVE correctamente.');

    // 5. Test Webhook: Firma Inválida (Seguridad)
    console.log('\n5. Intentando vulnerar el Webhook con firma HMAC inválida...');
    try {
      await request(`${BASE_URL}/webhooks/mercadopago`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': 'ts=123,v1=firma_falsa_hacker_123',
          'x-request-id': requestId,
        },
        body: JSON.stringify(webhookPayload),
      });
      throw new Error('Error de Seguridad: El webhook debió rechazar la solicitud con firma falsa.');
    } catch (err) {
      if (err.status === 400) {
        console.log('   ¡Éxito! El servidor rechazó correctamente la firma inválida (HTTP 400).');
      } else {
        throw err;
      }
    }

    // 6. Test Webhook: Simular Pago Fallido / Mora (Firma Válida)
    console.log('\n6. Enviando Webhook de cobro Rechazado/Mora (past_due)...');
    const subscriptionIdPastDue = `sub_pastdue_${initialTenant.id}_999`;
    const signaturePastDue = generateSignature(WEBHOOK_SECRET, subscriptionIdPastDue, requestId, timestamp);

    await request(`${BASE_URL}/webhooks/mercadopago`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-signature': signaturePastDue,
        'x-request-id': requestId,
      },
      body: JSON.stringify({
        type: 'preapproval',
        action: 'preapproval.updated',
        data: { id: subscriptionIdPastDue },
      }),
    });

    const planRes3 = await request(`${BASE_URL}/tenants/my-plan`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    console.log(`   Plan del Tenant tras Webhook de impago: ${planRes3.body.estado_plan}`);
    if (planRes3.body.estado_plan !== 'PAST_DUE') {
      throw new Error('Error: El plan del inquilino debió actualizarse a PAST_DUE.');
    }
    console.log('   ¡Éxito! El plan pasó a PAST_DUE correctamente.');

    // 7. Test Webhook: Simular Cancelación (Firma Válida)
    console.log('\n7. Enviando Webhook de cancelación (cancelled)...');
    const subscriptionIdCancelled = `sub_cancelled_${initialTenant.id}_999`;
    const signatureCancelled = generateSignature(WEBHOOK_SECRET, subscriptionIdCancelled, requestId, timestamp);

    await request(`${BASE_URL}/webhooks/mercadopago`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-signature': signatureCancelled,
        'x-request-id': requestId,
      },
      body: JSON.stringify({
        type: 'preapproval',
        action: 'preapproval.updated',
        data: { id: subscriptionIdCancelled },
      }),
    });

    const planRes4 = await request(`${BASE_URL}/tenants/my-plan`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    console.log(`   Plan del Tenant tras Webhook de cancelación: ${planRes4.body.estado_plan}`);
    if (planRes4.body.estado_plan !== 'CANCELED') {
      throw new Error('Error: El plan del inquilino debió actualizarse a CANCELED.');
    }
    console.log('   ¡Éxito! El plan pasó a CANCELED correctamente.');

    console.log('\n=== TODAS LAS PRUEBAS DEL BACKEND COMPLETADAS CON ÉXITO ===');
  } catch (error) {
    console.error('\n❌ ERROR EN EL TEST DE INTEGRACIÓN:', error);
    process.exit(1);
  }
}

runTests();
