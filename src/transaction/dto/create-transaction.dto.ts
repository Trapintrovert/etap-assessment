import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import {
  TransactionStatus,
  TransactionType,
} from '../../entities/transaction.entity';

export class CreateTransactionDto {
  @ApiProperty({
    enum: TransactionType,
    description: 'Type of transaction',
  })
  @IsNotEmpty()
  @IsEnum(TransactionType)
  type: TransactionType;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Wallet ID',
  })
  @IsNotEmpty()
  @IsUUID()
  walletId: string;

  @ApiProperty({
    example: 5000,
    description: 'Amount (stored as decimal in ledger)',
    minimum: 0.01,
  })
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({
    example: 'PAY_1234567890_abc',
    description: 'External reference (e.g. Paystack reference)',
  })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata (e.g. payment gateway payload)',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({
    enum: TransactionStatus,
    description: 'Status (defaults to COMPLETED)',
  })
  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440001',
    description: 'Related transfer ID for TRANSFER_IN / TRANSFER_OUT',
  })
  @IsOptional()
  @IsUUID()
  transferId?: string;
}
