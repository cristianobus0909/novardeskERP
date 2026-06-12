import { Controller, Post, Body, Get, UseGuards, Request, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req: any) {
    return {
      message: 'Datos del usuario autenticado en contexto multi-tenant',
      user: req.user,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('autorizar-pin')
  async autorizarPin(@Request() req: any, @Body('pin') pin: string) {
    return this.authService.autorizarPin(req.user.tenantId, pin);
  }

  @UseGuards(JwtAuthGuard)
  @Post('set-pin')
  async setPin(@Request() req: any, @Body('pin') pin: string) {
    if (req.user.role !== 'Administrador') {
      throw new UnauthorizedException('Solo los administradores pueden configurar el PIN');
    }
    // req.user.sub contiene el id del usuario por cómo se firma el JWT
    return this.authService.setPin(req.user.sub, pin);
  }
}
