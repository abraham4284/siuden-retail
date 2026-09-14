import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { IdParamDto } from '../common/dto/id-param.dto';
import { CancelSaleDto, CreateSaleDto, SaleQueryDto } from './dto/sale.dto';
import { SalesService } from './sales.service';

@ApiBearerAuth()
@ApiTags('sales')
@Controller('sales')
export class SalesController {
  constructor(private readonly sales: SalesService) {}

  @Permissions('sales.read')
  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: SaleQueryDto,
  ) {
    return this.sales.findAll(user.tenantId, query);
  }

  @Permissions('sales.read')
  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param() params: IdParamDto) {
    return this.sales.findOne(user.tenantId, params.id);
  }

  @Permissions('sales.create')
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateSaleDto) {
    return this.sales.create(user.tenantId, user.userId, dto);
  }

  @Permissions('sales.cancel')
  @Post(':id/cancel')
  cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: IdParamDto,
    @Body() dto: CancelSaleDto,
  ) {
    return this.sales.cancel(user.tenantId, user.userId, params.id, dto);
  }
}
