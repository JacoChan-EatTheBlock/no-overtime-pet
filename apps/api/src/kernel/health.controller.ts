import { randomUUID } from 'node:crypto'
import { Controller, Get } from '@nestjs/common'
import { createSuccessEnvelope } from '@no-overtime/contracts'

@Controller('health')
export class HealthController {
  @Get()
  getHealth() {
    return createSuccessEnvelope(randomUUID(), {
      service: 'no-overtime-api',
      status: 'ok' as const
    })
  }
}
