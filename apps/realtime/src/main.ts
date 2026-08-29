import { NestFactory } from '@nestjs/core';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { RealtimeModule } from './realtime.module';

async function bootstrap() {
  const app = await NestFactory.create(RealtimeModule);
  app.useWebSocketAdapter(new IoAdapter(app));

  const port = process.env.REALTIME_PORT || 3001;
  await app.listen(port);
  console.log(`[realtime] WebSocket gateway on :${port} (Redis: Upstash)`);
}

bootstrap();
