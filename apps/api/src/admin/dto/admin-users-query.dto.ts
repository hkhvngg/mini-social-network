import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  ACCOUNT_STATUSES,
  USER_ROLES,
  type AccountStatus,
  type UserRole,
} from '../../users/types/person.type';

export class AdminUsersQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q = '';

  @IsOptional()
  @IsIn(ACCOUNT_STATUSES)
  status?: AccountStatus;

  @IsOptional()
  @IsIn(USER_ROLES)
  role?: UserRole;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}
