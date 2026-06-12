import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../common/context/tenant-context.service';
import { CreateVentaDto } from './dto/create-venta.dto';
import { AfipService } from './afip.service';

@Injectable()
export class VentasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly afipService: AfipService
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

    // Verificar si el usuario tiene una caja abierta
    const cajaAbierta = await this.prisma.cajaTurno.findFirst({
      where: {
        tenant_id: tenantId,
        user_id: userId,
        estado: 'ABIERTA'
      }
    });

    if (!cajaAbierta) {
      throw new BadRequestException('DEBES_ABRIR_CAJA');
    }

    // Ejecutar transaccionalmente en la base de datos
    const ventaGuardada = await this.prisma.$transaction(async (tx) => {
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

      const subtotal = dto.subtotal ?? dto.total;
      const descuento_monto = dto.descuento_monto || 0;
      const descuento_motivo = dto.descuento_motivo || null;
      const cupon_id = dto.cupon_id || null;

      const pagosParaCrear = [];
      if (dto.pagos && dto.pagos.length > 0) {
        pagosParaCrear.push(...dto.pagos);
      } else if (dto.metodo_pago) {
        pagosParaCrear.push({ metodo_pago: dto.metodo_pago, monto: dto.total });
      } else {
        throw new BadRequestException('Debe proporcionar al menos un método de pago válido');
      }

      // Validar que la suma de los pagos sea igual al total a cobrar
      const sumaPagos = pagosParaCrear.reduce((acc, p) => acc + p.monto, 0);
      if (Math.abs(sumaPagos - dto.total) > 0.01) {
        throw new BadRequestException(`La suma de los pagos (${sumaPagos}) no coincide con el total (${dto.total})`);
      }

      // Validación de Cuenta Corriente
      const cuentasCorrienteIds: Record<number, number> = {};
      for (let i = 0; i < pagosParaCrear.length; i++) {
        const p = pagosParaCrear[i]!;
        if (p.metodo_pago === 'CUENTA_CORRIENTE') {
          if (!dto.cliente_id) {
            throw new BadRequestException('Debe seleccionar un cliente para cobrar a Cuenta Corriente.');
          }
          
          const cuenta = await tx.cuentaCorriente.findUnique({
            where: { cliente_id: dto.cliente_id }
          });
          
          if (!cuenta || !cuenta.activa) {
            throw new BadRequestException('El cliente no tiene una Cuenta Corriente activa.');
          }
          
          const limite = Number(cuenta.limite_credito);
          const saldo = Number(cuenta.saldo_actual);
          const disponible = limite - saldo;
          if (limite !== -1 && disponible < p.monto) {
            throw new BadRequestException(`Límite de crédito excedido. Disponible: $${disponible}. Solicitado: $${p.monto}`);
          }
          
          // Actualizamos el saldo
          await tx.cuentaCorriente.update({
            where: { id: cuenta.id },
            data: { saldo_actual: { increment: p.monto } }
          });

          cuentasCorrienteIds[i] = cuenta.id;
        }
      }

      const recargo_monto = (dto as any).recargo_monto || 0;
      const recargo_motivo = (dto as any).recargo_motivo || null;

      // Crear cabecera de la venta y sus detalles vinculados
      const venta = await tx.venta.create({
        data: {
          tenant_id: tenantId,
          user_id: userId,
          caja_turno_id: cajaAbierta.id,
          cliente_id: dto.cliente_id || null,
          id_cliente: dto.id_cliente || null,
          nombre_cliente: dto.nombre_cliente || 'Consumidor Final',
          subtotal,
          descuento_monto,
          descuento_motivo,
          recargo_monto,
          recargo_motivo,
          cupon_id: dto.cupon_id,
          promocion_id: dto.promocion_id,
          total: dto.total,
          metodo_pago: dto.metodo_pago || pagosParaCrear[0]?.metodo_pago || 'EFECTIVO', // Keep for backward compatibility
          estado_arca: 'NO_FISCAL',
          detalles: {
            create: detallesParaCrear,
          },
          pagos: {
            create: pagosParaCrear.map(p => ({
              metodo_pago: p.metodo_pago,
              monto: p.monto,
              cuenta_contable_id: (p as any).cuenta_contable_id || null,
              plan_pago_id: (p as any).plan_pago_id || null,
            }))
          }
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
          pagos: true,
          usuario: {
            select: {
              id: true,
              nombre: true,
              email: true,
            },
          },
        },
      });

      // Crear el movimiento de caja asociado por CADA pago (excluyendo Cuenta Corriente)
      for (const pago of pagosParaCrear) {
        if (pago.metodo_pago !== 'CUENTA_CORRIENTE') {
          await tx.cajaMovimiento.create({
            data: {
              tenant_id: tenantId,
              caja_turno_id: cajaAbierta.id,
              tipo: 'INGRESO',
              metodo_pago: pago.metodo_pago,
              monto: pago.monto,
              concepto: `Venta #${venta.id} - Pago con ${pago.metodo_pago}`
            }
          });
        }
      }

      // Crear Movimientos de Cuenta Corriente si corresponde
      for (let i = 0; i < pagosParaCrear.length; i++) {
        const p = pagosParaCrear[i]!;
        if (p.metodo_pago === 'CUENTA_CORRIENTE' && cuentasCorrienteIds[i]) {
          await tx.movimientoCuentaCorriente.create({
            data: {
              cuenta_corriente_id: cuentasCorrienteIds[i] as number,
              tipo_movimiento: 'CARGO',
              monto: p.monto,
              concepto: `Compra Ticket #${venta.id}`,
              venta_id: venta.id
            }
          });
        }
      }

      return venta;
    }, {
      maxWait: 10000,
      timeout: 20000, // 20 segundos de timeout para DB remota
    });

    // 2. Facturar en AFIP si el tenant lo tiene activado por defecto
    const tenantConfig = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (tenantConfig && tenantConfig.afip_facturacion_automatica) {
      try {
        const ventaActualizada = await this.afipService.emitirFactura(ventaGuardada.id, tenantId);
        return ventaActualizada;
      } catch (error) {
        // Log the error but return the saved sale with PENDIENTE or RECHAZADO status
        console.error('Error post-guardado al facturar en AFIP:', error);
        // Devolvemos la venta original (ya sabemos que estado_arca cambió a RECHAZADO por dentro de afipService)
        return this.prisma.venta.findUnique({
          where: { id: ventaGuardada.id },
          include: { detalles: { include: { variante: { include: { producto: true } } } }, pagos: true }
        });
      }
    }

    return ventaGuardada;
  }

  async findAll(page: number = 1, limit: number = 50): Promise<any> {
    const skip = (page - 1) * limit;
    
    // El tenant_id está implícito si configuramos el PrismaService con el contexto,
    // pero si no, deberíamos forzarlo aquí. Asumimos que PrismaService maneja el RLS o contexto.
    
    const [total, data] = await Promise.all([
      this.prisma.venta.count(),
      this.prisma.venta.findMany({
        skip,
        take: limit,
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
  async getDashboardStats(): Promise<any> {
    const tenantId = this.tenantContext.getTenantId();
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const ventas = await this.prisma.venta.findMany({
      where: { tenant_id: tenantId },
      include: {
        detalles: {
          include: {
            variante: { include: { producto: true } }
          }
        },
        pagos: true,
        usuario: { select: { id: true, nombre: true } }
      }
    });

    let ventasHoy = 0;
    let ventasMes = 0;
    const productosTop: Record<string, { nombre: string; cantidad: number; total: number }> = {};
    const ventasPorMetodo: Record<string, number> = {};
    const ventasPorVendedor: Record<string, number> = {};

    for (const v of ventas) {
      if (v.fecha_venta >= startOfDay) ventasHoy += Number(v.total);
      if (v.fecha_venta >= startOfMonth) ventasMes += Number(v.total);

      // Agrupar por vendedor
      const vendedorName = v.usuario?.nombre || 'Administrador';
      ventasPorVendedor[vendedorName] = (ventasPorVendedor[vendedorName] || 0) + Number(v.total);

      // Pagos aggregation (historicos o multipago)
      if (v.pagos && v.pagos.length > 0) {
        for (const p of v.pagos) {
          const met = p.metodo_pago || 'OTRO';
          ventasPorMetodo[met] = (ventasPorMetodo[met] || 0) + Number(p.monto);
        }
      } else {
        const met = v.metodo_pago || 'OTRO';
        ventasPorMetodo[met] = (ventasPorMetodo[met] || 0) + Number(v.total);
      }

      for (const d of v.detalles) {
        const prodName = d.variante?.producto?.nombre || 'Desconocido';
        if (!productosTop[prodName]) {
          productosTop[prodName] = { nombre: prodName, cantidad: 0, total: 0 };
        }
        productosTop[prodName].cantidad += Number(d.cantidad);
        productosTop[prodName].total += Number(d.subtotal);
      }
    }

    const topProductos = Object.values(productosTop)
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);

    // Evolución diaria para el gráfico de barras (últimos 7 días)
    const ventasPorDia: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(startOfDay);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().substring(0, 10);
      ventasPorDia[dateStr] = 0;
    }

    for (const v of ventas) {
      const dateStr = v.fecha_venta.toISOString().substring(0, 10);
      if (ventasPorDia[dateStr] !== undefined) {
        ventasPorDia[dateStr] += Number(v.total);
      }
    }

    const chartVentas = Object.entries(ventasPorDia).map(([fecha, total]) => ({ fecha, total }));
    const chartMetodos = Object.entries(ventasPorMetodo).map(([metodo, total]) => ({ metodo, total }));
    const chartVendedores = Object.entries(ventasPorVendedor).map(([vendedor, total]) => ({ vendedor, total }));

    return {
      ventasHoy,
      ventasMes,
      topProductos,
      chartVentas,
      chartMetodos,
      chartVendedores
    };
  }
}
