import {
  Controller,
  Get,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
  Logger,
  UseFilters,
  InternalServerErrorException,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { Public } from '../../shared/decorators/public.decorator';
import { AuthService } from '../services/auth.service';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { GlobalExceptionFilter } from '../../shared/filters/global-exception.filter';

@ApiTags('Google Auth')
@Controller('auth/google')
@UseFilters(GlobalExceptionFilter)
export class GoogleAuthController {
  private readonly logger = new Logger(GoogleAuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Get()
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Initiate Google OAuth flow' })
  @ApiResponse({
    status: 302,
    description: 'Redirects to Google OAuth page',
  })
  googleAuth() {
    // This method won't be called as the guard will redirect to Google
    return { message: 'Initiating Google OAuth flow' };
  }

  @Public()
  @Get('callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Handle Google OAuth callback' })
  @ApiResponse({
    status: 200,
    description: 'OAuth callback successful',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or expired OAuth state',
  })
  async googleCallback(
    @Req() req: any,
    @Res({ passthrough: true }) response: Response,
  ) {
    try {
      if (!req.user) {
        this.logger.warn('No user object in request after Google authentication');
        throw new UnauthorizedException('Authentication failed');
      }

      this.logger.debug(`Google auth successful for user: ${req.user.email}`);

      // Generate tokens
      const accessToken = this.authService.generateAccessToken(req.user);
      
      // Generate refresh token
      const refreshTokenExpiry = this.authService.getRefreshTokenExpiryTime();
      const refreshToken = await this.authService.refreshTokenRepository.createRefreshToken(
        req.user.id,
        refreshTokenExpiry,
      );

      // Set refresh token cookie
      this.setRefreshTokenCookie(response, refreshToken.token);

      return {
        message: 'Google authentication successful',
        user: this.sanitizeUser(req.user),
        access_token: accessToken,
      };
    } catch (error) {
      this.logger.error(`Error in Google callback: ${error.message}`, error.stack);
      
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      throw new InternalServerErrorException('Authentication processing failed');
    }
  }

  private setRefreshTokenCookie(
    response: Response,
    refreshToken: string,
  ): void {
    const expiresIn = this.authService.getRefreshTokenExpiryTime();
    const isProduction =
      this.configService.get<string>('app.nodeEnv') === 'production';

    response.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      expires: new Date(Date.now() + expiresIn),
      sameSite: 'strict',
      path: '/',
    });
  }

  private sanitizeUser(user: any): any {
    const { password, ...result } = user;
    return result;
  }
} 