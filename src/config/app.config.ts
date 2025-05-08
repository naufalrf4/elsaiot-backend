import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.API_PORT || '3000', 10),
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  enableSwagger: process.env.ENABLE_SWAGGER === 'true',
  corsOrigin: process.env.CORS_ORIGIN || '*',
}));
