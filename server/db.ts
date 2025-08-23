import 'dotenv/config';

import * as schema from "../shared/schema.js";

// Support both Neon serverless (websocket) and local Postgres (tcp)
import { neonConfig, Pool as NeonPool } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import pg from 'pg';
const { Pool: PgPool } = pg;
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';

// Debug logging
console.log('🔍 Database Environment Variables:');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
console.log('NODE_ENV:', process.env.NODE_ENV || 'NOT SET');
console.log('PGSSL:', process.env.PGSSL || 'NOT SET');

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('❌ DATABASE_URL is not set!');
  throw new Error("DATABASE_URL must be set. Example (local): postgres://user:pass@localhost:5432/dbname | Example (Neon): postgresql://user:pass@ep-xxxxx.neon.tech/db?sslmode=require");
}

console.log('🔗 Database URL detected:', databaseUrl);

// Heuristic: use Neon driver for neon.tech URLs, otherwise use node-postgres
const isNeon = /neon\.tech/i.test(databaseUrl) && !/localhost|127\.0\.0\.1/i.test(databaseUrl);

console.log('🔧 Using database driver:', isNeon ? 'Neon (serverless)' : 'node-postgres (TCP)');

let db: ReturnType<typeof drizzleNeon> | ReturnType<typeof drizzlePg>;

try {
  if (isNeon) {
    console.log('🚀 Initializing Neon database connection...');
    neonConfig.webSocketConstructor = ws;
    const neonPool = new NeonPool({ connectionString: databaseUrl });
    db = drizzleNeon({ client: neonPool, schema });
    console.log('✅ Neon database connection initialized');
  } else {
    console.log('🔌 Initializing PostgreSQL database connection...');
    const useSsl = /^true$/i.test(process.env.PGSSL || 'false');
    console.log('🔐 SSL enabled:', useSsl);
    
    const pgPool = new PgPool({
      connectionString: databaseUrl,
      ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    });
    
    // Test the connection
    pgPool.on('connect', (client) => {
      console.log('✅ PostgreSQL client connected');
    });
    
    pgPool.on('error', (err) => {
      console.error('❌ PostgreSQL pool error:', err);
    });
    
    db = drizzlePg(pgPool, { schema });
    console.log('✅ PostgreSQL database connection initialized');
  }
} catch (error) {
  console.error('❌ Database initialization failed:', error);
  throw error;
}

export { db };
