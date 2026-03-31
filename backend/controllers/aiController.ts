/**
 * backend/controllers/aiController.ts
 * ============================================================
 * Cœur du RAG — IA spécialiste fertilisation bio Fertili'zeo
 * Phase 2 : Support malagasy + détection automatique langue
 * ============================================================
 */

import { Request, Response } from 'express';
import { turso } from '../../database/turso';

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
  detected_language: string;
}

// ─── DÉTECTION DE LANGUE ─────────────────────────────────────

export function detectLanguage(text: string): 'mg' | 'fr' | 'en' {
  const t = text.toLowerCase();

  const malagasyWords = [
    'ahoana', 'inona', 'iza', 'oviana', 'aiza', 'firy', 'maninona',
    'eny', 'tsia', 'azafady', 'misaotra', 'manao', 'hoe', 'mba', 'efa',
    'mbola', 'tena', 'tokoa', 'koa', 'anefa', 'saingy', 'satria',
    'vary', 'omby', 'akoho', 'kisoa', 'tanimbary', 'fambolena',
    'zezika', 'ahitra', 'hazo', 'rano', 'tany', 'vokatra',
    'fanafody', 'fiompiana', 'trondro', 'tantely', 'fafana',
    'komposita', 'zavamaniry', 'voly', 'amidy', 'vidiny',
    'hanao', 'ahoana', 'inona', 'atao', 'izany', 'ilay',
    'ny', 'sy', 'ho', 'aho', 'ianao', 'izy', 'isika',
  ];

  const frenchWords = [
    'comment', 'faire', 'pour', 'avec', 'dans', 'quoi', 'quel',
    'est', 'les', 'des', 'que', 'qui', 'sur', 'par', 'pas',
    'compost', 'engrais', 'fumier', 'culture', 'plante', 'sol',
    'pourquoi', 'quelle', 'combien', 'mais', 'donc', 'alors',
  ];

  const words = t.split(/\s+/);
  let mgScore = 0;
  let frScore = 0;

  for (const word of words) {
    if (malagasyWords.includes(word)) mgScore += 2;
    if (frenchWords.includes(word)) frScore += 1;
  }

  // Accents français
  if (/[àâäéèêëîïôùûü]/.test(t)) frScore += 2;

  if (mgScore >= 2) return 'mg';
  if (frScore >= 1) return 'fr';

  // Détecter anglais par mots clés basiques
  const enWords = ['how', 'what', 'where', 'when', 'why', 'which', 'the', 'and', 'for'];
  let enScore = 0;
  for (const word of words) {
    if (enWords.includes(word)) enScore++;
  }
  if (enScore >= 1) return 'en';

  return 'fr'; // Défaut : français
}

// ─── PROMPTS PAR LANGUE ──────────────────────────────────────

