import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../common/context/tenant-context.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService
  ) {}

  async getEmployees() {
    const tenantId = this.tenantContext.getTenantId();
    return this.prisma.user.findMany({
      where: { tenant_id: tenantId },
      select: {
        id: true,
        nombre: true,
        email: true,
        activo: true,
        role: {
          select: { nombre: true },
        },
      },
      orderBy: { id: 'asc' },
    });
  }

  async createEmployee(dto: CreateEmployeeDto) {
    const tenantId = this.tenantContext.getTenantId();
    
    // 1. Verificar si el email ya existe en el tenant (o global)
    const existingUser = await this.prisma.user.findFirst({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new ConflictException('El correo electrónico ya está en uso');
    }

    // 2. Buscar o crear el rol "Vendedor"
    let vendedorRole = await this.prisma.role.findFirst({
      where: { tenant_id: tenantId, nombre: 'Vendedor' },
    });

    if (!vendedorRole) {
      vendedorRole = await this.prisma.role.create({
        data: {
          tenant_id: tenantId,
          nombre: 'Vendedor',
        },
      });

      // Podríamos asignarle permisos de cajero, pero por ahora solo el rol basta
      // Los permisos reales dependerán del seed o lógica de UI posterior
    }

    // 3. Crear el empleado
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);

    const newUser = await this.prisma.user.create({
      data: {
        tenant_id: tenantId,
        email: dto.email,
        nombre: dto.nombre,
        password: passwordHash,
        role_id: vendedorRole.id,
        activo: true,
      },
    });

    const { password, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  }
}
