import { Injectable, InternalServerErrorException, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';

// Requerir afip.js
const Afip = require('@afipsdk/afip.js');

@Injectable()
export class AfipService {
  private readonly logger = new Logger(AfipService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Genera una factura electrónica (o comprobante) en AFIP
   */
  async emitirFactura(ventaId: number, tenantId: number): Promise<any> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new BadRequestException('Tenant no encontrado');

    if (!tenant.afip_crt || !tenant.afip_key || !tenant.cuit || !tenant.afip_punto_venta) {
      throw new BadRequestException('La empresa no tiene la configuración de AFIP completa (CUIT, Punto de Venta, Certificado o Llave).');
    }

    const venta = await this.prisma.venta.findUnique({
      where: { id: ventaId },
      include: {
        detalles: true,
        cliente: true,
      },
    });

    if (!venta) throw new BadRequestException('Venta no encontrada');

    // 1. Preparar archivos temporales para el certificado y la llave
    const tmpDir = os.tmpdir();
    const certFileName = `cert_${tenantId}_${crypto.randomBytes(4).toString('hex')}.crt`;
    const keyFileName = `key_${tenantId}_${crypto.randomBytes(4).toString('hex')}.key`;
    
    const certPath = path.join(tmpDir, certFileName);
    const keyPath = path.join(tmpDir, keyFileName);

    try {
      // Escribir los certificados al disco temporal
      fs.writeFileSync(certPath, tenant.afip_crt);
      fs.writeFileSync(keyPath, tenant.afip_key);

      // 2. Instanciar AFIP
      // Nota: Si production es true, se conectará a los servidores de producción de AFIP.
      const afip = new Afip({ 
        CUIT: parseInt(tenant.cuit.replace(/[^0-9]/g, ''), 10),
        res_folder: tmpDir,
        cert: certFileName,
        key: keyFileName,
        production: true // Configurado para Producción
      });

      // 3. Determinar el Tipo de Comprobante
      // 1 = Factura A, 6 = Factura B, 11 = Factura C
      let cbteTipo = 6; // Por defecto Factura B (Consumidor Final o exentos)
      
      let docTipo = 99; // 99 = Consumidor Final
      let docNro = 0; // Para montos menores a cierto límite, puede ser 0
      
      const total = Number(venta.total);

      // Reglas básicas de Facturación (simplificadas para el ejemplo)
      if (tenant.condicion_iva === 'Responsable Inscripto') {
        if (venta.cliente) {
          if (venta.cliente.condicion_iva === 'Responsable Inscripto' || venta.cliente.condicion_iva === 'Monotributista') {
            cbteTipo = 1; // Factura A
          } else {
            cbteTipo = 6; // Factura B
          }
        }
      } else if (tenant.condicion_iva === 'Monotributista') {
        cbteTipo = 11; // Factura C (Monotributo siempre emite C)
      } else {
        // Por defecto para otros (exentos, no categorizados)
        cbteTipo = 11; 
      }

      // 4. Datos del Cliente
      if (venta.cliente) {
        if (venta.cliente.tipo_documento === 'CUIT') {
          docTipo = 80; // CUIT
          docNro = parseInt(venta.cliente.cuit_dni.replace(/[^0-9]/g, ''), 10);
        } else if (venta.cliente.tipo_documento === 'CUIL') {
          docTipo = 86; // CUIL
          docNro = parseInt(venta.cliente.cuit_dni.replace(/[^0-9]/g, ''), 10);
        } else if (venta.cliente.tipo_documento === 'DNI') {
          docTipo = 96; // DNI
          docNro = parseInt(venta.cliente.cuit_dni.replace(/[^0-9]/g, ''), 10);
        }
      } else {
        // AFIP exige identificar al cliente si el total supera un límite para Consumidor Final (aprox $344.000 ARS en 2024).
        // Simplificación: si es mayor a 100,000 pero no hay cliente, podría dar error en AFIP. 
        // El cajero debería cargar el cliente.
      }

      // 5. Obtener el último número de comprobante autorizado
      const lastCbte = await afip.ElectronicBilling.getLastVoucher(tenant.afip_punto_venta, cbteTipo);
      const numeroFactura = lastCbte + 1;

      // 6. Preparar el payload del comprobante
      const date = new Date(Date.now() - ((new Date()).getTimezoneOffset() * 60000)).toISOString().split('T')[0]!.replace(/-/g, '');
      
      let data: any = {
        'CantReg': 1, // Cantidad de comprobantes a registrar
        'PtoVta': tenant.afip_punto_venta,
        'CbteTipo': cbteTipo, 
        'Concepto': 1, // 1 = Productos, 2 = Servicios, 3 = Productos y Servicios
        'DocTipo': docTipo,
        'DocNro': docNro,
        'CbteDesde': numeroFactura,
        'CbteHasta': numeroFactura,
        'CbteFch': parseInt(date), // Fecha del comprobante (AAAAMMDD)
        'ImpTotal': total,
        'ImpTotConc': 0, // Importe neto no gravado
        'ImpNeto': total, // Importe neto gravado (Si es factura C o B simplificada, suele ir el total acá, excepto si desglosan IVA)
        'ImpOpEx': 0, // Importe exento al IVA
        'ImpIVA': 0, // Importe IVA
        'ImpTrib': 0, // Importe tributos
        'MonId': 'PES', // Moneda (Pesos)
        'MonCotiz': 1, // Cotización de la moneda
      };

      // Si es Factura A o B (RI), hay que desglosar el IVA.
      // Aquí estamos haciendo una simplificación: asumiendo que todos los productos tienen 21% de IVA incluido en el precio.
      if (tenant.condicion_iva === 'Responsable Inscripto') {
        const netoGravado = Number((total / 1.21).toFixed(2));
        const importeIva = Number((total - netoGravado).toFixed(2));

        data['ImpNeto'] = netoGravado;
        data['ImpIVA'] = importeIva;
        
        data['Iva'] = [
          {
            'Id': 5, // 5 = 21%
            'BaseImp': netoGravado,
            'Importe': importeIva 
          }
        ];
      }

      // 7. Llamar al Web Service de AFIP
      const res = await afip.ElectronicBilling.createVoucher(data);
      
      // AFIP devuelve el CAE y la fecha de vencimiento
      if (res.CAE && res.CAEFchVto) {
        // Format vto from "AAAAMMDD" to Date
        const vtoStr = res.CAEFchVto.toString();
        const vtoYear = parseInt(vtoStr.substring(0, 4));
        const vtoMonth = parseInt(vtoStr.substring(4, 6)) - 1;
        const vtoDay = parseInt(vtoStr.substring(6, 8));
        const vtoDate = new Date(vtoYear, vtoMonth, vtoDay);

        let tipoStr = 'FACTURA_C';
        if (cbteTipo === 1) tipoStr = 'FACTURA_A';
        if (cbteTipo === 6) tipoStr = 'FACTURA_B';

        // Actualizar la venta con los datos de AFIP
        const updatedVenta = await this.prisma.venta.update({
          where: { id: ventaId },
          data: {
            estado_arca: 'APROBADO',
            cae: res.CAE,
            vto_cae: vtoDate,
            nro_factura: numeroFactura,
            tipo_comprobante: tipoStr,
            arca_error: null,
          }
        });

        return updatedVenta;
      } else {
        throw new InternalServerErrorException('AFIP no devolvió un CAE válido.');
      }

    } catch (error: any) {
      this.logger.error(`Error al emitir factura en AFIP: ${error.message}`, error.stack);
      
      // Guardar el error en la venta
      await this.prisma.venta.update({
        where: { id: ventaId },
        data: {
          estado_arca: 'RECHAZADO',
          arca_error: error.message || 'Error desconocido al contactar a AFIP',
        }
      });

      throw new BadRequestException(`Rechazo de AFIP: ${error.message}`);
    } finally {
      // Limpieza de certificados temporales
      if (fs.existsSync(certPath)) fs.unlinkSync(certPath);
      if (fs.existsSync(keyPath)) fs.unlinkSync(keyPath);
    }
  }
}
