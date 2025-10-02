import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../users/entities/user.entity';

export type JwtData = Pick<User, 'login' | 'id' | 'name'>

export const AuthUser = createParamDecorator(
  (data: never, ctx: ExecutionContext): JwtData => {
    const request = ctx.switchToHttp().getRequest();

    return request.user as JwtData;
  },
);
