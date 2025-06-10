import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ConflictException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserRepository } from '../../users/repositories/user.repository';
import { RefreshTokenRepository } from '../../users/repositories/refresh-token.repository';
import { User } from '../../users/entities/user.entity';
import { UserRole } from '../../shared/enums/app.enum';
import { GoogleProfile } from '../interfaces/google-profile.interface';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: UserRepository;

  const mockUser: User = {
    id: 'test-id',
    email: 'test@example.com',
    fullName: 'Test User',
    googleId: null,
    role: UserRole.USER,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    validatePassword: jest.fn(),
    hashPassword: jest.fn(),
  };

  const mockUserRepository = {
    findByEmail: jest.fn(),
    createGoogleUser: jest.fn(),
    save: jest.fn(),
  };

  const mockRefreshTokenRepository = {
    createRefreshToken: jest.fn(),
    findByToken: jest.fn(),
    deleteRefreshToken: jest.fn(),
    deleteAllUserTokens: jest.fn(),
    deleteExpiredTokens: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(() => 'test-token'),
  };

  const mockConfigService = {
    get: jest.fn(() => 'test-config-value'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserRepository,
          useValue: mockUserRepository,
        },
        {
          provide: RefreshTokenRepository,
          useValue: mockRefreshTokenRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get<UserRepository>(UserRepository);
    
    // Mock setInterval for token cleanup
    jest.spyOn(global, 'setInterval').mockImplementation(jest.fn());
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateGoogleUser', () => {
    const googleProfile: GoogleProfile = {
      googleId: 'google-id-123',
      email: 'test@example.com',
      fullName: 'Test User',
    };

    it('should update googleId for existing user without googleId', async () => {
      // Mock an existing user without a googleId
      const existingUser = { ...mockUser, googleId: null };
      mockUserRepository.findByEmail.mockResolvedValue(existingUser);
      mockUserRepository.save.mockResolvedValue({
        ...existingUser,
        googleId: googleProfile.googleId,
      });

      const result = await service.validateGoogleUser(googleProfile);

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(googleProfile.email);
      expect(mockUserRepository.save).toHaveBeenCalledWith({
        ...existingUser,
        googleId: googleProfile.googleId,
      });
      expect(result.googleId).toBe(googleProfile.googleId);
    });

    it('should return existing user with matching googleId', async () => {
      // Mock an existing user with matching googleId
      const existingUser = { 
        ...mockUser, 
        googleId: googleProfile.googleId 
      };
      mockUserRepository.findByEmail.mockResolvedValue(existingUser);

      const result = await service.validateGoogleUser(googleProfile);

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(googleProfile.email);
      expect(mockUserRepository.save).not.toHaveBeenCalled();
      expect(result).toBe(existingUser);
    });

    it('should throw conflict exception when email is associated with a different googleId', async () => {
      // Mock an existing user with a different googleId
      const existingUser = { 
        ...mockUser, 
        googleId: 'different-google-id' 
      };
      mockUserRepository.findByEmail.mockResolvedValue(existingUser);

      await expect(service.validateGoogleUser(googleProfile)).rejects.toThrow(
        ConflictException,
      );
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it('should create a new user when email does not exist', async () => {
      // Mock no existing user
      mockUserRepository.findByEmail.mockResolvedValue(null);
      const newUser = { 
        ...mockUser, 
        googleId: googleProfile.googleId 
      };
      mockUserRepository.createGoogleUser.mockResolvedValue(newUser);

      const result = await service.validateGoogleUser(googleProfile);

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(googleProfile.email);
      expect(mockUserRepository.createGoogleUser).toHaveBeenCalledWith(
        googleProfile.email,
        googleProfile.fullName,
        googleProfile.googleId,
      );
      expect(result).toBe(newUser);
    });
  });
}); 