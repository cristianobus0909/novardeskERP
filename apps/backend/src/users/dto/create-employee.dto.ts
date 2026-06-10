import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreateEmployeeDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(3)
  nombre: string;

  @IsString()
  @MinLength(6)
  password: string;
}
