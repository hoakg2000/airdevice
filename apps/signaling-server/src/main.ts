import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { RedisIoAdapter } from './redis-io.adapter';

async function bootstrap() {
  // Sử dụng Fastify thay vì Express mặc định
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter()
  );

  // Gắn Redis Adapter vào Lifecycle của NestJS
  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  // Khởi chạy server ở port 3000, lắng nghe trên 0.0.0.0 để Docker/LAN có thể truy cập
  await app.listen(3000, '0.0.0.0');
  console.log(`🚀 Signaling Server is running on: ${await app.getUrl()}`);
}
bootstrap();