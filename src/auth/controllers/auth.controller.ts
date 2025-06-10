import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBody, ApiOperation, ApiResponse, ApiTags, ApiHeader } from '@nestjs/swagger';
import { Request, Response } from 'express';

import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Public } from '../../shared/decorators/public.decorator';
import { RegisterDto } from '../dto/register.dto';
import { SignInDto } from '../dto/signin.dto';
import { AuthService } from '../services/auth.service';
import { generateDeviceFingerprint } from '../utils/device-fingerprint.util';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error or user already exists',
  })
  async register(
    @Body() registerDto: RegisterDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.register(registerDto);

    // Get device info for the refresh token
    const deviceInfo = this.authService.getDeviceInfoFromRequest(request);
    
    // Generate a device fingerprint if not provided
    if (!deviceInfo.deviceFingerprint) {
      deviceInfo.deviceFingerprint = generateDeviceFingerprint(request);
      
      // Set the fingerprint in a cookie for future requests
      this.setFingerprintCookie(response, deviceInfo.deviceFingerprint);
    }

    const loginResult = await this.authService.login({
      email: registerDto.email,
      password: registerDto.password,
    }, deviceInfo);

    if (loginResult.refreshToken) {
      this.setRefreshTokenCookie(response, loginResult.refreshToken);
    }

    return {
      message: 'User registered successfully',
      user: result.user,
      access_token: result.accessToken,
    };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with credentials' })
  @ApiBody({ type: SignInDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid credentials',
  })
  async login(
    @Body() signInDto: SignInDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    // Get device info for the refresh token
    const deviceInfo = this.authService.getDeviceInfoFromRequest(request);
    
    // Generate a device fingerprint if not provided
    if (!deviceInfo.deviceFingerprint) {
      deviceInfo.deviceFingerprint = generateDeviceFingerprint(request);
      
      // Set the fingerprint in a cookie for future requests
      this.setFingerprintCookie(response, deviceInfo.deviceFingerprint);
    }

    const result = await this.authService.login(signInDto, deviceInfo);

    if (result.refreshToken) {
      this.setRefreshTokenCookie(response, result.refreshToken);
    }

    return {
      message: 'Login successful',
      user: result.user,
      access_token: result.accessToken,
    };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token cookie' })
  @ApiHeader({
    name: 'x-device-fingerprint',
    description: 'Optional device fingerprint for enhanced security',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or expired refresh token',
  })
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = request.cookies['refresh_token'];

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    try {
      // Get device info for the refresh token
      const deviceInfo = this.authService.getDeviceInfoFromRequest(request);
      
      // If no fingerprint in header, check for fingerprint cookie
      if (!deviceInfo.deviceFingerprint && request.cookies['device_fingerprint']) {
        deviceInfo.deviceFingerprint = request.cookies['device_fingerprint'];
      }
      
      // If still no fingerprint, generate one
      if (!deviceInfo.deviceFingerprint) {
        deviceInfo.deviceFingerprint = generateDeviceFingerprint(request);
        this.setFingerprintCookie(response, deviceInfo.deviceFingerprint);
      }

      // Validate and rotate tokens
      const result = await this.authService.refreshToken(refreshToken, deviceInfo);

      // Set the new refresh token in the cookie
      this.setRefreshTokenCookie(response, result.refreshToken);

      return {
        message: 'Token refreshed successfully',
        access_token: result.accessToken,
      };
    } catch (error) {
      // Clear cookies on error
      this.clearRefreshTokenCookie(response);
      this.clearFingerprintCookie(response);
      throw error;
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout and invalidate tokens' })
  @ApiResponse({
    status: 200,
    description: 'Logout successful',
  })
  async logout(
    @CurrentUser('id') userId: string,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = request.cookies['refresh_token'];

    if (refreshToken) {
      try {
        // Invalidate the specific token instead of all user tokens
        await this.authService.invalidateRefreshToken(refreshToken, userId);
      } catch (error) {
        console.error('Error invalidating refresh token:', error);
      }
    }

    // Clear cookies
    this.clearRefreshTokenCookie(response);
    this.clearFingerprintCookie(response);

    return {
      message: 'Logout successful',
    };
  }

  @Post('logout-all-devices')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout from all devices by invalidating all refresh tokens' })
  @ApiResponse({
    status: 200,
    description: 'Logged out from all devices successfully',
  })
  async logoutAllDevices(
    @CurrentUser('id') userId: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.invalidateAllUserTokens(userId);
    
    // Clear cookies on current device
    this.clearRefreshTokenCookie(response);
    this.clearFingerprintCookie(response);

    return {
      message: 'Logged out from all devices successfully',
    };
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

  private clearRefreshTokenCookie(response: Response): void {
    response.clearCookie('refresh_token', {
      path: '/',
    });
  }
  
  private setFingerprintCookie(
    response: Response,
    fingerprint: string,
  ): void {
    const isProduction =
      this.configService.get<string>('app.nodeEnv') === 'production';
      
    // This cookie should be accessible from JavaScript so the client can
    // include it in headers, so it's not httpOnly
    response.cookie('device_fingerprint', fingerprint, {
      httpOnly: false,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
      path: '/',
    });
  }
  
  private clearFingerprintCookie(response: Response): void {
    response.clearCookie('device_fingerprint', {
      path: '/',
    });
  }
}
