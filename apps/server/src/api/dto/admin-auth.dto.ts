import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class AdminLoginDto {
  @ApiProperty({ example: 'admin', maxLength: 128, type: String })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  username!: string;

  @ApiProperty({ format: 'password', maxLength: 512, type: String })
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  password!: string;
}

export class AdminSessionResponseDto {
  @ApiProperty({ example: true, type: Boolean })
  authenticated!: boolean;

  @ApiPropertyOptional({ example: 'admin', type: String })
  username?: string;
}
