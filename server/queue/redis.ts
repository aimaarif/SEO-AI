import Redis from 'ioredis';
import { config } from 'dotenv';

config();

// Debug logging
console.log('🔍 Redis Environment Variables:');
console.log('REDIS_URL:', process.env.REDIS_URL ? 'SET' : 'NOT SET');
console.log('REDIS_HOST:', process.env.REDIS_HOST || 'NOT SET');
console.log('REDIS_PORT:', process.env.REDIS_PORT || 'NOT SET');
console.log('REDIS_PASSWORD:', process.env.REDIS_PASSWORD ? 'SET' : 'NOT SET');

// Use REDIS_URL if available, otherwise fall back to individual config
const redisConfig = process.env.REDIS_URL ? {
  // Use the full Redis URL
  url: process.env.REDIS_URL,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: null, // BullMQ requirement
  lazyConnect: true,
} : {
  // Fallback to individual config (for local development)
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: null, // BullMQ requirement
  lazyConnect: true,
};

console.log('🔧 Redis Config:', JSON.stringify(redisConfig, null, 2));

// Create Redis connection
export const redis = new Redis(redisConfig);

// Handle connection events
redis.on('connect', () => {
  console.log('✅ Redis connected successfully');
  if (process.env.REDIS_URL) {
    console.log('📍 Connected to Redis via REDIS_URL');
  } else {
    console.log('📍 Connected to Redis via individual config');
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

export default redis;
