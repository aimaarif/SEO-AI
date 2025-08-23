import Redis from 'ioredis';
import { config } from 'dotenv';

// Load environment variables
config();

// Debug logging
console.log('🔍 Redis Environment Variables:');
console.log('REDIS_URL:', process.env.REDIS_URL ? 'SET' : 'NOT SET');
console.log('REDIS_HOST:', process.env.REDIS_HOST || 'NOT SET');
console.log('REDIS_PORT:', process.env.REDIS_PORT || 'NOT SET');
console.log('REDIS_PASSWORD:', process.env.REDIS_PASSWORD ? 'SET' : 'NOT SET');
console.log('NODE_ENV:', process.env.NODE_ENV || 'NOT SET');

// Determine Redis configuration
let redis: Redis;

if (process.env.REDIS_URL) {
  console.log('🚀 Using REDIS_URL configuration');
  const options = {
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: null, // BullMQ requirement
    lazyConnect: true,
    retryDelayOnClusterDown: 100,
    enableReadyCheck: false,
    maxLoadingTimeout: 10000,
  };
  redis = new Redis(process.env.REDIS_URL, options);
} else if (process.env.REDIS_HOST && process.env.REDIS_PORT) {
  console.log('🔧 Using individual Redis config');
  const options = {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: null,
    lazyConnect: true,
    retryDelayOnClusterDown: 100,
    enableReadyCheck: false,
    maxLoadingTimeout: 10000,
  };
  redis = new Redis(options);
} else {
  console.log('⚠️ No Redis config found, using localhost fallback');
  const options = {
    host: 'localhost',
    port: 6379,
    db: 0,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: null,
    lazyConnect: true,
    retryDelayOnClusterDown: 100,
    enableReadyCheck: false,
    maxLoadingTimeout: 10000,
  };
  redis = new Redis(options);
}

console.log('🔧 Redis instance created with options');

// Handle connection events
redis.on('connect', () => {
  console.log('✅ Redis connected successfully');
  if (process.env.REDIS_URL) {
    console.log('📍 Connected to Redis via REDIS_URL');
  } else if (process.env.REDIS_HOST) {
    console.log('📍 Connected to Redis via individual config');
  } else {
    console.log('📍 Connected to Redis via localhost fallback');
  }
});

redis.on('error', (error) => {
  console.error('❌ Redis connection error:', error);
});

redis.on('close', () => {
  console.log('🔌 Redis connection closed');
});

redis.on('reconnecting', () => {
  console.log('🔄 Redis reconnecting...');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down Redis connection...');
  await redis.quit();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down Redis connection...');
  await redis.quit();
  process.exit(0);
});

export { redis };
export default redis;
