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
  @IsInt()
  @Min(2000)
  @Max(2100)
  year: number;

  @ApiProperty({
    example: 1,
    description: 'Month of the year (1-12)',
    minimum: 1,
    maximum: 12,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;
}
