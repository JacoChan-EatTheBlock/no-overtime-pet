import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { TasksModule } from './tasks/tasks.module';
import { FriendsModule } from './friends/friends.module';
import { WorkSettingsModule } from './work-settings/work-settings.module';
import { join } from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        join(__dirname, '../../../.env.local'), // monorepo root
        join(__dirname, '../../../.env'),
        '.env.local',
        '.env',
      ],
    }),

    // PostgreSQL via Supabase (cloud)
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.getOrThrow('DATABASE_URL'),
        ssl: { rejectUnauthorized: false },
        autoLoadEntities: true,
        synchronize: false,
        logging: config.get('NODE_ENV') === 'development',
      }),
    }),

    // Feature modules
    AuthModule,
    TasksModule,
    FriendsModule,
    WorkSettingsModule,
  ],
})
export class AppModule {}
