import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { instanceToPlain } from 'class-transformer';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly adminRepository: Repository<User>,
  ) {}

  async getUserById(id: number): Promise<User | null> {
    const user = await this.adminRepository.findOne({ where: { id } });

    if (!user) {
      throw new BadRequestException('Пользователь с данным id не найден');
    }

    return instanceToPlain(user) as User;
  }
}
