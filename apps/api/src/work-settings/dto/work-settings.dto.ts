import {
  IsOptional,
  IsString,
  Matches,
  IsNumberString,
} from 'class-validator';

/**
 * PUT /v1/work-settings — full update of work schedule + wage.
 * Time format: HH:mm (24h, UTC-equivalent in Asia/Shanghai context).
 * dailySalaryMinor: string representation of BIGINT (fen), e.g. "50000" = ¥500.00
 */
export class UpdateWorkSettingsDto {
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'workStart must be HH:mm format',
  })
  workStart?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'workEnd must be HH:mm format',
  })
  workEnd?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'lunchStart must be HH:mm format',
  })
  lunchStart?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'lunchEnd must be HH:mm format',
  })
  lunchEnd?: string;

  @IsOptional()
  @IsNumberString({}, { message: 'dailySalaryMinor must be a numeric string (BIGINT in fen)' })
  dailySalaryMinor?: string;
}
