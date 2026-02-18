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
import { User } from '../entities/user.entity';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @Public()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created' })
  @ApiResponse({ status: 400, description: 'Invalid input (validation error)' })
  @ApiResponse({ status: 409, description: 'Phone number already exists' })
  async createUser(@Body() dto: CreateUserDto): Promise<User> {
    return this.userService.createUser(dto);
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user profile by id' })
  @ApiResponse({ status: 200, description: 'User profile (password excluded)' })
  @ApiResponse({ status: 400, description: 'Invalid UUID format' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getProfile(@Param('id', ParseUUIDPipe) id: string): Promise<User> {
    return this.userService.findUserByIdOrFail(id);
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'All users' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getAllUsers(): Promise<User[]> {
    return this.userService.allUsers();
  }

  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user profile by id' })
  @ApiResponse({ status: 200, description: 'User profile updated' })
  @ApiResponse({ status: 400, description: 'Invalid input (validation error)' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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
  @ApiOperation({ summary: 'Delete user by id' })
  @ApiResponse({ status: 200, description: 'User deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async deleteUser(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.userService.deleteUser(id);
  }
}
