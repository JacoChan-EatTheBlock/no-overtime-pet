import {
  Controller,
  Get,
  Put,
  Body,
  Headers,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WorkSettingsService } from './work-settings.service';
import { UpdateWorkSettingsDto } from './dto/work-settings.dto';

@Controller('work-settings')
@UseGuards(JwtAuthGuard)
export class WorkSettingsController {
  constructor(private workSettingsService: WorkSettingsService) {}

  /** GET /v1/work-settings/current — get combined schedule + wage */
  @Get('current')
  async getCurrent(@Request() req: any) {
    const settings = await this.workSettingsService.getCurrent(req.user.sub);
    return {
      data: {
        workStart: settings.schedule.workStart,
        workEnd: settings.schedule.workEnd,
        lunchStart: settings.schedule.lunchStart,
        lunchEnd: settings.schedule.lunchEnd,
        dailySalaryMinor: settings.wage.dailySalaryMinor,
        revision: Math.max(
          Number(settings.schedule.revision),
          Number(settings.wage.revision),
        ),
      },
    };
  }

  /** PUT /v1/work-settings — update schedule + wage (If-Match revision) */
  @Put()
  async update(
    @Request() req: any,
    @Headers('if-match') ifMatch: string,
    @Body() dto: UpdateWorkSettingsDto,
  ) {
    const expectedRevision = this.parseRevisionHeader(ifMatch);
    const settings = await this.workSettingsService.update(
      req.user.sub,
      dto,
      expectedRevision,
    );
    return {
      data: {
        workStart: settings.schedule.workStart,
        workEnd: settings.schedule.workEnd,
        lunchStart: settings.schedule.lunchStart,
        lunchEnd: settings.schedule.lunchEnd,
        dailySalaryMinor: settings.wage.dailySalaryMinor,
        revision: Math.max(
          Number(settings.schedule.revision),
          Number(settings.wage.revision),
        ),
      },
    };
  }

  // ─── Helpers ──────────────────────────────────────────
  private parseRevisionHeader(ifMatch: string | undefined): number {
    if (!ifMatch) {
      throw new BadRequestException({
        code: 'MISSING_IF_MATCH',
        message: 'If-Match header is required for updates',
      });
    }
    const revision = parseInt(ifMatch, 10);
    if (isNaN(revision) || revision < 1) {
      throw new BadRequestException({
        code: 'INVALID_IF_MATCH',
        message: 'If-Match must be a positive integer revision number',
      });
    }
    return revision;
  }
}
