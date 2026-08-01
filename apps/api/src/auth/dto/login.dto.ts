import { Transform } from 'class-transformer';
import type { TransformFnParams } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'minh.nguyen' })
  @Transform(({ value }: TransformFnParams): unknown =>
    typeof value === 'string' ? value.trim().toLowerCase() : (value as unknown),
  )
  @IsString()
  @MinLength(1)
  @MaxLength(254)
  identifier!: string;

  @ApiProperty({ example: 'StrongPass123!' })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password!: string;
}
