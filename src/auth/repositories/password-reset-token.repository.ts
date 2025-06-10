import { Injectable } from '@nestjs/common';
import { DataSource, Repository, MoreThan } from 'typeorm';
import { PasswordResetToken } from '../entities/password-reset-token.entity';

@Injectable()
export class PasswordResetTokenRepository extends Repository<PasswordResetToken> {
  constructor(private dataSource: DataSource) {
    super(PasswordResetToken, dataSource.createEntityManager());
  }

  async findByTokenHash(tokenHash: string): Promise<PasswordResetToken | null> {
    return this.findOne({
      where: { tokenHash },
      relations: ['user'],
    });
  }

  async findValidToken(tokenHash: string): Promise<PasswordResetToken | null> {
    return this.findOne({
      where: {
        tokenHash,
        used: false,
        expiresAt: MoreThan(new Date()),
      },
      relations: ['user'],
    });
  }

  async markAsUsed(id: string): Promise<void> {
    await this.update(id, { used: true });
  }

  async removeExpiredTokens(): Promise<void> {
    await this.createQueryBuilder()
      .delete()
      .from(PasswordResetToken)
      .where('expires_at < :now', { now: new Date() })
      .execute();
  }

  /**
   * Delete all tokens for a specific user
   * Used when we need to invalidate all potential reset attempts
   * @param userId User ID to delete tokens for
   * @returns The number of tokens deleted
   */
  async deleteByUserId(userId: string): Promise<number> {
    const result = await this.createQueryBuilder()
      .delete()
      .from(PasswordResetToken)
      .where('user_id = :userId', { userId })
      .execute();
      
    return result.affected || 0;
  }
} 