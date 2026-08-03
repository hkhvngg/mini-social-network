import {
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  ACCOUNT_STATUSES,
  type AccountStatus,
} from '../../users/types/person.type';

export class UpdateAccountStatusDto {
  @IsIn(ACCOUNT_STATUSES)
  status!: AccountStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsOptional()
  @IsISO8601()
  suspendedUntil?: string;
}
