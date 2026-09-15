import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'dueno@demo.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Demo123!' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ description: 'Tenant ID para usuarios multi-tenant' })
  @IsOptional()
  @IsString()
  tenantId?: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class VerifyPasswordDto {
  @ApiProperty({ description: 'Contraseña actual del usuario autenticado' })
  @IsString()
  @MinLength(6)
  password: string;
}
