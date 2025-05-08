import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { RefreshToken } from '../entities/refresh-token.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RefreshTokenRepository extends Repository<RefreshToken> {
  constructor(private dataSource: DataSource) {
    super(RefreshToken, dataSource.createEntityManager());
  }

  /**
   * Create a new refresh token for a user
   */
  async createRefreshToken(userId: string, expiresIn: number): Promise<RefreshToken> {
    const refreshToken = new RefreshToken();
    refreshToken.userId = userId;
    refreshToken.token = uuidv4();
    refreshToken.expiresAt = new Date(Date.now() + expiresIn);

    return this.save(refreshToken);
  }

  /**
   * Find refresh token by token value
   */
  async findByToken(token: string): Promise<RefreshToken | null> {
    return this.findOne({ where: { token } });
  }

  /**
   * Find all refresh tokens for a user
   */
  async findByUserId(userId: string): Promise<RefreshToken[]> {
    return this.find({ where: { userId } });
  }

  /**
   * Delete a refresh token
   */
  async deleteRefreshToken(token: string): Promise<void> {
    await this.delete({ token });
  }

  /**
   * Delete all refresh tokens for a user
   */
  async deleteAllUserTokens(userId: string): Promise<void> {
    await this.delete({ userId });
  }

  /**
   * Delete expired tokens
   */
  async deleteExpiredTokens(): Promise<void> {
    await this.createQueryBuilder()
      .delete()
      .from(RefreshToken)
      .where('expiresAt < :now', { now: new Date() })
      .execute();
  }
} 