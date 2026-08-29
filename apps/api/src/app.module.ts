import { Module } from '@nestjs/common'
import { HealthController } from './kernel/health.controller.js'
import { AccountModule } from './modules/account/account.module.js'
import { EconomyModule } from './modules/economy/economy.module.js'
import { PlanningModule } from './modules/planning/planning.module.js'
import { ScheduleModule } from './modules/schedule/schedule.module.js'
import { SocialModule } from './modules/social/social.module.js'

@Module({
  imports: [AccountModule, PlanningModule, ScheduleModule, EconomyModule, SocialModule],
  controllers: [HealthController]
})
export class AppModule {}
