import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../common/context/tenant-context.service';
import { AbrirCajaDto } from './dto/abrir-caja.dto';
import { CerrarCajaDto } from './dto/cerrar-caja.dto';

@Injectable()
export class CajaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService
  ) {}

  async getEstadoCaja(userId: number): Promise<any> {
    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) throw new BadRequestException('No tenant');
    const cajaAbierta = await this.prisma.cajaTurno.findFirst({
      where: {
        tenant_id: tenantId,
        user_id: userId,
        estado: 'ABIERTA'
      },
      include: {
        movimientos: true,
        ventas: true,
        gastos: true
      }
    });

    if (!cajaAbierta) {
      return { status: 'CERRADA', turno: null, sumario: null };
    }

    // Calcular el sumario actual en base a los movimientos
    let efectivo = Number(cajaAbierta.monto_apertura);
    let debito = 0;
    let credito = 0;
    let transferencia = 0;
    let mercadopago = 0;

    for (const mov of cajaAbierta.movimientos) {
      const amt = Number(mov.monto);
      const isIngreso = mov.tipo === 'INGRESO';
      
      if (mov.metodo_pago === 'EFECTIVO') efectivo += isIngreso ? amt : -amt;
      else if (mov.metodo_pago === 'TARJETA_DEBITO') debito += isIngreso ? amt : -amt;
      else if (mov.metodo_pago === 'TARJETA_CREDITO') credito += isIngreso ? amt : -amt;
      else if (mov.metodo_pago === 'TRANSFERENCIA') transferencia += isIngreso ? amt : -amt;
      else if (mov.metodo_pago === 'MERCADO_PAGO') mercadopago += isIngreso ? amt : -amt;
    }

    for (const g of cajaAbierta.gastos) {
      efectivo -= Number(g.monto);
    }

    return {
      status: 'ABIERTA',
      turno: cajaAbierta,
      sumario: {
        efectivo,
        debito,
        credito,
        transferencia,
        mercadopago
      }
    };
  }

  async abrirCaja(userId: number, dto: AbrirCajaDto): Promise<any> {
    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) throw new BadRequestException('No tenant');

    const cajaAbierta = await this.prisma.cajaTurno.findFirst({
      where: { tenant_id: tenantId, user_id: userId, estado: 'ABIERTA' }
    });

    if (cajaAbierta) {
      throw new BadRequestException('Ya tienes un turno de caja abierto.');
    }

    return this.prisma.cajaTurno.create({
      data: {
        tenant_id: tenantId,
        user_id: userId,
        monto_apertura: dto.monto_apertura,
        estado: 'ABIERTA'
      }
    });
  }

  async cerrarCaja(userId: number, dto: CerrarCajaDto): Promise<any> {
    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) throw new BadRequestException('No tenant');

    const cajaAbierta = await this.prisma.cajaTurno.findFirst({
      where: { tenant_id: tenantId, user_id: userId, estado: 'ABIERTA' },
      include: { movimientos: true }
    });

    if (!cajaAbierta) {
      throw new BadRequestException('No hay ninguna caja abierta para cerrar.');
    }

    return this.prisma.cajaTurno.update({
      where: { id: cajaAbierta.id },
      data: {
        estado: 'CERRADA',
        fecha_cierre: new Date(),
        declarado_caja: dto.declarado_caja,
        declarado_extraccion: dto.declarado_extraccion,
        declarado_tarjeta_debito: dto.declarado_tarjeta_debito,
        declarado_tarjeta_credito: dto.declarado_tarjeta_credito,
        declarado_transferencia: dto.declarado_transferencia,
        declarado_mercadopago: dto.declarado_mercadopago,
        notas_cierre: dto.notas_cierre
      }
    });
  }

  async getHistorialCaja(page: number, limit: number): Promise<any> {
    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) throw new BadRequestException('No tenant');

    const skip = (page - 1) * limit;

    const [turnos, total] = await Promise.all([
      this.prisma.cajaTurno.findMany({
        where: { tenant_id: tenantId },
        orderBy: { fecha_apertura: 'desc' },
        skip,
        take: limit,
        include: {
          usuario: { select: { nombre: true, email: true } },
          movimientos: true,
          ventas: {
            select: {
              id: true,
              total: true,
              metodo_pago: true,
              estado_arca: true,
            }
          },
          gastos: true
        }
      }),
      this.prisma.cajaTurno.count({ where: { tenant_id: tenantId } })
    ]);

    const turnosConSumario = turnos.map(t => {
      const totalVentas = t.ventas.reduce((acc, v) => acc + Number(v.total), 0);
      const cantVentas = t.ventas.length;
      let efectivo = Number(t.monto_apertura);
      let debito = 0;
      let credito = 0;
      let transferencia = 0;
      let mercadopago = 0;
      
      for (const mov of t.movimientos) {
        const amt = Number(mov.monto);
        const isIngreso = mov.tipo === 'INGRESO';
        if (mov.metodo_pago === 'EFECTIVO') efectivo += isIngreso ? amt : -amt;
        else if (mov.metodo_pago === 'TARJETA_DEBITO') debito += isIngreso ? amt : -amt;
        else if (mov.metodo_pago === 'TARJETA_CREDITO') credito += isIngreso ? amt : -amt;
        else if (mov.metodo_pago === 'TRANSFERENCIA') transferencia += isIngreso ? amt : -amt;
        else if (mov.metodo_pago === 'MERCADO_PAGO') mercadopago += isIngreso ? amt : -amt;
      }
      for (const g of (t.gastos || [])) {
        efectivo -= Number(g.monto);
      }
      return {
        ...t,
        sumario: { 
          totalVentas, cantVentas, 
          efectivoCaja: efectivo,
          debitoCaja: debito,
          creditoCaja: credito,
          transferenciaCaja: transferencia,
          mercadopagoCaja: mercadopago
        }
      };
    });

    return {
      data: turnosConSumario,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getLibroCaja(fechaDesde?: string, fechaHasta?: string) {
    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) throw new BadRequestException('No tenant');

    let dateFilter: any = {};
    if (fechaDesde || fechaHasta) {
      dateFilter = {};
      if (fechaDesde) dateFilter.gte = new Date(fechaDesde);
      if (fechaHasta) dateFilter.lte = new Date(fechaHasta);
    }

    const [ventas, gastos, movimientos] = await Promise.all([
      this.prisma.venta.findMany({
        where: { tenant_id: tenantId, ...(Object.keys(dateFilter).length > 0 ? { fecha_venta: dateFilter } : {}) },
        select: { id: true, total: true, metodo_pago: true, cliente: { select: { razon_social: true } }, fecha_venta: true }
      }),
      this.prisma.gasto.findMany({
        where: { tenant_id: tenantId, ...(Object.keys(dateFilter).length > 0 ? { fecha: dateFilter } : {}) },
        select: { id: true, descripcion: true, monto: true, categoria: true, fecha: true }
      }),
      this.prisma.cajaMovimiento.findMany({
        where: { 
          tenant_id: tenantId, 
          ...(Object.keys(dateFilter).length > 0 ? { fecha: dateFilter } : {}),
          NOT: { concepto: { startsWith: 'Venta #' } }
        },
        select: { id: true, concepto: true, monto: true, tipo: true, metodo_pago: true, fecha: true }
      })
    ]);

    const libro = [
      ...ventas.map(v => ({ tipo_registro: 'VENTA', id: v.id, descripcion: `Venta ${v.cliente?.razon_social ? `(${v.cliente.razon_social})` : ''}`, monto: Number(v.total), fecha: v.fecha_venta, extra: v.metodo_pago, is_ingreso: true })),
      ...gastos.map(g => ({ tipo_registro: 'GASTO', id: g.id, descripcion: g.descripcion, monto: Number(g.monto), fecha: g.fecha, extra: g.categoria, is_ingreso: false })),
      ...movimientos.map(m => ({ tipo_registro: 'MOVIMIENTO', id: m.id, descripcion: m.concepto, monto: Number(m.monto), fecha: m.fecha, extra: m.metodo_pago, is_ingreso: m.tipo === 'INGRESO' }))
    ];

    libro.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());

    const ingresos = libro.filter(x => x.is_ingreso).reduce((acc, x) => acc + x.monto, 0);
    const egresos = libro.filter(x => !x.is_ingreso).reduce((acc, x) => acc + x.monto, 0);

    console.log("=== API getLibroCaja ===");
    console.log("Movimientos:", libro.length);
    console.log("Ingresos:", ingresos);
    console.log("Egresos:", egresos);

    return {
      movimientos: libro,
      resumen: {
        ingresos,
        egresos,
        saldo: ingresos - egresos
      }
    };
  }

  async getCierreResumen(userId: number) {
    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) throw new BadRequestException('No tenant');

    const cajaAbierta = await this.prisma.cajaTurno.findFirst({
      where: { tenant_id: tenantId, user_id: userId, estado: 'ABIERTA' },
      include: {
        ventas: {
          select: { id: true, total: true, metodo_pago: true, pagos: true }
        },
        gastos: {
          select: { id: true, monto: true }
        },
        movimientos: true
      }
    });

    if (!cajaAbierta) {
      throw new BadRequestException('No hay caja abierta');
    }

    let efectivo = Number(cajaAbierta.monto_apertura);
    let debito = 0;
    let credito = 0;
    let transferencia = 0;
    let mercadopago = 0;
    let cta_cte = 0;

    for (const mov of cajaAbierta.movimientos) {
      const amt = Number(mov.monto);
      const isIngreso = mov.tipo === 'INGRESO';
      if (mov.metodo_pago === 'EFECTIVO') efectivo += isIngreso ? amt : -amt;
      else if (mov.metodo_pago === 'TARJETA_DEBITO') debito += isIngreso ? amt : -amt;
      else if (mov.metodo_pago === 'TARJETA_CREDITO') credito += isIngreso ? amt : -amt;
      else if (mov.metodo_pago === 'TRANSFERENCIA') transferencia += isIngreso ? amt : -amt;
      else if (mov.metodo_pago === 'MERCADO_PAGO') mercadopago += isIngreso ? amt : -amt;
      else if (mov.metodo_pago === 'CUENTA_CORRIENTE') cta_cte += isIngreso ? amt : -amt;
    }

    // Restamos los gastos en efectivo (asumimos que todo gasto de caja sale en efectivo)
    for (const g of cajaAbierta.gastos) {
      efectivo -= Number(g.monto);
    }

    const totalVentas = cajaAbierta.ventas.reduce((acc, v) => acc + Number(v.total), 0);
    const totalGastos = cajaAbierta.gastos.reduce((acc, g) => acc + Number(g.monto), 0);
    const gananciaBruta = totalVentas - totalGastos;

    return {
      ventas_dia: totalVentas,
      cant_ventas: cajaAbierta.ventas.length,
      gastos_dia: totalGastos,
      cant_gastos: cajaAbierta.gastos.length,
      ganancia_bruta: gananciaBruta,
      caja_efectivo: efectivo,
      medios_pago: {
        EFECTIVO: efectivo,
        TARJETA_DEBITO: debito,
        TARJETA_CREDITO: credito,
        TRANSFERENCIA: transferencia,
        MERCADO_PAGO: mercadopago,
        CUENTA_CORRIENTE: cta_cte
      }
    };
  }
}
