import { Injectable, Logger } from '@nestjs/common';
import { PasswordResetTokenRepository } from '../repositories/password-reset-token.repository';
import { PasswordResetToken } from '../entities/password-reset-token.entity';
import { MoreThan } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

@Injectable()
export class PasswordResetTokenService {
  private readonly logger = new Logger(PasswordResetTokenService.name);
  private readonly TOKEN_EXPIRATION_HOURS = 1;

  constructor(
    private readonly passwordResetTokenRepository: PasswordResetTokenRepository,
  ) {}

  /**
   * Generate a secure random token for password reset
   * @param userId The ID of the user requesting password reset
   * @returns The plaintext token to be sent to the user
   */
  async generateToken(userId: string): Promise<string> {
    try {
      // Generate a cryptographically secure random token
      const tokenBytes = crypto.randomBytes(32);
      const token = tokenBytes.toString('hex');
      
      // Hash the token for storage
      const tokenHash = await bcrypt.hash(token, 10);
      
      // Calculate expiration time (1 hour from now)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + this.TOKEN_EXPIRATION_HOURS);
      
      // Create a new token record
      const tokenEntity = new PasswordResetToken();
      tokenEntity.userId = userId;
      tokenEntity.tokenHash = tokenHash;
      tokenEntity.expiresAt = expiresAt;
      tokenEntity.used = false;
      
      // Save to database
      await this.passwordResetTokenRepository.save(tokenEntity);
      
      // Clean up expired tokens
      this.cleanupExpiredTokens();
      
      // Return the plaintext token (not the hash)
      return token;
    } catch (error) {
      this.logger.error(`Error generating password reset token: ${error.message}`);
      throw error;
    }
  }

  /**
   * Validates a password reset token without consuming it
   * @param token The token to validate
   * @returns Validation result with userId if valid
   */
  async validateToken(token: string): Promise<{ isValid: boolean; userId?: string }> {
    try {
      // Find all non-used tokens that haven't expired
      const passwordResetTokens = await this.passwordResetTokenRepository.find({
        where: {
          used: false,
          expiresAt: MoreThan(new Date()),
        },
      });

      // Early return if no tokens found
      if (!passwordResetTokens || passwordResetTokens.length === 0) {
        this.logger.debug('No valid tokens found');
        return { isValid: false };
      }

      // Check each token by comparing the hash
      for (const tokenEntity of passwordResetTokens) {
        const isMatch = await bcrypt.compare(token, tokenEntity.tokenHash);
        if (isMatch) {
          return { isValid: true, userId: tokenEntity.userId };
        }
      }

      // No match found
      this.logger.debug('Token validation failed, no matching token found');
      return { isValid: false };
    } catch (error) {
      this.logger.error(`Error validating password reset token: ${error.message}`);
      return { isValid: false };
    }
  }

  /**
   * Consumes a token after successful password reset
   * @param token The token to consume
   * @returns Whether the operation was successful
   */
  async consumeToken(token: string): Promise<boolean> {
    try {
      // Find all non-used tokens that haven't expired
      const passwordResetTokens = await this.passwordResetTokenRepository.find({
        where: {
          used: false,
          expiresAt: MoreThan(new Date()),
        },
      });

      // Early return if no tokens found
      if (!passwordResetTokens || passwordResetTokens.length === 0) {
        return false;
      }

      // Find the matching token
      for (const tokenEntity of passwordResetTokens) {
        const isMatch = await bcrypt.compare(token, tokenEntity.tokenHash);
        if (isMatch) {
          // Mark as used
          tokenEntity.used = true;
          await this.passwordResetTokenRepository.save(tokenEntity);
          this.logger.debug(`Token consumed for user ${tokenEntity.userId}`);
          return true;
        }
      }

      return false;
    } catch (error) {
      this.logger.error(`Error consuming password reset token: ${error.message}`);
      return false;
    }
  }

  /**
   * Removes expired tokens from the database
   */
  private async cleanupExpiredTokens(): Promise<void> {
    try {
      await this.passwordResetTokenRepository.removeExpiredTokens();
      this.logger.debug('Expired password reset tokens cleaned up');
    } catch (error) {
      this.logger.error(`Error cleaning up expired tokens: ${error.message}`);
    }
  }
} 