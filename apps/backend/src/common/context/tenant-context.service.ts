import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';

export interface TenantContext {
  tenantId: number;
  userId: number;
}

@Injectable()
export class TenantContextService {
  private readonly asyncLocalStorage = new AsyncLocalStorage<TenantContext>();

  run(context: TenantContext, callback: () => any) {
    return this.asyncLocalStorage.run(context, callback);
  }

  getStore(): TenantContext | undefined {
    return this.asyncLocalStorage.getStore();
  }

  getTenantId(): number | undefined {
    return this.getStore()?.tenantId;
  }

  getUserId(): number | undefined {
    return this.getStore()?.userId;
  }
}
