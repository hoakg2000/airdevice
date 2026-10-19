import { Module } from '@nestjs/common';
import { createClient, type RedisClientType } from 'redis';
import { SignalingGateway } from './signaling.gateway';
import { HealthController } from './health.controller';
import { MemorySessionStore, RedisSessionStore, SessionStore } from './session.store';
import { config } from './config';

@Module({
  controllers: [HealthController],
  providers: [
    SignalingGateway,
    {
      provide: SessionStore,
      useFactory: async () => {
        if (!config.redisUrl) return new MemorySessionStore();
        const client = createClient({ url: config.redisUrl });
        client.on('error', (err) => console.error('Redis Store Error', err));
        await client.connect();
        return new RedisSessionStore(client as RedisClientType);
      },
    },
  ],
})
export class AppModule {}
