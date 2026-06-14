import { Injectable, ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../common/context/tenant-context.service';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';

@Injectable()
export class ProductosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService
  ) {}

  async create(dto: CreateProductoDto): Promise<any> {
    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) {
      throw new UnauthorizedException('Inquilino no especificado en el contexto de la solicitud');
    }

    // 0. Validar límite de catálogo según el plan
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new UnauthorizedException('Inquilino no encontrado');
    }

    const currentVariantsCount = await this.prisma.productoVariante.count({
      where: { tenant_id: tenantId },
    });

    const newVariantsCount = dto.variantes.length;
    const totalVariantsCount = currentVariantsCount + newVariantsCount;

    let productLimit = -1;
    if (tenant.plan_tier === 'TRIAL') productLimit = 100;
    else if (tenant.plan_tier === 'BASICO') productLimit = 1000;
    else if (tenant.plan_tier === 'PREMIUM') productLimit = 10000;

    if (productLimit !== -1 && totalVariantsCount > productLimit) {
      throw new ConflictException(
        `Has alcanzado el límite de variantes permitido para tu plan ${tenant.plan_tier} (${productLimit} variantes). Tu conteo actual es de ${currentVariantsCount} variantes, e intentas agregar ${newVariantsCount}. Por favor mejora tu plan para continuar.`
      );
    }

    // 1. Validar que ninguno de los SKUs provistos colisione dentro del mismo Tenant
    for (const variant of dto.variantes) {
      const existingVariant = await this.prisma.productoVariante.findUnique({
        where: {
          tenant_id_sku: {
            tenant_id: tenantId,
            sku: variant.sku,
          },
        },
      });

      if (existingVariant) {
        throw new ConflictException(`El SKU "${variant.sku}" ya se encuentra registrado para este comercio`);
      }
    }

    // 2. Crear producto y variantes de forma transaccional
    return this.prisma.$transaction(async (tx) => {
      const producto = await tx.producto.create({
        data: {
          nombre: dto.nombre,
          descripcion: dto.descripcion,
          categoria: dto.categoria,
          marca: dto.marca,
          es_servicio: dto.es_servicio ?? false,
          unidad_medida: dto.unidad_medida ?? 'unidad',
          tenant_id: tenantId,
          variantes: {
            create: dto.variantes.map((v) => ({
              sku: v.sku,
              codigo_barras: v.codigo_barras,
              precio_venta: v.precio_venta,
              costo: v.costo ?? 0,
              stock_actual: v.stock_actual,
              stock_minimo: v.stock_minimo ?? 0,
              atributos_extra: v.atributos_extra || {},
              tenant_id: tenantId, // Vinculación explícita para la restricción única compuesta
            })),
          },
        },
        include: {
          variantes: true,
        },
      });

      return producto;
    });
  }

  async findAll(page: number = 1, limit: number = 50): Promise<any> {
    const skip = (page - 1) * limit;
    
    const [total, data] = await Promise.all([
      this.prisma.producto.count(),
      this.prisma.producto.findMany({
        skip,
        take: limit,
        include: {
          variantes: true,
        },
        orderBy: {
          id: 'desc',
        },
      })
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages
      }
    };
  }

  async findOne(id: number): Promise<any> {
    // El filtro de tenant_id se inyecta automáticamente
    const producto = await this.prisma.producto.findUnique({
      where: { id },
      include: {
        variantes: true,
      },
    });

    if (!producto) {
      throw new NotFoundException(`Producto con ID ${id} no encontrado en este comercio`);
    }

    return producto;
  }

  async findVariantBySkuOrBarcode(query: string): Promise<any> {
    // El filtro de tenant_id se inyecta automáticamente
    const variant = await this.prisma.productoVariante.findFirst({
      where: {
        OR: [
          { sku: query },
          { codigo_barras: query },
        ],
      },
      include: {
        producto: true,
      },
    });

    if (!variant) {
      throw new NotFoundException(`Variante de producto con código o SKU "${query}" no encontrada`);
    }

    return variant;
  }

  async update(id: number, dto: UpdateProductoDto): Promise<any> {
    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) {
      throw new UnauthorizedException('Inquilino no especificado en el contexto de la solicitud');
    }

    // Validar existencia en el Tenant actual y cargar variante(s)
    const existingProduct = await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      // 1. Actualizar el producto
      await tx.producto.update({
        where: { id },
        data: {
          nombre: dto.nombre,
          descripcion: dto.descripcion,
          categoria: dto.categoria,
          marca: dto.marca,
          es_servicio: dto.es_servicio,
          unidad_medida: dto.unidad_medida,
        },
      });

      // 2. Actualizar variantes si se proveen
      if (dto.variantes && dto.variantes.length > 0) {
        for (const v of dto.variantes) {
          if (v.id) {
            // Validar SKU único en caso de cambio de SKU
            if (v.sku) {
              const duplicateSku = await tx.productoVariante.findFirst({
                where: {
                  tenant_id: tenantId,
                  sku: v.sku,
                  NOT: { id: v.id },
                },
              });
              if (duplicateSku) {
                throw new ConflictException(`El SKU "${v.sku}" ya se encuentra registrado por otro producto`);
              }
            }

            await tx.productoVariante.update({
              where: { id: v.id },
              data: {
                sku: v.sku,
                codigo_barras: v.codigo_barras,
                precio_venta: v.precio_venta,
                costo: v.costo,
                stock_actual: v.stock_actual,
                stock_minimo: v.stock_minimo,
                atributos_extra: v.atributos_extra,
              },
            });
          } else {
            // Fallback: Actualizar la primera variante del producto
            const firstVariant = existingProduct.variantes[0];
            if (firstVariant) {
              if (v.sku) {
                const duplicateSku = await tx.productoVariante.findFirst({
                  where: {
                    tenant_id: tenantId,
                    sku: v.sku,
                    NOT: { id: firstVariant.id },
                  },
                });
                if (duplicateSku) {
                  throw new ConflictException(`El SKU "${v.sku}" ya se encuentra registrado por otro producto`);
                }
              }

              await tx.productoVariante.update({
                where: { id: firstVariant.id },
                data: {
                  sku: v.sku,
                  codigo_barras: v.codigo_barras,
                  precio_venta: v.precio_venta,
                  costo: v.costo,
                  stock_actual: v.stock_actual,
                  stock_minimo: v.stock_minimo,
                  atributos_extra: v.atributos_extra,
                },
              });
            }
          }
        }
      }

      // Devolver producto actualizado con sus variantes
      return tx.producto.findUnique({
        where: { id },
        include: {
          variantes: true,
        },
      });
    });
  }

  async remove(id: number): Promise<any> {
    // Validar existencia en el Tenant actual
    await this.findOne(id);

    // La eliminación se ejecuta en cascada en la base de datos para las variantes
    await this.prisma.producto.delete({
      where: { id },
    });

    return { message: 'Producto y sus variantes asociados eliminados exitosamente' };
  }
}
