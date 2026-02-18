import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

/**
 * Nigerian phone format: +234 followed by 10 digits, or 0 followed by 10 digits.
 * E.g. +2348012345678, 08012345678
 */
const PHONE_REGEX = /^(\+234|0)[0-9]{10}$/;

export class CreateUserDto {
  @ApiProperty({
    example: '+2348012345678',
    description: 'Unique phone number',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(PHONE_REGEX, {
    message:
      'Phone must be in Nigerian format (e.g. +2348012345678 or 08012345678)',
  })
  phone: string;

  @ApiProperty({ example: 'SecurePass123!', minLength: 6 })
  @IsNotEmpty()
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password: string;
}
