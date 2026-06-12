import { Controller, Post, Get, Body, UseGuards, Headers, HttpException, HttpStatus } from '@nestjs/common';
import { MPService } from './mp.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('mp')
export class MPController {
  constructor(private readonly mpService: MPService) {}

  @UseGuards(JwtAuthGuard)
  @Post('config')
  @Permissions('settings:write')
  async saveConfig(
    @Body() configDto: { mp_access_token: string; mp_caja_id: string }
  ) {
    return this.mpService.saveConfig(configDto.mp_access_token, configDto.mp_caja_id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('config')
  @Permissions('settings:read')
  async getConfig() {
    return this.mpService.getConfig();
  }

  @UseGuards(JwtAuthGuard)
  @Post('qr/intent')
  @Permissions('pos:access')
  async createQrIntent(@Body() orderDto: { external_reference: string; total_amount: number; title: string }) {
    return this.mpService.createQrIntent(orderDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('pos/intent')
  @Permissions('pos:access')
  async createPosIntent(@Body() orderDto: { external_reference: string; total_amount: number; title: string }) {
    return this.mpService.createPosIntent(orderDto);
  }

  // Webhook público de Mercado Pago (No tiene JwtAuthGuard)
  @Post('webhook')
  async handleWebhook(@Body() body: any, @Headers('x-signature') signature: string) {
    console.log('[MP Webhook] Received notification:', body);
    try {
      await this.mpService.processWebhook(body);
      return { received: true };
    } catch (error: any) {
      console.error('[MP Webhook] Error:', error.message);
      // MP requiere un 200 OK siempre para dejar de reintentar si es error nuestro de lógica,
      // a menos que sea un bad request evidente. Por ahora retornamos 200.
      return { error: error.message };
    }
  }
}
