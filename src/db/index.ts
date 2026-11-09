import path from "node:path";
import { drizzle as drizzleNode, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { drizzle as drizzleLite } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { PGlite } from "@electric-sql/pglite";
import { Pool } from "pg";

const localMode = process.env.ALGAMAL_LOCAL_DB === "1";

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
  __algamalLocalDb?: NodePgDatabase;
  __algamalLocalReady?: Promise<void>;
};

export let pool: Pool | null = null;
let database: NodePgDatabase;

if (localMode) {
  if (!globalForDb.__algamalLocalDb) {
    const dataDir = process.env.ALGAMAL_DATA_DIR || path.join(process.cwd(), "data", "algamal");
    const client = new PGlite(dataDir);
    const lite = drizzleLite({ client });
    globalForDb.__algamalLocalReady = (async () => {
      await client.waitReady;
      await migrate(lite, { migrationsFolder: path.join(process.cwd(), "drizzle") });
    })();
    // PGlite exposes the same Drizzle PostgreSQL query/transaction API.
    globalForDb.__algamalLocalDb = lite as unknown as NodePgDatabase;
  }
  database = globalForDb.__algamalLocalDb;
} else {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required");
  pool = globalForDb.__arenaNextJsPostgresqlPool ?? new Pool({ connectionString: databaseUrl });
  if (process.env.NODE_ENV !== "production") globalForDb.__arenaNextJsPostgresqlPool = pool;
  database = drizzleNode(pool);
}

export const db = database;

export async function ensureDatabaseReady(): Promise<void> {
  if (localMode && globalForDb.__algamalLocalReady) await globalForDb.__algamalLocalReady;
}
