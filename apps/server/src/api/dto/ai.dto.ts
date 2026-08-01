import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class AiSettingsResponseDto {
  @ApiProperty({ type: Boolean })
  configured!: boolean;

  @ApiProperty({ nullable: true, type: String })
  selectedModel!: string | null;

  @ApiProperty({ type: Boolean })
  ready!: boolean;

  @ApiProperty({ enum: ['kimi'] })
  provider!: 'kimi';

  @ApiProperty({ format: 'date-time', nullable: true, type: String })
  lastValidatedAt!: string | null;
}

export class SetAiApiKeyDto {
  @ApiProperty({ type: String, writeOnly: true })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  apiKey!: string;
}

export class SetAiModelDto {
  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  model!: string;
}

export class AiModelResponseDto {
  @ApiProperty({ nullable: true, type: Number })
  contextLength!: number | null;

  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  ownedBy!: string;

  @ApiProperty({ type: Boolean })
  supportsReasoning!: boolean;
}

export class AiModelsResponseDto {
  @ApiProperty({ isArray: true, type: AiModelResponseDto })
  items!: AiModelResponseDto[];
}

export class AiAnalysisResponseDto {
  @ApiProperty({ format: 'uuid', type: String })
  id!: string;

  @ApiProperty({ enum: ['kimi'] })
  provider!: 'kimi';

  @ApiProperty({ type: String })
  model!: string;

  @ApiProperty({ maximum: 1, minimum: 0, type: Number })
  confidence!: number;

  @ApiProperty({ type: String })
  rationale!: string;

  @ApiProperty({ nullable: true, type: String })
  suggestedProjectName!: string | null;

  @ApiProperty({ nullable: true, type: String })
  suggestedCategoryName!: string | null;

  @ApiProperty({ isArray: true, type: String })
  suggestedTagNames!: string[];

  @ApiProperty({ format: 'date-time', nullable: true, type: String })
  appliedAt!: string | null;

  @ApiProperty({ format: 'date-time', type: String })
  createdAt!: string;
}

export class ApplyAiSuggestionsDto {
  @ApiProperty({ format: 'uuid', type: String })
  @IsUUID()
  analysisId!: string;

  @ApiProperty({ type: Boolean })
  @IsBoolean()
  applyProject!: boolean;

  @ApiProperty({ type: Boolean })
  @IsBoolean()
  applyCategory!: boolean;

  @ApiProperty({ isArray: true, type: String })
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  tagNames!: string[];
}
