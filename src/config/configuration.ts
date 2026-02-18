export default () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    name: process.env.DB_NAME || 'wallet_db',
    synchronize: process.env.DB_SYNCHRONIZE === 'true',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'change-me-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  paystack: {
    apiKey: process.env.PAYSTACK_API_KEY || '',
    callbackUrl:
      process.env.PAYSTACK_CALLBACK_URL ||
      `${process.env.APP_URL || 'http://localhost:3000'}/api/payments/callback`,
  },
  transfer: {
    /** Amount (NGN) above which transfers require admin approval. */
    largeTransferThreshold: parseInt(
      process.env.LARGE_TRANSFER_THRESHOLD || '1000000',
      10,
    ),
  },
  throttle: {
    /** Time window in milliseconds. */
    ttl: parseInt(process.env.THROTTLE_TTL || '60000', 10),
    /** Max requests per ttl per IP. */
    limit: parseInt(process.env.THROTTLE_LIMIT || '100', 10),
  },
  cors: {
    /** Comma-separated origins, or * for all. */
    origin: process.env.CORS_ORIGIN || '*',
  },
});
