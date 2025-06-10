import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from '../../users/entities/user.entity';
import { RefreshTokenRepository } from '../../users/repositories/refresh-token.repository';
import { UserRepository } from '../../users/repositories/user.repository';
import { RegisterDto } from '../dto/register.dto';
import { SignInDto } from '../dto/signin.dto';
import { GoogleProfile } from '../interfaces/google-profile.interface';
import { RefreshToken } from '../../users/entities/refresh-token.entity';
import { Request } from 'express';

interface TokenPayload {
  sub: string;
  iat?: number;
  exp?: number;
  email?: string;
  role?: string;
}

interface DeviceInfo {
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    public readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    // Clean expired tokens regularly
    this.setupTokenCleanup();
  }

  private setupTokenCleanup() {
    // Clean expired tokens every hour
    setInterval(
      () => {
        this.refreshTokenRepository.deleteExpiredTokens();
      },
      60 * 60 * 1000,
    ); // 1 hour
  }

  /**
   * Register a new user
   */
  async register(
    registerDto: RegisterDto,
  ): Promise<{ user: Partial<User>; accessToken: string }> {
    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(
      registerDto.email,
    );

    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    // Create new user
    const user = await this.userRepository.createUser(
      registerDto.email,
      registerDto.password,
      registerDto.fullName,
    );

    // Generate JWT token
    const accessToken = this.generateAccessToken(user);

    // Return user (without password) and token
    return {
      user: this.sanitizeUser(user),
      accessToken,
    };
  }

  /**
   * Authenticate user and generate tokens
   */
  async login(
    signInDto: SignInDto, 
    deviceInfo?: DeviceInfo
  ): Promise<{
    user: Partial<User>;
    accessToken: string;
    refreshToken: string;
  }> {
    // Find user by email
    const user = await this.userRepository.findByEmailWithPassword(
      signInDto.email,
    );

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await user.validatePassword(signInDto.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT token
    const accessToken = this.generateAccessToken(user);

    // Generate and save refresh token
    const refreshTokenExpiry = this.getRefreshTokenExpiryTime();
    const refreshToken = await this.refreshTokenRepository.createRefreshToken(
      user.id,
      refreshTokenExpiry,
      deviceInfo
    );

    // Return user (without password) and tokens
    return {
      user: this.sanitizeUser(user),
      accessToken,
      refreshToken: refreshToken.token,
    };
  }

  /**
   * Validate a refresh token and issue a new access token with token rotation
   */
  async refreshToken(
    token: string, 
    deviceInfo?: DeviceInfo
  ): Promise<{ accessToken: string; refreshToken: string }> {
    // Find the refresh token with user relation
    const refreshTokenEntity = await this.refreshTokenRepository.findByTokenWithUser(token);

    if (!refreshTokenEntity) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Check if token is expired
    if (refreshTokenEntity.expiresAt < new Date()) {
      // Remove expired token
      await this.refreshTokenRepository.deleteRefreshToken(token);
      throw new UnauthorizedException('Refresh token expired');
    }

    // Check device fingerprint if available
    if (deviceInfo?.deviceFingerprint && refreshTokenEntity.deviceFingerprint) {
      if (deviceInfo.deviceFingerprint !== refreshTokenEntity.deviceFingerprint) {
        // Potential token theft - revoke the entire token family
        await this.refreshTokenRepository.revokeRefreshTokenFamily(token);
        throw new UnauthorizedException('Invalid token for this device');
      }
    }

    // Get the user
    const user = refreshTokenEntity.user || 
      await this.userRepository.findByIdWithoutPassword(refreshTokenEntity.userId);

    if (!user) {
      // Token references a user that doesn't exist
      await this.refreshTokenRepository.deleteRefreshToken(token);
      throw new UnauthorizedException('User not found');
    }

    // Mark the current token as used
    await this.refreshTokenRepository.markTokenAsUsed(token);

    // Generate a new access token
    const accessToken = this.generateAccessToken(user);

    // Generate a new refresh token (token rotation)
    const refreshTokenExpiry = this.getRefreshTokenExpiryTime();
    const newRefreshToken = await this.refreshTokenRepository.createRefreshToken(
      user.id,
      refreshTokenExpiry,
      deviceInfo,
      token // Pass the current token to link them
    );

    return { 
      accessToken,
      refreshToken: newRefreshToken.token
    };
  }

  /**
   * Validate a refresh token without creating a new one (for token introspection)
   */
  async validateRefreshToken(token: string, userId: string): Promise<boolean> {
    const refreshToken = await this.refreshTokenRepository.findByToken(token);
    
    if (!refreshToken) {
      return false;
    }
    
    // Check if token belongs to the specified user
    if (refreshToken.userId !== userId) {
      // Log potential token theft attempt
      console.warn(`Token theft attempt: Token belongs to user ${refreshToken.userId} but used by ${userId}`);
      await this.refreshTokenRepository.revokeToken(token);
      return false;
    }
    
    // Check expiration
    if (refreshToken.expiresAt < new Date()) {
      return false;
    }
    
    return !refreshToken.isUsed && !refreshToken.isRevoked;
  }

  /**
   * Parse and validate JWT token
   */
  async parseJwtToken(token: string): Promise<TokenPayload | null> {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('auth.jwt.secret'),
      });
      
      return payload;
    } catch (error) {
      return null;
    }
  }

  /**
   * Generate JWT access token
   */
  generateAccessToken(user: User): string {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('auth.jwt.secret'),
      expiresIn: this.configService.get<string>(
        'auth.jwt.accessTokenExpiration',
      ),
    });
  }

  /**
   * Remove sensitive data from user object
   */
  private sanitizeUser(user: User): Partial<User> {
    const { password, createdAt, updatedAt, active, ...result } = user;
    return result;
  }

  /**
   * Get refresh token expiry time in milliseconds
   */
  getRefreshTokenExpiryTime(): number {
    const expiry =
      this.configService.get<string>('auth.jwt.refreshTokenExpiration') || '7d';

    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 7 * 24 * 60 * 60 * 1000;
    }

    const [_, value, unit] = match;
    const numValue = parseInt(value, 10);

    switch (unit) {
      case 's':
        return numValue * 1000;
      case 'm':
        return numValue * 60 * 1000;
      case 'h':
        return numValue * 60 * 60 * 1000;
      case 'd':
        return numValue * 24 * 60 * 60 * 1000;
      default:
        return 7 * 24 * 60 * 60 * 1000;
    }
  }

  /**
   * Invalidate all refresh tokens for a user
   */
  async invalidateAllUserTokens(userId: string): Promise<void> {
    await this.refreshTokenRepository.deleteAllUserTokens(userId);
  }

  /**
   * Validate if a user ID exists
   */
  async validateUserId(userId: string): Promise<User> {
    const user = await this.userRepository.findByIdWithoutPassword(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    return user;
  }

  /**
   * Validate a Google user and create/update user record
   */
  async validateGoogleUser(
    profile: GoogleProfile,
  ): Promise<User> {
    const { googleId, email, fullName } = profile;

    // Check if user exists with this email
    const existingUser = await this.userRepository.findByEmail(email);

    if (existingUser) {
      // If user exists but has a different googleId, handle conflict
      if (existingUser.googleId && existingUser.googleId !== googleId) {
        throw new ConflictException('Email already associated with a different Google account');
      }

      // Update googleId if not set
      if (!existingUser.googleId) {
        existingUser.googleId = googleId;
        await this.userRepository.save(existingUser);
      }

      return existingUser;
    }

    // Create new user from Google profile
    const newUser = await this.userRepository.createGoogleUser(
      email,
      fullName,
      googleId,
    );

    return newUser;
  }

  /**
   * Invalidate a specific refresh token
   */
  async invalidateRefreshToken(token: string, userId: string): Promise<void> {
    const refreshToken = await this.refreshTokenRepository.findByToken(token);
    
    // Only allow users to invalidate their own tokens
    if (refreshToken && refreshToken.userId === userId) {
      await this.refreshTokenRepository.revokeToken(token);
    } else if (refreshToken) {
      throw new UnauthorizedException('Cannot invalidate token belonging to another user');
    }
  }

  /**
   * Get device information from request
   */
  getDeviceInfoFromRequest(req: Request): DeviceInfo {
    const deviceFingerprint = req.headers['x-device-fingerprint'] as string;
    
    return {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] as string,
      deviceFingerprint,
    };
  }
}
