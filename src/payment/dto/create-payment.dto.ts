import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsPositive, IsUUID, Min } from 'class-validator';

export class CreatePaymentDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Wallet ID to credit',
  })
  @IsNotEmpty()
  @IsUUID()
  walletId: string;

  @ApiProperty({
    example: 5000,
    description:
      'Amount in Naira (NGN). Will be converted to kobo for Paystack.',
    minimum: 1,
  })
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  @Min(1)
  amount: number;
}
