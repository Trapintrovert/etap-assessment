import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsPositive, IsUUID, Min } from 'class-validator';

export class CreatePaymentDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Wallet ID to credit',
  })
  @IsNotEmpty({ message: 'Wallet ID is required' })
  @IsUUID('4', { message: 'Wallet ID must be a valid UUID' })
  walletId: string;

  @ApiProperty({
    example: 5000,
    description:
      'Amount in Naira (NGN). Will be converted to kobo for Paystack.',
    minimum: 1,
  })
  @IsNotEmpty({ message: 'Amount is required' })
  @IsNumber({}, { message: 'Amount must be a number' })
  @IsPositive({ message: 'Amount must be greater than zero' })
  @Min(1, { message: 'Amount must be at least 1 NGN' })
  amount: number;
}
