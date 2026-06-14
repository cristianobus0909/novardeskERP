import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../common/context/tenant-context.service';

@Injectable()
export class ImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService
  ) {}

  async validateData(entity: string, data: any[]) {
    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) throw new UnauthorizedException('Tenant no especificado');

    const validatedData = [];
    let hasErrors = false;

    if (entity === 'productos') {
      const skus = data.map(item => item.codigo?.toString() || '').filter(s => s);
      const existingVariants = await this.prisma.productoVariante.findMany({
        where: { tenant_id: tenantId, sku: { in: skus } },
        select: { sku: true }
      });
      const existingSkus = new Set(existingVariants.map(v => v.sku));

      for (const row of data) {
        const errors = [...(row._errors || [])];
        if (row.codigo && existingSkus.has(row.codigo.toString())) {
          errors.push('El Código/SKU ya existe en BD');
        }
        if (errors.length > 0) hasErrors = true;
        validatedData.push({ ...row, _errors: errors });
      }

    } else if (entity === 'clientes') {
      const cuits = data.map(item => item.cuit_dni?.toString() || '').filter(s => s);
      const existingClientes = await this.prisma.cliente.findMany({
        where: { tenant_id: tenantId, cuit_dni: { in: cuits } },
        select: { cuit_dni: true }
      });
      const existingCuits = new Set(existingClientes.map(c => c.cuit_dni));

      for (const row of data) {
        const errors = [...(row._errors || [])];
        if (row.cuit_dni && existingCuits.has(row.cuit_dni.toString())) {
          errors.push('El DNI/CUIT ya existe en BD');
        }
        if (errors.length > 0) hasErrors = true;
        validatedData.push({ ...row, _errors: errors });
      }

    } else if (entity === 'proveedores') {
      const cuits = data.map(item => item.cuit?.toString() || '').filter(s => s);
      const existingProveedores = await this.prisma.proveedor.findMany({
        where: { tenant_id: tenantId, cuit: { in: cuits } },
        select: { cuit: true }
      });
      const existingCuits = new Set(existingProveedores.map(c => c.cuit));

      for (const row of data) {
        const errors = [...(row._errors || [])];
        if (row.cuit && existingCuits.has(row.cuit.toString())) {
          errors.push('El CUIT ya existe en BD');
        }
        if (!row.razon_social) errors.push('Razón social vacía');
        if (errors.length > 0) hasErrors = true;
        validatedData.push({ ...row, _errors: errors });
      }

    } else if (entity === 'stock') {
      const skus = data.map(item => item.sku?.toString() || '').filter(s => s);
      const existingVariants = await this.prisma.productoVariante.findMany({
        where: { tenant_id: tenantId, sku: { in: skus } },
        select: { sku: true }
      });
      const existingSkus = new Set(existingVariants.map(v => v.sku));

      for (const row of data) {
        const errors = [...(row._errors || [])];
        if (!row.sku) {
          errors.push('SKU vacío');
        } else if (!existingSkus.has(row.sku.toString())) {
          errors.push('El SKU no existe en la BD (debe existir para actualizar stock)');
        }
        if (row.nuevo_stock_total === undefined || isNaN(Number(row.nuevo_stock_total))) {
          errors.push('El valor de stock es inválido');
        }
        if (errors.length > 0) hasErrors = true;
        validatedData.push({ ...row, _errors: errors });
      }

    } else {
      throw new BadRequestException('Entidad no soportada');
    }

    return { validatedData, hasErrors };
  }

  async commitData(entity: string, data: any[]) {
    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) throw new UnauthorizedException('Tenant no especificado');

    return this.prisma.$transaction(async (tx) => {
      let count = 0;
      if (entity === 'productos') {
        for (const row of data) {
          await tx.producto.create({
            data: {
              nombre: row.nombre?.toString() || '',
              marca: row.marca?.toString() || undefined,
              descripcion: row.descripcion?.toString() || undefined,
              categoria: row.categoria?.toString() || 'Sin Categoría',
              tenant_id: tenantId,
              variantes: {
                create: [{
                  sku: row.codigo?.toString() || '',
                  codigo_barras: row.codigo_barras?.toString() || undefined,
                  precio_venta: Number(row.precio_venta) || 0,
                  costo: row.costo !== undefined && !isNaN(Number(row.costo)) ? Number(row.costo) : 0,
                  stock_actual: Number(row.stock_actual) || 0,
                  tenant_id: tenantId,
                }]
              }
            }
          });
          count++;
        }
      } else if (entity === 'clientes') {
        for (const row of data) {
          await tx.cliente.create({
            data: {
              cuit_dni: row.cuit_dni.toString(),
              razon_social: row.razon_social.toString(),
              condicion_iva: row.condicion_iva?.toString() || 'Consumidor Final',
              email: row.email?.toString(),
              telefono: row.telefono?.toString(),
              direccion: row.direccion?.toString(),
              tenant_id: tenantId,
            }
          });
          count++;
        }
      } else if (entity === 'proveedores') {
        for (const row of data) {
          await tx.proveedor.create({
            data: {
              cuit: row.cuit?.toString(),
              razon_social: row.razon_social.toString(),
              condicion_iva: row.condicion_iva?.toString() || 'Responsable Inscripto',
              email: row.email?.toString(),
              contacto: row.contacto?.toString(),
              tenant_id: tenantId,
            }
          });
          count++;
        }
      } else if (entity === 'stock') {
        for (const row of data) {
          await tx.productoVariante.update({
            where: {
              tenant_id_sku: { tenant_id: tenantId, sku: row.sku.toString() }
            },
            data: {
              stock_actual: Number(row.nuevo_stock_total)
            }
          });
          count++;
        }
      } else {
        throw new BadRequestException('Entidad no soportada');
      }

      return { message: `Importación completada exitosamente`, count };
    });
  }
}
