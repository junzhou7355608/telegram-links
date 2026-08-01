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
import { AiService } from '../ai/ai.service';
import {
  AdminLinkResponseDto,
  AdminOverviewResponseDto,
  BatchUpdateLinksResponseDto,
  BatchUpdateLinksDto,
  LinkQueryDto,
  PaginatedLinksResponseDto,
  UpdateLinkDto,
} from './dto/link.dto';
import { ApplyAiSuggestionsDto } from './dto/ai.dto';
import { ApiCommonErrorResponses } from './dto/error.dto';

@ApiTags('Admin - Links')
@ApiCommonErrorResponses()
@Controller('admin/v1')
export class AdminLinksController {
  constructor(
    private readonly ai: AiService,
    private readonly links: LinksService,
  ) {}

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

  @Post('links/:id/ai-suggestions/apply')
  @HttpCode(200)
  @ApiOkResponse({ type: AdminLinkResponseDto })
  async applyAiSuggestions(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: ApplyAiSuggestionsDto,
  ) {
    await this.ai.applySuggestions(id, body);
    return this.adminLink(id);
  }

  private async adminLink(id: string) {
    const [link, aiAnalysis] = await Promise.all([
      this.links.findOne(id),
      this.ai.latestAnalysis(id),
    ]);
    return { ...link, aiAnalysis };
  }
}
