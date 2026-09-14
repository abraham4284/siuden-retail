import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class AccountQueryDto extends PaginationDto {}

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
}
