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
import { ApiAiErrorResponses } from './dto/error.dto';
import {
  CreateSyncJobDto,
  PaginatedSyncJobsResponseDto,
  SyncJobResponseDto,
} from './dto/sync.dto';

@ApiTags('Admin - Sync jobs')
@ApiAiErrorResponses()
@Controller('admin/v1/sync-jobs')
export class AdminSyncController {
  constructor(private readonly jobs: SyncJobsService) {}

  @Post()
  @HttpCode(202)
  @ApiAcceptedResponse({ type: SyncJobResponseDto })
  create(@Body() body: CreateSyncJobDto) {
    return this.jobs.create(body.toInput());
  }

  @Get()
  @ApiOkResponse({ type: PaginatedSyncJobsResponseDto })
  list(@Query() query: PaginationQueryDto) {
    return this.jobs.list(query.page, query.pageSize);
  }

  @Get(':id')
  @ApiOkResponse({ type: SyncJobResponseDto })
  findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.jobs.findOne(id);
  }
}
