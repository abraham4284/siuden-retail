import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import {
  CreateStockMovementDto,
  MovementQueryDto,
  StockQueryDto,
} from './dto/inventory.dto';
import { InventoryService } from './inventory.service';

@ApiBearerAuth()
@ApiTags('inventory')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Permissions('inventory.read')
  @Get('balances')
  balances(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: StockQueryDto,
  ) {
    return this.inventory.balances(user.tenantId, query);
  }

  @Permissions('inventory.read')
  @Get('locations')
  locations(@CurrentUser() user: AuthenticatedUser) {
    return this.inventory.locations(user.tenantId);
  }

  @Permissions('inventory.read')
  @Get('movements')
  movements(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: MovementQueryDto,
  ) {
    return this.inventory.movements(user.tenantId, query);
  }

  @Permissions('inventory.adjust')
  @Post('movements')
  createMovement(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateStockMovementDto,
  ) {
    return this.inventory.createMovement(user.tenantId, user.userId, dto);
  }
}
