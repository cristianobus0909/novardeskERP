import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../common/context/tenant-context.service';

@Injectable()
export class ListasPrecioService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService
  ) {}

  private getTenantId() {
    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) throw new BadRequestException('No tenant');
    return tenantId;
  }

  async findAll(): Promise<any[]> {
    const tenantId = this.getTenantId();
    return this.prisma.listaPrecio.findMany({
      where: { tenant_id: tenantId },
      orderBy: { nombre: 'asc' },
      include: {
        _count: { select: { items: true } }
      }
    });
  }

  async findOne(id: number): Promise<any> {
    const tenantId = this.getTenantId();
    const lista = await this.prisma.listaPrecio.findFirst({
      where: { id, tenant_id: tenantId },
      include: {
        items: {
          include: {
            variante: {
              include: {
                producto: true
              }
            }
          }
        }
      }
    });
    if (!lista) throw new NotFoundException('Lista de precios no encontrada');
    return lista;
  }

  async create(dto: { nombre: string; items?: { variante_id: number; precio: number }[] }): Promise<any> {
    const tenantId = this.getTenantId();

    return this.prisma.$transaction(async (tx) => {
      const lista = await tx.listaPrecio.create({
        data: {
          tenant_id: tenantId,
          nombre: dto.nombre,
        }
      });

      if (dto.items && dto.items.length > 0) {
        await tx.listaPrecioItem.createMany({
          data: dto.items.map(item => ({
            lista_precio_id: lista.id,
            variante_id: item.variante_id,
            precio: item.precio
          }))
        });
      }

      // Return the newly created list with details
      const detailedList = await tx.listaPrecio.findFirst({
        where: { id: lista.id },
        include: {
          items: {
            include: {
              variante: {
                include: {
                  producto: true
                }
              }
            }
          }
        }
      });
      return detailedList;
    });
  }

  async update(id: number, dto: { nombre?: string; items?: { variante_id: number; precio: number }[] }): Promise<any> {
    const tenantId = this.getTenantId();

    return this.prisma.$transaction(async (tx) => {
      const lista = await tx.listaPrecio.findFirst({
        where: { id, tenant_id: tenantId }
      });
      if (!lista) throw new NotFoundException('Lista de precios no encontrada');

      if (dto.nombre) {
        await tx.listaPrecio.update({
          where: { id },
          data: { nombre: dto.nombre }
        });
      }

      if (dto.items) {
        // Eliminar items existentes
        await tx.listaPrecioItem.deleteMany({
          where: { lista_precio_id: id }
        });

        // Crear nuevos items
        if (dto.items.length > 0) {
          await tx.listaPrecioItem.createMany({
            data: dto.items.map(item => ({
              lista_precio_id: id,
              variante_id: item.variante_id,
              precio: item.precio
            }))
          });
        }
      }

      // Return the updated list with details
      const detailedList = await tx.listaPrecio.findFirst({
        where: { id },
        include: {
          items: {
            include: {
              variante: {
                include: {
                  producto: true
                }
              }
            }
          }
        }
      });
      return detailedList;
    });
  }

  async remove(id: number): Promise<any> {
    const tenantId = this.getTenantId();
    const lista = await this.prisma.listaPrecio.findFirst({
      where: { id, tenant_id: tenantId }
    });
    if (!lista) throw new NotFoundException('Lista de precios no encontrada');

    return this.prisma.listaPrecio.delete({
      where: { id }
    });
  }
}
