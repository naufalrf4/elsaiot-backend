import { registerAs } from '@nestjs/config';

export default registerAs('websocket', () => ({
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  },
})); 