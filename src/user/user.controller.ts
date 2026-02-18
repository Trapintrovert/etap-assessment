import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Delete,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { User, UserRole } from '../entities/user.entity';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SelfOrAdminGuard } from '../auth/guards/self-or-admin.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Create user (admin only)',
    description:
      'Admin creates a new user without auto-login. For self-registration (returns JWT), use POST /api/auth/register instead.',
  })
  @ApiResponse({ status: 201, description: 'User created' })
  @ApiResponse({ status: 400, description: 'Invalid input (validation error)' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden (admin only)' })
  @ApiResponse({ status: 409, description: 'Phone number already exists' })
  async createUser(@Body() dto: CreateUserDto): Promise<User> {
    return this.userService.createUser(dto);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all users (admin only)' })
  @ApiResponse({ status: 200, description: 'All users' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden (admin only)' })
  async getAllUsers(): Promise<User[]> {
    return this.userService.allUsers();
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(SelfOrAdminGuard)
  @ApiOperation({ summary: 'Get user profile by id (self or admin)' })
  @ApiResponse({ status: 200, description: 'User profile (password excluded)' })
  @ApiResponse({ status: 400, description: 'Invalid UUID format' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden (not self or admin)' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getProfile(@Param('id', ParseUUIDPipe) id: string): Promise<User> {
    return this.userService.findUserByIdOrFail(id);
  }

  @Put(':id')
  @ApiBearerAuth()
  @UseGuards(SelfOrAdminGuard)
  @ApiOperation({ summary: 'Update user profile by id (self or admin)' })
  @ApiResponse({ status: 200, description: 'User profile updated' })
  @ApiResponse({ status: 400, description: 'Invalid input (validation error)' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden (not self or admin)' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'Phone number already exists' })
  async updateProfile(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<User> {
    return this.userService.updateUser(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(SelfOrAdminGuard)
  @ApiOperation({ summary: 'Delete user by id (self or admin)' })
  @ApiResponse({ status: 200, description: 'User deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden (not self or admin)' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async deleteUser(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.userService.deleteUser(id);
  }
}
