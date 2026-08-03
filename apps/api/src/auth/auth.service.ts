import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { toPublicPerson } from '../users/mappers/person.mapper';
import { PublicPerson } from '../users/types/person.type';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './types/jwt-payload.type';

type AuthResponse = {
  accessToken: string;
  user: PublicPerson;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(input: RegisterDto): Promise<AuthResponse> {
    const [usernameMatch, emailMatch] = await Promise.all([
      this.usersService.findByUsername(input.username),
      this.usersService.findByEmail(input.email),
    ]);

    if (usernameMatch) {
      throw new ConflictException(
        'Tên người dùng này đã có người dùng. Bạn thử một tên khác nhé.',
      );
    }
    if (emailMatch) {
      throw new ConflictException(
        'Email này đã được đăng ký. Bạn có thể đăng nhập bằng email này.',
      );
    }

    const passwordHash = await argon2.hash(input.password, {
      type: argon2.argon2id,
    });
    const person = await this.usersService.createPerson({
      username: input.username,
      email: input.email,
      passwordHash,
      fullName: input.fullName,
      location: input.location,
      interests: [],
    });

    return {
      accessToken: await this.issueAccessToken(
        person.personId,
        person.username,
      ),
      user: toPublicPerson(person),
    };
  }

  async login(input: LoginDto): Promise<AuthResponse> {
    const person = await this.usersService.findByIdentifier(input.identifier);

    if (!person?.passwordHash) {
      throw new UnauthorizedException(
        'Tên đăng nhập hoặc mật khẩu chưa đúng. Bạn kiểm tra lại nhé.',
      );
    }

    let passwordMatches = false;
    try {
      passwordMatches = await argon2.verify(
        person.passwordHash,
        input.password,
      );
    } catch {
      passwordMatches = false;
    }

    if (!passwordMatches) {
      throw new UnauthorizedException(
        'Tên đăng nhập hoặc mật khẩu chưa đúng. Bạn kiểm tra lại nhé.',
      );
    }

    if (person.accountStatus === 'SUSPENDED') {
      throw new ForbiddenException(
        'Tài khoản đang tạm ngưng. Bạn thử lại sau hoặc liên hệ quản trị viên để được hỗ trợ.',
      );
    }
    if (person.accountStatus === 'BANNED') {
      throw new ForbiddenException(
        'Tài khoản đã bị khóa. Hãy liên hệ quản trị viên nếu bạn cần hỗ trợ.',
      );
    }

    return {
      accessToken: await this.issueAccessToken(
        person.personId,
        person.username,
      ),
      user: toPublicPerson(person),
    };
  }

  async me(personId: string): Promise<PublicPerson> {
    const person = await this.usersService.findById(personId);

    if (!person) {
      throw new UnauthorizedException();
    }

    return toPublicPerson(person);
  }

  private issueAccessToken(
    personId: string,
    username: string,
  ): Promise<string> {
    const payload: JwtPayload = { sub: personId, username };
    return this.jwtService.signAsync(payload);
  }
}
