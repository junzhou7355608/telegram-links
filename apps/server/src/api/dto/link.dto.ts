import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import {
  LinkSortValue,
  LinkViewValue,
  OrganizationStatusValue,
} from '../../common/link-values';
import { PaginationQueryDto } from '../../common/pagination.dto';
import { SyncJobStatusDtoValue } from './sync.dto';
import { PaginationMetaResponseDto } from './pagination.dto';

export class LinkQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: LinkViewValue })
  @IsOptional()
  @IsEnum(LinkViewValue)
  view?: LinkViewValue;

  @ApiPropertyOptional({ format: 'uuid', type: String })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ enum: OrganizationStatusValue })
  @IsOptional()
  @IsEnum(OrganizationStatusValue)
  status?: OrganizationStatusValue;

  @ApiPropertyOptional({ enum: LinkSortValue })
  @IsOptional()
  @IsEnum(LinkSortValue)
  sort?: LinkSortValue;

  @ApiPropertyOptional({ format: 'uuid', type: String })
  @IsOptional()
  @IsUUID()
  sourceChatId?: string;

  @ApiPropertyOptional({ format: 'uuid', isArray: true, type: String })
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

  @ApiPropertyOptional({ default: false, type: Boolean })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  includeArchived?: boolean;
}

export class UpdateLinkDto {
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(4096)
  url?: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  purpose?: string | null;

  @ApiPropertyOptional({ enum: OrganizationStatusValue })
  @IsOptional()
  @IsEnum(OrganizationStatusValue)
  status?: OrganizationStatusValue;

  @ApiPropertyOptional({ format: 'uuid', nullable: true, type: String })
  @IsOptional()
  @IsUUID()
  categoryId?: string | null;

  @ApiPropertyOptional({ format: 'uuid', isArray: true, type: String })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  tagIds?: string[];
}

export class BatchLinkPatchDto extends UpdateLinkDto {
  @ApiPropertyOptional({ format: 'uuid', isArray: true, type: String })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  addTagIds?: string[];
}

export class BatchUpdateLinksDto {
  @ApiProperty({ format: 'uuid', isArray: true, type: String })
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

export class BatchArchiveLinksDto {
  @ApiProperty({ format: 'uuid', isArray: true, type: String })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  ids!: string[];
}

export class TaxonomyReferenceResponseDto {
  @ApiProperty({ format: 'uuid', type: String })
  id!: string;

  @ApiProperty({ type: String })
  name!: string;
}

export class LinkSourceResponseDto {
  @ApiProperty({ format: 'uuid', type: String })
  id!: string;

  @ApiProperty({ format: 'uuid', type: String })
  chatId!: string;

  @ApiProperty({ type: String })
  chatName!: string;

  @ApiProperty({ type: Number })
  messageId!: number;

  @ApiProperty({ type: String })
  messagePreview!: string;

  @ApiPropertyOptional({ type: String })
  messageText?: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  messageUrl?: string | null;

  @ApiProperty({ type: String })
  rawUrl!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  senderName?: string | null;

  @ApiProperty({ format: 'date-time', type: String })
  capturedAt!: string;
}

export class LinkResponseDto {
  @ApiProperty({ format: 'uuid', type: String })
  id!: string;

  @ApiProperty({ type: String })
  title!: string;

  @ApiProperty({ type: String })
  url!: string;

  @ApiProperty({ type: String })
  domain!: string;

  @ApiProperty({ enum: OrganizationStatusValue })
  status!: OrganizationStatusValue;

  @ApiProperty({ nullable: true, type: TaxonomyReferenceResponseDto })
  category!: TaxonomyReferenceResponseDto | null;

  @ApiProperty({ isArray: true, type: TaxonomyReferenceResponseDto })
  tags!: TaxonomyReferenceResponseDto[];

  @ApiProperty({ nullable: true, type: String })
  purpose!: string | null;

  @ApiProperty({ type: Number })
  sourceCount!: number;

  @ApiProperty({ nullable: true, type: LinkSourceResponseDto })
  latestSource!: LinkSourceResponseDto | null;

  @ApiPropertyOptional({ isArray: true, type: LinkSourceResponseDto })
  sources?: LinkSourceResponseDto[];

  @ApiProperty({ format: 'date-time', type: String })
  firstDiscoveredAt!: string;

  @ApiProperty({ format: 'date-time', type: String })
  createdAt!: string;

  @ApiProperty({ format: 'date-time', type: String })
  updatedAt!: string;

  @ApiProperty({ format: 'date-time', nullable: true, type: String })
  archivedAt!: string | null;
}

export class AdminLinkResponseDto extends LinkResponseDto {}

export class PaginatedLinksResponseDto {
  @ApiProperty({ isArray: true, type: LinkResponseDto })
  items!: LinkResponseDto[];

  @ApiProperty({ type: PaginationMetaResponseDto })
  pagination!: PaginationMetaResponseDto;
}

export class LatestSyncSummaryResponseDto {
  @ApiProperty({ format: 'uuid', type: String })
  id!: string;

  @ApiProperty({ enum: SyncJobStatusDtoValue })
  status!: SyncJobStatusDtoValue;

  @ApiProperty({ format: 'date-time', nullable: true, type: String })
  finishedAt!: string | null;

  @ApiProperty({ format: 'date-time', type: String })
  createdAt!: string;
}

export class AdminOverviewResponseDto {
  @ApiProperty({ type: Number })
  archived!: number;

  @ApiProperty({ nullable: true, type: LatestSyncSummaryResponseDto })
  latestSync!: LatestSyncSummaryResponseDto | null;

  @ApiProperty({ type: Number })
  pending!: number;

  @ApiProperty({ type: Number })
  todayAdded!: number;

  @ApiProperty({ type: Number })
  total!: number;
}

export class BatchSkippedLinkResponseDto {
  @ApiProperty({ format: 'uuid', type: String })
  id!: string;

  @ApiProperty({ type: String })
  code!: string;

  @ApiProperty({ type: String })
  message!: string;
}

export class BatchUpdateLinksResponseDto {
  @ApiProperty({ format: 'uuid', isArray: true, type: String })
  updatedIds!: string[];

  @ApiProperty({ isArray: true, type: BatchSkippedLinkResponseDto })
  skipped!: BatchSkippedLinkResponseDto[];
}

export class OverviewCountResponseDto {
  @ApiProperty({ type: Number })
  count!: number;

  @ApiProperty({ format: 'uuid', type: String })
  id!: string;

  @ApiProperty({ type: String })
  name!: string;
}

export class WebOverviewCountsResponseDto {
  @ApiProperty({ type: Number })
  pending!: number;

  @ApiProperty({ type: Number })
  recent!: number;

  @ApiProperty({ type: Number })
  total!: number;
}

export class WebLatestSyncResponseDto {
  @ApiProperty({ format: 'date-time', nullable: true, type: String })
  finishedAt!: string | null;

  @ApiProperty({ enum: SyncJobStatusDtoValue })
  status!: SyncJobStatusDtoValue;
}

export class WebOverviewResponseDto {
  @ApiProperty({ isArray: true, type: OverviewCountResponseDto })
  categories!: OverviewCountResponseDto[];

  @ApiProperty({ type: WebOverviewCountsResponseDto })
  counts!: WebOverviewCountsResponseDto;

  @ApiProperty({ nullable: true, type: WebLatestSyncResponseDto })
  latestSync!: WebLatestSyncResponseDto | null;
}
