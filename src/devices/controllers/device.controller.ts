import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import {
  DeviceDto,
  DeviceQueryDto,
  PairDeviceDto,
  UpdateDeviceDto,
} from '../dto';
import { DeviceService } from '../services/device.service';

@ApiTags('devices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('devices')
export class DeviceController {
  constructor(private readonly deviceService: DeviceService) {}

  @ApiOperation({ summary: 'Get all devices for the current user' })
  @ApiResponse({
    status: 200,
    description: 'Returns a paginated list of devices',
    type: [DeviceDto],
  })
  @Get()
  async findAll(
    @CurrentUser('id') userId: string,
    @Query() queryDto: DeviceQueryDto,
  ) {
    return this.deviceService.findAllDevicesByUser(userId, queryDto);
  }

  @ApiOperation({ summary: 'Get a specific device by ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the device details',
    type: DeviceDto,
  })
  @ApiResponse({ status: 404, description: 'Device not found' })
  @ApiResponse({
    status: 403,
    description: 'User does not have access to this device',
  })
  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.deviceService.findDeviceById(id, userId);
  }

  @ApiOperation({ summary: 'Pair a new device with the current user' })
  @ApiResponse({
    status: 201,
    description: 'Device paired successfully',
    type: DeviceDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Device already paired with another account',
  })
  @Post('pair')
  async pairDevice(
    @Body() pairDeviceDto: PairDeviceDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.deviceService.pairDevice(userId, pairDeviceDto);
  }

  @ApiOperation({ summary: 'Update a device' })
  @ApiResponse({
    status: 200,
    description: 'Device updated successfully',
    type: DeviceDto,
  })
  @ApiResponse({ status: 404, description: 'Device not found' })
  @ApiResponse({
    status: 403,
    description: 'User does not have access to this device',
  })
  @Put(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDeviceDto: UpdateDeviceDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.deviceService.updateDevice(id, userId, updateDeviceDto);
  }

  @ApiOperation({ summary: 'Remove a device pairing' })
  @ApiResponse({
    status: 204,
    description: 'Device pairing removed successfully',
  })
  @ApiResponse({ status: 404, description: 'Device not found' })
  @ApiResponse({
    status: 403,
    description: 'User does not have access to this device',
  })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.deviceService.removeDevice(id, userId);
  }
}
