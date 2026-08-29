import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    // PostgreSQL via Supabase (cloud)
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.getOrThrow('DATABASE_URL'),
        ssl: { rejectUnauthorized: false },
        autoLoadEntities: true,
        synchronize: false, // 使用迁移，不自动同步
        logging: config.get('NODE_ENV') === 'development',
      }),
    }),

    // TODO: Import feature modules
    // AuthModule,
    // TasksModule,
    // FriendsModule,
    // EconomyModule,
    // SchedulingModule,
    // WorkdayModule,
    // ShopModule,
  ],
})
export class AppModule {}
