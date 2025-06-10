import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { UserRole } from '../../src/shared/enums/app.enum';
import { JwtService } from '@nestjs/jwt';
import { UserRepository } from '../../src/users/repositories/user.repository';
import { GlobalResponseInterceptor } from '../../src/shared/interceptors/global-response.interceptor';

describe('Admin User Management (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let userRepository: UserRepository;
  let adminToken: string;
  let userToken: string;
  let testUserId: string;

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

    // Create admin user
    const admin = await userRepository.createUser(
      'admin@test.com',
      'adminpassword',
      'Admin User',
      UserRole.ADMIN
    );

    // Create regular user
    const user = await userRepository.createUser(
      'user@test.com',
      'userpassword',
      'Regular User',
      UserRole.USER
    );
    
    testUserId = user.id;

    // Generate tokens
    adminToken = jwtService.sign({ sub: admin.id, email: admin.email, role: admin.role });
    userToken = jwtService.sign({ sub: user.id, email: user.email, role: user.role });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /users', () => {
    it('should return a list of users when requested by admin', () => {
      return request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe(true);
          expect(res.body.data.users).toBeDefined();
          expect(Array.isArray(res.body.data.users)).toBe(true);
        });
    });

    it('should filter users by role', () => {
      return request(app.getHttpServer())
        .get('/users?role=user')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data.users).toBeDefined();
          expect(Array.isArray(res.body.data.users)).toBe(true);
          res.body.data.users.forEach(user => {
            expect(user.role).toBe(UserRole.USER);
          });
        });
    });

    it('should not allow regular users to get all users', () => {
      return request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('GET /users/:id', () => {
    it('should return a user by ID when requested by admin', () => {
      return request(app.getHttpServer())
        .get(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe(true);
          expect(res.body.data.id).toBe(testUserId);
        });
    });

    it('should not allow regular users to get a user by ID', () => {
      return request(app.getHttpServer())
        .get(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('PUT /users/:id', () => {
    it('should update a user when requested by admin', () => {
      return request(app.getHttpServer())
        .put(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ fullName: 'Updated User Name' })
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe(true);
          expect(res.body.data.id).toBe(testUserId);
          expect(res.body.data.fullName).toBe('Updated User Name');
        });
    });

    it('should not allow regular users to update a user', () => {
      return request(app.getHttpServer())
        .put(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ fullName: 'Hacker Attack' })
        .expect(403);
    });
  });
}); 