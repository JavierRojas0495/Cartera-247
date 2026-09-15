import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InterestMethod, PaymentFrequency } from '@prisma/client';

export class CreateLoanProductDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: InterestMethod })
  @IsEnum(InterestMethod)
  interestMethod: InterestMethod;

  @ApiProperty({ example: 0.03, description: 'Tasa mensual (3% = 0.03)' })
  @IsNumber()
  @Min(0)
  defaultRate: number;

  @ApiProperty({ enum: PaymentFrequency })
  @IsEnum(PaymentFrequency)
  paymentFrequency: PaymentFrequency;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  graceDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  dailyRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  fixedPenalty?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean;
}

export class UpdateLoanProductDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  defaultRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
