import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class MonthlySummaryQueryDto {
  @ApiProperty({
    example: 2025,
    description: 'Calendar year (e.g. 2025)',
    minimum: 2000,
    maximum: 2100,
  })
  @Type(() => Number)
  @IsInt({ message: 'Year must be a whole number' })
  @Min(2000, { message: 'Year must be 2000 or later' })
  @Max(2100, { message: 'Year must be 2100 or earlier' })
  year: number;

  @ApiProperty({
    example: 1,
    description: 'Month of the year (1-12)',
    minimum: 1,
    maximum: 12,
  })
  @Type(() => Number)
  @IsInt({ message: 'Month must be a whole number (1-12)' })
  @Min(1, { message: 'Month must be between 1 and 12' })
  @Max(12, { message: 'Month must be between 1 and 12' })
  month: number;
}
