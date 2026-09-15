import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TenantStatus } from '@prisma/client';

export class CreateTenantDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  legalName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nit?: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  ownerEmail: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  ownerPassword: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  ownerFirstName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  ownerLastName: string;
}

export class UpdateTenantDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  legalName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ enum: TenantStatus })
  @IsOptional()
  @IsEnum(TenantStatus)
  status?: TenantStatus;
}

export class ActivateModuleDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  moduleCode: string;

  @ApiPropertyOptional()
  @IsOptional()
  settings?: Record<string, unknown>;
}

export class SupportSessionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  reason: string;
}
