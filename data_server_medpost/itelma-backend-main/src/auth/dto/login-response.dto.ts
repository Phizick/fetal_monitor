import { ApiProperty } from '@nestjs/swagger';
import { LoginResponseDTO } from '../../interfaces/auth';

export class LoginResponseDto implements LoginResponseDTO {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT токен',
  })
  access_token: string;
}
