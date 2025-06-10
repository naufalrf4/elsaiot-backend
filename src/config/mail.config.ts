import { registerAs } from '@nestjs/config';
import { MailConfig } from './interfaces/mail.config.interface';

export default registerAs('mail', (): MailConfig => ({
  host: process.env.MAIL_HOST || 'smtp.example.com',
  port: parseInt(process.env.MAIL_PORT || '587', 10),
  secure: process.env.MAIL_SECURE === 'true',
  user: process.env.MAIL_USER || '',
  password: process.env.MAIL_PASSWORD || '',
  from: process.env.MAIL_FROM || 'no-reply@elsaiot.com',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
})); 