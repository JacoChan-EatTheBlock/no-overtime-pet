/**
 * Redis Module — connects to Upstash Redis (serverless, cloud)
 * 
 * No local Redis needed!
 * Uses REST-based or ioredis with TLS connection to Upstash.
 */
import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.getOrThrow('UPSTASH_REDIS_URL');
        const token = config.getOrThrow('UPSTASH_REDIS_TOKEN');

        // Upstash supports standard Redis protocol on port 6379 with TLS
        return new Redis(url, {
          password: token,
          tls: { rejectUnauthorized: false },
          maxRetriesPerRequest: 3,
          retryStrategy: (times) => Math.min(times * 50, 2000),
        });
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
