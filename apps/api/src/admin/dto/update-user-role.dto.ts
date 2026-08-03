import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { USER_ROLES, type UserRole } from '../../users/types/person.type';

export class UpdateUserRoleDto {
  @IsIn(USER_ROLES)
  role!: UserRole;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
