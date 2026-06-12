import { Module } from '@nestjs/common';
import { CajaController } from './caja.controller';
import { CajaService } from './caja.service';

import { PrismaModule } from '../prisma/prisma.module';
import { TenantContextModule } from '../common/context/tenant-context.module';

@Module({
  imports: [PrismaModule, TenantContextModule],
  controllers: [CajaController],
  providers: [CajaService]
})
export class CajaModule {}
