import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { RegisterDto } from './dto/register.dto';
import { instanceToPlain } from 'class-transformer';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(login: string, password: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { login } });

    if (user && (await compare(password, user.password))) {
      return user;
    }

    throw new UnauthorizedException('Неправильный логин или пароль');
  }

  login(user: User) {
    const payload = {
      id: user.id,
      login: user.login,
      name: user.name,
    };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async register({ login, password, name }: RegisterDto): Promise<User> {
    const existingUser = await this.userRepository.findOne({
      where: { login },
    });

    if (existingUser) {
      throw new BadRequestException(
        'Пользователь с данным логином уже зарегистрирован',
      );
    }

    const hashedPassword = await hash(password, 10);
    const user = this.userRepository.create({
      login,
      password: hashedPassword,
      name,
    });
    const newUser = await this.userRepository.save(user);
    return instanceToPlain(newUser) as User;
  }
}
