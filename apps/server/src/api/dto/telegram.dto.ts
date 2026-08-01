import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination.dto';
import { PaginationMetaResponseDto } from './pagination.dto';

export enum ChatTypeValue {
  Saved = 'saved',
  Private = 'private',
  Group = 'group',
  Channel = 'channel',
}

export enum TelegramAccountStatusValue {
  Authorized = 'authorized',
  Unauthorized = 'unauthorized',
}

export enum TelegramCodeDeliveryValue {
  App = 'app',
  Sms = 'sms',
}

export enum TelegramAuthResultValue {
  Authorized = 'authorized',
  PasswordRequired = 'passwordRequired',
}

export class SendCodeDto {
  @ApiProperty({ example: '+8613800000000', type: String })
  @IsString()
  @Matches(/^\+[1-9]\d{5,14}$/u)
  phoneNumber!: string;
}

export class VerifyCodeDto {
  @ApiProperty({ format: 'uuid', type: String })
  @IsUUID()
  challengeId!: string;

  @ApiProperty({ type: String, writeOnly: true })
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  code!: string;
}

export class VerifyPasswordDto {
  @ApiProperty({ format: 'uuid', type: String })
  @IsUUID()
  challengeId!: string;

  @ApiProperty({ type: String, writeOnly: true })
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  password!: string;
}

export class ChatQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({ enum: ChatTypeValue })
  @IsOptional()
  @IsEnum(ChatTypeValue)
  type?: ChatTypeValue;
}

export class UpdateChatDto {
  @ApiProperty({ type: Boolean })
  @IsBoolean()
  isEnabled!: boolean;
}

export class TelegramAccountProfileResponseDto {
  @ApiProperty({ nullable: true, type: String })
  displayName!: string | null;

  @ApiProperty({ nullable: true, type: String })
  phoneNumber!: string | null;

  @ApiProperty({ nullable: true, type: String })
  telegramUserId!: string | null;

  @ApiProperty({ nullable: true, type: String })
  username!: string | null;
}

export class TelegramAccountResponseDto {
  @ApiProperty({ type: Boolean })
  configured!: boolean;

  @ApiProperty({ enum: TelegramAccountStatusValue })
  status!: TelegramAccountStatusValue;

  @ApiProperty({ nullable: true, type: TelegramAccountProfileResponseDto })
  account!: TelegramAccountProfileResponseDto | null;
}

export class SendCodeResponseDto {
  @ApiProperty({ format: 'uuid', type: String })
  challengeId!: string;

  @ApiProperty({ enum: TelegramCodeDeliveryValue })
  delivery!: TelegramCodeDeliveryValue;

  @ApiProperty({ format: 'date-time', type: String })
  expiresAt!: string;
}

export class TelegramAuthResultResponseDto {
  @ApiProperty({ enum: TelegramAuthResultValue })
  status!: TelegramAuthResultValue;
}

export class RefreshChatsResponseDto {
  @ApiProperty({ type: Number })
  count!: number;

  @ApiProperty({ format: 'date-time', type: String })
  refreshedAt!: string;
}

export class TelegramChatResponseDto {
  @ApiProperty({ format: 'uuid', type: String })
  id!: string;

  @ApiProperty({ type: String })
  telegramPeerId!: string;

  @ApiProperty({ enum: ChatTypeValue })
  type!: ChatTypeValue;

  @ApiProperty({ type: String })
  title!: string;

  @ApiProperty({ nullable: true, type: String })
  username!: string | null;

  @ApiProperty({ type: Boolean })
  isEnabled!: boolean;

  @ApiProperty({ type: Boolean })
  isAvailable!: boolean;

  @ApiProperty({ nullable: true, type: Number })
  lastSyncedMessageId!: number | null;

  @ApiProperty({ format: 'date-time', nullable: true, type: String })
  lastSyncedAt!: string | null;

  @ApiProperty({ format: 'date-time', type: String })
  createdAt!: string;

  @ApiProperty({ format: 'date-time', type: String })
  updatedAt!: string;
}

export class PaginatedTelegramChatsResponseDto {
  @ApiProperty({ isArray: true, type: TelegramChatResponseDto })
  items!: TelegramChatResponseDto[];

  @ApiProperty({ type: PaginationMetaResponseDto })
  pagination!: PaginationMetaResponseDto;
}
