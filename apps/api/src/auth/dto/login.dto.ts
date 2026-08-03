import { Transform } from 'class-transformer';
import type { TransformFnParams } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'minh.nguyen' })
  @Transform(({ value }: TransformFnParams): unknown =>
    typeof value === 'string' ? value.trim().toLowerCase() : (value as unknown),
  )
  @MaxLength(254, { message: 'Tên đăng nhập dài hơn mức cho phép.' })
  @IsString({ message: 'Hãy nhập email hoặc tên người dùng.' })
  @IsNotEmpty({ message: 'Hãy nhập email hoặc tên người dùng.' })
  identifier!: string;

  @ApiProperty({ example: 'StrongPass123!' })
  @Matches(/^[\x21-\x7E]+$/, {
    message:
      'Mật khẩu chỉ dùng chữ không dấu, số và ký tự trên bàn phím tiếng Anh.',
  })
  @MaxLength(128, { message: 'Mật khẩu dài hơn mức cho phép.' })
  @IsString({ message: 'Hãy nhập mật khẩu.' })
  @IsNotEmpty({ message: 'Hãy nhập mật khẩu.' })
  password!: string;
}
