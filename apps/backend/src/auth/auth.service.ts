import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { EstadoPlan } from '@repo/database';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService
  ) {}

  async register(dto: RegisterDto) {
    // 1. Validar que el email sea único globalmente para el onboarding inicial
    const existingUser = await this.prisma.user.findFirst({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('El correo electrónico ya se encuentra registrado en el sistema');
    }

    // 2. Hashear la contraseña con bcrypt
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);

    // 3. Realizar registro del Tenant, Rol y Usuario en una transacción ACID
    const result = await this.prisma.$transaction(async (tx) => {
      // a. Crear el Tenant con plan en período de prueba (Trial)
      const tenant = await tx.tenant.create({
        data: {
          razon_social: dto.razon_social,
          cuit: dto.cuit,
          estado_plan: EstadoPlan.TRIAL,
          fin_prueba: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
        },
      });

      // b. Crear el Rol Administrador para este Tenant
      const adminRole = await tx.role.create({
        data: {
          tenant_id: tenant.id,
          nombre: 'Administrador',
        },
      });

      // c. Asociar todos los permisos del sistema al rol de administrador creado
      const allPermissions = await tx.permission.findMany();
      const rolePermissionsData = allPermissions.map((perm) => ({
        role_id: adminRole.id,
        permission_id: perm.id,
      }));

      await tx.rolePermission.createMany({
        data: rolePermissionsData,
      });

      // d. Crear el Usuario Administrador inicial dueño del comercio
      const user = await tx.user.create({
        data: {
          tenant_id: tenant.id,
          role_id: adminRole.id,
          email: dto.email,
          password: passwordHash,
          nombre: dto.nombre,
          activo: true,
        },
      });

      return { user, tenant };
    });

    const { password, ...userWithoutPassword } = result.user;
    return {
      message: 'Comercio y usuario administrador registrados exitosamente',
      user: userWithoutPassword,
      tenant: result.tenant,
    };
  }

  async login(dto: LoginDto) {
    // 1. Buscar al usuario por correo
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email },
      include: { role: true, tenant: true },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!user.activo) {
      throw new UnauthorizedException('El usuario se encuentra suspendido o inactivo');
    }

    // 2. Validar contraseña hash con bcrypt
    const passwordMatch = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatch) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // 3. Crear payload JWT
    const payload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenant_id,
      role: user.role.nombre,
    };

    const token = this.jwtService.sign(payload);

    return {
      access_token: token,
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        role: user.role.nombre,
      },
      tenant: {
        id: user.tenant.id,
        razon_social: user.tenant.razon_social,
        estado_plan: user.tenant.estado_plan,
      },
    };
  }
}
