import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { UserRole } from '../../shared/enums/app.enum';
import { UserQueryDto } from '../dto/admin-user.dto';

export interface PaginatedUsersResult {
  users: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class UserRepository extends Repository<User> {
  constructor(private dataSource: DataSource) {
    super(User, dataSource.createEntityManager());
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.findOne({ where: { email } });
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.findOne({
      where: { email },
      select: ['id', 'email', 'password', 'fullName', 'role', 'createdAt', 'updatedAt', 'active'],
    });
  }

  async findByIdWithoutPassword(id: string): Promise<User | null> {
    return this.findOne({
      where: { id },
      select: ['id', 'email', 'fullName', 'role', 'createdAt', 'updatedAt', 'active'],
    });
  }

  async createUser(
    email: string,
    password: string,
    fullName: string,
    role: UserRole = UserRole.USER,
  ): Promise<User> {
    const user = new User();
    user.email = email;
    user.password = password;
    user.fullName = fullName;
    user.role = role;
    user.active = true;

    return this.save(user);
  }
  
  /**
   * Create a new user from Google OAuth profile
   */
  async createGoogleUser(
    email: string,
    fullName: string,
    googleId: string,
    role: UserRole = UserRole.USER,
  ): Promise<User> {
    const user = new User();
    user.email = email;
    user.fullName = fullName;
    user.googleId = googleId;
    user.role = role;
    user.active = true;

    return this.save(user);
  }
  
  async findUsersWithFilters(
    queryOptions: UserQueryDto,
  ): Promise<PaginatedUsersResult> {
    const { role, email, active, createdAfter, createdBefore, page = 0, limit = 10 } = queryOptions;
    
    const queryBuilder = this.createQueryBuilder('user');
    
    // Apply filters
    if (role) {
      queryBuilder.andWhere('user.role = :role', { role });
    }
    
    if (email) {
      queryBuilder.andWhere('user.email ILIKE :email', { email: `%${email}%` });
    }
    
    if (active !== undefined) {
      queryBuilder.andWhere('user.active = :active', { active });
    }
    
    if (createdAfter) {
      queryBuilder.andWhere('user.createdAt >= :createdAfter', { createdAfter });
    }
    
    if (createdBefore) {
      queryBuilder.andWhere('user.createdAt <= :createdBefore', { createdBefore });
    }
    
    // Select non-sensitive fields
    queryBuilder.select([
      'user.id',
      'user.email',
      'user.fullName',
      'user.role',
      'user.active',
      'user.createdAt',
      'user.updatedAt',
    ]);
    
    // Add pagination
    const total = await queryBuilder.getCount();
    
    queryBuilder
      .skip(page * limit)
      .take(limit)
      .orderBy('user.createdAt', 'DESC');
    
    const users = await queryBuilder.getMany();
    
    return {
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
} 