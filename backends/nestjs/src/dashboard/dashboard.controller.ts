import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { DashboardService } from './dashboard.service';

@ApiBearerAuth()
@ApiTags('dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}
  @Permissions('products.read')
  @Get()
  summary(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboard.summary(user.tenantId);
  }
}
