import { Injectable, Logger, BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRepository } from '../../users/repositories/user.repository';
import { PasswordResetTokenService } from './password-reset-token.service';
import { PasswordResetTokenRepository } from '../repositories/password-reset-token.repository';
import { MailService } from '../../email/services/mail.service';
import { EmailTemplateService } from '../../email/services/email-template.service';
import { ResetPasswordDto, ValidateResetTokenResponseDto } from '../dto/password-reset.dto';
import { User } from '../../users/entities/user.entity';
import { MailConfig } from '../../config/interfaces/mail.config.interface';

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);
  private readonly TOKEN_EXPIRATION_HOURS = 1;
  private mailConfig: MailConfig;
  private readonly isProduction: boolean;

  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordResetTokenService: PasswordResetTokenService,
    private readonly passwordResetTokenRepository: PasswordResetTokenRepository,
    private readonly mailService: MailService,
    private readonly emailTemplateService: EmailTemplateService,
    private readonly configService: ConfigService,
  ) {
    this.isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    
    const mailConfig = this.configService.get<MailConfig>('mail');
    if (!mailConfig) {
      throw new InternalServerErrorException('Mail configuration is missing');
    }
    this.mailConfig = mailConfig;
    
    // Validate mail configuration
    this.validateMailConfig();
  }
  
  /**
   * Validates mail configuration and throws exception if critical settings are missing in production
   */
  private validateMailConfig(): void {
    if (!this.mailConfig.host || this.mailConfig.host === 'smtp.example.com') {
      const message = 'Mail host is not configured or uses default value';
      if (this.isProduction) {
        throw new InternalServerErrorException(message);
      } else {
        this.logger.warn(`${message}. Password reset emails may not be delivered.`);
      }
    }
    
    if (!this.mailConfig.frontendUrl) {
      throw new InternalServerErrorException('Frontend URL is missing from mail configuration');
    }
  }

  /**
   * Requests a password reset for a user
   * @param email Email address of the user
   */
  async requestPasswordReset(email: string): Promise<void> {
    try {
      // Find user by email silently (no error if not found for security)
      const user = await this.userRepository.findByEmail(email);
      
      // If user doesn't exist or is inactive, log but don't throw error
      if (!user || !user.active) {
        this.logger.debug(`Password reset requested for non-existent/inactive user: ${email}`);
        return;
      }
      
      // Generate token for password reset
      const token = await this.passwordResetTokenService.generateToken(user.id);
      
      // Build the reset URL (frontend will handle the actual form)
      const resetLink = `${this.mailConfig.frontendUrl}/reset-password?token=${token}`;
      
      // Render email templates
      const { html, text } = this.emailTemplateService.renderPasswordResetEmail({
        userName: user.fullName,
        resetLink,
        expiresInHours: this.TOKEN_EXPIRATION_HOURS,
      });
      
      try {
        // Send the email
        await this.mailService.sendMail({
          to: user.email,
          subject: 'Reset Your ElsaIoT Password',
          html,
          text,
        });
        
        this.logger.log(`Password reset email sent to ${user.email}`);
      } catch (emailError) {
        // Email failed to send, but we still created the token
        // Log explicitly but don't throw error for security
        this.logger.error(`Failed to send password reset email: ${emailError.message}`);
        
        // Delete the token if email sending failed in production
        // This prevents tokens that can't be delivered from being used
        if (this.isProduction) {
          try {
            const deletedCount = await this.passwordResetTokenRepository.deleteByUserId(user.id);
            this.logger.debug(`${deletedCount} tokens removed due to email delivery failure for user ${user.id}`);
          } catch (deleteError) {
            this.logger.error(`Failed to delete token after email failure: ${deleteError.message}`);
          }
        }
      }
    } catch (error) {
      this.logger.error(`Error in requestPasswordReset: ${error.message}`);
      // Don't rethrow for security reasons - always return void
    }
  }

  /**
   * Validates a password reset token without consuming it
   * @param token Token to validate
   * @returns Token validation result with user email if valid
   */
  async validateResetToken(token: string): Promise<ValidateResetTokenResponseDto> {
    try {
      const { isValid, userId } = await this.passwordResetTokenService.validateToken(token);
      
      if (!isValid || !userId) {
        return { isValid: false };
      }
      
      // Get the user to return the email
      const user = await this.userRepository.findByIdWithoutPassword(userId);
      
      if (!user || !user.active) {
        return { isValid: false };
      }
      
      return {
        isValid: true,
        email: user.email,
      };
    } catch (error) {
      this.logger.error(`Error validating reset token: ${error.message}`);
      return { isValid: false };
    }
  }

  /**
   * Resets a user's password using a valid token
   * @param resetData Data for password reset
   * @returns Success status
   */
  async resetPassword(resetData: ResetPasswordDto): Promise<boolean> {
    try {
      // Verify passwords match
      if (resetData.password !== resetData.confirmPassword) {
        throw new BadRequestException('Passwords do not match');
      }
      
      // Validate token
      const { isValid, userId } = await this.passwordResetTokenService.validateToken(resetData.token);
      
      if (!isValid || !userId) {
        this.logger.debug('Invalid or expired token');
        return false;
      }
      
      // Get user with password field
      const user = await this.userRepository.findOne({
        where: { id: userId },
        select: ['id', 'email', 'password', 'fullName', 'active'],
      });
      
      if (!user || !user.active) {
        this.logger.debug(`User not found or inactive: ${userId}`);
        return false;
      }
      
      // Update password
      user.password = resetData.password;
      await this.userRepository.save(user);
      
      // Consume the token
      await this.passwordResetTokenService.consumeToken(resetData.token);
      
      this.logger.log(`Password successfully reset for user ${user.email}`);
      
      // Optionally send a confirmation email (implementation not shown)
      
      return true;
    } catch (error) {
      this.logger.error(`Error resetting password: ${error.message}`);
      
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      return false;
    }
  }
} 