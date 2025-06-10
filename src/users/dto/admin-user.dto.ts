import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsBoolean, IsDate, Min, Max, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole } from '../../shared/enums/app.enum';

export class UserQueryDto {
  @ApiPropertyOptional({ enum: UserRole, description: 'Filter users by role' })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ description: 'Search users by email' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Filter by user activation status' })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
  
  @ApiPropertyOptional({ description: 'Filter users created after this date' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  createdAfter?: Date;
  
  @ApiPropertyOptional({ description: 'Filter users created before this date' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  createdBefore?: Date;
  
  @ApiPropertyOptional({ default: 0, description: 'Page number (0-based)' })
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  page?: number = 0;
  
  @ApiPropertyOptional({ default: 10, description: 'Number of results per page' })
  @IsOptional()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 10;
}

export class UpdateUserDto {
  @ApiPropertyOptional({ description: 'User full name' })
  @IsOptional()
  fullName?: string;
  
  @ApiPropertyOptional({ enum: UserRole, description: 'User role' })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
  
  @ApiPropertyOptional({ description: 'User activation status' })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UserResponseDto {
  @ApiProperty({ description: 'User ID' })
  id: string;
  
  @ApiProperty({ description: 'User email' })
  email: string;
  
  @ApiProperty({ description: 'User full name' })
  fullName: string;
  
  @ApiProperty({ enum: UserRole, description: 'User role' })
  role: UserRole;
  
  @ApiProperty({ description: 'User creation date' })
  createdAt: Date;
  
  @ApiProperty({ description: 'User last update date' })
  updatedAt: Date;
  
  @ApiProperty({ description: 'User activation status' })
  active: boolean;
}

export class PaginatedUsersResponseDto {
  @ApiProperty({ description: 'Array of users', type: [UserResponseDto] })
  users: UserResponseDto[];
  
  @ApiProperty({ description: 'Total number of users matching the query' })
  total: number;
  
  @ApiProperty({ description: 'Current page number' })
  page: number;
  
  @ApiProperty({ description: 'Number of users per page' })
  limit: number;
  
  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;
} 