import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';

/**
 * Nigerian phone format: +234 followed by 10 digits, or 0 followed by 10 digits.
 * E.g. +2348012345678, 08012345678
 */
const PHONE_REGEX = /^(\+234|0)[0-9]{10}$/;

export class UpdateUserDto {
  @ApiPropertyOptional({
    example: '+2348012345678',
    description: 'Phone number (must be unique)',
  })
  @IsOptional()
  @IsString()
  @Matches(PHONE_REGEX, {
    message:
      'Phone must be in Nigerian format (e.g. +2348012345678 or 08012345678)',
  })
  phone?: string;
}
