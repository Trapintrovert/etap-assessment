import { createHmac } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

@Injectable()
export class PaystackService {
  private readonly client: AxiosInstance;
  private readonly apiKey: string;

  constructor(private config: ConfigService) {
    this.apiKey = this.config.get<string>('paystack.apiKey', '');
    this.client = axios.create({
      baseURL: PAYSTACK_BASE_URL,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Initialize a transaction (e.g. for wallet credit).
   * Returns authorization_url for redirect or reference for verification.
   */
  async initializeTransaction(params: {
    email: string;
    amount: number; // in kobo/cents
    reference?: string;
    callback_url?: string;
    metadata?: Record<string, unknown>;
  }) {
    const { data } = await this.client.post('/transaction/initialize', {
      email: params.email,
      amount: params.amount,
      reference: params.reference,
      callback_url: params.callback_url,
      metadata: params.metadata,
    });
    return data;
  }

  /**
   * Verify a transaction by reference.
   */
  async verifyTransaction(reference: string) {
    const { data } = await this.client.get(`/transaction/verify/${reference}`);
    return data;
  }

  /**
   * Verify Paystack webhook signature (x-paystack-signature).
   * Body must be the raw request body string.
   */
  verifyWebhookSignature(body: string, signature: string): boolean {
    const hash = createHmac('sha512', this.apiKey).update(body).digest('hex');
    return hash === signature;
  }
}
