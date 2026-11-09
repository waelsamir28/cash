import fs from "node:fs";
import path from "node:path";
import { drizzle as drizzleNode, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { drizzle as drizzleLite } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { PGlite } from "@electric-sql/pglite";
import { Pool } from "pg";

const localMode = process.env.ALGAMAL_LOCAL_DB === "1";

type GlobalDb = typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
  __algamalLocalDb?: NodePgDatabase;
  __algamalLocalReady?: Promise<void>;
  __algamalPgReady?: Promise<void>;
};

const globalForDb = globalThis as GlobalDb;

// --- Local mode (PGlite) ---
let _localDb: NodePgDatabase | null = null;
let _localReady: Promise<void> | null = null;

function getLocalDb(): NodePgDatabase {
  if (globalForDb.__algamalLocalDb) return globalForDb.__algamalLocalDb;
  if (_localDb) return _localDb;
  const dataDir = process.env.ALGAMAL_DATA_DIR || path.join(process.cwd(), "data", "algamal");
  const client = new PGlite(dataDir);
  const lite = drizzleLite({ client });
  _localReady = (async () => {
    await client.waitReady;
    await migrate(lite, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  })();
  globalForDb.__algamalLocalReady = _localReady;
  globalForDb.__algamalLocalDb = lite as unknown as NodePgDatabase;
  _localDb = lite as unknown as NodePgDatabase;
  return _localDb;
}

// --- Production mode (Postgres via pg) ---
let _pool: Pool | null = null;
let _database: NodePgDatabase | null = null;
let _pgReady: Promise<void> | null = null;

function needsSSL(url: string): boolean {
  return (
    url.includes("sslmode=require") ||
    url.includes("neon.tech") ||
    url.includes("supabase.co") ||
    url.includes("vercel-storage.com") ||
    url.includes("postgres.vercel-storage.com") ||
    url.includes("aws.neon.tech") ||
    url.includes("pooler.supabase.com") ||
    url.includes("render.com") ||
    url.includes("railway.app")
  );
}

function getPgDatabase(): NodePgDatabase {
  if (_database) return _database;
  if (globalForDb.__arenaNextJsPostgresqlPool && _pool === null) {
    _pool = globalForDb.__arenaNextJsPostgresqlPool;
    _database = drizzleNode(_pool);
    pool = _pool;
    return _database;
  }

  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
  if (!databaseUrl) {
    const dummyError = () => {
      throw new Error("DATABASE_URL غير مضبوط. أضفه في Vercel Dashboard -> Settings -> Environment Variables ثم أعد النشر.");
    };
    return new Proxy({} as NodePgDatabase, {
      get(_target, prop) {
        if (prop === "then") return undefined;
        return dummyError;
      },
    });
  }

  const ssl = needsSSL(databaseUrl) ? { rejectUnauthorized: false } : undefined;
  const poolConfig: ConstructorParameters<typeof Pool>[0] = {
    connectionString: databaseUrl,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  };
  if (ssl) poolConfig.ssl = ssl;

  _pool = globalForDb.__arenaNextJsPostgresqlPool ?? new Pool(poolConfig);
  globalForDb.__arenaNextJsPostgresqlPool = _pool;
  pool = _pool;
  _pool.on("error", (err) => console.error("[DB Pool Error]", err.message));
  _database = drizzleNode(_pool);
  return _database;
}

function getDatabase(): NodePgDatabase {
  if (localMode) return getLocalDb();
  return getPgDatabase();
}

// pool كـ live binding
export let pool: Pool | null = globalForDb.__arenaNextJsPostgresqlPool ?? null;

export const db: NodePgDatabase = new Proxy({} as NodePgDatabase, {
  get(_target, prop) {
    const realDb = getDatabase();
    const value = (realDb as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof value === "function") return (value as Function).bind(realDb);
    return value;
  },
});

// ---- ترحيل تلقائي لـ Postgres (Vercel/Neon) ----
async function ensurePgMigrated(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
  if (!databaseUrl) return;
  getPgDatabase();
  const activePool = _pool ?? globalForDb.__arenaNextJsPostgresqlPool;
  if (!activePool) return;

  try {
    const check = await activePool.query("SELECT to_regclass('public.settings') as tbl");
    const exists = check.rows[0]?.tbl !== null;
    if (exists) {
      // تحقق من الجداول الجديدة و أنشئها لو ناقصة
      await ensureNewTables(activePool);
      return;
    }
    console.log("[DB] جداول غير موجودة — جاري إنشاء الجداول تلقائياً...");
    const candidates = [
      path.join(process.cwd(), "drizzle", "0000_desktop_local_init.sql"),
      path.join(process.cwd(), "drizzle.config.json"),
      path.join(__dirname, "../../drizzle/0000_desktop_local_init.sql"),
    ];
    let sqlFile: string | null = null;
    for (const p of candidates) {
      if (fs.existsSync(p) && p.endsWith(".sql")) {
        sqlFile = p;
        break;
      }
    }
    if (!sqlFile) {
      const fallback = path.join(process.cwd(), "drizzle", "0000_desktop_local_init.sql");
      if (fs.existsSync(fallback)) sqlFile = fallback;
    }
    if (!sqlFile || !fs.existsSync(sqlFile)) {
      console.error("[DB] لم أجد ملف drizzle SQL للترحيل:", candidates);
      return;
    }
    const raw = fs.readFileSync(sqlFile, "utf8");
    const statements = raw.split("--> statement-breakpoint").map((s) => s.trim()).filter(Boolean);
    for (const stmt of statements) {
      if (!stmt) continue;
      try {
        await activePool.query(stmt);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("already exists")) continue;
        console.error("[DB migrate stmt error]", msg.slice(0, 300));
        throw e;
      }
    }
    console.log("[DB] تم إنشاء الجداول بنجاح ✅");
    await ensureNewTables(activePool);
  } catch (err) {
    console.error("[DB] فشل الترحيل التلقائي:", err instanceof Error ? err.message : err);
  }
}

