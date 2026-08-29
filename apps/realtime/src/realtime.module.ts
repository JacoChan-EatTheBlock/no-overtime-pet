import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
// import { PresenceGateway } from './presence.gateway';
// import { PetActionGateway } from './pet-action.gateway';
// import { RedisModule } from './redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // RedisModule, // 连接 Upstash Redis
  ],
  providers: [
    // PresenceGateway,
    // PetActionGateway,
  ],
})
export class RealtimeModule {}
