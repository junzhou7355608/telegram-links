import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  LinkEnvironmentValue,
  LinkSortValue,
  LinkViewValue,
  OrganizationStatusValue,
} from '../common/link-values';
import { PaginationQueryDto } from '../common/pagination.dto';
import type { CreateSyncJobInput } from '../sync/sync-jobs.service';

export enum ChatTypeValue {
  Saved = 'saved',
  Private = 'private',
  Group = 'group',
  Channel = 'channel',
}

export enum SyncRangeDtoValue {
  SinceLast = 'sinceLast',
  Last7Days = 'last7Days',
  Custom = 'custom',
  AllHistory = 'allHistory',
}

export class SendCodeDto {
  @ApiProperty({ example: '+8613800000000' })
  @IsString()
  @Matches(/^\+[1-9]\d{5,14}$/u)
  phoneNumber!: string;
}

export class VerifyCodeDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  challengeId!: string;

  @ApiProperty({ writeOnly: true })
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  code!: string;
}

export class VerifyPasswordDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  challengeId!: string;

  @ApiProperty({ writeOnly: true })
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  password!: string;
}

export class ChatQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({ enum: ChatTypeValue })
  @IsOptional()
  @IsEnum(ChatTypeValue)
  type?: ChatTypeValue;
}

export class UpdateChatDto {
  @ApiProperty()
  @IsBoolean()
  isEnabled!: boolean;
}

export class CreateSyncJobDto {
  @ApiPropertyOptional({ format: 'uuid', isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  chatIds?: string[];

  @ApiProperty({ enum: SyncRangeDtoValue })
  @IsEnum(SyncRangeDtoValue)
  rangeMode!: SyncRangeDtoValue;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  rangeFrom?: Date;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  rangeTo?: Date;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  defaultProjectId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  defaultCategoryId?: string;

  @ApiPropertyOptional({ format: 'uuid', isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  defaultTagIds?: string[];

  toInput(): CreateSyncJobInput {
    return {
      chatIds: this.chatIds,
      defaultCategoryId: this.defaultCategoryId,
      defaultProjectId: this.defaultProjectId,
      defaultTagIds: this.defaultTagIds,
      rangeFrom: this.rangeFrom,
      rangeMode: this.rangeMode,
      rangeTo: this.rangeTo,
    };
  }
}

export class LinkQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: LinkViewValue })
  @IsOptional()
  @IsEnum(LinkViewValue)
  view?: LinkViewValue;

  @ApiPropertyOptional({ description: 'UUID 或 unassigned' })
  @IsOptional()
  @IsString()
  @Matches(
    /^(?:unassigned|[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/iu,
  )
  projectId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ enum: LinkEnvironmentValue })
  @IsOptional()
  @IsEnum(LinkEnvironmentValue)
  environment?: LinkEnvironmentValue;

  @ApiPropertyOptional({ enum: OrganizationStatusValue })
  @IsOptional()
  @IsEnum(OrganizationStatusValue)
  status?: OrganizationStatusValue;

  @ApiPropertyOptional({ enum: LinkSortValue })
  @IsOptional()
  @IsEnum(LinkSortValue)
  sort?: LinkSortValue;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  sourceChatId?: string;

  @ApiPropertyOptional({ format: 'uuid', isArray: true })
  @IsOptional()
  @Transform(({ value }) => {
    const input: unknown = value;
    return Array.isArray(input)
      ? input
      : typeof input === 'string'
        ? input.split(',').filter(Boolean)
        : undefined;
  })
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  tagIds?: string[];

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  includeArchived?: boolean;
}

export class UpdateLinkDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4096)
  url?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  purpose?: string | null;

  @ApiPropertyOptional({ enum: LinkEnvironmentValue })
  @IsOptional()
  @IsEnum(LinkEnvironmentValue)
  environment?: LinkEnvironmentValue;

  @ApiPropertyOptional({ enum: OrganizationStatusValue })
  @IsOptional()
  @IsEnum(OrganizationStatusValue)
  status?: OrganizationStatusValue;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  projectId?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  categoryId?: string | null;

  @ApiPropertyOptional({ format: 'uuid', isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  tagIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isFavorite?: boolean;
}

export class BatchLinkPatchDto extends UpdateLinkDto {
  @ApiPropertyOptional({ format: 'uuid', isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  addTagIds?: string[];
}

export class BatchUpdateLinksDto {
  @ApiProperty({ format: 'uuid', isArray: true })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  ids!: string[];

  @ApiProperty({ type: BatchLinkPatchDto })
  @ValidateNested()
  @Type(() => BatchLinkPatchDto)
  patch!: BatchLinkPatchDto;
}

export class TaxonomyNameDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;
}

export class PaginationMetaResponseDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class TaxonomyReferenceResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;
}

export class LinkSourceResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  chatId!: string;

  @ApiProperty()
  chatName!: string;

  @ApiProperty()
  messageId!: number;

  @ApiProperty()
  messagePreview!: string;

  @ApiPropertyOptional()
  messageText?: string;

  @ApiPropertyOptional({ nullable: true })
  messageUrl?: string | null;

  @ApiProperty()
  rawUrl!: string;

  @ApiPropertyOptional({ nullable: true })
  senderName?: string | null;

  @ApiProperty({ format: 'date-time' })
  capturedAt!: string;
}

export class LinkResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  url!: string;

  @ApiProperty()
  domain!: string;

  @ApiProperty({ enum: LinkEnvironmentValue })
  environment!: LinkEnvironmentValue;

  @ApiProperty({ enum: OrganizationStatusValue })
  status!: OrganizationStatusValue;

  @ApiProperty({ nullable: true, type: TaxonomyReferenceResponseDto })
  project!: TaxonomyReferenceResponseDto | null;

  @ApiProperty({ nullable: true, type: TaxonomyReferenceResponseDto })
  category!: TaxonomyReferenceResponseDto | null;

  @ApiProperty({ isArray: true, type: TaxonomyReferenceResponseDto })
  tags!: TaxonomyReferenceResponseDto[];

  @ApiProperty({ nullable: true })
  purpose!: string | null;

  @ApiProperty()
  isFavorite!: boolean;

  @ApiProperty()
  sourceCount!: number;

  @ApiProperty({ nullable: true, type: LinkSourceResponseDto })
  latestSource!: LinkSourceResponseDto | null;

  @ApiPropertyOptional({ isArray: true, type: LinkSourceResponseDto })
  sources?: LinkSourceResponseDto[];

  @ApiProperty({ format: 'date-time' })
  firstDiscoveredAt!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;

  @ApiProperty({ format: 'date-time', nullable: true })
  archivedAt!: string | null;
}

export class PaginatedLinksResponseDto {
  @ApiProperty({ isArray: true, type: LinkResponseDto })
  items!: LinkResponseDto[];

  @ApiProperty({ type: PaginationMetaResponseDto })
  pagination!: PaginationMetaResponseDto;
}
