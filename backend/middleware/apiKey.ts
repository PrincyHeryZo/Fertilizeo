/**
 * backend/middleware/apiKey.ts
 * ============================================================
 * Middleware pour l'API publique vendable de Fertili'zeo
 *
 * Les clients tiers envoient leur clé dans le header :
 *   Authorization: Bearer fzai_xxxxxxxxxxxxxxxxxxxx
 *   OU
 *   X-API-Key: fzai_xxxxxxxxxxxxxxxxxxxx
 *
 * La clé est vérifiée dans la table api_keys de Turso.
 * Chaque appel est compté pour le rate limiting et la facturation.
 *
 * Pour créer une clé (route admin) :
 *   POST /api/admin/ai/keys  { client_name, plan, monthly_limit }
 * ============================================================
 */

import { Request, Response, NextFunction } from 'express';
import { turso } from '../../database/turso.ts';
import { createHash } from 'crypto';

// Préfixe reconnaissable pour les clés Fertili'zeo
export const API_KEY_PREFIX = 'fzai_';

// ─── GÉNÉRER UNE NOUVELLE CLÉ API ────────────────────────────

export function generateApiKey(): string {
  const random = Math.random().toString(36).substring(2) +
                 Math.random().toString(36).substring(2) +
                 Date.now().toString(36);
  return API_KEY_PREFIX + random;
}

// Hash de la clé pour stockage sécurisé (on ne stocke pas la clé en clair)
export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

// ─── MIDDLEWARE DE VÉRIFICATION ───────────────────────────────

export const authenticateApiKey = async (req: Request, res: Response, next: NextFunction) => {
  // Chercher la clé dans Authorization: Bearer ou X-API-Key
  const authHeader = req.headers['authorization'];
  const xApiKey    = req.headers['x-api-key'] as string;

  let rawKey: string | null = null;

  if (authHeader?.startsWith('Bearer fzai_')) {
    rawKey = authHeader.split(' ')[1];
  } else if (xApiKey?.startsWith(API_KEY_PREFIX)) {
    rawKey = xApiKey;
  }

  if (!rawKey) {
    return res.status(401).json({
      error: 'API key required',
      hint: 'Add header: Authorization: Bearer fzai_your_key',
      docs: 'https://fertilizeo.mg/docs/api',
    });
  }

  try {
    const keyHash = hashApiKey(rawKey);

    // Chercher la clé dans la DB
    const keyData = await turso.get(
      'SELECT * FROM api_keys WHERE key_hash = ? AND is_active = 1',
      [keyHash]
    ).catch(() => null);

    if (!keyData) {
      return res.status(403).json({ error: 'Invalid or revoked API key' });
    }

    const key = keyData as any;

    // Vérifier le rate limit mensuel
    if (key.monthly_limit && key.calls_this_month >= key.monthly_limit) {
      return res.status(429).json({
        error: 'Monthly limit reached',
        limit: key.monthly_limit,
        used: key.calls_this_month,
        plan: key.plan,
        upgrade: 'Contact fertilizeo.mg to upgrade your plan',
      });
    }

    // Incrémenter le compteur d'appels (non bloquant)
    turso.run(
      `UPDATE api_keys
       SET calls_total = calls_total + 1,
           calls_this_month = calls_this_month + 1,
           last_used_at = CURRENT_TIMESTAMP
       WHERE key_hash = ?`,
      [keyHash]
    ).catch(() => {});

    // Attacher les infos de la clé à la requête
    (req as any).apiKeyData = {
      key_id:    key.id,
      client:    key.client_name,
      plan:      key.plan,
      calls_remaining: key.monthly_limit ? key.monthly_limit - key.calls_this_month : null,
    };

    next();
  } catch (err) {
    console.error('[API Key Auth]', err);
    res.status(500).json({ error: 'Authentication error' });
  }
};

// ─── CRÉER UNE CLÉ API (admin seulement) ─────────────────────

export const createApiKey = async (req: any, res: Response) => {
  const { client_name, plan = 'starter', monthly_limit = 1000 } = req.body;

  if (!client_name?.trim()) {
    return res.status(400).json({ message: 'client_name requis.' });
  }

  const PLANS: Record<string, number> = {
    starter:     1000,
    pro:         10000,
    enterprise: 100000,
  };

  const limit = PLANS[plan] || monthly_limit;
  const rawKey = generateApiKey();
  const keyHash = hashApiKey(rawKey);

  try {
    // S'assurer que la table api_keys existe
    await turso.run(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id                TEXT PRIMARY KEY,
        client_name       TEXT NOT NULL,
        key_hash          TEXT UNIQUE NOT NULL,
        plan              TEXT DEFAULT 'starter',
        monthly_limit     INTEGER DEFAULT 1000,
        calls_total       INTEGER DEFAULT 0,
        calls_this_month  INTEGER DEFAULT 0,
        is_active         INTEGER DEFAULT 1,
        last_used_at      DATETIME,
        created_at        DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const id = crypto.randomUUID();
    await turso.run(
      `INSERT INTO api_keys (id, client_name, key_hash, plan, monthly_limit)
       VALUES (?, ?, ?, ?, ?)`,
      [id, client_name.trim(), keyHash, plan, limit]
    );

    // Retourner la clé EN CLAIR une seule fois (elle n'est pas stockée en clair)
    res.status(201).json({
      message: 'Clé API créée. Sauvegardez-la maintenant, elle ne sera plus affichée.',
      api_key: rawKey,
      client_name: client_name.trim(),
      plan,
      monthly_limit: limit,
      example_usage: {
        curl: `curl -X POST https://api.fertilizeo.mg/api/ai/query \\
  -H "Authorization: Bearer ${rawKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"question": "Comment faire du compost rapide ?"}'`,
      },
    });
  } catch (err) {
    console.error('[Create API Key]', err);
    res.status(500).json({ message: 'Erreur lors de la création de la clé.' });
  }
};

// ─── LISTER LES CLÉS (admin) ─────────────────────────────────

export const listApiKeys = async (req: any, res: Response) => {
  try {
    const keys = await turso.all(
      `SELECT id, client_name, plan, monthly_limit, calls_total, calls_this_month,
              is_active, last_used_at, created_at
       FROM api_keys ORDER BY created_at DESC`
    ).catch(() => []);

    res.json({ keys });
  } catch (err) {
    res.status(500).json({ message: 'Erreur récupération des clés.' });
  }
};

// ─── RÉVOQUER UNE CLÉ (admin) ────────────────────────────────

export const revokeApiKey = async (req: any, res: Response) => {
  const { id } = req.params;
  try {
    await turso.run('UPDATE api_keys SET is_active = 0 WHERE id = ?', [id]);
    res.json({ message: 'Clé révoquée.' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur révocation.' });
  }
};

// ─── RESET COMPTEURS MENSUELS (cron job mensuel) ─────────────

export const resetMonthlyCounters = async () => {
  try {
    await turso.run('UPDATE api_keys SET calls_this_month = 0');
    console.log('[API Keys] Compteurs mensuels remis à zéro');
  } catch (err) {
    console.error('[API Keys] Erreur reset mensuel:', err);
  }
};
