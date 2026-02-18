import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsPositive, IsUUID, Min } from 'class-validator';

export class CreateTransferDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Source wallet ID (must belong to current user)',
  })
  @IsNotEmpty({ message: 'Source wallet ID is required' })
  @IsUUID('4', { message: 'Source wallet ID must be a valid UUID' })
  fromWalletId: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440001',
    description: 'Destination wallet ID',
  })
  @IsNotEmpty({ message: 'Destination wallet ID is required' })
  @IsUUID('4', { message: 'Destination wallet ID must be a valid UUID' })
  toWalletId: string;

  @ApiProperty({
    example: 10000,
    description: 'Amount to transfer (in major currency units)',
    minimum: 0.01,
  })
  @IsNotEmpty({ message: 'Amount is required' })
  @IsNumber({}, { message: 'Amount must be a number' })
  @IsPositive({ message: 'Amount must be greater than zero' })
  @Min(0.01, { message: 'Amount must be at least 0.01' })
  amount: number;
}
