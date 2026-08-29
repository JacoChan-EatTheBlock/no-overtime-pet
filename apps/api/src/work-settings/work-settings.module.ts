import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkScheduleSettingsEntity } from './entities/work-schedule-settings.entity';
import { WageSettingsEntity } from './entities/wage-settings.entity';
import { WorkSettingsService } from './work-settings.service';
import { WorkSettingsController } from './work-settings.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkScheduleSettingsEntity,
      WageSettingsEntity,
    ]),
    AuthModule,
  ],
  controllers: [WorkSettingsController],
  providers: [WorkSettingsService],
  exports: [WorkSettingsService],
})
export class WorkSettingsModule {}
