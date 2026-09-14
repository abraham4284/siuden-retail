import { PartialType } from '@nestjs/swagger';
import { CustomerKind, CustomerSource, CustomerStatus } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class CreateCustomerDto {
  @IsOptional()
  @IsUUID()
  customerGroupId?: string;

  @IsOptional()
  @IsEnum(CustomerSource)
  source?: CustomerSource;

  @IsOptional()
  @IsEnum(CustomerKind)
  kind?: CustomerKind;

  @IsOptional() @IsString() @MaxLength(100) firstName?: string;
  @IsOptional() @IsString() @MaxLength(100) lastName?: string;
  @IsOptional() @IsString() @MaxLength(200) businessName?: string;
  @IsOptional() @IsString() @MaxLength(30) documentType?: string;
  @IsOptional() @IsString() @MaxLength(40) documentNumber?: string;
  @IsOptional() @IsString() @MaxLength(80) taxCondition?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {
  @IsOptional()
  @IsEnum(CustomerStatus)
  status?: CustomerStatus;
}

export class CustomerQueryDto extends PaginationDto {
  @IsOptional()
  @IsEnum(CustomerStatus)
  status?: CustomerStatus;

  @IsOptional()
  @IsUUID()
  customerGroupId?: string;
}
