/**
 * Validates required environment variables at startup.
 * Fails fast if critical env vars are missing.
 */
export function validateEnv(): void {
  const required = [
    'DB_HOST',
    'DB_PORT',
    'DB_USERNAME',
    'DB_PASSWORD',
    'DB_NAME',
    'JWT_SECRET',
  ] as const;

  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. Copy .env.example to .env and set values.`,
    );
  }

  if (process.env.NODE_ENV === 'production' && process.env.JWT_SECRET === 'change-me-in-production') {
    throw new Error('JWT_SECRET must be set to a secure value in production.');
  }
}
