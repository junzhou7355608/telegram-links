import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { LinksService } from '../links/links.service';
import {
  AdminLinkResponseDto,
  AdminOverviewResponseDto,
  BatchArchiveLinksDto,
  BatchUpdateLinksResponseDto,
  BatchUpdateLinksDto,
  CreateLinkDto,
  LinkQueryDto,
  PaginatedLinksResponseDto,
  UpdateLinkDto,
} from './dto/link.dto';
import { ApiAdminAuth, ApiCommonErrorResponses } from './dto/error.dto';

@ApiTags('Admin - Links')
@ApiAdminAuth()
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
      includeArchived: query.includeArchived,
      page: query.page,
      pageSize: query.pageSize,
      query: query.q,
      sort: query.sort,
      sourceChatId: query.sourceChatId,
      status: query.status,
      tagIds: query.tagIds,
      view: query.view,
    });
  }

  @Post('links')
  @ApiCreatedResponse({ type: AdminLinkResponseDto })
  create(@Body() body: CreateLinkDto) {
    return this.links.create(body);
  }

  @Patch('links/batch')
  @ApiOkResponse({ type: BatchUpdateLinksResponseDto })
  batch(@Body() body: BatchUpdateLinksDto) {
    return this.links.batchUpdate(body.ids, body.patch);
  }

  @Post('links/batch/archive')
  @HttpCode(200)
  @ApiOkResponse({ type: BatchUpdateLinksResponseDto })
  batchArchive(@Body() body: BatchArchiveLinksDto) {
    return this.links.batchArchive(body.ids);
  }

  @Get('links/:id')
  @ApiOkResponse({ type: AdminLinkResponseDto })
  async findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.adminLink(id);
  }

  @Patch('links/:id')
  @ApiOkResponse({ type: AdminLinkResponseDto })
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: UpdateLinkDto,
  ) {
    await this.links.update(id, body);
    return this.adminLink(id);
  }

  @Delete('links/:id')
  @HttpCode(204)
  @ApiNoContentResponse({ description: '链接已归档。' })
  archive(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.links.archive(id);
  }

  @Post('links/:id/restore')
  @HttpCode(200)
  @ApiOkResponse({ type: AdminLinkResponseDto })
  async restore(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    await this.links.restore(id);
    return this.adminLink(id);
  }

  private adminLink(id: string) {
    return this.links.findOne(id);
  }
}
