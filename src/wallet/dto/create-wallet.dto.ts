import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class CreateWalletDto {
  @ApiProperty({ example: 'NGN', description: 'Currency code (e.g. NGN, USD)' })
  @IsNotEmpty({ message: 'Currency is required' })
  @IsString({ message: 'Currency must be a string' })
  @Length(3, 10, {
    message: 'Currency must be 3 to 10 characters (e.g. NGN, USD)',
  })
  currency: string;
}
