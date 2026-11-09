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
};

const globalForDb = globalThis as GlobalDb;

// --- Local mode (PGlite) ---
let _localDbInitialized = false;
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

function needsSSL(url: string): boolean {
  // Neon, Supabase, Vercel Postgres, AWS RDS, Render, Railway كلها تحتاج SSL
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
  // إعادة الاستخدام في حالة serverless hot reload
  if (globalForDb.__algamalLocalDb && !localMode) {
    // نظف حالة خاطئة لو switching modes
  }
  if (_database) return _database;
  if (globalForDb.__arenaNextJsPostgresqlPool && _pool === null) {
    // في حال كان هناك pool محفوظ سابقاً
    _pool = globalForDb.__arenaNextJsPostgresqlPool;
    _database = drizzleNode(_pool);
    return _database;
  }

  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";

  // أثناء build على Vercel قد لا يكون DATABASE_URL موجوداً — نرجع dummy لتجنب كسر الـ build
  // لكن عند الطلب الفعلي سيتم رمي خطأ واضح
  if (!databaseUrl) {
    // إنشاء dummy pool لا يستخدم إلا عند البناء
    // نستخدم Proxy لتأجيل الخطأ حتى وقت الاستعلام الفعلي
    const dummyError = () => {
      throw new Error(
        "DATABASE_URL غير مضبوط. أضفه في Vercel Dashboard -> Settings -> Environment Variables ثم أعد النشر."
      );
    };
    // نرجع object يرمي عند أي استخدام
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

  // حفظ للـ hot reload في dev فقط، وفي production نحتفظ به أيضاً لتقليل الاتصالات
  globalForDb.__arenaNextJsPostgresqlPool = _pool;

  // معالجة أخطاء الاتصال بدون كسر السيرفر
  _pool.on("error", (err) => {
    console.error("[DB Pool Error]", err.message);
  });

  _database = drizzleNode(_pool);
  return _database;
}

// التصدير الرئيسي - lazy getter
function getDatabase(): NodePgDatabase {
  if (localMode) return getLocalDb();
  return getPgDatabase();
}

// تصدير pool للاستخدام الخارجي (قد يكون null في local mode أو أثناء build)
export const pool: Pool | null = localMode ? null : (_pool ?? globalForDb.__arenaNextJsPostgresqlPool ?? null);

// تصدير db كـ Proxy ليكون lazy ومتوافق مع الكود القديم (db.select, db.insert...)
export const db: NodePgDatabase = new Proxy({} as NodePgDatabase, {
  get(_target, prop) {
    const realDb = getDatabase();
    const value = (realDb as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof value === "function") return (value as Function).bind(realDb);
    return value;
  },
});

export async function ensureDatabaseReady(): Promise<void> {
  if (localMode) {
    const ready = globalForDb.__algamalLocalReady ?? _localReady;
    if (ready) await ready;
  }
  // في وضع Postgres لا حاجة لانتظار - الاتصال يتم عند أول query
}

// helper للتشخيص
export function isDatabaseConfigured(): boolean {
  if (localMode) return true;
  return Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL);
}
