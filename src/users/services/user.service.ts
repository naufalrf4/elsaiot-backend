import { Injectable, NotFoundException, ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { UserRepository, PaginatedUsersResult } from '../repositories/user.repository';
import { UserRole } from '../../shared/enums/app.enum';
import { User } from '../entities/user.entity';
import { UpdateUserDto, UserQueryDto } from '../dto/admin-user.dto';
import { UpdateProfileDto } from '../dto/profile.dto';

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
      select: ['id', 'email', 'fullName', 'role', 'active', 'createdAt', 'updatedAt'],
    });
  }

  async findUsers(queryOptions: UserQueryDto): Promise<PaginatedUsersResult> {
    return this.userRepository.findUsersWithFilters(queryOptions);
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
  
  async updateUserAsAdmin(id: string, updateData: UpdateUserDto): Promise<User> {
    const existingUser = await this.getUserById(id);
    
    // Create a new object with the updates
    const updates = { ...updateData };
    
    // Perform the update
    Object.assign(existingUser, updates);
    
    // Prevent deactivating the last admin user
    if (existingUser.role === UserRole.ADMIN && updates.active === false) {
      const adminCount = await this.userRepository.count({ 
        where: { role: UserRole.ADMIN, active: true }
      });
      
      if (adminCount <= 1) {
        throw new ForbiddenException('Cannot deactivate the last admin user');
      }
    }
    
    await this.userRepository.save(existingUser);
    
    return this.getUserById(id);
  }
  
  async deactivateUser(id: string, currentUserId: string): Promise<User> {
    if (id === currentUserId) {
      throw new ForbiddenException('You cannot deactivate your own account');
    }
    
    const user = await this.getUserById(id);
    
    // Prevent deactivating the last admin user
    if (user.role === UserRole.ADMIN) {
      const adminCount = await this.userRepository.count({ 
        where: { role: UserRole.ADMIN, active: true }
      });
      
      if (adminCount <= 1) {
        throw new ForbiddenException('Cannot deactivate the last admin user');
      }
    }
    
    user.active = false;
    await this.userRepository.save(user);
    
    return this.getUserById(id);
  }

  // New methods for profile management

  async updateUserProfile(id: string, updateData: UpdateProfileDto): Promise<User> {
    const existingUser = await this.getUserById(id);
    
    // Handle password change
    if (updateData.newPassword) {
      if (!updateData.currentPassword) {
        throw new BadRequestException('Current password is required to set a new password');
      }
      
      // Get user with password for validation
      const userWithPassword = await this.userRepository.findOne({
        where: { id },
        select: ['id', 'password']
      });
      
      if (!userWithPassword) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }
      
      const isPasswordValid = await userWithPassword.validatePassword(updateData.currentPassword);
      if (!isPasswordValid) {
        throw new BadRequestException('Current password is incorrect');
      }
      
      // Set new password
      existingUser.password = updateData.newPassword;
    }
    
    // Handle email change
    if (updateData.email && updateData.email !== existingUser.email) {
      const emailExists = await this.userRepository.findByEmail(updateData.email);
      if (emailExists) {
        throw new ConflictException('Email address is already in use');
      }
      existingUser.email = updateData.email;
    }
    
    // Handle name change
    if (updateData.fullName) {
      existingUser.fullName = updateData.fullName;
    }
    
    // Remove sensitive fields from DTO
    delete updateData.currentPassword;
    delete updateData.newPassword;
    
    // Save updated user
    await this.userRepository.save(existingUser);
    
    return this.getUserById(id);
  }

  async deactivateOwnAccount(id: string): Promise<User> {
    const user = await this.getUserById(id);
    
    // Prevent deactivating the last admin user
    if (user.role === UserRole.ADMIN) {
      const adminCount = await this.userRepository.count({ 
        where: { role: UserRole.ADMIN, active: true }
      });
      
      if (adminCount <= 1) {
        throw new ForbiddenException('Cannot deactivate the last admin account');
      }
    }
    
    user.active = false;
    await this.userRepository.save(user);
    
    return this.getUserById(id);
  }
} 