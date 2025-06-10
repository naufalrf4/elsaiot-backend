import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailService } from './services/mail.service';
import { EmailTemplateService } from './services/email-template.service';

@Module({
  imports: [ConfigModule],
  providers: [
    MailService, 
    EmailTemplateService,
    {
      provide: 'IS_DEVELOPMENT',
      useFactory: (configService: ConfigService) => 
        configService.get<string>('NODE_ENV') === 'development',
      inject: [ConfigService],
    },
  ],
  exports: [MailService, EmailTemplateService],
})
export class EmailModule {} 