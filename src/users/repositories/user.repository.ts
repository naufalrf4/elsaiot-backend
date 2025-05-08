import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { UserRole } from '../../shared/enums/app.enum';

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
      select: ['id', 'email', 'password', 'fullName', 'role', 'createdAt', 'updatedAt'],
    });
  }

  async findByIdWithoutPassword(id: string): Promise<User | null> {
    return this.findOne({
      where: { id },
      select: ['id', 'email', 'fullName', 'role', 'createdAt', 'updatedAt'],
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

    return this.save(user);
  }
} 