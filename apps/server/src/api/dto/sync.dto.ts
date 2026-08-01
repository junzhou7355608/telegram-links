import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsDate,
  IsEnum,
  IsOptional,
  IsUUID,
} from 'class-validator';
import type { CreateSyncJobInput } from '../../sync/sync-jobs.service';
import { PaginationMetaResponseDto } from './pagination.dto';

export enum SyncRangeDtoValue {
  SinceLast = 'sinceLast',
  Last7Days = 'last7Days',
  Custom = 'custom',
  AllHistory = 'allHistory',
}

export enum SyncJobStatusDtoValue {
  Queued = 'queued',
  Running = 'running',
  Succeeded = 'succeeded',
  PartiallySucceeded = 'partiallySucceeded',
  Failed = 'failed',
  Interrupted = 'interrupted',
}

export enum SyncStageDtoValue {
  Connecting = 'connecting',
  Reading = 'reading',
  Extracting = 'extracting',
  Deduplicating = 'deduplicating',
  Saving = 'saving',
}

export enum SyncJobChatStatusDtoValue {
  Pending = 'pending',
  Running = 'running',
  Succeeded = 'succeeded',
  Failed = 'failed',
}

export class CreateSyncJobDto {
  @ApiProperty({
    format: 'uuid',
    isArray: true,
    minItems: 1,
    type: String,
    uniqueItems: true,
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  chatIds!: string[];

  @ApiProperty({ enum: SyncRangeDtoValue })
  @IsEnum(SyncRangeDtoValue)
  rangeMode!: SyncRangeDtoValue;

  @ApiPropertyOptional({ format: 'date-time', type: String })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  rangeFrom?: Date;

  @ApiPropertyOptional({ format: 'date-time', type: String })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  rangeTo?: Date;

  @ApiPropertyOptional({ format: 'uuid', type: String })
  @IsOptional()
  @IsUUID()
  defaultCategoryId?: string;

  @ApiPropertyOptional({ format: 'uuid', isArray: true, type: String })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  defaultTagIds?: string[];

  toInput(): CreateSyncJobInput {
    return {
      chatIds: this.chatIds,
      defaultCategoryId: this.defaultCategoryId,
      defaultTagIds: this.defaultTagIds,
      rangeFrom: this.rangeFrom,
      rangeMode: this.rangeMode,
      rangeTo: this.rangeTo,
    };
  }
}

export class SyncJobChatResponseDto {
  @ApiProperty({ format: 'uuid', type: String })
  id!: string;

  @ApiProperty({ format: 'uuid', type: String })
  chatId!: string;

  @ApiProperty({ type: String })
  chatTitle!: string;

  @ApiProperty({ enum: SyncJobChatStatusDtoValue })
  status!: SyncJobChatStatusDtoValue;

  @ApiProperty({ type: Number })
  messageCount!: number;

  @ApiProperty({ type: Number })
  foundCount!: number;

  @ApiProperty({ type: Number })
  newCount!: number;

  @ApiProperty({ type: Number })
  duplicateCount!: number;

  @ApiProperty({ nullable: true, type: Number })
  maxProcessedMessageId!: number | null;

  @ApiProperty({ nullable: true, type: String })
  error!: string | null;

  @ApiProperty({ format: 'date-time', nullable: true, type: String })
  startedAt!: string | null;

  @ApiProperty({ format: 'date-time', nullable: true, type: String })
  finishedAt!: string | null;
}

export class SyncJobResponseDto {
  @ApiProperty({ format: 'uuid', type: String })
  id!: string;

  @ApiProperty({ enum: SyncJobStatusDtoValue })
  status!: SyncJobStatusDtoValue;

  @ApiProperty({
    enum: [...Object.values(SyncStageDtoValue), null],
    nullable: true,
  })
  stage!: SyncStageDtoValue | null;

  @ApiProperty({ type: Number })
  progress!: number;

  @ApiProperty({ enum: SyncRangeDtoValue })
  rangeMode!: SyncRangeDtoValue;

  @ApiProperty({ format: 'date-time', nullable: true, type: String })
  rangeFrom!: string | null;

  @ApiProperty({ format: 'date-time', nullable: true, type: String })
  rangeTo!: string | null;

  @ApiProperty({ format: 'uuid', nullable: true, type: String })
  defaultCategoryId!: string | null;

  @ApiProperty({ format: 'uuid', isArray: true, type: String })
  defaultTagIds!: string[];

  @ApiProperty({ type: Number })
  messageCount!: number;

  @ApiProperty({ type: Number })
  foundCount!: number;

  @ApiProperty({ type: Number })
  newCount!: number;

  @ApiProperty({ type: Number })
  duplicateCount!: number;

  @ApiProperty({ nullable: true, type: String })
  error!: string | null;

  @ApiProperty({ format: 'date-time', nullable: true, type: String })
  startedAt!: string | null;

  @ApiProperty({ format: 'date-time', nullable: true, type: String })
  finishedAt!: string | null;

  @ApiProperty({ format: 'date-time', type: String })
  createdAt!: string;

  @ApiProperty({ format: 'date-time', type: String })
  updatedAt!: string;

  @ApiProperty({ isArray: true, type: SyncJobChatResponseDto })
  chats!: SyncJobChatResponseDto[];
}

export class PaginatedSyncJobsResponseDto {
  @ApiProperty({ isArray: true, type: SyncJobResponseDto })
  items!: SyncJobResponseDto[];

  @ApiProperty({ type: PaginationMetaResponseDto })
  pagination!: PaginationMetaResponseDto;
}
