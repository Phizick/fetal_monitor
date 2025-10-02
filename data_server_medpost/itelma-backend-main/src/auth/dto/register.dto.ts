import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RegisterRequestDTO } from '../../interfaces/auth';

export class RegisterDto implements RegisterRequestDTO {
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

  @ApiProperty({
    example: 'John Doe',
  })
  @IsString()
  @MinLength(2)
  name: string;
}
