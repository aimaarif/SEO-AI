import 'dotenv/config';

import * as schema from "../shared/schema.js";

// Support both Neon serverless (websocket) and local Postgres (tcp)
import { neonConfig, Pool as NeonPool } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import pg from 'pg';
const { Pool: PgPool } = pg;
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL must be set. Example (local): postgres://user:pass@localhost:5432/dbname | Example (Neon): postgresql://user:pass@ep-xxxxx.neon.tech/db?sslmode=require");
}

// Heuristic: use Neon driver for neon.tech URLs, otherwise use node-postgres
const isNeon = /neon\.tech/i.test(databaseUrl) && !/localhost|127\.0\.0\.1/i.test(databaseUrl);

let db: ReturnType<typeof drizzleNeon> | ReturnType<typeof drizzlePg>;

if (isNeon) {
  neonConfig.webSocketConstructor = ws;
  const neonPool = new NeonPool({ connectionString: databaseUrl });
  db = drizzleNeon({ client: neonPool, schema });
} else {
  const useSsl = /^true$/i.test(process.env.PGSSL || 'false');
  const pgPool = new PgPool({
    connectionString: databaseUrl,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  });
  db = drizzlePg(pgPool, { schema });
}

export { db };
