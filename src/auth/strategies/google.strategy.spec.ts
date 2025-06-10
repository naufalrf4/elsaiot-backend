import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { GoogleStrategy } from './google.strategy';
import { AuthService } from '../services/auth.service';
import { User } from '../../users/entities/user.entity';
import { UserRole } from '../../shared/enums/app.enum';

describe('GoogleStrategy', () => {
  let strategy: GoogleStrategy;
  let authService: AuthService;
  let configService: ConfigService;

  const mockUser: User = {
    id: 'test-id',
    email: 'test@example.com',
    fullName: 'Test User',
    googleId: 'google-id-123',
    role: UserRole.USER,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    validatePassword: jest.fn(),
    hashPassword: jest.fn(),
  };

  const mockAuthService = {
    validateGoogleUser: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'auth.google.clientId') return 'client-id';
      if (key === 'auth.google.clientSecret') return 'client-secret';
      if (key === 'auth.google.callbackUrl') return 'callback-url';
      if (key === 'auth.google.allowedDomains') return ['example.com'];
      return undefined;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleStrategy,
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    strategy = module.get<GoogleStrategy>(GoogleStrategy);
    authService = module.get<AuthService>(AuthService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    const mockDone = jest.fn();
    
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should validate a Google profile with verified email', async () => {
      mockAuthService.validateGoogleUser.mockResolvedValue(mockUser);

      const mockProfile = {
        id: 'google-id-123',
        emails: [{ value: 'test@example.com', verified: true }],
        displayName: 'Test User',
      };

      await strategy.validate('token', 'refresh-token', mockProfile, mockDone);

      expect(mockAuthService.validateGoogleUser).toHaveBeenCalledWith({
        googleId: 'google-id-123',
        email: 'test@example.com',
        fullName: 'Test User',
      });
      
      expect(mockDone).toHaveBeenCalledWith(null, mockUser);
    });

    it('should reject unverified email', async () => {
      const mockProfile = {
        id: 'google-id-123',
        emails: [{ value: 'test@example.com', verified: false }],
        displayName: 'Test User',
      };

      await strategy.validate('token', 'refresh-token', mockProfile, mockDone);

      expect(mockAuthService.validateGoogleUser).not.toHaveBeenCalled();
      expect(mockDone).toHaveBeenCalledWith(
        expect.any(UnauthorizedException),
        false,
      );
    });

    it('should reject email from unauthorized domain when allowedDomains is set', async () => {
      const mockProfile = {
        id: 'google-id-123',
        emails: [{ value: 'test@unauthorized.com', verified: true }],
        displayName: 'Test User',
      };

      await strategy.validate('token', 'refresh-token', mockProfile, mockDone);

      expect(mockAuthService.validateGoogleUser).not.toHaveBeenCalled();
      expect(mockDone).toHaveBeenCalledWith(
        expect.any(UnauthorizedException),
        false,
      );
    });
  });
}); 