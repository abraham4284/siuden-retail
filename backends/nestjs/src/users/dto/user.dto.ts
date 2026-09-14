import { MemberStatus, UserStatus } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export enum AccountRoleCode {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  SELLER = 'SELLER',
  STOCK_MANAGER = 'STOCK_MANAGER',
}

export class UserQueryDto extends PaginationDto {
  @IsOptional()
  @IsEnum(UserStatus)
  userStatus?: UserStatus;

  @IsOptional()
  @IsEnum(MemberStatus)
  memberStatus?: MemberStatus;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  roleCode?: string;
}

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password: string;

  @IsString()
  @MaxLength(150)
  displayName: string;

  @IsEnum(AccountRoleCode)
  roleCode: AccountRoleCode;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  displayName?: string;

  @IsOptional()
  @IsEnum(MemberStatus)
  memberStatus?: MemberStatus;
}

export class ChangeUserRoleDto {
  @IsEnum(AccountRoleCode)
  roleCode: AccountRoleCode;
}

export class ResetUserPasswordDto {
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password: string;
}

export class CreatePlatformAdminDto {
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