function getSystemPrompt(language: 'mg' | 'fr' | 'en', context: string): string {
  const expertise = `
Tes domaines d'expertise :
- Fertilisation biologique (compost, fumier, bokashi, biofertilisants, engrais verts)
- Pisciculture (étang, cage flottante, aquaponie, tilapia, silure)
- Apiculture (ruche KTB, miel, propolis, cire, pollinisation)
- Cultures tropicales (riz/vary, maïs, manioc, cacao, café, légumes)
- Santé des sols et diagnostic des carences
Régions : Madagascar, Afrique de l'Est, Afrique de l'Ouest, Sahel.`;

  const kb = context ? `\nKNOWLEDGE BASE — données techniques vérifiées :\n${context}\n` : '';

  if (language === 'mg') {
    return `Ianao dia FEZA, mpanampy IA manam-pahaizana momba ny fambolena maharitra sy ny fiompiana any Madagasikara sy Afrika tropikaly.
Noforonina ianao nataon'i Fertili'zeo — ny sehatra voalohany momba ny fambolena nomerika any Madagasikara.
${expertise}
${kb}
FITSIPIKA LEHIBE :
1. Ampiasao ny angona ao amin'ny knowledge base aloha. Raha hita ao ny vaovao, lazao mazava tsara (doses, fotoana, NPK).
2. Valio FOANA amin'ny MALAGASY satria ny fanontaniana dia an'ny malagasy.
3. Azo atao ny mampiasa teny frantsay ho an'ny teny teknika (compost, NPK, pH, etc.) saingy ny teny hafa dia malagasy.
4. Mazava sy teknika : doses amin'ny kg/m² na t/ha, fotoana marina.
5. Raha tsy fantatrao, lazao mazava fa tsy fantatra.
6. Ny fanontaniana tsy mifandray amin'ny fambolena : avereno amin'ny lohahevitra.`;
  }

  if (language === 'en') {
    return `You are FEZA, an AI specialist in sustainable agriculture and farming in Madagascar and tropical Africa.
Developed by Fertili'zeo — Madagascar's first digital agricultural platform.
${expertise}
${kb}
ABSOLUTE RULES:
1. Use knowledge base data first. If the info is there, cite it precisely (doses, durations, NPK).
2. Always respond in ENGLISH since the question is in English.
3. Be precise and technical: doses in kg/m² or t/ha, exact durations.
4. Structure your answer: direct response first, then steps or details if asked.
5. If you don't know, say so clearly rather than inventing.
6. For non-agriculture questions, politely redirect to the topic.`;
  }

  // Français (défaut)
  return `Tu es FEZA, l'assistant IA spécialiste en agriculture durable et élevage à Madagascar et en Afrique tropicale.
Développé par Fertili'zeo — la première plateforme agricole numérique malgache.
${expertise}
${kb}
RÈGLES ABSOLUES :
1. Utilise les données de la knowledge base en priorité. Si l'info y est, cite-la précisément (doses, durées, NPK).
2. Réponds TOUJOURS en FRANÇAIS puisque la question est en français.
3. Sois précis et technique : doses en kg/m² ou t/ha, durées précises.
4. Structure ta réponse : commence par une réponse directe, puis les étapes ou détails si demandé.
5. Si tu ne sais pas, dis-le clairement plutôt que d'inventer.
6. Pour les questions hors agriculture/élevage/pisciculture/apiculture, redirige poliment.`;
}

// ─── RECHERCHE RAG DANS TURSO ────────────────────────────────

async function searchKnowledgeBase(question: string, limit = 6): Promise<RAGChunk[]> {
  const stopWords = new Set([
    // Français
    'comment', 'faire', 'pour', 'avec', 'dans', 'quoi', 'quel', 'quelle',
    'est', 'une', 'les', 'des', 'que', 'qui', 'sur', 'par', 'pas', 'plus', 'aussi',
    // Anglais
    'the', 'how', 'what', 'which', 'this', 'that', 'are', 'can', 'for', 'and',
    // Malagasy
    'aho', 'ianao', 'izy', 'isika', 'izahay', 'hoe', 'mba', 'efa',
    'mbola', 'koa', 'anefa', 'saingy', 'satria', 'ny', 'sy', 'ho',
  ]);

  const keywords = question
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3 && !stopWords.has(w));

  if (keywords.length === 0) keywords.push(question.substring(0, 20).toLowerCase());

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

  const params = [
    ...likeParams, ...likeParams, ...likeParams, ...likeParams,
    ...likeParams, ...likeParams, ...likeParams,
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

function buildContext(chunks: RAGChunk[]): string {
  if (chunks.length === 0) return '';

  const seen = new Set<string>();
  const parts: string[] = [];

  for (const chunk of chunks) {
    const key = chunk.title;
    const isNew = !seen.has(key);
    seen.add(key);

    let part = '';

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

    part += chunk.chunk_content + '\n';

    if (isNew && chunk.steps) {
      try {
        const steps = JSON.parse(chunk.steps) as string[];
        if (steps.length > 0) {
          part += '\nÉtapes: ' + steps.slice(0, 5).join(' | ') + '\n';
        }
      } catch { /* ignore */ }
    }

    if (isNew && chunk.tips) {
      try {
        const tips = JSON.parse(chunk.tips) as string[];
        if (tips.length > 0) {
          part += 'Conseils: ' + tips.slice(0, 3).join(' | ') + '\n';
        }
      } catch { /* ignore */ }
    }

    parts.push(part);
    if (parts.join('').length > 5000) break;
  }

  return parts.join('\n---\n').substring(0, 6000);
}

// ─── APPEL GROQ ──────────────────────────────────────────────

async function callGroq(
    question: string,
    context: string,
    history: ChatMessage[] = [],
    language: 'mg' | 'fr' | 'en' = 'fr',
): Promise<{ answer: string; tokens: number }> {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY manquant dans les variables d\'environnement');
  }

  const systemPrompt = getSystemPrompt(language, context);

  const messages: ChatMessage[] = [
    ...history.slice(-6),
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
    answer: data.choices?.[0]?.message?.content || 'Tsy afaka namaly aho. / Je n\'ai pas pu répondre.',
    tokens: data.usage?.total_tokens || 0,
  };
}

