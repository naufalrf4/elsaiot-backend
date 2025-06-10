import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { UserRole } from '../../src/shared/enums/app.enum';
import { JwtService } from '@nestjs/jwt';
import { UserRepository } from '../../src/users/repositories/user.repository';
import { GlobalResponseInterceptor } from '../../src/shared/interceptors/global-response.interceptor';
import { User } from '../../src/users/entities/user.entity';
import { v4 as uuidv4 } from 'uuid';

describe('User Profile Management (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let userRepository: UserRepository;
  let userToken: string;
  let testUser: User;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    app.useGlobalInterceptors(new GlobalResponseInterceptor());
    
    jwtService = app.get<JwtService>(JwtService);
    userRepository = app.get<UserRepository>(UserRepository);
    
    await app.init();

    // Create regular user for testing with unique email
    const uniqueEmail = `test.${uuidv4().substring(0, 8)}@example.com`;
    testUser = await userRepository.createUser(
      uniqueEmail,
      'Password123',
      'Test User',
      UserRole.USER
    );
    
    // Generate token
    userToken = jwtService.sign({ 
      sub: testUser.id, 
      email: testUser.email, 
      role: testUser.role 
    });
  });

  afterAll(async () => {
    // Clean up test user
    if (testUser?.id) {
      await userRepository.delete(testUser.id);
    }
    await app.close();
  });

  describe('GET /users/profile', () => {
    it('should return user profile when authenticated', () => {
      return request(app.getHttpServer())
        .get('/users/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe(true);
          expect(res.body.data.id).toBe(testUser.id);
          expect(res.body.data.email).toBe(testUser.email);
          expect(res.body.data.fullName).toBe(testUser.fullName);
        });
    });

    it('should reject access when not authenticated', () => {
      return request(app.getHttpServer())
        .get('/users/profile')
        .expect(401);
    });
  });

  describe('PUT /users/profile', () => {
    it('should update user fullName with valid data', () => {
      const newName = 'Updated Test User';
      
      return request(app.getHttpServer())
        .put('/users/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ fullName: newName })
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe(true);
          expect(res.body.data.fullName).toBe(newName);
        });
    });

    it('should reject update with invalid fullName (too short)', () => {
      return request(app.getHttpServer())
        .put('/users/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ fullName: 'AB' }) // Less than 3 characters
        .expect(400);
    });

    it('should reject password change without currentPassword', () => {
      return request(app.getHttpServer())
        .put('/users/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ newPassword: 'NewPassword123' })
        .expect(400);
    });

    it('should reject password change with incorrect currentPassword', () => {
      return request(app.getHttpServer())
        .put('/users/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ 
          currentPassword: 'WrongPassword123',
          newPassword: 'NewPassword123' 
        })
        .expect(400);
    });

    it('should reject password change with weak password', () => {
      return request(app.getHttpServer())
        .put('/users/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ 
          currentPassword: 'Password123',
          newPassword: 'password' // Missing uppercase and number
        })
        .expect(400);
    });
  });

  describe('DELETE /users/profile', () => {
    it('should deactivate user account', () => {
      return request(app.getHttpServer())
        .delete('/users/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe(true);
          expect(res.body.data.active).toBe(false);
        });
    });
  });
}); 