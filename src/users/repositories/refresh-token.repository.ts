import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { RefreshToken } from '../entities/refresh-token.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RefreshTokenRepository extends Repository<RefreshToken> {
  constructor(private dataSource: DataSource) {
    super(RefreshToken, dataSource.createEntityManager());
  }

  async createRefreshToken(userId: string, expiresIn: number): Promise<RefreshToken> {
    const refreshToken = new RefreshToken();
    refreshToken.userId = userId;
    refreshToken.token = uuidv4();
    refreshToken.expiresAt = new Date(Date.now() + expiresIn);

    return this.save(refreshToken);
  }

  async findByToken(token: string): Promise<RefreshToken | null> {
    return this.findOne({ where: { token } });
  }

  async findByUserId(userId: string): Promise<RefreshToken[]> {
    return this.find({ where: { userId } });
  }

  async deleteRefreshToken(token: string): Promise<void> {
    await this.delete({ token });
  }

  async deleteAllUserTokens(userId: string): Promise<void> {
    await this.delete({ userId });
  }

  async deleteExpiredTokens(): Promise<void> {
    await this.createQueryBuilder()
      .delete()
      .from(RefreshToken)
      .where('expiresAt < :now', { now: new Date() })
      .execute();
  }
} 