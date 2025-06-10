import { Injectable } from '@nestjs/common';
import { DataSource, Repository, MoreThan } from 'typeorm';
import { RefreshToken } from '../entities/refresh-token.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RefreshTokenRepository extends Repository<RefreshToken> {
  constructor(private dataSource: DataSource) {
    super(RefreshToken, dataSource.createEntityManager());
  }

  async createRefreshToken(
    userId: string, 
    expiresIn: number,
    deviceInfo?: {
      ipAddress?: string;
      userAgent?: string;
      deviceFingerprint?: string;
    },
    previousToken?: string
  ): Promise<RefreshToken> {
    const refreshToken = new RefreshToken();
    refreshToken.userId = userId;
    refreshToken.token = uuidv4();
    refreshToken.expiresAt = new Date(Date.now() + expiresIn);
    
    // Save device tracking information (all fields are already nullable in the entity)
    if (deviceInfo) {
      refreshToken.ipAddress = deviceInfo.ipAddress ?? null;
      refreshToken.userAgent = deviceInfo.userAgent ?? null;
      refreshToken.deviceFingerprint = deviceInfo.deviceFingerprint ?? null;
    }
    
    // For token rotation, store the previous token
    if (previousToken) {
      refreshToken.previousToken = previousToken;
    }

    return this.save(refreshToken);
  }

  async findByToken(token: string): Promise<RefreshToken | null> {
    return this.findOne({ 
      where: { 
        token,
        isUsed: false,
        isRevoked: false
      } 
    });
  }

  async findByTokenWithUser(token: string): Promise<RefreshToken | null> {
    return this.findOne({
      where: {
        token,
        isUsed: false,
        isRevoked: false
      },
      relations: ['user']
    });
  }

  async findByUserId(userId: string): Promise<RefreshToken[]> {
    return this.find({ where: { userId } });
  }

  async markTokenAsUsed(token: string): Promise<void> {
    await this.update({ token }, { isUsed: true });
  }

  async revokeToken(token: string): Promise<void> {
    await this.update({ token }, { isRevoked: true });
  }

  async revokeRefreshTokenFamily(token: string): Promise<void> {
    // First get the token to find its chainPreviousToken
    const refreshToken = await this.findOne({ where: { token } });
    if (!refreshToken) return;

    // Start with the current token and recursively find and revoke all related tokens
    await this.revokeTokenAndChildren(token);
  }

  private async revokeTokenAndChildren(token: string): Promise<void> {
    // Mark the current token as revoked
    await this.update({ token }, { isRevoked: true });

    // Find any children that have this token as their previousToken
    const childTokens = await this.find({ where: { previousToken: token } });
    
    // Recursively revoke all children
    for (const childToken of childTokens) {
      await this.revokeTokenAndChildren(childToken.token);
    }
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

  async findActiveTokensByFingerprint(userId: string, deviceFingerprint: string): Promise<RefreshToken[]> {
    return this.find({
      where: {
        userId,
        deviceFingerprint,
        isUsed: false,
        isRevoked: false,
        expiresAt: MoreThan(new Date())
      }
    });
  }
} 