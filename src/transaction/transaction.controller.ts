import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { User, UserRole } from '../entities/user.entity';
import { TransactionService } from './transaction.service';
import { WalletService } from '../wallet/wallet.service';
import { MonthlySummaryQueryDto } from './dto/monthly-summary-query.dto';
import { MonthlySummaryResponseDto } from './dto/monthly-summary-response.dto';

@ApiTags('transactions')
@Controller('transactions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TransactionController {
  constructor(
    private readonly transactionService: TransactionService,
    private readonly walletService: WalletService,
  ) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiTags('transactions', 'admin')
  @ApiOperation({ summary: 'List all transactions (admin only)' })
  @ApiResponse({ status: 200, description: 'List of all transactions' })
  async allTransactions() {
    return this.transactionService.allTransactions();
  }

  @Get('summaries/monthly')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiTags('transactions', 'admin')
  @ApiOperation({
    summary: 'Monthly payment summary (admin only)',
    description:
      'Aggregates all transactions (credits + transfers) for the given month. Returns total count, total amount, and breakdown by type and currency.',
  })
  @ApiQuery({
    name: 'year',
    required: true,
    type: Number,
    example: 2025,
    description: 'Calendar year (2000-2100)',
  })
  @ApiQuery({
    name: 'month',
    required: true,
    type: Number,
    example: 1,
    description: 'Month of the year (1-12)',
  })
  @ApiResponse({
    status: 200,
    description:
      'Monthly summary with totals and breakdown by type and currency',
    type: MonthlySummaryResponseDto,
  })
  async getMonthlySummary(
    @Query() query: MonthlySummaryQueryDto,
  ): Promise<MonthlySummaryResponseDto> {
    return this.transactionService.getMonthlySummary(query.year, query.month);
  }

  @Get('reference/:reference')
  @ApiOperation({ summary: 'Get transaction by reference' })
  @ApiResponse({ status: 200, description: 'Transaction details' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async transactionByReference(
    @Param('reference') reference: string,
    @CurrentUser() user: User,
  ) {
    const transaction =
      await this.transactionService.transactionByReferenceOrFail(reference);
    await this.walletService.getWalletById(transaction.walletId, user.id);
    return transaction;
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'List transactions for a user' })
  @ApiResponse({ status: 200, description: 'List of transactions' })
  @ApiResponse({ status: 403, description: 'Can only list own transactions' })
  async transactionsByUserId(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: User,
  ) {
    if (userId !== user.id) {
      throw new ForbiddenException('You can only list your own transactions');
    }
    return this.transactionService.transactionsByUserId(userId);
  }

  @Get('wallet/:walletId')
  @ApiOperation({ summary: 'List transactions for a wallet' })
  @ApiResponse({ status: 200, description: 'List of transactions' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Wallet or transactions not found' })
  async transactionsByWalletId(
    @Param('walletId', ParseUUIDPipe) walletId: string,
    @CurrentUser() user: User,
  ) {
    await this.walletService.getWalletById(walletId, user.id);
    return this.transactionService.transactionsByWalletIdOrFail(walletId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get transaction by id' })
  @ApiResponse({ status: 200, description: 'Transaction details' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async transactionById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    const transaction =
      await this.transactionService.findTransactionByIdOrFail(id);
    await this.walletService.getWalletById(transaction.walletId, user.id);
    return transaction;
  }
}
