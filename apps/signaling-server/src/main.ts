import { existsSync } from 'fs';
import { resolve } from 'path';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { AppIoAdapter } from './io.adapter';
import { config } from './config';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());

  const ioAdapter = new AppIoAdapter(app);
  if (config.redisUrl) await ioAdapter.connectToRedis(config.redisUrl);
  app.useWebSocketAdapter(ioAdapter);

  // Serve the phone page from the same origin so it can reach the socket at '/'
  if (config.mobileDir) {
    const root = resolve(config.mobileDir);
    if (!existsSync(root)) throw new Error(`MOBILE_DIR not found: ${root}`);
    app.useStaticAssets({ root, prefix: '/m/' });
  }

  await app.listen(config.port, config.host);
  console.log(`AirDevice signaling server listening on ${await app.getUrl()}`);
}
bootstrap();
