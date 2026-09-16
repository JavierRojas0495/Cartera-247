import { IsDateString, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentFrequency } from '@prisma/client';

export class CreateLoanDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  borrowerId: string;

  @ApiPropertyOptional({
    description: 'Opcional. Si no se envía, usa el producto activo del tenant (reglas de mora).',
  })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiProperty({ example: 1000000 })
  @IsInt()
  @Min(1)
  principalAmount: number;

  @ApiProperty({ description: 'Tasa del ciclo de cobro en decimal (ej. 0.03 = 3% por periodo).' })
  @IsNumber()
  @Min(0)
  interestRate: number;

  @ApiProperty({
    enum: PaymentFrequency,
    description: 'Frecuencia de cobro del interés.',
  })
  @IsEnum(PaymentFrequency)
  paymentFrequency: PaymentFrequency;

  @ApiProperty({ description: 'Fecha de desembolso del préstamo' })
  @IsDateString()
  startDate: string;
}

export class UpdateLoanDto {
  @ApiProperty({ description: 'Contraseña del usuario para autorizar la modificación' })
  @IsString()
  @IsNotEmpty()
  confirmPassword: string;

  @ApiPropertyOptional({ description: 'Valor prestado (desembolso). Ajusta Por cobrar en la misma diferencia.' })
  @IsOptional()
  @IsInt()
  @Min(1)
  principalAmount?: number;

  @ApiPropertyOptional({ description: 'Tasa del ciclo de cobro en decimal (ej. 0.03 = 3%).' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  interestRate?: number;

  @ApiPropertyOptional({ enum: PaymentFrequency })
  @IsOptional()
  @IsEnum(PaymentFrequency)
  paymentFrequency?: PaymentFrequency;

  @ApiPropertyOptional({ description: 'Fecha de desembolso' })
  @IsOptional()
  @IsDateString()
  startDate?: string;
}
