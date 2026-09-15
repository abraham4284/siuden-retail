import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import {
  UpdateStoreContactsDto,
  UpdateStoreProfileDto,
  UpdateStorefrontSettingsDto,
  UpdateStoreThemeDto,
} from './dto/store.dto';
import { StoreService } from './store.service';

@ApiBearerAuth()
@ApiTags('store')
@Controller('store')
export class StoreController {
  constructor(private readonly store: StoreService) {}

  @Permissions('store.read') @Get('profile') profile(
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.store.profile(user.tenantId);
  }
  @Permissions('store.update') @Put('profile') updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateStoreProfileDto,
  ) {
    return this.store.updateProfile(user.tenantId, dto);
  }
  @Permissions('store.read') @Get('settings') settings(
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.store.settings(user.tenantId);
  }
  @Permissions('store.update') @Put('settings') updateSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateStorefrontSettingsDto,
  ) {
    return this.store.updateSettings(user.tenantId, dto);
  }
  @Permissions('store.read') @Get('theme') theme(
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.store.theme(user.tenantId);
  }
  @Permissions('store.theme.update') @Put('theme') updateTheme(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateStoreThemeDto,
  ) {
    return this.store.updateTheme(user.tenantId, dto);
  }
  @Permissions('store.read') @Get('contacts') contacts(
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.store.contacts(user.tenantId);
  }
  @Permissions('store.update') @Put('contacts') updateContacts(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateStoreContactsDto,
  ) {
    return this.store.updateContacts(user.tenantId, dto);
  }
}
