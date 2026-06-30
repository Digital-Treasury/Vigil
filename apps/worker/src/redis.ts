import IORedis from 'ioredis';
import { env } from './env';

// BullMQ requires maxRetriesPerRequest: null on its Redis connection.
export const connection = new IORedis(env.redisUrl, { maxRetriesPerRequest: null });
