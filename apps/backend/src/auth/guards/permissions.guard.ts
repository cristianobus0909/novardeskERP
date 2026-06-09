import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Si el endpoint no requiere permisos específicos, permitimos el acceso
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user || !user.roleId) {
      return false;
    }

    // Consultamos los permisos asociados al rol del usuario en la base de datos.
    // Al ejecutarse después del Interceptor de Tenant, la consulta de roles
    // se filtra automáticamente por el tenant_id del usuario, garantizando aislamiento.
    const roleData = await this.prisma.role.findUnique({
      where: { id: user.roleId },
      include: {
        permisos: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!roleData) {
      return false;
    }

    const assignedPermissions = roleData.permisos.map(
      (rp) => rp.permission.codigo_permiso
    );

    // El usuario debe poseer todos los permisos requeridos
    return requiredPermissions.every((requiredPerm) =>
      assignedPermissions.includes(requiredPerm)
    );
  }
}
