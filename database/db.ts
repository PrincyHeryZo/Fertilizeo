import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATABASE_URL = process.env.DATABASE_URL;

interface DbInterface {
  query: (sql: string, params?: any[]) => Promise<any>;
  get: (sql: string, params?: any[]) => Promise<any>;
  all: (sql: string, params?: any[]) => Promise<any[]>;
  run: (sql: string, params?: any[]) => Promise<{ lastInsertRowid: number | string }>;
  transaction: (callback: () => Promise<void>) => Promise<void>;
}

let db: DbInterface;

if (DATABASE_URL) {
  // PostgreSQL (Supabase)
  const pool = new pg.Pool({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  db = {
    query: async (sql: string, params: any[] = []) => {
      const result = await pool.query(sql.replace(/\?/g, (_, i) => `$${i + 1}`), params);
      return result;
    },
    get: async (sql: string, params: any[] = []) => {
      const result = await pool.query(sql.replace(/\?/g, (_, i) => `$${i + 1}`), params);
      return result.rows[0];
    },
    all: async (sql: string, params: any[] = []) => {
      const result = await pool.query(sql.replace(/\?/g, (_, i) => `$${i + 1}`), params);
      return result.rows;
    },
    run: async (sql: string, params: any[] = []) => {
      // For PostgreSQL, we often need RETURNING id to get the last insert id
      // We'll try to append RETURNING id if it's an INSERT and doesn't have it
      let finalSql = sql.replace(/\?/g, (_, i) => `$${i + 1}`);
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
  // SQLite (Local)
  const dbPath = path.resolve(__dirname, 'fertilizeo.db');
  const sqlite = new Database(dbPath);

  // Initialize database with schema
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
    get: async (sql: string, params: any[] = []) => {
      return sqlite.prepare(sql).get(...params);
    },
    all: async (sql: string, params: any[] = []) => {
      return sqlite.prepare(sql).all(...params);
    },
    run: async (sql: string, params: any[] = []) => {
      const result = sqlite.prepare(sql).run(...params);
      return { lastInsertRowid: result.lastInsertRowid };
    },
    transaction: async (callback: () => Promise<void>) => {
      const tx = sqlite.transaction(async () => {
        await callback();
      });
      await tx();
    }
  };
  console.log('Connected to SQLite (Local)');
}

export default db;
