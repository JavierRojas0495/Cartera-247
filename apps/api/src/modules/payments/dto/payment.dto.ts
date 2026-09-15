import { IsBoolean, IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';

export class CreatePaymentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  loanId: string;

  @ApiProperty({ example: 150000 })
  @IsInt()
  @Min(1)
  amount: number;

  @ApiProperty()
  @IsDateString()
  paymentDate: string;

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Si el crédito está en mora, el prestamista decide cobrarla o no.' })
  @IsOptional()
  @IsBoolean()
  chargeLateFee?: boolean;

  @ApiPropertyOptional({ description: 'Valor de mora acordado con el prestatario. Solo aplica si chargeLateFee es true.' })
  @IsOptional()
  @IsInt()
  @Min(0)
  lateFeeAmount?: number;
}
