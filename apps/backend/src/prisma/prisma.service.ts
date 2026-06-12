import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@repo/database';
import { TenantContextService } from '../common/context/tenant-context.service';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly extendedPrisma: any;

  constructor(private readonly tenantContext: TenantContextService) {
    super({
      datasources: {
        db: {
          url: process.env.DATABASE_URL || 'mysql://root:EbwVqcAJjyjAkFetzBYMjBTnQXPYJylH@interchange.proxy.rlwy.net:26804/railway',
        },
      },
    });

    // Crear la extensión de Prisma para el aislamiento automático de inquilinos
    this.extendedPrisma = this.$extends({
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }: { model: string; operation: string; args: any; query: any }) {
            // Modelos que contienen la columna tenant_id y deben ser aislados
            const tenantScopedModels = ['User', 'Role', 'Producto', 'ProductoVariante', 'Venta'];

            if (tenantScopedModels.includes(model)) {
              const tenantId = tenantContext.getTenantId();


              // Solo aplicamos el aislamiento si hay un tenantId establecido en el contexto asíncrono
              if (tenantId) {
                // 1. Operaciones que soportan cláusula 'where' (filtrado de consultas y actualizaciones)
                if (operation !== 'create' && operation !== 'createMany') {
                  args.where = args.where || {};

                  // Validación de seguridad para prevenir bypassing manual
                  if (args.where.tenant_id !== undefined && args.where.tenant_id !== tenantId) {
                    throw new Error(
                      `Acceso no autorizado: Intento de filtrar por tenant_id ${args.where.tenant_id} pero el contexto activo requiere ${tenantId}`
                    );
                  }

                  // Inyectamos el filtro de inquilino de forma mandatoria
                  args.where.tenant_id = tenantId;
                }

                // 2. Operaciones de escritura que requieren inyectar el tenant_id en los datos
                if (operation === 'create') {
                  args.data = args.data || {};
                  args.data.tenant_id = tenantId;
                } else if (operation === 'createMany') {
                  if (Array.isArray(args.data)) {
                    args.data.forEach((item: any) => {
                      item.tenant_id = tenantId;
                    });
                  } else if (args.data?.data && Array.isArray(args.data.data)) {
                    args.data.data.forEach((item: any) => {
                      item.tenant_id = tenantId;
                    });
                  }
                } else if (operation === 'upsert') {
                  if (args.create) args.create.tenant_id = tenantId;
                  if (args.update) args.update.tenant_id = tenantId;
                }
              }
            }

            return query(args);
          },
        },
      },
    });

    // Retornar un Proxy para redirigir dinámicamente las llamadas al cliente Prisma extendido,
    // preservando el tipado de TypeScript del PrismaClient base.
    return new Proxy(this, {
      get: (target, prop) => {
        // Métodos de ciclo de vida de NestJS ejecutados en el target
        if (prop === 'onModuleInit' || prop === 'onModuleDestroy') {
          return (target as any)[prop];
        }
        // Todo lo demás (incluidos modelos y transacciones) se redirige al cliente extendido
        return target.extendedPrisma[prop];
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
