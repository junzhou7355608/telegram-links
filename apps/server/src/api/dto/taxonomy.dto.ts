import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export enum TaxonomyKindDtoValue {
  Categories = 'categories',
  Tags = 'tags',
}

export class TaxonomyNameDto {
  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;
}

export class TaxonomyOrderDto {
  @ApiProperty({ format: 'uuid', isArray: true, type: String })
  @IsArray()
  @IsUUID('4', { each: true })
  ids!: string[];
}

export class TaxonomyItemResponseDto {
  @ApiProperty({ format: 'uuid', type: String })
  id!: string;

  @ApiProperty({ type: String })
  name!: string;

  @ApiProperty({ type: Number })
  referenceCount!: number;
}
