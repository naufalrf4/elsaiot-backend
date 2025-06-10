import {
  Controller,
  Get,
  UseGuards,
  Param,
  NotFoundException,
  Query,
  Put,
  Body,
  Delete,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { UserService } from '../services/user.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { UserRole } from '../../shared/enums/app.enum';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { User } from '../entities/user.entity';
import {
  UpdateUserDto,
  UserQueryDto,
  UserResponseDto,
  PaginatedUsersResponseDto,
} from '../dto/admin-user.dto';
import { ProfileResponseDto, UpdateProfileDto } from '../dto/profile.dto';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    type: ProfileResponseDto
  })
  async getProfile(@CurrentUser() user: User) {
    return {
      status: true,
      message: 'User profile retrieved successfully',
      data: user,
    };
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile updated successfully',
    type: ProfileResponseDto
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid data or password' })
  @ApiResponse({ status: 409, description: 'Conflict - Email already in use' })
  async updateProfile(
    @CurrentUser() user: User,
    @Body() updateProfileDto: UpdateProfileDto
  ) {
    const updatedUser = await this.userService.updateUserProfile(
      user.id,
      updateProfileDto
    );
    
    return {
      status: true,
      message: 'User profile updated successfully',
      data: updatedUser,
    };
  }

  @Delete('profile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate own user account' })
  @ApiResponse({
    status: 200,
    description: 'User account deactivated successfully',
    type: ProfileResponseDto
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Cannot deactivate last admin account' })
  async deactivateOwnAccount(@CurrentUser() user: User) {
    const deactivatedUser = await this.userService.deactivateOwnAccount(user.id);
    
    return {
      status: true,
      message: 'User account deactivated successfully',
      data: deactivatedUser,
    };
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get all users with filtering and pagination (Admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Users retrieved successfully',
    type: PaginatedUsersResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires admin role' })
  async getAllUsers(@Query() query: UserQueryDto) {
    const users = await this.userService.findUsers(query);

    return {
      status: true,
      message: 'Users retrieved successfully',
      data: users.users,
      meta: {
        total: users.total,
        page: users.page,
        limit: users.limit,
        totalPages: users.totalPages,
      },
    };
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get user by ID (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'User retrieved successfully',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires admin role' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiParam({
    name: 'id',
    description: 'User ID',
    type: 'string',
    format: 'uuid',
  })
  async getUserById(@Param('id', ParseUUIDPipe) id: string) {
    const user = await this.userService.getUserById(id);

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return {
      status: true,
      message: 'User retrieved successfully',
      data: user,
    };
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update user (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires admin role' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiParam({
    name: 'id',
    description: 'User ID',
    type: 'string',
    format: 'uuid',
  })
  async updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateData: UpdateUserDto,
  ) {
    const user = await this.userService.updateUserAsAdmin(id, updateData);

    return {
      status: true,
      message: 'User updated successfully',
      data: user,
    };
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Deactivate user (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'User deactivated successfully',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires admin role' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiParam({
    name: 'id',
    description: 'User ID',
    type: 'string',
    format: 'uuid',
  })
  async deactivateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: User,
  ) {
    const user = await this.userService.deactivateUser(id, currentUser.id);

    return {
      status: true,
      message: 'User deactivated successfully',
      data: user,
    };
  }
}
