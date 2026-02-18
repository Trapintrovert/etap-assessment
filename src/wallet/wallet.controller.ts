import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Wallet } from '../entities/wallet.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../entities/user.entity';
import { WalletService } from './wallet.service';
import { CreateWalletDto } from './dto/create-wallet.dto';

@ApiTags('wallets')
@Controller('wallets')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new wallet' })
  @ApiResponse({ status: 201, description: 'Wallet created' })
  @ApiResponse({ status: 400, description: 'Invalid input (validation error)' })
  @ApiResponse({
    status: 409,
    description: 'Wallet with currency already exists',
  })
  async createWallet(
    @CurrentUser() user: User,
    @Body() dto: CreateWalletDto,
  ): Promise<Wallet> {
    return this.walletService.createWallet(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all wallets for the authenticated user' })
  @ApiResponse({ status: 200, description: 'List of wallets' })
  async getWallets(@CurrentUser() user: User): Promise<Wallet[]> {
    return this.walletService.getWallets(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get wallet by id' })
  @ApiResponse({ status: 200, description: 'Wallet details' })
  @ApiResponse({ status: 400, description: 'Invalid UUID format' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  async getWallet(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<Wallet> {
    return this.walletService.getWalletById(id, user.id);
  }
}
