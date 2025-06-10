import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { MailOptions } from '../interfaces/mail-options.interface';
import { MailConfig } from '../../config/interfaces/mail.config.interface';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;
  private mailConfig: MailConfig;
  private readonly isProduction: boolean;

  constructor(private readonly configService: ConfigService) {
    this.isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    
    const mailConfig = this.configService.get<MailConfig>('mail');
    if (!mailConfig) {
      throw new InternalServerErrorException('Mail configuration is missing');
    }
    this.mailConfig = mailConfig;
    
    // In production mode, validate required mail settings
    if (this.isProduction) {
      this.validateProductionMailConfig();
    } else {
      // Only log config details in non-production
      this.logger.debug(`Mail Configuration: host=${this.mailConfig.host}, port=${this.mailConfig.port}`);
    }
    
    this.initializeTransporter();
  }
  
  /**
   * Validates that all required mail configuration is present in production mode
   * @throws InternalServerErrorException if critical config is missing
   */
  private validateProductionMailConfig(): void {
    if (!this.mailConfig.host || this.mailConfig.host === 'smtp.example.com') {
      throw new InternalServerErrorException('Mail host configuration is missing or invalid');
    }
    
    if (!this.mailConfig.user || !this.mailConfig.password) {
      throw new InternalServerErrorException('Mail authentication credentials are missing');
    }
    
    if (!this.mailConfig.from) {
      throw new InternalServerErrorException('Mail "from" address is missing');
    }
  }

  private initializeTransporter(): void {
    try {
      // Check if auth credentials are available
      const hasCredentials = this.mailConfig.user && this.mailConfig.password;
      
      if (!hasCredentials) {
        if (this.isProduction) {
          throw new InternalServerErrorException('Mail credentials are required in production mode');
        } else {
          this.logger.warn('Mail credentials are missing or empty. Email functionality will be limited.');
        }
      }
      
      // Create transport config
      const transportConfig: nodemailer.TransportOptions = {
        host: this.mailConfig.host,
        port: this.mailConfig.port,
        secure: this.mailConfig.secure,
      };
      
      // Only add auth if credentials are available
      if (hasCredentials) {
        transportConfig['auth'] = {
          user: this.mailConfig.user,
          pass: this.mailConfig.password,
        };
      }
      
      this.transporter = nodemailer.createTransport(transportConfig);
      
      // Verify transporter
      this.transporter.verify((error, success) => {
        if (error) {
          const errorMessage = `Mail transporter verification failed: ${error.message}`;
          this.logger.error(errorMessage);
          
          if (this.isProduction) {
            throw new InternalServerErrorException(errorMessage);
          }
        } else {
          this.logger.log('Mail transporter verified successfully');
        }
      });
    } catch (error) {
      const errorMessage = `Failed to initialize mail transporter: ${error.message}`;
      this.logger.error(errorMessage);
      
      if (this.isProduction) {
        throw new InternalServerErrorException(errorMessage);
      }
    }
  }

  async sendMail(options: MailOptions): Promise<boolean> {
    try {
      if (!this.transporter) {
        this.logger.warn('Mail transporter not initialized, attempting to reinitialize');
        this.initializeTransporter();
        
        if (!this.transporter) {
          const errorMessage = 'Mail transporter could not be initialized';
          this.logger.error(errorMessage);
          
          if (this.isProduction) {
            throw new InternalServerErrorException(errorMessage);
          }
          return false;
        }
      }

      const mailOptions = {
        from: this.mailConfig.from,
        ...options,
      };

      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent to ${options.to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`);
      
      if (this.isProduction) {
        // In production, log error details but don't expose them in the exception
        throw new InternalServerErrorException('Failed to send email');
      }
      return false;
    }
  }
} 