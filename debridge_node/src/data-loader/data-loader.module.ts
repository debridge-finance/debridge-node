import { SubmissionEntity } from '../entities/SubmissionEntity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';
import { MissedEventsService } from './missed-events.service';

@Module({
  imports: [TypeOrmModule.forFeature([SubmissionEntity])],
  providers: [MissedEventsService],
})
export class DataLoaderModule {}
