import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import {
  TaxonomyService,
  type TaxonomyKind,
} from '../taxonomy/taxonomy.service';
import { ApiAdminAuth, ApiCommonErrorResponses } from './dto/error.dto';
import {
  TaxonomyItemResponseDto,
  TaxonomyKindDtoValue,
  TaxonomyNameDto,
  TaxonomyOrderDto,
} from './dto/taxonomy.dto';

function taxonomyKind(value: string): TaxonomyKind {
  if (value === 'categories' || value === 'tags') {
    return value;
  }
  throw new BadRequestException({
    code: 'INVALID_TAXONOMY_KIND',
    message: '基础资料类型必须是 categories 或 tags。',
  });
}

@ApiTags('Admin - Taxonomy')
@ApiAdminAuth()
@ApiCommonErrorResponses()
@Controller('admin/v1/taxonomy')
export class AdminTaxonomyController {
  constructor(private readonly taxonomy: TaxonomyService) {}

  @Get(':kind')
  @ApiParam({ enum: TaxonomyKindDtoValue, name: 'kind' })
  @ApiOkResponse({ isArray: true, type: TaxonomyItemResponseDto })
  list(@Param('kind') kind: string) {
    return this.taxonomy.list(taxonomyKind(kind));
  }

  @Post(':kind')
  @ApiParam({ enum: TaxonomyKindDtoValue, name: 'kind' })
  @ApiCreatedResponse({ type: TaxonomyItemResponseDto })
  create(@Param('kind') kind: string, @Body() body: TaxonomyNameDto) {
    return this.taxonomy.create(taxonomyKind(kind), body.name);
  }

  @Put(':kind/order')
  @ApiParam({ enum: TaxonomyKindDtoValue, name: 'kind' })
  @ApiOkResponse({ isArray: true, type: TaxonomyItemResponseDto })
  reorder(@Param('kind') kind: string, @Body() body: TaxonomyOrderDto) {
    return this.taxonomy.reorder(taxonomyKind(kind), body.ids);
  }

  @Patch(':kind/:id')
  @ApiParam({ enum: TaxonomyKindDtoValue, name: 'kind' })
  @ApiOkResponse({ type: TaxonomyItemResponseDto })
  rename(
    @Param('kind') kind: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: TaxonomyNameDto,
  ) {
    return this.taxonomy.rename(taxonomyKind(kind), id, body.name);
  }

  @Delete(':kind/:id')
  @HttpCode(204)
  @ApiParam({ enum: TaxonomyKindDtoValue, name: 'kind' })
  @ApiNoContentResponse({ description: '删除未被引用的基础资料。' })
  remove(
    @Param('kind') kind: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.taxonomy.remove(taxonomyKind(kind), id);
  }
}
