import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../entities/user.entity';

export class AuthResponseDto {
  @ApiProperty({ description: 'User object (password excluded)' })
  user: User;

  @ApiProperty({ description: 'JWT access token' })
  accessToken: string;
}
