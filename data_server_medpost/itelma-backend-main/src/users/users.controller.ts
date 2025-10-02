import { Controller, Get, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { User } from './entities/user.entity';
import { JwtGuard } from '../guards/jwt.guard';
import { AuthUser, JwtData } from '../decorator/user.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Получение данных об авторизованном пользователе' })
  @ApiResponse({
    status: 200,
    type: User,
  })
  @UseGuards(JwtGuard)
  @Get('me')
  getOwnUser(@AuthUser() { id }: JwtData) {
    return this.usersService.getUserById(id);
  }
}
