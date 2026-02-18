import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class CreateWalletDto {
  @ApiProperty({ example: 'NGN', description: 'Currency code (e.g. NGN, USD)' })
  @IsNotEmpty()
  @IsString()
  @Length(3, 10)
  currency: string;
}
