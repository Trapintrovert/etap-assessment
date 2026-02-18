import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

/**
 * Nigerian phone format: +234 followed by 10 digits, or 0 followed by 10 digits.
 */
const PHONE_REGEX = /^(\+234|0)[0-9]{10}$/;

export class LoginDto {
  @ApiProperty({ example: '+2348012345678', description: 'Phone number' })
  @IsNotEmpty({ message: 'Phone is required' })
  @IsString({ message: 'Phone must be a string' })
  @Matches(PHONE_REGEX, {
    message:
      'Phone must be in Nigerian format (e.g. +2348012345678 or 08012345678)',
  })
  phone: string;

  @ApiProperty({ example: 'SecurePass123!', minLength: 6 })
  @IsNotEmpty({ message: 'Password is required' })
  @IsString({ message: 'Password must be a string' })
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password: string;
}
