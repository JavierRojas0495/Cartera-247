import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { BorrowerStatus, FieldType } from '@prisma/client';

export class BorrowerPhoneDto {
  @ApiProperty({ example: '3101234567' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiPropertyOptional({ example: 'Personal' })
  @IsOptional()
  @IsString()
  label?: string;
}

export class BorrowerWorkPhoneDto {
  @ApiProperty({ example: '6017654321' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiPropertyOptional({ example: 'Oficina' })
  @IsOptional()
  @IsString()
  label?: string;
}

export class BorrowerWorkAddressDto {
  @ApiProperty({ example: 'Carrera 15 #93-47, Bogotá' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiPropertyOptional({ example: 'Sede principal' })
  @IsOptional()
  @IsString()
  label?: string;
}

export class PersonalReferenceDto {
  @ApiProperty({ example: 'Juan Pérez' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: '3101234567' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: 'Familiar', description: 'Relación con el prestatario' })
  @IsString()
  @IsNotEmpty()
  relationship: string;

  @ApiPropertyOptional({ example: 'Calle 45 #12-34, Bogotá', description: 'Dirección de la referencia' })
  @IsOptional()
  @IsString()
  address?: string;
}

export class CreateBorrowerDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  documentNum: string;

  @ApiPropertyOptional({ default: 'CC' })
  @IsOptional()
  @IsString()
  documentType?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  /** @deprecated Usar phones */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ type: [BorrowerPhoneDto], description: 'Teléfonos de contacto del prestatario' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BorrowerPhoneDto)
  phones?: BorrowerPhoneDto[];

  @ApiProperty({ description: 'Dirección de residencia' })
  @IsString()
  @IsNotEmpty()
  residenceAddress: string;

  @ApiPropertyOptional({ example: 'Bogotá' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'Chapinero' })
  @IsOptional()
  @IsString()
  neighborhood?: string;

  @ApiPropertyOptional({ example: 'Distribuidora ABC S.A.S.' })
  @IsOptional()
  @IsString()
  workCompanyName?: string;

  @ApiPropertyOptional({ example: 'Laura Méndez — Jefe inmediato', description: 'Persona de contacto en la empresa' })
  @IsOptional()
  @IsString()
  workContactName?: string;

  /** @deprecated Usar workAddresses */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  workAddress?: string;

  /** @deprecated Usar workPhones */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  workPhone?: string;

  @ApiPropertyOptional({ type: [BorrowerWorkPhoneDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BorrowerWorkPhoneDto)
  workPhones?: BorrowerWorkPhoneDto[];

  @ApiPropertyOptional({ type: [BorrowerWorkAddressDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BorrowerWorkAddressDto)
  workAddresses?: BorrowerWorkAddressDto[];

  @ApiProperty({ type: [PersonalReferenceDto], description: 'Referencias personales (mínimo 1)' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PersonalReferenceDto)
  personalReferences: PersonalReferenceDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  customData?: Record<string, unknown>;
}

export class UpdateBorrowerDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  documentNum?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  documentType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  /** @deprecated Usar phones */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ type: [BorrowerPhoneDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BorrowerPhoneDto)
  phones?: BorrowerPhoneDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  residenceAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  neighborhood?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  workCompanyName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  workContactName?: string;

  /** @deprecated Usar workAddresses */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  workAddress?: string;

  /** @deprecated Usar workPhones */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  workPhone?: string;

  @ApiPropertyOptional({ type: [BorrowerWorkPhoneDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BorrowerWorkPhoneDto)
  workPhones?: BorrowerWorkPhoneDto[];

  @ApiPropertyOptional({ type: [BorrowerWorkAddressDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BorrowerWorkAddressDto)
  workAddresses?: BorrowerWorkAddressDto[];

  @ApiPropertyOptional({ enum: BorrowerStatus })
  @IsOptional()
  @IsEnum(BorrowerStatus)
  status?: BorrowerStatus;

  @ApiPropertyOptional({ type: [PersonalReferenceDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PersonalReferenceDto)
  personalReferences?: PersonalReferenceDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  customData?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Contraseña del usuario autenticado, requerida al modificar datos sensibles con préstamos activos',
  })
  @IsOptional()
  @IsString()
  confirmPassword?: string;
}

export class CreateFieldDefinitionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiProperty({ enum: FieldType })
  @IsEnum(FieldType)
  fieldType: FieldType;

  @ApiPropertyOptional()
  @IsOptional()
  required?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  options?: string[];
}
