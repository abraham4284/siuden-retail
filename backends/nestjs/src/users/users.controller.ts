import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { GlobalAdmin } from '../auth/decorators/global-admin.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { IdParamDto } from '../common/dto/id-param.dto';
import {
  ChangeUserRoleDto,
  CreatePlatformAdminDto,
  CreateUserDto,
  ResetUserPasswordDto,
  UpdateUserDto,
  UserQueryDto,
} from './dto/user.dto';
import { UsersService } from './users.service';

@ApiBearerAuth()
@ApiTags('users')
@Permissions('users.manage')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: UserQueryDto,
  ) {
    return this.users.findAll(user.accountId, query);
  }

  @Get('roles')
  roles(@CurrentUser() user: AuthenticatedUser) {
    return this.users.roles(user.accountId, user.roleCode === 'PLATFORM_ADMIN');
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param() params: IdParamDto) {
    return this.users.findOne(user.accountId, params.id);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateUserDto) {
    return this.users.create(user, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: IdParamDto,
    @Body() dto: UpdateUserDto,
  ) {
    return this.users.update(user, params.id, dto);
  }

  @Patch(':id/role')
  changeRole(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: IdParamDto,
    @Body() dto: ChangeUserRoleDto,
  ) {
    return this.users.changeRole(user, params.id, dto);
  }

  @Post(':id/reset-password')
  resetPassword(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: IdParamDto,
    @Body() dto: ResetUserPasswordDto,
  ) {
    return this.users.resetPassword(user, params.id, dto);
  }
}

@ApiBearerAuth()
@ApiTags('users')
@GlobalAdmin()
@Permissions('accounts.manage')
@Controller('users/platform-admins')
export class PlatformAdminsController {
  constructor(private readonly users: UsersService) {}

  @Post()
  create(@Body() dto: CreatePlatformAdminDto) {
    return this.users.createPlatformAdmin(dto);
  }
}
