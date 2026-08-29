import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS for desktop app
  app.enableCors({
    origin: ['http://localhost:5173', 'app://.*'],
    credentials: true,
  });

  const port = process.env.API_PORT || 3000;
  await app.listen(port);

  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log(`  🐱 不要加班 API running`);
  console.log(`  📍 http://localhost:${port}/v1`);
  console.log(`  📦 Database: Supabase PostgreSQL`);
  console.log('═══════════════════════════════════════════');
  console.log('');
}
bootstrap();
