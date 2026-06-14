const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const tenants = await prisma.tenant.findMany({ select: { id: true, plan_tier: true, razon_social: true } });
  console.log(tenants);
}
main().catch(console.error).finally(() => prisma.$disconnect());
