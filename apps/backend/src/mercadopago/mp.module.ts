import { Module } from '@nestjs/common';
import { MPController } from './mp.controller';
import { MPService } from './mp.service';

@Module({
  controllers: [MPController],
  providers: [MPService],
  exports: [MPService],
})
export class MercadoPagoModule {}
