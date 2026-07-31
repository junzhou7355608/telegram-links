import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { LinksService } from '../links/links.service';
import {
  LinkQueryDto,
  LinkResponseDto,
  PaginatedLinksResponseDto,
} from './api.dto';

@ApiTags('Web - Links')
@Controller('web/v1')
export class WebApiController {
  constructor(private readonly links: LinksService) {}

  @Get('overview')
  @ApiOkResponse({ description: 'Web 链接工作台概览。' })
  overview() {
    return this.links.webOverview();
  }

  @Get('links')
  @ApiOkResponse({ type: PaginatedLinksResponseDto })
  list(@Query() query: LinkQueryDto) {
    return this.links.list(
      {
        categoryId: query.categoryId,
        environment: query.environment,
        page: query.page,
        pageSize: query.pageSize,
        projectId: query.projectId,
        query: query.q,
        sort: query.sort,
        status: query.status,
        tagIds: query.tagIds,
        view: query.view,
      },
      true,
    );
  }

  @Get('links/:id')
  @ApiOkResponse({ type: LinkResponseDto })
  findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.links.findOne(id, true);
  }
}