// ─── EXTRAIRE STRUCTURE ───────────────────────────────────────

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

// ─── LOG USAGE ───────────────────────────────────────────────

async function logApiUsage(params: {
  api_key_id?: string;
  user_id?: number;
  question: string;
  tokens: number;
  source: 'chat' | 'api';
  language?: string;
}) {
  try {
    await turso.run(
        `INSERT INTO collection_log (id, source, query, status, items)
         VALUES (?, ?, ?, ?, ?)`,
        [
          crypto.randomUUID(),
          params.source,
          `[${params.language?.toUpperCase() || 'FR'}] ${params.question.substring(0, 190)}`,
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
  const { question, history = [], language: forcedLang } = req.body;

  if (!question?.trim()) {
    return res.status(400).json({ message: 'La question est requise.' });
  }

  if (question.length > 500) {
    return res.status(400).json({ message: 'Question trop longue (max 500 caractères).' });
  }

  // Détecter la langue automatiquement (ou utiliser celle forcée par l'UI)
  const language: 'mg' | 'fr' | 'en' = forcedLang || detectLanguage(question);

  try {
    const chunks = await searchKnowledgeBase(question, 6);
    const context = buildContext(chunks);
    const { answer, tokens } = await callGroq(question, context, history, language);

    await logApiUsage({
      user_id: req.user?.id,
      question,
      tokens,
      source: 'chat',
      language,
    });

    const aiResponse: AIResponse = {
      answer,
      sources: Array.from(new Map(chunks.map(c => [c.title, {
        title: c.title,
        category: c.category,
        source: c.source,
      }])).values()).slice(0, 3),
      structured: extractStructured(answer, chunks),
      tokens_used: tokens,
      kb_chunks_used: chunks.length,
      detected_language: language,
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
  const { question, language: forcedLang, context_filter } = req.body;
  const apiKeyData = (req as any).apiKeyData;

  if (!question?.trim()) {
    return res.status(400).json({ error: 'question is required' });
  }

  if (question.length > 1000) {
    return res.status(400).json({ error: 'question too long (max 1000 chars)' });
  }

  const language: 'mg' | 'fr' | 'en' = forcedLang || detectLanguage(question);

  try {
    const chunks = await searchKnowledgeBase(question, 8);
    const context = buildContext(chunks);
    const { answer, tokens } = await callGroq(question, context, [], language);

    await logApiUsage({
      api_key_id: apiKeyData?.key_id,
      question,
      tokens,
      source: 'api',
      language,
    });

    res.json({
      answer,
      language,
      sources: Array.from(new Map(chunks.map(c => [c.title, {
        title: c.title,
        category: c.category,
        npk_ratio: c.npk_ratio,
        region: c.region,
      }])).values()).slice(0, 4),
      metadata: {
        model: GROQ_MODEL,
        kb_chunks_found: chunks.length,
        tokens_used: tokens,
        detected_language: language,
        powered_by: 'Fertili\'zeo AI',
      },
    });
  } catch (err: any) {
    console.error('[AI Query]', err);
    res.status(500).json({ error: 'AI generation failed', details: err.message });
  }
};

// =============================================================
// ENDPOINT 3 — /api/ai/kb/stats (admin)
// =============================================================

export const kbStats = async (req: any, res: Response) => {
  try {
    const [total, byCategory, bySrc, recentLogs] = await Promise.all([
      turso.get('SELECT COUNT(*) as total FROM knowledge_base'),
      turso.all('SELECT category, COUNT(*) as n FROM knowledge_base GROUP BY category ORDER BY n DESC'),
      turso.all('SELECT source, COUNT(*) as n FROM knowledge_base GROUP BY source ORDER BY n DESC'),
      turso.all('SELECT source, query, status, items, created_at FROM collection_log ORDER BY created_at DESC LIMIT 20'),
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
      detected_language: detectLanguage(String(q)),
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