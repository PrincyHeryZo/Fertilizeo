/**
 * backend/controllers/aiController.ts
 * ============================================================
 * Cœur du RAG — IA spécialiste fertilisation bio Fertili'zeo
 *
 * Endpoints :
 *   POST /api/ai/chat          — chatbot interne (JWT requis)
 *   POST /api/ai/query         — API publique vendable (API key)
 *   GET  /api/ai/kb/stats      — stats de la knowledge base (admin)
 *   GET  /api/ai/kb/search     — recherche directe dans la KB (admin)
 *
 * Pipeline RAG :
 *   1. Reçoit la question
 *   2. Recherche les chunks les plus pertinents dans Turso
 *   3. Construit le contexte (max 3000 tokens)
 *   4. Envoie à Groq avec prompt expert
 *   5. Retourne réponse structurée + sources
 * ============================================================
 */

import { Request, Response } from 'express';
import { turso } from '../../database/turso.ts';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL   = 'llama-3.3-70b-versatile';

// ─── TYPES ───────────────────────────────────────────────────

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface RAGChunk {
  chunk_id: string;
  title: string;
  category: string;
  source: string;
  chunk_content: string;
  fertilizer_name: string | null;
  steps: string | null;
  tips: string | null;
  npk_ratio: string | null;
  region: string | null;
  score: number;
}

interface AIResponse {
  answer: string;
  sources: Array<{ title: string; category: string; source: string }>;
  structured: {
    fertilizer_name?: string;
    steps?: string[];
    tips?: string[];
    npk_ratio?: string;
  } | null;
  tokens_used?: number;
  kb_chunks_used: number;
}

// ─── RECHERCHE RAG DANS TURSO ────────────────────────────────
// Recherche multi-mots avec scoring par pertinence
// On décompose la question en mots-clés et on cherche dans
// knowledge_chunks + knowledge_structured + knowledge_base

async function searchKnowledgeBase(question: string, limit = 6): Promise<RAGChunk[]> {
  // Extraire les mots-clés significatifs (> 3 chars, sans stop words)
  const stopWords = new Set(['comment', 'faire', 'pour', 'avec', 'dans', 'quoi', 'quel', 'quelle',
    'est', 'une', 'les', 'des', 'que', 'qui', 'sur', 'par', 'pas', 'plus', 'aussi',
    'the', 'how', 'what', 'which', 'this', 'that', 'are', 'can', 'for', 'and']);

  const keywords = question
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopWords.has(w));

  if (keywords.length === 0) keywords.push(question.substring(0, 20).toLowerCase());

  // Construire les conditions LIKE dynamiquement
  const likeConditions = keywords.map(() => 'LOWER(kc.content) LIKE ?').join(' OR ');
  const titleConditions = keywords.map(() => 'LOWER(kb.title) LIKE ?').join(' OR ');
  const nameConditions  = keywords.map(() => 'LOWER(ks.fertilizer_name) LIKE ?').join(' OR ');
  const cropConditions  = keywords.map(() => 'LOWER(ks.best_for_crops) LIKE ?').join(' OR ');

  const likeParams = keywords.map(k => `%${k}%`);

  const sql = `
    SELECT
      kc.id          AS chunk_id,
      kb.title,
      kb.category,
      kb.source,
      kc.content     AS chunk_content,
      ks.fertilizer_name,
      ks.steps,
      ks.tips,
      ks.npk_ratio,
      ks.region,
      (
        CASE WHEN (${titleConditions}) THEN 10 ELSE 0 END +
        CASE WHEN (${likeConditions})  THEN 5  ELSE 0 END +
        CASE WHEN ks.fertilizer_name IS NOT NULL AND (${nameConditions}) THEN 8 ELSE 0 END +
        CASE WHEN ks.best_for_crops  IS NOT NULL AND (${cropConditions}) THEN 4 ELSE 0 END
      ) AS score
    FROM knowledge_chunks kc
    JOIN knowledge_base       kb ON kb.id = kc.knowledge_id
    LEFT JOIN knowledge_structured ks ON ks.knowledge_id = kb.id
    WHERE (${likeConditions})
       OR (${titleConditions})
       OR (ks.fertilizer_name IS NOT NULL AND (${nameConditions}))
    ORDER BY score DESC, kc.chunk_index ASC
    LIMIT ?
  `;

  // Paramètres : likeConditions×4 groups + titleConditions×2 groups + nameConditions×1 group + limit
  const params = [
    ...likeParams,  // title score
    ...likeParams,  // content score
    ...likeParams,  // name score
    ...likeParams,  // crop score
    ...likeParams,  // WHERE content
    ...likeParams,  // WHERE title
    ...likeParams,  // WHERE name
    limit,
  ];

  try {
    const rows = await turso.all(sql, params) as any[];
    return rows.map(r => ({ ...r, score: Number(r.score) || 0 }));
  } catch (err) {
    console.error('[RAG] Turso search error:', err);
    return [];
  }
}

// ─── CONSTRUCTION DU CONTEXTE ────────────────────────────────
// Transforme les chunks RAG en texte contexte pour le LLM

