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
} from '@nestjs/common';
import { ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import {
  TaxonomyService,
  type TaxonomyKind,
} from '../taxonomy/taxonomy.service';
import { TaxonomyNameDto } from './api.dto';

function taxonomyKind(value: string): TaxonomyKind {
  if (value === 'projects' || value === 'categories' || value === 'tags') {
    return value;
  }
  throw new BadRequestException({
    code: 'INVALID_TAXONOMY_KIND',
    message: '基础资料类型必须是 projects、categories 或 tags。',
  });
}

@ApiTags('Admin - Taxonomy')
@Controller('admin/v1/taxonomy')
export class AdminTaxonomyController {
  constructor(private readonly taxonomy: TaxonomyService) {}

  @Get(':kind')
  @ApiOkResponse({ description: '基础资料列表及引用数。' })
  list(@Param('kind') kind: string) {
    return this.taxonomy.list(taxonomyKind(kind));
  }

  @Post(':kind')
  @ApiOkResponse({ description: '新增基础资料。' })
  create(@Param('kind') kind: string, @Body() body: TaxonomyNameDto) {
    return this.taxonomy.create(taxonomyKind(kind), body.name);
  }

  @Patch(':kind/:id')
  @ApiOkResponse({ description: '重命名基础资料。' })
  rename(
    @Param('kind') kind: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: TaxonomyNameDto,
  ) {
    return this.taxonomy.rename(taxonomyKind(kind), id, body.name);
  }

  @Delete(':kind/:id')
  @HttpCode(204)
  @ApiNoContentResponse({ description: '删除未被引用的基础资料。' })
  remove(
    @Param('kind') kind: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.taxonomy.remove(taxonomyKind(kind), id);
  }
}
