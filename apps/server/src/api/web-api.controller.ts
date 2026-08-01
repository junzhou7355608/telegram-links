import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { LinksService } from '../links/links.service';
import { ApiCommonErrorResponses } from './dto/error.dto';
import {
  LinkResponseDto,
  PaginatedLinksResponseDto,
  WebLinkQueryDto,
  WebOverviewResponseDto,
} from './dto/link.dto';

@ApiTags('Web - Links')
@ApiCommonErrorResponses()
@Controller('web/v1')
export class WebApiController {
  constructor(private readonly links: LinksService) {}

  @Get('overview')
  @ApiOkResponse({ type: WebOverviewResponseDto })
  overview() {
    return this.links.webOverview();
  }

  @Get('links')
  @ApiOkResponse({ type: PaginatedLinksResponseDto })
  list(@Query() query: WebLinkQueryDto) {
    return this.links.list(
      {
        categoryId: query.categoryId,
        page: query.page,
        pageSize: query.pageSize,
        query: query.q,
        sort: query.sort,
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