function buildContext(chunks: RAGChunk[]): string {
  if (chunks.length === 0) return '';

  const seen = new Set<string>();
  const parts: string[] = [];

  for (const chunk of chunks) {
    const key = chunk.title;
    const isNew = !seen.has(key);
    seen.add(key);

    let part = '';

    // En-tête de la source (une seule fois par article)
    if (isNew) {
      part += `\n### ${chunk.title}`;
      if (chunk.fertilizer_name && chunk.fertilizer_name !== chunk.title) {
        part += ` (${chunk.fertilizer_name})`;
      }
      if (chunk.region) part += ` — ${chunk.region}`;
      if (chunk.npk_ratio && chunk.npk_ratio !== 'inconnu') {
        part += `\nNPK: ${chunk.npk_ratio}`;
      }
      part += '\n';
    }

    // Contenu du chunk
    part += chunk.chunk_content + '\n';

    // Étapes structurées (une seule fois par article)
    if (isNew && chunk.steps) {
      try {
        const steps = JSON.parse(chunk.steps) as string[];
        if (steps.length > 0) {
          part += '\nÉtapes: ' + steps.slice(0, 5).join(' | ') + '\n';
        }
      } catch { /* ignore */ }
    }

    // Conseils (une seule fois par article)
    if (isNew && chunk.tips) {
      try {
        const tips = JSON.parse(chunk.tips) as string[];
        if (tips.length > 0) {
          part += 'Conseils: ' + tips.slice(0, 3).join(' | ') + '\n';
        }
      } catch { /* ignore */ }
    }

    parts.push(part);

    // Limiter la taille du contexte (~3000 tokens max)
    if (parts.join('').length > 5000) break;
  }

  return parts.join('\n---\n').substring(0, 6000);
}

// ─── APPEL GROQ ──────────────────────────────────────────────

