import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from '../repositories/user.repository';
import { UserRole } from '../../shared/enums/app.enum';
import { User } from '../entities/user.entity';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async getUserById(id: string): Promise<User> {
    const user = await this.userRepository.findByIdWithoutPassword(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async userExists(email: string): Promise<boolean> {
    const user = await this.userRepository.findByEmail(email);
    return !!user;
  }

  async getAllUsers(): Promise<User[]> {
    return this.userRepository.find({
      select: ['id', 'email', 'fullName', 'role', 'createdAt', 'updatedAt'],
    });
  }

  async updateUser(id: string, updateData: Partial<User>): Promise<User> {
    const { password, role, ...safeUpdateData } = updateData;
    
    const existingUser = await this.getUserById(id);
    
    const updatedUser = { ...existingUser, ...safeUpdateData };
    
    await this.userRepository.save(updatedUser);
    
    const user = await this.userRepository.findByIdWithoutPassword(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found after update`);
    }
    return user;
  }

  async updateUserRole(id: string, role: UserRole): Promise<User> {
    const user = await this.getUserById(id);
    
    user.role = role;
    await this.userRepository.save(user);
    
    const updatedUser = await this.userRepository.findByIdWithoutPassword(id);
    if (!updatedUser) {
      throw new NotFoundException(`User with ID ${id} not found after role update`);
    }
    return updatedUser;
  }

  async getUserProfile(id: string): Promise<User> {
    return this.getUserById(id);
  }
} 