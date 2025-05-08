import { registerAs } from '@nestjs/config';
import { JwtConfig } from './interfaces/auth.interface';

/**
 * JWT configuration
 * Contains configuration for JWT token generation and validation
 */
export default registerAs('jwt', (): JwtConfig => {
  // Verify required environment variables
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    console.warn(
      'WARNING: JWT_SECRET is not set. Using a default secret is not secure for production.',
    );
  }

  return {
    secret: jwtSecret || 'unsecure_dev_secret_change_me_in_production',
    accessTokenExpiration: process.env.JWT_EXPIRES_IN || '15m',
    refreshTokenExpiration: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  };
});
