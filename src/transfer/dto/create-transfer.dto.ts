import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsPositive, IsUUID, Min } from 'class-validator';

export class CreateTransferDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Source wallet ID (must belong to current user)',
  })
  @IsNotEmpty()
  @IsUUID()
  fromWalletId: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440001',
    description: 'Destination wallet ID',
  })
  @IsNotEmpty()
  @IsUUID()
  toWalletId: string;

  @ApiProperty({
    example: 10000,
    description: 'Amount to transfer (in major currency units)',
    minimum: 0.01,
  })
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  @Min(0.01)
  amount: number;
}
