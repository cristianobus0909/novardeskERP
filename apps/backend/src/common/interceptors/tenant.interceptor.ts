import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { TenantContextService } from '../context/tenant-context.service';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  constructor(private readonly tenantContextService: TenantContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    // 1. Extraer de req.user (adjuntado por el AuthGuard al decodificar el JWT)
    let tenantId = request.user?.tenantId || request.user?.tenant_id;
    let userId = request.user?.userId || request.user?.id;

    // 2. Extraer de cabeceras customizadas (ej: para webhooks o llamadas inter-servicio)
    if (!tenantId) {
      const tenantHeader = request.headers['x-tenant-id'];
      if (tenantHeader) {
        tenantId = parseInt(tenantHeader as string, 10);
      }
    }

    // 3. Extraer de query string
    if (!tenantId) {
      const tenantQuery = request.query['tenantId'] || request.query['tenant_id'];
      if (tenantQuery) {
        tenantId = parseInt(tenantQuery as string, 10);
      }
    }

    // Si hay un tenantId detectado, envolvemos la ejecución en el contexto asíncrono
    if (tenantId) {
      const parsedTenantId = typeof tenantId === 'string' ? parseInt(tenantId, 10) : tenantId;
      const parsedUserId = typeof userId === 'string' ? parseInt(userId, 10) : (userId || 0);

      if (isNaN(parsedTenantId)) {
        throw new BadRequestException('El tenant_id proporcionado en la solicitud no es un número válido');
      }



      return new Observable((subscriber) => {
        this.tenantContextService.run(
          { tenantId: parsedTenantId, userId: parsedUserId },
          () => {
            next.handle().subscribe({
              next: (val) => subscriber.next(val),
              error: (err) => subscriber.error(err),
              complete: () => subscriber.complete(),
            });
          }
        );
      });
    }

    // Si no hay tenantId (ej: registro de un nuevo tenant o login), se prosigue normalmente sin contexto
    return next.handle();
  }
}
