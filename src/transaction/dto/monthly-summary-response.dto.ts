import { ApiProperty } from '@nestjs/swagger';
import { TransactionType } from '../../entities/transaction.entity';

class TypeBreakdownDto {
  @ApiProperty({ example: 42, description: 'Number of transactions' })
  count: number;

  @ApiProperty({
    example: '125000.50',
    description: 'Sum of amounts (decimal string)',
  })
  totalAmount: string;
}

export class MonthlySummaryResponseDto {
  @ApiProperty({ example: 2025, description: 'Year of the summary' })
  year: number;

  @ApiProperty({ example: 1, description: 'Month (1-12)' })
  month: number;

  @ApiProperty({ example: 150, description: 'Total number of transactions' })
  totalCount: number;

  @ApiProperty({
    example: '500000.00',
    description: 'Sum of all transaction amounts in the month',
  })
  totalAmount: string;

  @ApiProperty({
    description:
      'Breakdown by transaction type (CREDIT, TRANSFER_IN, TRANSFER_OUT)',
    example: {
      CREDIT: { count: 80, totalAmount: '400000.00' },
      TRANSFER_IN: { count: 35, totalAmount: '50000.00' },
      TRANSFER_OUT: { count: 35, totalAmount: '50000.00' },
    },
  })
  byType: Partial<Record<TransactionType, TypeBreakdownDto>>;

  @ApiProperty({
    description: 'Breakdown by wallet currency',
    example: {
      NGN: { count: 100, totalAmount: '300000.00' },
      USD: { count: 50, totalAmount: '200000.00' },
    },
  })
  byCurrency: Record<string, TypeBreakdownDto>;
}
