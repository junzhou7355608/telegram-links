import { Global, Module } from '@nestjs/common';
import { SyncJobsService } from './sync-jobs.service';

@Global()
@Module({
  exports: [SyncJobsService],
  providers: [SyncJobsService],
})
export class SyncModule {}
