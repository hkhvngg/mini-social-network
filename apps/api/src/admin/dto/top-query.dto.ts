import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class TopQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 10;
}
