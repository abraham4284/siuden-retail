import { PartialType } from '@nestjs/swagger';
import { CustomerKind, CustomerSource, CustomerStatus } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CustomerAddressDto {
  @IsOptional() @IsUUID() id?: string;
  @IsString() addressType: 'HOME' | 'BILLING' | 'SHIPPING' | 'OTHER';
  @IsOptional() @IsString() @MaxLength(80) label?: string | null;
  @IsString() @MaxLength(200) street: string;
  @IsOptional() @IsString() @MaxLength(30) number?: string | null;
  @IsOptional() @IsString() @MaxLength(20) floor?: string | null;
  @IsOptional() @IsString() @MaxLength(20) apartment?: string | null;
  @IsString() @MaxLength(100) city: string;
  @IsString() @MaxLength(100) province: string;
  @IsOptional() @IsString() @MaxLength(20) postalCode?: string | null;
  @IsString() @MaxLength(2) countryCode: string;
  @IsBoolean() isDefault: boolean;
}
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

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomerAddressDto)
  addresses?: CustomerAddressDto[];
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

  @IsOptional() @IsEnum(CustomerKind) kind?: CustomerKind;
  @IsOptional() @IsEnum(CustomerSource) source?: CustomerSource;
}
