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
import { CustomersService } from './customers.service';
import {
  CreateCustomerDto,
  CustomerQueryDto,
  UpdateCustomerDto,
} from './dto/customer.dto';

@ApiBearerAuth()
@ApiTags('customers')
@Controller('customers')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Permissions('customers.read')
  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: CustomerQueryDto,
  ) {
    return this.customers.findAll(user.tenantId, query);
  }

  @Permissions('customers.read')
  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param() params: IdParamDto) {
    return this.customers.findOne(user.tenantId, params.id);
  }

  @Permissions('customers.write')
  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCustomerDto,
  ) {
    return this.customers.create(user.tenantId, dto);
  }

  @Permissions('customers.write')
  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: IdParamDto,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customers.update(user.tenantId, params.id, dto);
  }

  @Permissions('customers.write')
  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param() params: IdParamDto) {
    return this.customers.remove(user.tenantId, params.id);
  }
}
