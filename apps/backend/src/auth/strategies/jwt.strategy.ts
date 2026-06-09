import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'novardesk_super_secret_key_change_me_in_production',
    });
  }

  async validate(payload: any) {
    // El Guard se ejecuta antes que el Interceptor. En este punto, no hay tenant_id en AsyncLocalStorage.
    // Buscamos el usuario de forma directa y retornamos sus claims y tenant_id.
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { role: true },
    });

    if (!user || !user.activo) {
      throw new UnauthorizedException('Usuario no válido, inactivo o suspendido');
    }

    // Los datos retornados aquí se asignan a request.user
    return {
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      tenantId: user.tenant_id,
      role: user.role.nombre,
      roleId: user.role_id,
    };
  }
}
