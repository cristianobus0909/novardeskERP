import { Controller, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ImportService } from './import.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('import')
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  @Post('validate/:entity')
  @Permissions('productos:write')
  validateData(@Param('entity') entity: string, @Body() data: any[]) {
    return this.importService.validateData(entity, data);
  }

  @Post('commit/:entity')
  @Permissions('productos:write')
  commitData(@Param('entity') entity: string, @Body() data: any[]) {
    return this.importService.commitData(entity, data);
  }
}
