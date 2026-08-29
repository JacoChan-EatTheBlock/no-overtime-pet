import {
  Injectable,
  PreconditionFailedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkScheduleSettingsEntity } from './entities/work-schedule-settings.entity';
import { WageSettingsEntity } from './entities/wage-settings.entity';
import { UpdateWorkSettingsDto } from './dto/work-settings.dto';

export interface WorkSettingsCombined {
  schedule: WorkScheduleSettingsEntity;
  wage: WageSettingsEntity;
}

@Injectable()
export class WorkSettingsService {
  constructor(
    @InjectRepository(WorkScheduleSettingsEntity)
    private scheduleRepo: Repository<WorkScheduleSettingsEntity>,
    @InjectRepository(WageSettingsEntity)
    private wageRepo: Repository<WageSettingsEntity>,
  ) {}

  /**
   * Get current work settings for the user, creating defaults if absent.
   */
  async getCurrent(userId: string): Promise<WorkSettingsCombined> {
    let schedule = await this.scheduleRepo.findOne({ where: { userId } });
    if (!schedule) {
      schedule = this.scheduleRepo.create({ userId });
      schedule = await this.scheduleRepo.save(schedule);
    }

    let wage = await this.wageRepo.findOne({ where: { userId } });
    if (!wage) {
      wage = this.wageRepo.create({ userId });
      wage = await this.wageRepo.save(wage);
    }

    return { schedule, wage };
  }

  /**
   * Update work settings with optimistic locking.
   * The client sends If-Match with the max revision of schedule & wage.
   */
  async update(
    userId: string,
    dto: UpdateWorkSettingsDto,
    expectedRevision: number,
  ): Promise<WorkSettingsCombined> {
    const { schedule, wage } = await this.getCurrent(userId);

    // Use max of schedule/wage revision as the combined revision
    const currentRevision = Math.max(
      Number(schedule.revision),
      Number(wage.revision),
    );

    if (currentRevision !== expectedRevision) {
      throw new PreconditionFailedException({
        code: 'REVISION_CONFLICT',
        message: `Expected revision ${expectedRevision}, actual ${currentRevision}`,
      });
    }

    // Update schedule fields
    let scheduleChanged = false;
    if (dto.workStart !== undefined) {
      schedule.workStart = dto.workStart;
      scheduleChanged = true;
    }
    if (dto.workEnd !== undefined) {
      schedule.workEnd = dto.workEnd;
      scheduleChanged = true;
    }
    if (dto.lunchStart !== undefined) {
      schedule.lunchStart = dto.lunchStart;
      scheduleChanged = true;
    }
    if (dto.lunchEnd !== undefined) {
      schedule.lunchEnd = dto.lunchEnd;
      scheduleChanged = true;
    }

    if (scheduleChanged) {
      schedule.revision = Number(schedule.revision) + 1;
      await this.scheduleRepo.save(schedule);
    }

    // Update wage fields
    if (dto.dailySalaryMinor !== undefined) {
      // Validate non-negative
      const salaryValue = BigInt(dto.dailySalaryMinor);
      if (salaryValue < 0n) {
        throw new PreconditionFailedException({
          code: 'INVALID_SALARY',
          message: 'dailySalaryMinor must be non-negative',
        });
      }
      wage.dailySalaryMinor = dto.dailySalaryMinor;
      wage.revision = Number(wage.revision) + 1;
      await this.wageRepo.save(wage);
    }

    return { schedule, wage };
  }
}
