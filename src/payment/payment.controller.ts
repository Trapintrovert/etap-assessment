import {
  Body,
  Controller,
  Headers,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Request } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../entities/user.entity';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@ApiTags('payments')
@Controller('payments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('initialize')
  @ApiOperation({ summary: 'Initialize Paystack payment to credit wallet' })
  @ApiResponse({
    status: 201,
    description: 'Payment initialized; redirect user to authorization_url',
  })
  @ApiResponse({ status: 403, description: 'Wallet does not belong to user' })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  async initializePayment(
    @CurrentUser() user: User,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.paymentService.createPayment(user.id, dto);
  }

  @Post('webhook')
  @Public()
  @SkipThrottle()
  @ApiOperation({
    summary: 'Paystack webhook',
    description:
      'Called by Paystack on payment events. Auth: x-paystack-signature only (HMAC SHA512). No JWT. Handles charge.success to credit wallet and update transaction.',
  })
  @ApiHeader({
    name: 'x-paystack-signature',
    description:
      'HMAC SHA512 signature of request body (required for verification).',
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid webhook signature',
  })
  async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-paystack-signature') signature: string,
  ) {
    const rawBody = req.rawBody?.toString('utf8') ?? req.body;
    const bodyStr =
      typeof rawBody === 'string' ? rawBody : JSON.stringify(req.body ?? {});
    await this.paymentService.handleWebhook(bodyStr, signature ?? '');
    return {};
  }
}
