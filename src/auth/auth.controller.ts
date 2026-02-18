import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Self-registration',
    description:
      'Create your own account. Returns user + JWT (no auth required). For admin creating users without auto-login, use POST /api/users instead (admin only).',
  })
  @ApiResponse({
    status: 201,
    description: 'User created and JWT token returned',
  })
  @ApiResponse({ status: 400, description: 'Invalid input (validation error)' })
  @ApiResponse({ status: 409, description: 'Phone number already exists' })
  async register(@Body() dto: CreateUserDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login a user' })
  @ApiResponse({
    status: 200,
    description: 'User logged in and JWT token returned',
  })
  @ApiResponse({ status: 400, description: 'Invalid input (validation error)' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
