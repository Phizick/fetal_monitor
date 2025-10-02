import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

@Entity({ name: 'users' })
export class User {
  @ApiProperty({
    example: 1,
  })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    example: '2025-09-14T08:57:59.589Z',
  })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({
    example: '2025-09-14T08:57:59.589Z',
  })
  @CreateDateColumn()
  updatedAt: Date;

  @ApiProperty({
    example: 'user',
  })
  @Column({ unique: true, nullable: false })
  login: string;

  @Column({ nullable: false })
  @Exclude()
  password: string;

  @ApiProperty({
    example: 'John Doe',
  })
  @Column({ nullable: true })
  name: string;
}
