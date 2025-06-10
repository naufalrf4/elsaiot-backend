import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { GoogleProfile } from '../interfaces/google-profile.interface';
import { AuthService } from '../services/auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>('auth.google.clientId'),
      clientSecret: configService.get<string>('auth.google.clientSecret'),
      callbackURL: configService.get<string>('auth.google.callbackUrl'),
      scope: ['profile', 'email'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    try {
      // Extract profile information
      const { id: googleId, emails, displayName, name } = profile;

      // Verify email exists and is verified
      if (!emails || !emails.length) {
        this.logger.warn('Google profile missing email information');
        throw new UnauthorizedException('Google email not provided');
      }
      
      if (!emails[0].verified) {
        this.logger.warn(`Unverified Google email: ${emails[0].value}`);
        throw new UnauthorizedException('Google email not verified');
      }

      const email = emails[0].value;
      const fullName = displayName || `${name?.givenName || ''} ${name?.familyName || ''}`.trim();

      // Check if email domain is allowed
      const allowedDomains = this.configService.get<string[]>('auth.google.allowedDomains');
      if (allowedDomains && allowedDomains.length) {
        const emailDomain = email.split('@')[1];
        if (!allowedDomains.includes(emailDomain)) {
          this.logger.warn(`Unauthorized email domain: ${emailDomain}`);
          throw new UnauthorizedException(`Email domain ${emailDomain} not allowed`);
        }
      }

      // Create a Google profile object with the extracted information
      const googleProfile: GoogleProfile = {
        googleId,
        email,
        fullName,
      };

      this.logger.debug(`Processing Google authentication for email: ${email}`);

      // Validate or create user based on Google profile
      const user = await this.authService.validateGoogleUser(googleProfile);
      
      done(null, user);
    } catch (error) {
      this.logger.error(`Google authentication error: ${error.message}`, error.stack);
      done(error, false);
    }
  }
} 