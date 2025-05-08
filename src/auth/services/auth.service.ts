import {
  BadRequestException,
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

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly refreshTokenRepository: RefreshTokenRepository,
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
  async login(signInDto: SignInDto): Promise<{
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
    );

    // Return user (without password) and tokens
    return {
      user: this.sanitizeUser(user),
      accessToken,
      refreshToken: refreshToken.token,
    };
  }

  /**
   * Validate a refresh token and issue a new access token
   */
  async refreshToken(token: string): Promise<{ accessToken: string }> {
    // Find the refresh token
    const refreshTokenEntity =
      await this.refreshTokenRepository.findByToken(token);

    if (!refreshTokenEntity) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Check if token is expired
    if (refreshTokenEntity.expiresAt < new Date()) {
      // Remove expired token
      await this.refreshTokenRepository.deleteRefreshToken(token);
      throw new UnauthorizedException('Refresh token expired');
    }

    // Get the user
    const user = await this.userRepository.findByIdWithoutPassword(
      refreshTokenEntity.userId,
    );

    if (!user) {
      // Token references a user that doesn't exist
      await this.refreshTokenRepository.deleteRefreshToken(token);
      throw new UnauthorizedException('User not found');
    }

    // Generate a new access token
    const accessToken = this.generateAccessToken(user);

    return { accessToken };
  }

  /**
   * Generate JWT access token
   */
  private generateAccessToken(user: User): string {
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
    const { password, ...result } = user;
    return result;
  }

  /**
   * Get refresh token expiry time in milliseconds
   */
  getRefreshTokenExpiryTime(): number {
    const expiry =
      this.configService.get<string>('auth.jwt.refreshTokenExpiration') || '7d';

    // Parse expiry time to milliseconds
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) {
      // Default to 7 days if invalid format
      return 7 * 24 * 60 * 60 * 1000;
    }

    const [_, value, unit] = match;
    const numValue = parseInt(value, 10);

    switch (unit) {
      case 's':
        return numValue * 1000; // seconds
      case 'm':
        return numValue * 60 * 1000; // minutes
      case 'h':
        return numValue * 60 * 60 * 1000; // hours
      case 'd':
        return numValue * 24 * 60 * 60 * 1000; // days
      default:
        return 7 * 24 * 60 * 60 * 1000; // default to 7 days
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
}
