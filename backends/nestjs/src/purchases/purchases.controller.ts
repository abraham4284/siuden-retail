import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { IdParamDto } from '../common/dto/id-param.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import {
  CreatePurchaseDto,
  CreateSupplierDto,
  PurchaseQueryDto,
  UpdateSupplierDto,
} from './dto/purchase.dto';
import { PurchasesService } from './purchases.service';
import { SuppliersService } from './suppliers.service';

@ApiBearerAuth()
@ApiTags('purchases')
@Controller('purchases')
export class PurchasesController {
  constructor(private readonly purchases: PurchasesService) {}

  @Permissions('purchases.read')
  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PurchaseQueryDto,
  ) {
    return this.purchases.findAll(user.tenantId, query);
  }

  @Permissions('purchases.read')
  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param() params: IdParamDto) {
    return this.purchases.findOne(user.tenantId, params.id);
  }

  @Permissions('purchases.write')
  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePurchaseDto,
  ) {
    return this.purchases.create(user.tenantId, user.userId, dto);
  }

  @Permissions('purchases.write')
  @Post(':id/receive')
  receive(@CurrentUser() user: AuthenticatedUser, @Param() params: IdParamDto) {
    return this.purchases.receive(user.tenantId, user.userId, params.id);
  }
}

@ApiBearerAuth()
@ApiTags('suppliers')
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliers: SuppliersService) {}

  @Permissions('purchases.read')
  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PaginationDto,
  ) {
    return this.suppliers.findAll(user.tenantId, query);
  }

  @Permissions('purchases.read')
  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param() params: IdParamDto) {
    return this.suppliers.findOne(user.tenantId, params.id);
  }

  @Permissions('purchases.write')
  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSupplierDto,
  ) {
    return this.suppliers.create(user.tenantId, dto);
  }

  @Permissions('purchases.write')
  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: IdParamDto,
    @Body() dto: UpdateSupplierDto,
  ) {
    return this.suppliers.update(user.tenantId, params.id, dto);
  }

  @Permissions('purchases.write')
  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param() params: IdParamDto) {
    return this.suppliers.remove(user.tenantId, params.id);
  }
}