async function callGroq(
  question: string,
  context: string,
  history: ChatMessage[] = [],
  language: string = 'fr',
): Promise<{ answer: string; tokens: number }> {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY manquant dans les variables d\'environnement');
  }

  const systemPrompt = `Tu es FEZA, l'assistant IA spécialiste en agriculture durable et élevage à Madagascar et en Afrique tropicale.

Tu es développé par Fertili'zeo — la première plateforme agricole numérique malgache.

Tes domaines d'expertise :
- Fertilisation biologique (compost, fumier, bokashi, biofertilisants, engrais verts)
- Pisciculture (étang, cage flottante, aquaponie, tilapia, silure)
- Apiculture (ruche KTB, miel, propolis, cire, pollinisation)
- Cultures tropicales (riz, maïs, manioc, cacao, café, légumes, cultures sahéliennes)
- Santé des sols et diagnostic des carences

Régions couvertes : Madagascar, Afrique de l'Est, Afrique de l'Ouest, Sahel, Afrique Centrale.

${context ? `KNOWLEDGE BASE — données techniques vérifiées :\n${context}\n` : ''}

RÈGLES ABSOLUES :
1. Utilise les données de la knowledge base en priorité. Si l'info y est, cite-la précisément (doses, durées, NPK).
2. Si la knowledge base ne couvre pas entièrement la question, complète avec tes connaissances agronomiques — mais signale-le.
3. Réponds TOUJOURS en ${language === 'mg' ? 'malagasy' : 'français'} sauf si l'utilisateur écrit dans une autre langue.
4. Sois précis et technique : doses en kg/m² ou t/ha, densités en poissons/m³, durées précises.
5. Structure ta réponse : commence par une réponse directe, puis les étapes ou détails si demandé.
6. Si tu ne sais pas, dis-le clairement plutôt que d'inventer.
7. Pour les questions hors agriculture/élevage/pisciculture/apiculture, redirige poliment vers le sujet.`;

  const messages: ChatMessage[] = [
    ...history.slice(-6), // Max 3 échanges d'historique
    { role: 'user', content: question },
  ];

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      max_tokens: 1500,
      temperature: 0.4,
      stream: false,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq API error ${response.status}: ${err.substring(0, 100)}`);
  }

  const data = await response.json() as any;
  return {
    answer: data.choices?.[0]?.message?.content || 'Désolé, je n\'ai pas pu générer une réponse.',
    tokens: data.usage?.total_tokens || 0,
  };
}

// ─── EXTRAIRE STRUCTURE DEPUIS RÉPONSE ───────────────────────
// Si la réponse contient des étapes/conseils, les extraire proprement

function extractStructured(answer: string, chunks: RAGChunk[]): AIResponse['structured'] {
  const topChunk = chunks[0];
  if (!topChunk) return null;

  try {
    return {
      fertilizer_name: topChunk.fertilizer_name || undefined,
      steps: topChunk.steps ? JSON.parse(topChunk.steps) : undefined,
      tips: topChunk.tips ? JSON.parse(topChunk.tips) : undefined,
      npk_ratio: topChunk.npk_ratio || undefined,
    };
  } catch {
    return null;
  }
}

// ─── LOG USAGE (pour analytics API vendable) ─────────────────

async function logApiUsage(params: {
  api_key_id?: string;
  user_id?: number;
  question: string;
  tokens: number;
  source: 'chat' | 'api';
}) {
  // Stocker dans Turso pour tracking usage des clients API
  try {
    await turso.run(
      `INSERT INTO collection_log (id, source, query, status, items)
       VALUES (?, ?, ?, ?, ?)`,
      [
        crypto.randomUUID(),
        params.source,
        params.question.substring(0, 200),
        'success',
        params.tokens,
      ]
    );
  } catch { /* Non bloquant */ }
}

// =============================================================
// ENDPOINT 1 — /api/ai/chat (JWT requis, usage interne)
// =============================================================

export const chat = async (req: any, res: Response) => {
  const { question, history = [], language = 'fr' } = req.body;

  if (!question?.trim()) {
    return res.status(400).json({ message: 'La question est requise.' });
  }

  if (question.length > 500) {
    return res.status(400).json({ message: 'Question trop longue (max 500 caractères).' });
  }

  try {
    // 1. Recherche RAG
    const chunks = await searchKnowledgeBase(question, 6);
    const context = buildContext(chunks);

    // 2. Appel Groq
    const { answer, tokens } = await callGroq(question, context, history, language);

    // 3. Logger l'usage
    await logApiUsage({
      user_id: req.user?.id,
      question,
      tokens,
      source: 'chat',
    });

    // 4. Réponse
    const aiResponse: AIResponse = {
      answer,
      sources: [...new Map(chunks.map(c => [c.title, {
        title: c.title,
        category: c.category,
        source: c.source,
      }])).values()].slice(0, 3),
      structured: extractStructured(answer, chunks),
      tokens_used: tokens,
      kb_chunks_used: chunks.length,
    };

    res.json(aiResponse);
  } catch (err: any) {
    console.error('[AI Chat]', err);
    if (err.message?.includes('GROQ_API_KEY')) {
      return res.status(503).json({ message: 'Service IA temporairement indisponible.' });
    }
    res.status(500).json({ message: 'Erreur lors de la génération de la réponse.' });
  }
};

// =============================================================
// ENDPOINT 2 — /api/ai/query (API key, usage externe/vendable)
// =============================================================

export const query = async (req: Request, res: Response) => {
  const { question, language = 'fr', context_filter } = req.body;
  const apiKeyData = (req as any).apiKeyData;

  if (!question?.trim()) {
    return res.status(400).json({ error: 'question is required' });
  }

  if (question.length > 1000) {
    return res.status(400).json({ error: 'question too long (max 1000 chars)' });
  }

  try {
    // Recherche RAG (plus large pour API externe)
    const chunks = await searchKnowledgeBase(question, 8);
    const context = buildContext(chunks);

    const { answer, tokens } = await callGroq(question, context, [], language);

    await logApiUsage({
      api_key_id: apiKeyData?.key_id,
      question,
      tokens,
      source: 'api',
    });

    // Réponse API publique — format plus lisible pour intégration tierce
    res.json({
      answer,
      language,
      sources: [...new Map(chunks.map(c => [c.title, {
        title: c.title,
        category: c.category,
        npk_ratio: c.npk_ratio,
        region: c.region,
      }])).values()].slice(0, 4),
      metadata: {
        model: GROQ_MODEL,
        kb_chunks_found: chunks.length,
        tokens_used: tokens,
        powered_by: 'Fertili\'zeo AI',
      },
    });
  } catch (err: any) {
    console.error('[AI Query]', err);
    res.status(500).json({ error: 'AI generation failed', details: err.message });
  }
};

// =============================================================
// ENDPOINT 3 — /api/ai/kb/stats (admin seulement)
// =============================================================

export const kbStats = async (req: any, res: Response) => {
  try {
    const [total, byCategory, bySrc, recentLogs] = await Promise.all([
      turso.get('SELECT COUNT(*) as total FROM knowledge_base'),
      turso.all('SELECT category, COUNT(*) as n FROM knowledge_base GROUP BY category ORDER BY n DESC'),
      turso.all('SELECT source, COUNT(*) as n FROM knowledge_base GROUP BY source ORDER BY n DESC'),
      turso.all('SELECT source, query, status, items, created_at FROM collection_log ORDER BY created_at DESC LIMIT 10'),
    ]);

    res.json({
      knowledge_base: {
        total_articles: (total as any)?.total || 0,
        by_category: byCategory,
        by_source: bySrc,
      },
      recent_activity: recentLogs,
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur récupération stats KB.' });
  }
};

// =============================================================
// ENDPOINT 4 — /api/ai/kb/search (admin — debug RAG)
// =============================================================

export const kbSearch = async (req: any, res: Response) => {
  const { q, limit = 5 } = req.query;

  if (!q) return res.status(400).json({ message: 'Paramètre q requis.' });

  try {
    const chunks = await searchKnowledgeBase(String(q), Number(limit));
    res.json({
      query: q,
      results: chunks.map(c => ({
        title: c.title,
        category: c.category,
        source: c.source,
        score: c.score,
        preview: c.chunk_content.substring(0, 150) + '...',
        fertilizer_name: c.fertilizer_name,
        npk_ratio: c.npk_ratio,
        region: c.region,
      })),
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur recherche KB.' });
  }
};
