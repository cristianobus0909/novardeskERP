import { Controller, Get, Patch, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificacionesService } from './notificaciones.service';

@UseGuards(JwtAuthGuard)
@Controller('notificaciones')
export class NotificacionesController {
  constructor(private readonly notificacionesService: NotificacionesService) {}

  @Get()
  async getNotificaciones() {
    return this.notificacionesService.getNotificaciones();
  }

  @Get('unread-count')
  async getUnreadCount() {
    return this.notificacionesService.getUnreadCount();
  }

  @Patch('mark-all-read')
  async markAllAsRead() {
    return this.notificacionesService.markAllAsRead();
  }

  @Patch(':id/read')
  async markAsRead(@Param('id', ParseIntPipe) id: number) {
    return this.notificacionesService.markAsRead(id);
  }
}
