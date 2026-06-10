import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PrismaModule } from '../prisma/prisma.module';
import { TenantContextModule } from '../common/context/tenant-context.module';

@Module({
  imports: [PrismaModule, TenantContextModule],
  controllers: [UsersController],
  providers: [UsersService]
})
export class UsersModule {}
