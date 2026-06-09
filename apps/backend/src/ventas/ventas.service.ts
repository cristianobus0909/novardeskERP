import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../common/context/tenant-context.service';
import { CreateVentaDto } from './dto/create-venta.dto';

@Injectable()
export class VentasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService
  ) {}

  async create(userId: number, dto: CreateVentaDto): Promise<any> {
    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) {
      throw new UnauthorizedException('Inquilino no especificado en el contexto de la solicitud');
    }

    if (!dto.detalles || dto.detalles.length === 0) {
      throw new BadRequestException('La venta debe tener al menos un artículo.');
    }

    // Validar estado de suscripción del Tenant
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (tenant && (tenant.estado_plan === 'PAST_DUE' || tenant.estado_plan === 'CANCELED')) {
      throw new BadRequestException('El acceso al Punto de Venta está restringido. Por favor regularice su suscripción.');
    }

    // Ejecutar transaccionalmente en la base de datos
    return this.prisma.$transaction(async (tx) => {
      const detallesParaCrear = [];

      for (const item of dto.detalles) {
        // Buscar la variante y su producto asociado
        const variante = await tx.productoVariante.findUnique({
          where: { id: item.variante_id },
          include: { producto: true },
        });

        if (!variante) {
          throw new BadRequestException(`La variante con ID ${item.variante_id} no existe.`);
        }

        // Si es un producto físico (no un servicio), validamos y descontamos stock
        if (!variante.producto.es_servicio) {
          const stockActual = Number(variante.stock_actual);
          if (stockActual < item.cantidad) {
            throw new BadRequestException(
              `Stock insuficiente para la variante "${variante.sku}". Disponible: ${stockActual}, Solicitado: ${item.cantidad}`
            );
          }

          // Actualizar stock de la variante
          await tx.productoVariante.update({
            where: { id: item.variante_id },
            data: {
              stock_actual: {
                decrement: item.cantidad,
              },
            },
          });
        }

        detallesParaCrear.push({
          variante_id: item.variante_id,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
          subtotal: item.subtotal,
        });
      }

      // Crear cabecera de la venta y sus detalles vinculados
      const venta = await tx.venta.create({
        data: {
          tenant_id: tenantId,
          user_id: userId,
          id_cliente: dto.id_cliente || null,
          nombre_cliente: dto.nombre_cliente || 'Consumidor Final',
          total: dto.total,
          metodo_pago: dto.metodo_pago,
          estado_arca: 'NO_FISCAL',
          detalles: {
            create: detallesParaCrear,
          },
        },
        include: {
          detalles: {
            include: {
              variante: {
                include: {
                  producto: true,
                },
              },
            },
          },
          usuario: {
            select: {
              id: true,
              nombre: true,
              email: true,
            },
          },
        },
      });

      return venta;
    });
  }

  async findAll(): Promise<any> {
    return this.prisma.venta.findMany({
      include: {
        detalles: {
          include: {
            variante: {
              include: {
                producto: true,
              },
            },
          },
        },
        usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
          },
        },
      },
      orderBy: {
        fecha_venta: 'desc',
      },
    });
  }

  async findOne(id: number): Promise<any> {
    const venta = await this.prisma.venta.findUnique({
      where: { id },
      include: {
        detalles: {
          include: {
            variante: {
              include: {
                producto: true,
              },
            },
          },
        },
        usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
          },
        },
      },
    });

    if (!venta) {
      throw new BadRequestException(`Venta con ID ${id} no encontrada en este comercio.`);
    }

    return venta;
  }
}
