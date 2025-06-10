import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/auth/services/auth.service';
import { ConfigService } from '@nestjs/config';
import { User } from '../src/users/entities/user.entity';
import { UserRole } from '../src/shared/enums/app.enum';

describe('GoogleAuthController (e2e)', () => {
  let app: INestApplication;
  let authService: AuthService;
  let configService: ConfigService;

  // Mock user for testing
  const mockUser: Partial<User> = {
    id: 'test-id',
    email: 'test@example.com',
    fullName: 'Test User',
    googleId: 'google-id-123',
    role: UserRole.USER,
    active: true,
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AuthService)
      .useValue({
        validateGoogleUser: jest.fn().mockResolvedValue(mockUser),
        generateAccessToken: jest.fn().mockReturnValue('test-access-token'),
        getRefreshTokenExpiryTime: jest.fn().mockReturnValue(604800000), // 7 days
        refreshTokenRepository: {
          createRefreshToken: jest.fn().mockResolvedValue({
            token: 'test-refresh-token',
          }),
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    authService = moduleFixture.get<AuthService>(AuthService);
    configService = moduleFixture.get<ConfigService>(ConfigService);

    await app.init();
  });

  it('/auth/google (GET) - should redirect to Google', () => {
    return request(app.getHttpServer())
      .get('/auth/google')
      .expect(302) // Redirect status
      .expect((res) => {
        // Should redirect to Google OAuth URL
        expect(res.headers.location).toContain('accounts.google.com');
      });
  });

  it('/auth/google/callback (GET) - should handle OAuth callback', async () => {
    // This is a mock test since we can't fully test the OAuth flow in an E2E test
    // We're bypassing passport and directly testing the controller logic
    
    // Mock the passport authentication by setting req.user
    const agent = request.agent(app.getHttpServer());
    
    // We need to manually set up the session with a mock user
    // In a real app, this would be done by Passport
    (app as any).use((req, res, next) => {
      if (req.path === '/auth/google/callback') {
        req.user = mockUser;
      }
      next();
    });
    
    const response = await agent
      .get('/auth/google/callback')
      .expect(200);
    
    expect(response.body).toHaveProperty('message', 'Google authentication successful');
    expect(response.body).toHaveProperty('access_token', 'test-access-token');
    expect(response.body.user).toEqual(expect.objectContaining({
      email: mockUser.email,
      fullName: mockUser.fullName,
    }));
    
    // Verify refresh token cookie was set
    expect(response.headers['set-cookie']).toBeDefined();
    expect(response.headers['set-cookie'][0]).toContain('refresh_token');
  });

  afterEach(async () => {
    await app.close();
  });
}); 