async function ensureNewTables(activePool: Pool): Promise<void> {
  const extraSQL = [
    `CREATE TABLE IF NOT EXISTS "users" (
      "id" serial PRIMARY KEY NOT NULL,
      "code" text NOT NULL UNIQUE,
      "name" text NOT NULL,
      "phone" text DEFAULT '' NOT NULL,
      "role" text DEFAULT 'cashier' NOT NULL,
      "password" text DEFAULT '1234' NOT NULL,
      "active" boolean DEFAULT true NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS "shifts" (
      "id" serial PRIMARY KEY NOT NULL,
      "user_id" integer,
      "user_name" text NOT NULL,
      "role" text DEFAULT 'cashier' NOT NULL,
      "start_at" timestamp with time zone DEFAULT now() NOT NULL,
      "end_at" timestamp with time zone,
      "starting_cash" numeric(14, 3) DEFAULT 0 NOT NULL,
      "ending_cash" numeric(14, 3) DEFAULT 0 NOT NULL,
      "total_sales" numeric(14, 3) DEFAULT 0 NOT NULL,
      "total_purchases" numeric(14, 3) DEFAULT 0 NOT NULL,
      "sales_count" integer DEFAULT 0 NOT NULL,
      "status" text DEFAULT 'مفتوحة' NOT NULL,
      "notes" text DEFAULT '' NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS "purchase_orders" (
      "id" serial PRIMARY KEY NOT NULL,
      "order_no" text NOT NULL UNIQUE,
      "status" text DEFAULT 'مسودة' NOT NULL,
      "supplier_name" text DEFAULT 'المورد العام' NOT NULL,
      "total_items" integer DEFAULT 0 NOT NULL,
      "total_cost" numeric(14, 3) DEFAULT 0 NOT NULL,
      "notes" text DEFAULT '' NOT NULL,
      "created_by" text DEFAULT '' NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS "purchase_order_items" (
      "id" serial PRIMARY KEY NOT NULL,
      "order_id" integer NOT NULL REFERENCES "purchase_orders"("id") ON DELETE cascade,
      "product_id" integer,
      "product_code" text NOT NULL,
      "product_name" text NOT NULL,
      "quantity" numeric(14, 3) DEFAULT 0 NOT NULL,
      "purchase_price" numeric(14, 3) DEFAULT 0 NOT NULL,
      "total" numeric(14, 3) DEFAULT 0 NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS "inventory_counts" (
      "id" serial PRIMARY KEY NOT NULL,
      "count_no" text NOT NULL UNIQUE,
      "title" text NOT NULL,
      "status" text DEFAULT 'جارية' NOT NULL,
      "created_by" text DEFAULT '' NOT NULL,
      "total_scanned" integer DEFAULT 0 NOT NULL,
      "total_variance" integer DEFAULT 0 NOT NULL,
      "notes" text DEFAULT '' NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS "inventory_count_items" (
      "id" serial PRIMARY KEY NOT NULL,
      "count_id" integer NOT NULL REFERENCES "inventory_counts"("id") ON DELETE cascade,
      "product_id" integer,
      "product_code" text NOT NULL,
      "product_name" text NOT NULL,
      "system_quantity" numeric(14, 3) DEFAULT 0 NOT NULL,
      "counted_quantity" numeric(14, 3) DEFAULT 0 NOT NULL,
      "variance" numeric(14, 3) DEFAULT 0 NOT NULL
    )`,
  ];
  for (const sql of extraSQL) {
    try {
      await activePool.query(sql);
    } catch {
      // تجاهل
    }
  }
  // Seed افتراضي للمستخدمين لو الجدول فارغ
  try {
    const c = await activePool.query("SELECT count(*)::int as cnt FROM users");
    if (c.rows[0]?.cnt === 0) {
      await activePool.query(
        `INSERT INTO users (code, name, phone, role, password) VALUES
        ('U001','المدير العام','01222355769','admin','admin123'),
        ('U002','كاشير 1','01000000001','cashier','1234'),
        ('U003','مدير فرع','01000000002','manager','1234')
        ON CONFLICT (code) DO NOTHING`
      );
    }
  } catch {}
}

export async function ensureDatabaseReady(): Promise<void> {
  if (localMode) {
    const ready = globalForDb.__algamalLocalReady ?? _localReady;
    if (ready) await ready;
    return;
  }
  // Postgres: تأكد من وجود الجداول (مرة واحدة فقط)
  if (globalForDb.__algamalPgReady) {
    await globalForDb.__algamalPgReady;
    return;
  }
  if (_pgReady) {
    await _pgReady;
    return;
  }
  _pgReady = ensurePgMigrated();
  globalForDb.__algamalPgReady = _pgReady;
  await _pgReady;
}

export function isDatabaseConfigured(): boolean {
  if (localMode) return true;
  return Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL);
}

export async function getPool(): Promise<Pool | null> {
  if (localMode) return null;
  getPgDatabase();
  return _pool ?? globalForDb.__arenaNextJsPostgresqlPool ?? null;
}
