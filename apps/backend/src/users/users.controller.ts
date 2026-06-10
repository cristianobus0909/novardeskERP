import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('Administrador')
  getEmployees() {
    return this.usersService.getEmployees();
  }

  @Post('employee')
  @Roles('Administrador')
  createEmployee(@Body() createEmployeeDto: CreateEmployeeDto) {
    return this.usersService.createEmployee(createEmployeeDto);
  }
}
