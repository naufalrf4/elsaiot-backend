import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from '../repositories/user.repository';
import { UserRole } from '../../shared/enums/app.enum';
import { User } from '../entities/user.entity';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  /**
   * Get a user by ID
   */
  async getUserById(id: string): Promise<User> {
    const user = await this.userRepository.findByIdWithoutPassword(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  /**
   * Check if a user exists by email
   */
  async userExists(email: string): Promise<boolean> {
    const user = await this.userRepository.findByEmail(email);
    return !!user;
  }

  /**
   * Get all users (for admin purposes)
   */
  async getAllUsers(): Promise<User[]> {
    return this.userRepository.find({
      select: ['id', 'email', 'fullName', 'role', 'createdAt', 'updatedAt'],
    });
  }

  /**
   * Update user details
   */
  async updateUser(id: string, updateData: Partial<User>): Promise<User> {
    // Do not allow updating sensitive fields like password here
    const { password, role, ...safeUpdateData } = updateData;
    
    const existingUser = await this.getUserById(id);
    
    // Apply updates
    const updatedUser = { ...existingUser, ...safeUpdateData };
    
    // Save the updated user
    await this.userRepository.save(updatedUser);
    
    // Return the updated user without password
    const user = await this.userRepository.findByIdWithoutPassword(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found after update`);
    }
    return user;
  }

  /**
   * Update user role (admin only)
   */
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

  /**
   * Get user profile
   */
  async getUserProfile(id: string): Promise<User> {
    return this.getUserById(id);
  }
} 