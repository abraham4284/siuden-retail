import { Type } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class AccountQueryDto extends PaginationDto {}

export class CreateAccountOwnerDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password: string;

  @IsString()
  @MaxLength(150)
  displayName: string;
}

export class CreateAccountDto {
  @IsString()
  @MaxLength(150)
  accountName: string;

  @IsString()
  @MaxLength(150)
  tenantName: string;

  @IsString()
  @MaxLength(100)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug solo admite minúsculas, números y guiones',
  })
  slug: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/)
  defaultCurrency = 'ARS';

  @IsOptional()
  @IsString()
  @MaxLength(80)
  timeZone = 'America/Argentina/Buenos_Aires';

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateAccountOwnerDto)
  owner?: CreateAccountOwnerDto;
}
