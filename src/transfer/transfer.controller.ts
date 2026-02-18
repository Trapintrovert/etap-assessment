import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '../entities/user.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { User } from '../entities/user.entity';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { TransferService } from './transfer.service';

@ApiTags('transfers')
@Controller('transfers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TransferController {
  constructor(private readonly transferService: TransferService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a transfer (or pending if amount > threshold)',
  })
  @ApiResponse({
    status: 201,
    description: 'Transfer created or pending approval',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error or insufficient balance',
  })
  async createTransfer(
    @CurrentUser() user: User,
    @Body() dto: CreateTransferDto,
  ) {
    return this.transferService.createTransfer(user.id, dto);
  }

  @Get('pending')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiTags('transfers', 'admin')
  @ApiOperation({ summary: 'List pending transfers (admin only)' })
  @ApiResponse({ status: 200, description: 'List of pending transfers' })
  async allPendingTransfers() {
    return this.transferService.allPendingTransfers();
  }

  @Patch(':id/approve')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiTags('transfers', 'admin')
  @ApiOperation({ summary: 'Approve pending transfer (admin only)' })
  @ApiResponse({ status: 200, description: 'Transfer approved and executed' })
  @ApiResponse({
    status: 400,
    description: 'Not pending or insufficient balance',
  })
  async approveTransfer(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.transferService.approveTransfer(id, user.id);
  }

  @Patch(':id/reject')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiTags('transfers', 'admin')
  @ApiOperation({ summary: 'Reject pending transfer (admin only)' })
  @ApiResponse({ status: 200, description: 'Transfer rejected' })
  @ApiResponse({ status: 400, description: 'Not pending approval' })
  async rejectTransfer(@Param('id', ParseUUIDPipe) id: string) {
    return this.transferService.rejectTransfer(id);
  }
}
