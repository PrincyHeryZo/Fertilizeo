/**
 * database/turso.ts
 * Client Turso pour la Knowledge Base IA de Fertili'zeo
 *
 * Variables d'environnement nécessaires :
 *   TURSO_URL       = libsql://your-db-name.turso.io
 *   TURSO_AUTH_TOKEN = eyJ...
 */

import { createClient, type Client } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config();

let tursoClient: Client | null = null;

export function getTursoClient(): Client {
  if (tursoClient) return tursoClient;

  const url = process.env.TURSO_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    throw new Error(
      '❌ TURSO_URL et TURSO_AUTH_TOKEN sont requis dans .env\n' +
      '   1. Crée une DB sur https://turso.tech\n' +
      '   2. Copie les credentials dans ton .env'
    );
  }

  tursoClient = createClient({ url, authToken });
  return tursoClient;
}

// Helpers typés pour simplifier les appels
export const turso = {
  async execute(sql: string, args: any[] = []) {
    const db = getTursoClient();
    return db.execute({ sql, args });
  },

  async get(sql: string, args: any[] = []) {
    const result = await this.execute(sql, args);
    return result.rows[0] ?? null;
  },

  async all(sql: string, args: any[] = []) {
    const result = await this.execute(sql, args);
    return result.rows;
  },

  async run(sql: string, args: any[] = []) {
    return this.execute(sql, args);
  },

  async batch(statements: { sql: string; args?: any[] }[]) {
    const db = getTursoClient();
    return db.batch(
      statements.map(s => ({ sql: s.sql, args: s.args ?? [] })),
      'write'
    );
  }
};
