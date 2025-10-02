import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { LoginRequestDTO } from '../../interfaces/auth';

export class LoginDto implements LoginRequestDTO {
  @ApiProperty({
    example: 'user',
  })
  @IsString()
  @MinLength(3)
  login: string;

  @ApiProperty({
    example: 'Strongpassword123!',
  })
  @IsString()
  @MinLength(8)
  password: string;
}
