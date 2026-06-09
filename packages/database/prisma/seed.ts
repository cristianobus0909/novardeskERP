import { PrismaClient, EstadoPlan, EstadoARCA } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding for NovarDesk...');

  // 1. Limpieza de base de datos
  console.log('🧹 Cleaning existing tables...');
  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0;');
  await prisma.ventaDetalle.deleteMany({});
  await prisma.venta.deleteMany({});
  await prisma.productoVariante.deleteMany({});
  await prisma.producto.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.rolePermission.deleteMany({});
  await prisma.permission.deleteMany({});
  await prisma.role.deleteMany({});
  await prisma.tenant.deleteMany({});
  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1;');
  console.log('🧹 Clean completed.');

  // 2. Crear Permisos Globales del Sistema
  console.log('🔑 Seeding Permissions...');
  const permissionsData = [
    { codigo_permiso: 'pos:access', descripcion: 'Permite acceder a la interfaz del punto de venta (POS) y cobrar' },
    { codigo_permiso: 'productos:read', descripcion: 'Permite ver el catálogo de productos y variantes' },
    { codigo_permiso: 'productos:write', descripcion: 'Permite crear, editar y eliminar productos y variantes' },
    { codigo_permiso: 'ventas:read', descripcion: 'Permite ver el historial de ventas realizadas' },
    { codigo_permiso: 'ventas:write', descripcion: 'Permite anular o editar ventas registradas' },
    { codigo_permiso: 'usuarios:read', descripcion: 'Permite ver los usuarios del comercio' },
    { codigo_permiso: 'usuarios:write', descripcion: 'Permite crear, editar y suspender usuarios' },
    { codigo_permiso: 'settings:write', descripcion: 'Permite configurar los datos del comercio, facturación de ARCA y Mercado Pago' },
  ];

  const permissionsMap = new Map<string, number>();

  for (const perm of permissionsData) {
    const created = await prisma.permission.upsert({
      where: { codigo_permiso: perm.codigo_permiso },
      update: {},
      create: perm,
    });
    permissionsMap.set(created.codigo_permiso, created.id);
  }
  console.log(`🔑 ${permissionsMap.size} permissions seeded.`);

  // 3. Crear el Tenant de Prueba (Trial)
  console.log('🏢 Seeding Trial Tenant...');
  const trialTenant = await prisma.tenant.create({
    data: {
      razon_social: 'Comercio de Pruebas S.A.',
      cuit: '30712345678',
      estado_plan: EstadoPlan.TRIAL,
      fin_prueba: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
    },
  });
  console.log(`🏢 Tenant "${trialTenant.razon_social}" (ID: ${trialTenant.id}) created.`);

  // 4. Crear Roles para el Tenant
  console.log('👥 Seeding Roles for Tenant...');
  const adminRole = await prisma.role.create({
    data: {
      tenant_id: trialTenant.id,
      nombre: 'Administrador',
    },
  });

  const sellerRole = await prisma.role.create({
    data: {
      tenant_id: trialTenant.id,
      nombre: 'Vendedor',
    },
  });
  console.log(`👥 Roles created: Administrador (ID: ${adminRole.id}), Vendedor (ID: ${sellerRole.id})`);

  // 5. Vincular Permisos a los Roles
  console.log('🔗 Linking Permissions to Roles...');
  
  // Administrador tiene todos los permisos
  const adminPermissionsRelations = Array.from(permissionsMap.values()).map((permId) => ({
    role_id: adminRole.id,
    permission_id: permId,
  }));
  
  await prisma.rolePermission.createMany({
    data: adminPermissionsRelations,
  });

  // Vendedor solo tiene pos:access, productos:read y ventas:read
  const sellerPermissions = ['pos:access', 'productos:read', 'ventas:read'];
  const sellerPermissionsRelations = sellerPermissions
    .map((code) => permissionsMap.get(code))
    .filter((id): id is number => id !== undefined)
    .map((permId) => ({
      role_id: sellerRole.id,
      permission_id: permId,
    }));

  await prisma.rolePermission.createMany({
    data: sellerPermissionsRelations,
  });
  console.log('🔗 RolePermissions links created.');

  // 6. Crear Usuarios de Prueba
  console.log('👤 Seeding Users...');
  // Hashed version of "admin123"
  const passwordHash = '$2b$10$RMGkTTNc4oFkhgweLX5u6e.QXSYv2m.hvJA5rUllSHfA/XLZzjssi';

  const adminUser = await prisma.user.create({
    data: {
      tenant_id: trialTenant.id,
      role_id: adminRole.id,
      email: 'admin@novardesk.com',
      password: passwordHash,
      nombre: 'Admin Novardesk',
      activo: true,
    },
  });

  const sellerUser = await prisma.user.create({
    data: {
      tenant_id: trialTenant.id,
      role_id: sellerRole.id,
      email: 'vendedor@novardesk.com',
      password: passwordHash,
      nombre: 'Juan Vendedor',
      activo: true,
    },
  });
  console.log(`👤 Users created: Admin (${adminUser.email}), Vendedor (${sellerUser.email})`);

  // 7. Crear Productos y Variantes de Ejemplo (Multi-Rubro)
  console.log('📦 Seeding Products and Variants (Multi-Rubro)...');
  
  // Producto Rubro: Indumentaria
  const jeanProducto = await prisma.producto.create({
    data: {
      tenant_id: trialTenant.id,
      nombre: 'Jean Levi\'s 511',
      descripcion: 'Jean de corte slim fit para hombre',
      categoria: 'Indumentaria',
      marca: 'Levi\'s',
      es_servicio: false,
    },
  });

  await prisma.productoVariante.createMany({
    data: [
      {
        producto_id: jeanProducto.id,
        tenant_id: trialTenant.id,
        sku: 'JEAN-LEV-511-32-BLU',
        codigo_barras: '7790011223344',
        precio_venta: 45000.00,
        stock_actual: 15.000,
        atributos_extra: { talle: '32', color: 'Azul' },
      },
      {
        producto_id: jeanProducto.id,
        tenant_id: trialTenant.id,
        sku: 'JEAN-LEV-511-34-BLK',
        codigo_barras: '7790011223351',
        precio_venta: 47000.00,
        stock_actual: 8.000,
        atributos_extra: { talle: '34', color: 'Negro' },
      },
    ],
  });

  // Producto Rubro: Almacén (Venta fraccionada por peso)
  const quesoProducto = await prisma.producto.create({
    data: {
      tenant_id: trialTenant.id,
      nombre: 'Queso Cremoso La Paulina',
      descripcion: 'Queso cremoso fraccionable de primera calidad',
      categoria: 'Lácteos',
      marca: 'La Paulina',
      es_servicio: false,
    },
  });

  await prisma.productoVariante.create({
    data: {
      producto_id: quesoProducto.id,
      tenant_id: trialTenant.id,
      sku: 'ALM-QUESO-CREM-LAPAULINA',
      codigo_barras: '7790022334455',
      precio_venta: 8500.00, // Precio por kg
      stock_actual: 45.250, // 45.25 kg en stock
      atributos_extra: { fraccionable: true, unidad: 'kg' },
    },
  });

  console.log('🌿 Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
