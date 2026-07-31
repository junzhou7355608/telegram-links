import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiAcceptedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { PaginationQueryDto } from '../common/pagination.dto';
import { SyncJobsService } from '../sync/sync-jobs.service';
import { CreateSyncJobDto } from './api.dto';

@ApiTags('Admin - Sync jobs')
@Controller('admin/v1/sync-jobs')
export class AdminSyncController {
  constructor(private readonly jobs: SyncJobsService) {}

  @Post()
  @HttpCode(202)
  @ApiAcceptedResponse({ description: '同步任务已进入后台执行。' })
  create(@Body() body: CreateSyncJobDto) {
    return this.jobs.create(body.toInput());
  }

  @Get()
  @ApiOkResponse({ description: '同步任务列表。' })
  list(@Query() query: PaginationQueryDto) {
    return this.jobs.list(query.page, query.pageSize);
  }

  @Get(':id')
  @ApiOkResponse({ description: '同步任务详情与聊天级进度。' })
  findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.jobs.findOne(id);
  }
}
