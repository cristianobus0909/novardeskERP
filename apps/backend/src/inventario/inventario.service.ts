import { Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../common/context/tenant-context.service';
import { CreateMovimientoDto } from './dto/create-movimiento.dto';
import { CreateMovimientoLoteDto } from './dto/create-movimiento-lote.dto';

@Injectable()
export class InventarioService {
  constructor(
    private prisma: PrismaService,
    private tenantContext: TenantContextService
  ) {}

  private getTenantId() {
    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) throw new UnauthorizedException('Tenant no identificado');
    return tenantId;
  }

  // Obtener los depósitos del tenant. Si no existe ninguno, crea uno por defecto.
  async getDepositos() {
    const tenantId = this.getTenantId();
    let depositos = await this.prisma.deposito.findMany({
      where: { tenant_id: tenantId, activo: true }
    });

    if (depositos.length === 0) {
      const defaultDepot = await this.prisma.deposito.create({
        data: {
          tenant_id: tenantId,
          nombre: 'Depósito Principal',
          is_principal: true,
        }
      });
      depositos = [defaultDepot];
    }
    return depositos;
  }

  // Registrar un movimiento (Entrada/Salida/Remito)
  async registrarMovimiento(dto: CreateMovimientoDto, userId: number): Promise<any> {
    const tenantId = this.getTenantId();

    return this.prisma.$transaction(async (tx) => {
      // Validar que la variante pertenece al tenant
      const variante = await tx.productoVariante.findFirst({
        where: { id: dto.variante_id, tenant_id: tenantId }
      });
      if (!variante) throw new NotFoundException('Variante no encontrada');

      // Validar que el depósito pertenece al tenant
      const deposito = await tx.deposito.findFirst({
        where: { id: dto.deposito_id, tenant_id: tenantId }
      });
      if (!deposito) throw new NotFoundException('Depósito no encontrado');

      // Calcular factor de impacto en stock
      let factor = 0;
      if (['ENTRADA_COMPRA', 'ENTRADA_AJUSTE'].includes(dto.tipo)) {
        factor = 1;
      } else if (['SALIDA_VENTA', 'SALIDA_AJUSTE', 'REMITO_ENTREGA'].includes(dto.tipo)) {
        factor = -1;
      }

      if (factor === 0 && dto.tipo !== 'TRASLADO') {
        throw new BadRequestException('Tipo de movimiento inválido para afectar stock directamente.');
      }

      const cantidadAbsoluta = Math.abs(dto.cantidad);
      const stockChange = factor * cantidadAbsoluta;

      // Crear el registro de auditoría/movimiento
      const movimiento = await tx.stockMovimiento.create({
        data: {
          tenant_id: tenantId,
          deposito_id: dto.deposito_id,
          variante_id: dto.variante_id,
          usuario_id: userId,
          tipo: dto.tipo as any,
          cantidad: stockChange, // Se guarda el delta real (+/-)
          concepto: dto.concepto,
          comprobante: dto.comprobante
        }
      });

      // Actualizar el stock_actual en ProductoVariante (Global)
      await tx.productoVariante.update({
        where: { id: dto.variante_id },
        data: {
          stock_actual: {
            increment: stockChange
          }
        }
      });

      return movimiento;
    });
  }

  // Registrar un movimiento en lote (Entrada/Salida/Remito)
  async registrarMovimientoLote(dto: CreateMovimientoLoteDto, userId: number): Promise<any> {
    const tenantId = this.getTenantId();

    return this.prisma.$transaction(async (tx) => {
      // Validar que el depósito pertenece al tenant
      const deposito = await tx.deposito.findFirst({
        where: { id: dto.deposito_id, tenant_id: tenantId }
      });
      if (!deposito) throw new NotFoundException('Depósito no encontrado');

      // Calcular factor de impacto en stock
      let factor = 0;
      if (['ENTRADA_COMPRA', 'ENTRADA_AJUSTE'].includes(dto.tipo)) {
        factor = 1;
      } else if (['SALIDA_VENTA', 'SALIDA_AJUSTE', 'REMITO_ENTREGA'].includes(dto.tipo)) {
        factor = -1;
      }

      if (factor === 0 && dto.tipo !== 'TRASLADO') {
        throw new BadRequestException('Tipo de movimiento inválido para afectar stock directamente.');
      }

      const resultados = [];

      for (const item of dto.items) {
        // Validar que la variante pertenece al tenant
        const variante = await tx.productoVariante.findFirst({
          where: { id: item.variante_id, tenant_id: tenantId }
        });
        if (!variante) throw new NotFoundException(`Variante ID ${item.variante_id} no encontrada`);

        const cantidadAbsoluta = Math.abs(item.cantidad);
        const stockChange = factor * cantidadAbsoluta;

        // Crear el registro de auditoría/movimiento
        const movimiento = await tx.stockMovimiento.create({
          data: {
            tenant_id: tenantId,
            deposito_id: dto.deposito_id,
            variante_id: item.variante_id,
            usuario_id: userId,
            tipo: dto.tipo as any,
            cantidad: stockChange, // Se guarda el delta real (+/-)
            concepto: dto.concepto,
            comprobante: dto.comprobante
          }
        });

        // Actualizar el stock_actual en ProductoVariante (Global)
        await tx.productoVariante.update({
          where: { id: item.variante_id },
          data: {
            stock_actual: {
              increment: stockChange
            }
          }
        });

        resultados.push(movimiento);
      }

      return resultados;
    });
  }

  // Obtener el historial de un producto específico o general
  async getHistorial(varianteId?: number): Promise<any[]> {
    const tenantId = this.getTenantId();
    return this.prisma.stockMovimiento.findMany({
      where: {
        tenant_id: tenantId,
        ...(varianteId ? { variante_id: varianteId } : {})
      },
      orderBy: { fecha: 'desc' },
      include: {
        variante: { include: { producto: true } },
        deposito: true,
        usuario: { select: { id: true, nombre: true, email: true } }
      },
      take: 200 // Limitar últimos movimientos por rendimiento
    });
  }
}
