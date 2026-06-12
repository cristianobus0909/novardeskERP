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
          tenant_id: tenantId,
          variantes: {
            create: dto.variantes.map((v) => ({
              sku: v.sku,
              codigo_barras: v.codigo_barras,
              precio_venta: v.precio_venta,
              stock_actual: v.stock_actual,
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
    // Validar existencia en el Tenant actual
    await this.findOne(id);

    return this.prisma.producto.update({
      where: { id },
      data: {
        nombre: dto.nombre,
        descripcion: dto.descripcion,
        categoria: dto.categoria,
        marca: dto.marca,
        es_servicio: dto.es_servicio,
      },
      include: {
        variantes: true,
      },
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
