import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

interface DbInterface {
  query: (sql: string, params?: any[]) => Promise<any>;
  get: (sql: string, params?: any[]) => Promise<any>;
  all: (sql: string, params?: any[]) => Promise<any[]>;
  run: (sql: string, params?: any[]) => Promise<{ lastInsertRowid: number | string }>;
  transaction: (callback: () => Promise<void>) => Promise<void>;
}

function convertParams(sql: string): string {
  let counter = 0;
  return sql.replace(/\?/g, () => `$${++counter}`);
}

let db: DbInterface;

if (DATABASE_URL) {
  const pool = new pg.Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  db = {
    query: async (sql: string, params: any[] = []) => {
      const result = await pool.query(convertParams(sql), params);
      return result;
    },
    get: async (sql: string, params: any[] = []) => {
      const result = await pool.query(convertParams(sql), params);
      return result.rows[0];
    },
    all: async (sql: string, params: any[] = []) => {
      const result = await pool.query(convertParams(sql), params);
      return result.rows;
    },
    run: async (sql: string, params: any[] = []) => {
      let finalSql = convertParams(sql);
      if (finalSql.trim().toUpperCase().startsWith('INSERT') && !finalSql.toUpperCase().includes('RETURNING')) {
        finalSql += ' RETURNING id';
      }
      const result = await pool.query(finalSql, params);
      return { lastInsertRowid: result.rows[0]?.id || 0 };
    },
    transaction: async (callback: () => Promise<void>) => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await callback();
        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    }
  };
  console.log('Connected to PostgreSQL (Supabase)');
} else {
  // SQLite fallback for local dev
  const { default: Database } = await import('better-sqlite3');
  const path = await import('path');
  const fs = await import('fs');
  const { fileURLToPath } = await import('url');

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const dbPath = path.resolve(__dirname, 'fertilizeo.db');
  const sqlite = new Database(dbPath);
  const schemaPath = path.resolve(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  sqlite.exec(schema);

  db = {
    query: async (sql: string, params: any[] = []) => {
      const stmt = sqlite.prepare(sql);
      if (sql.trim().toUpperCase().startsWith('SELECT')) {
        return { rows: stmt.all(...params) };
      }
      return stmt.run(...params);
    },
    get: async (sql: string, params: any[] = []) => sqlite.prepare(sql).get(...params),
    all: async (sql: string, params: any[] = []) => sqlite.prepare(sql).all(...params),
    run: async (sql: string, params: any[] = []) => {
      const result = sqlite.prepare(sql).run(...params);
      return { lastInsertRowid: result.lastInsertRowid };
    },
    transaction: async (callback: () => Promise<void>) => {
      const tx = sqlite.transaction(async () => { await callback(); });
      await tx();
    }
  };
  console.log('Connected to SQLite (Local)');
}

export default db;
