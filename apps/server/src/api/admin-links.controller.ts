import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Body,
} from '@nestjs/common';
import { ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { LinksService } from '../links/links.service';
import {
  AdminOverviewResponseDto,
  BatchUpdateLinksResponseDto,
  BatchUpdateLinksDto,
  LinkQueryDto,
  LinkResponseDto,
  PaginatedLinksResponseDto,
  UpdateLinkDto,
} from './dto/link.dto';
import { ApiCommonErrorResponses } from './dto/error.dto';

@ApiTags('Admin - Links')
@ApiCommonErrorResponses()
@Controller('admin/v1')
export class AdminLinksController {
  constructor(private readonly links: LinksService) {}

  @Get('overview')
  @ApiOkResponse({ type: AdminOverviewResponseDto })
  overview() {
    return this.links.adminOverview();
  }

  @Get('links')
  @ApiOkResponse({ type: PaginatedLinksResponseDto })
  list(@Query() query: LinkQueryDto) {
    return this.links.list({
      categoryId: query.categoryId,
      environment: query.environment,
      includeArchived: query.includeArchived,
      page: query.page,
      pageSize: query.pageSize,
      projectId: query.projectId,
      query: query.q,
      sort: query.sort,
      sourceChatId: query.sourceChatId,
      status: query.status,
      tagIds: query.tagIds,
      view: query.view,
    });
  }

  @Patch('links/batch')
  @ApiOkResponse({ type: BatchUpdateLinksResponseDto })
  batch(@Body() body: BatchUpdateLinksDto) {
    return this.links.batchUpdate(body.ids, body.patch);
  }

  @Get('links/:id')
  @ApiOkResponse({ type: LinkResponseDto })
  findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.links.findOne(id);
  }

  @Patch('links/:id')
  @ApiOkResponse({ type: LinkResponseDto })
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: UpdateLinkDto,
  ) {
    return this.links.update(id, body);
  }

  @Delete('links/:id')
  @HttpCode(204)
  @ApiNoContentResponse({ description: '链接已归档。' })
  archive(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.links.archive(id);
  }

  @Post('links/:id/restore')
  @HttpCode(200)
  @ApiOkResponse({ type: LinkResponseDto })
  restore(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.links.restore(id);
  }
}
