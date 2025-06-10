import { 
  Controller, 
  Post, 
  Body, 
  Get, 
  Param, 
  BadRequestException,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
  Req
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiParam 
} from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { PasswordResetService } from '../services/password-reset.service';
import { 
  ForgotPasswordDto, 
  ValidateResetTokenResponseDto, 
  ResetPasswordDto 
} from '../dto/password-reset.dto';
import { Public } from '../../shared/decorators/public.decorator';
import { Request } from 'express';

@ApiTags('Authentication')
@Controller('auth')
@UseGuards(ThrottlerGuard)
export class PasswordResetController {
  private readonly logger = new Logger(PasswordResetController.name);
  
  constructor(private readonly passwordResetService: PasswordResetService) {}

  @Post('forgot-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset email' })
  @ApiResponse({ 
    status: 200, 
    description: 'Password reset email sent if user exists' 
  })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto, @Req() req: Request): Promise<any> {
    this.logger.debug(`Password reset requested for email: ${forgotPasswordDto.email.substring(0, 3)}***`);
    
    const clientIp = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    this.logger.debug(`Request from IP: ${clientIp}`);
    
    await this.passwordResetService.requestPasswordReset(forgotPasswordDto.email);
    
    // Always return success, regardless of whether user exists
    return {
      status: true,
      message: 'If an account with that email exists, a password reset link has been sent.'
    };
  }

  @Get('reset-password/validate/:token')
  @Public()
  @ApiOperation({ summary: 'Validate reset token without consuming it' })
  @ApiParam({ name: 'token', description: 'Password reset token' })
  @ApiResponse({ 
    status: 200, 
    description: 'Token validation result', 
    type: ValidateResetTokenResponseDto 
  })
  async validateResetToken(@Param('token') token: string, @Req() req: Request): Promise<any> {
    const clientIp = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    this.logger.debug(`Token validation request from IP: ${clientIp}`);
    
    if (!token || token.length < 10) {
      this.logger.debug(`Invalid token format received`);
      return {
        status: true,
        message: 'Token is invalid or expired',
        data: { isValid: false }
      };
    }
    
    const result = await this.passwordResetService.validateResetToken(token);
    
    this.logger.debug(`Token validation result: ${result.isValid ? 'Valid' : 'Invalid'}`);
    
    return {
      status: true,
      message: result.isValid ? 'Token is valid' : 'Token is invalid or expired',
      data: result
    };
  }

  @Post('reset-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using token' })
  @ApiResponse({ status: 200, description: 'Password successfully reset' })
  @ApiResponse({ status: 400, description: 'Invalid token or passwords do not match' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto, @Req() req: Request): Promise<any> {
    const clientIp = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    this.logger.debug(`Password reset attempt from IP: ${clientIp}`);
    
    // Validate passwords match
    if (resetPasswordDto.password !== resetPasswordDto.confirmPassword) {
      this.logger.debug('Password reset failed: Passwords do not match');
      throw new BadRequestException('Passwords do not match');
    }
    
    if (!resetPasswordDto.token || resetPasswordDto.token.length < 10) {
      this.logger.debug('Password reset failed: Invalid token format');
      throw new BadRequestException('Invalid token format');
    }
    
    const success = await this.passwordResetService.resetPassword(resetPasswordDto);
    
    if (!success) {
      this.logger.debug('Password reset failed: Invalid or expired token');
      throw new BadRequestException('Invalid or expired token');
    }
    
    this.logger.log('Password reset successful');
    
    return {
      status: true,
      message: 'Password successfully reset. You can now log in with your new password.'
    };
  }
} 