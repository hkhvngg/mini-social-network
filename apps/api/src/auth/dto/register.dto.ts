import { Transform } from 'class-transformer';
import type { TransformFnParams } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'minh.nguyen', minLength: 3, maxLength: 30 })
  @Transform(({ value }: TransformFnParams): unknown =>
    typeof value === 'string' ? value.trim().toLowerCase() : (value as unknown),
  )
  @Matches(/^[a-z0-9._]+$/, {
    message: 'Tên người dùng chỉ gồm chữ, số, dấu chấm và gạch dưới.',
  })
  @Length(3, 30, {
    message: 'Tên người dùng cần có từ 3 đến 30 ký tự.',
  })
  @IsString({ message: 'Hãy nhập tên người dùng.' })
  @IsNotEmpty({ message: 'Hãy nhập tên người dùng.' })
  username!: string;

  @ApiProperty({ example: 'minh@example.com' })
  @Transform(({ value }: TransformFnParams): unknown =>
    typeof value === 'string' ? value.trim().toLowerCase() : (value as unknown),
  )
  @MaxLength(254, { message: 'Email dài hơn mức cho phép.' })
  @IsEmail(
    {},
    { message: 'Email chưa đúng định dạng. Ví dụ: ban@example.com.' },
  )
  @IsNotEmpty({ message: 'Hãy nhập email.' })
  email!: string;

  @ApiProperty({ example: 'StrongPass123!', minLength: 8, maxLength: 128 })
  @Matches(/^[\x21-\x7E]+$/, {
    message:
      'Mật khẩu chỉ dùng chữ không dấu, số và ký tự trên bàn phím tiếng Anh.',
  })
  @MaxLength(128, { message: 'Mật khẩu dài hơn mức cho phép.' })
  @MinLength(8, { message: 'Mật khẩu cần có ít nhất 8 ký tự.' })
  @IsString({ message: 'Hãy tạo một mật khẩu.' })
  @IsNotEmpty({ message: 'Hãy tạo một mật khẩu.' })
  password!: string;

  @ApiProperty({ example: 'Nguyen Van Minh', minLength: 2, maxLength: 100 })
  @Transform(({ value }: TransformFnParams): unknown =>
    typeof value === 'string' ? value.trim() : (value as unknown),
  )
  @Length(2, 100, { message: 'Họ tên cần có từ 2 đến 100 ký tự.' })
  @IsString({ message: 'Hãy cho mọi người biết tên của bạn.' })
  @IsNotEmpty({ message: 'Hãy cho mọi người biết tên của bạn.' })
  fullName!: string;

  @ApiProperty({ example: 'TP. Hồ Chí Minh', minLength: 2, maxLength: 100 })
  @Transform(({ value }: TransformFnParams): unknown =>
    typeof value === 'string' ? value.trim() : (value as unknown),
  )
  @Length(2, 100, {
    message: 'Nơi sinh sống cần có từ 2 đến 100 ký tự.',
  })
  @IsString({ message: 'Hãy nhập nơi bạn đang sống.' })
  @IsNotEmpty({ message: 'Hãy nhập nơi bạn đang sống.' })
  location!: string;
}
