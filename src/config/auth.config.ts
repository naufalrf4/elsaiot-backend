import { registerAs } from '@nestjs/config';
import { AuthConfig } from './interfaces/auth.interface';

/**
 * Authentication configuration
 * Contains configuration for all authentication mechanisms
 */
export default registerAs('auth', (): AuthConfig => {
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const googleCallbackUrl = process.env.GOOGLE_CALLBACK_URL;

  // Only include Google OAuth config if all required values are present
  const googleConfig =
    googleClientId && googleClientSecret && googleCallbackUrl
      ? {
          clientId: googleClientId,
          clientSecret: googleClientSecret,
          callbackUrl: googleCallbackUrl,
        }
      : undefined;

  return {
    jwt: {
      secret:
        process.env.JWT_SECRET || 'unsecure_dev_secret_change_me_in_production',
      accessTokenExpiration: process.env.JWT_EXPIRES_IN || '15m',
      refreshTokenExpiration: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    },
    ...(googleConfig && { google: googleConfig }),
  };
});
