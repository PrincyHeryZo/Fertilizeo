/**
 * backend/controllers/aiController.ts
 * ============================================================
 * Cœur du RAG — IA spécialiste fertilisation bio Fertili'zeo
 * Phase 4 : Refonte complète — qualité réponses + guard contextuel
 * ============================================================
 */

import { Request, Response } from 'express';
import { turso } from '../../database/turso';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL   = 'llama-3.3-70b-versatile';

// Seuil minimum de score RAG pour considérer un chunk comme pertinent
const MIN_CHUNK_SCORE = 5;

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
    _npk_relevant?: boolean;
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
    'hanao', 'atao', 'izany', 'ilay',
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

  if (/[àâäéèêëîïôùûü]/.test(t)) frScore += 2;
  if (mgScore >= 2) return 'mg';
  if (frScore >= 1) return 'fr';

  const enWords = ['how', 'what', 'where', 'when', 'why', 'which', 'the', 'and', 'for'];
  let enScore = 0;
  for (const word of words) {
    if (enWords.includes(word)) enScore++;
  }
  if (enScore >= 1) return 'en';

  return 'fr';
}

// ─── GUARD SUJET ─────────────────────────────────────────────
// Phase 4 : prend en compte l'historique de conversation pour
// autoriser les questions de suivi contextuelles

const TOPIC_KEYWORDS: Record<string, string[]> = {
  fr: [
    'engrais', 'compost', 'fumier', 'bokashi', 'vermicompost', 'lombricompost',
    'fertilisant', 'fertilisation', 'biofertilisant', 'biostimulant',
    'sol', 'terre', 'argile', 'humus', 'ph', 'acidite', 'carence',
    'npk', 'azote', 'phosphore', 'potassium', 'calcium', 'magnesium',
    'plante', 'culture', 'semence', 'graine', 'semis', 'recolte', 'rendement',
    'riz', 'mais', 'manioc', 'haricot', 'tomate', 'legume', 'fruit',
    'cacao', 'cafe', 'vanille', 'girofle', 'poivre',
    'irrigation', 'drainage', 'mulch', 'paillage', 'rotation',
    'pisciculture', 'poisson', 'tilapia', 'etang', 'aquaponie', 'cage',
    'apiculture', 'abeille', 'ruche', 'miel', 'propolis', 'cire', 'pollinisation',
    'reine', 'gelee', 'royale', 'essaim', 'couvain', 'hausse',
    'pesticide', 'insecticide', 'fongicide', 'ravageur', 'maladie',
    'agriculture', 'agriculteur', 'ferme', 'champ', 'parcelle',
    'sahel', 'tropical', 'africain', 'madagascar',
    'nourrir', 'nourriture', 'alimentation', 'aliment', 'manger',
    'elever', 'elevage', 'reproduction', 'croissance',
    'riziere', 'aquaculture', 'silure', 'carpe', 'truite', 'alevin',
    'recette', 'fabriquer', 'construire', 'preparer', 'installer',
    'dose', 'quantite', 'frequence', 'temperature', 'oxygene',
  ],
  mg: [
    'zezika', 'komposita', 'fambolena', 'voly', 'tany', 'vary', 'katsaka',
    'mangahazo', 'voatabia', 'legioma', 'vokatra', 'famafazana',
    'trondro', 'fiompiana', 'etangy', 'tantely', 'tanteli', 'fafana',
    'ahitra', 'zavamaniry', 'hazo', 'rano', 'aina', 'biby',
    'akoho', 'omby', 'kisoa', 'amboa', 'vorona',
    'fanafody', 'aretin', 'valala',
    'fifamanor', 'fofifa', 'cirad', 'antsirabe',
    'sakafo', 'hanina', 'mihinana', 'miompy',
  ],
  en: [
    'fertilizer', 'fertiliser', 'compost', 'manure', 'bokashi', 'soil',
    'crop', 'plant', 'seed', 'harvest', 'yield', 'farm', 'field',
    'rice', 'maize', 'corn', 'cassava', 'bean', 'vegetable', 'fruit',
    'cocoa', 'coffee', 'organic', 'nitrogen', 'phosphorus', 'potassium',
    'fish', 'tilapia', 'pond', 'aquaculture', 'aquaponics',
    'bee', 'honey', 'hive', 'apiculture', 'pollination', 'queen', 'royal',
    'irrigation', 'drainage', 'mulch', 'rotation', 'pest', 'disease',
    'agriculture', 'tropical', 'africa', 'madagascar',
    'feed', 'feeding', 'food', 'eat', 'nutrition', 'grow', 'breed',
  ],
};

const OFF_TOPIC_REPLIES: Record<string, string> = {
  fr: "Je suis FEZA, spécialiste en agriculture biologique, pisciculture et apiculture. Je ne peux pas répondre à cette question. Posez-moi une question sur les engrais, le compost, les cultures tropicales, la pisciculture ou l'apiculture !",
  mg: "FEZA aho, manam-pahaizana momba ny fambolena sy fiompiana. Tsy afaka mamaly an'io fanontaniana io aho. Manontania ahy momba ny zezika, komposita, trondro na tantely !",
  en: "I am FEZA, specialist in organic farming, aquaculture and beekeeping. I cannot answer this question. Ask me about fertilizers, compost, tropical crops, fish or bees!",
};

function isOnTopic(
    question: string,
    language: 'mg' | 'fr' | 'en',
    history: ChatMessage[] = [],
): boolean {
  const normalize = (s: string) =>
      s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const q = normalize(question);
  const keywords = [
    ...(TOPIC_KEYWORDS[language] || []),
    ...(TOPIC_KEYWORDS['fr'] || []),
  ];

  // 1. La question contient un mot-clé agricole
  if (keywords.some(kw => q.includes(kw))) return true;

  // 2. Question courte de suivi (<= 8 mots) + historique récent on-topic
  const wordCount = question.trim().split(/\s+/).length;
  if (wordCount <= 8 && history.length >= 2) {
    const recentContext = history
        .slice(-4)
        .map(m => normalize(m.content))
        .join(' ');
    if (keywords.some(kw => recentContext.includes(kw))) return true;
  }

  return false;
}

// ─── PERTINENCE NPK ──────────────────────────────────────────
// Détermine si la question porte sur un engrais/fertilisant
// pour conditionner l'affichage du badge NPK dans le frontend

export function isNPKRelevant(question: string, history: ChatMessage[] = []): boolean {
  const combined = question + ' ' + history.slice(-2).map(m => m.content).join(' ');
  return (
      /engrais|fumier|compost|bokashi|npk|fertilisant|zezika|komposita|fertilizer|manure/i.test(combined) ||
      /carence|azote|phosphore|potassium|nitrogen|phosphorus/i.test(combined) ||
      /nourrir.*(sol|plante|culture)|améliorer.*(sol|terre)/i.test(combined)
  );
}

// ─── PROMPTS PAR LANGUE ──────────────────────────────────────
// Phase 4 : anti-hallucination stricte, réponses directes,
// interdiction d'inventer des NPK, élimination des formules répétitives

function getSystemPrompt(language: 'mg' | 'fr' | 'en', context: string): string {
  const expertise = `Domaines d'expertise :
- Fertilisation biologique (compost, fumier, bokashi, biofertilisants, engrais verts)
- Pisciculture (étang, cage flottante, aquaponie, tilapia, silure, carpe)
- Apiculture (ruche KTB, reine, gelée royale, miel, propolis, cire, pollinisation)
- Cultures tropicales (riz/vary, maïs, manioc, cacao, café, légumes)
- Santé des sols et diagnostic des carences
Régions : Madagascar, Afrique de l'Est, Afrique de l'Ouest, Sahel.`;

  const kb = context
      ? `\nKNOWLEDGE BASE — données techniques vérifiées :\n${context}\n`
      : `\nKNOWLEDGE BASE : aucune donnée trouvée pour cette question.\n`;

  if (language === 'mg') {
    return `Ianao dia FEZA, mpanampy IA manam-pahaizana momba ny fambolena maharitra sy ny fiompiana any Madagasikara.
Noforonina ianao nataon'i Fertili'zeo.
${expertise}
${kb}
FITSIPIKA LEHIBE — TSILAZAO :
1. Ampiasao FOANA ny angona ao amin'ny knowledge base raha misy. Lazao mazava tsara ny doses, fotoana, NPK raha hita.
2. Valio FOANA amin'ny MALAGASY mahazatra sy mazava. Azo ampiasaina ny teny teknika frantsay (compost, NPK, pH...).
3. FOHY : 3-5 andalana. AZA manao "Tokony mamaly... Tokony manorona..." matetika — fomba fiteny tsy voajanahary io.
4. Raha misy etape maro, ampiasao laharan-isa (1. 2. 3.). Raha tsy misy etape, aza manao lisitra.
5. NPK : AZA MAMORONA isa NPK raha tsy hita amin'ny knowledge base. Lazao hoe "tsy fantatra" raha tsy misy.
6. Valio mivantana ny fanontaniana — aza manomboka amin'ny famaritana lava.`;
  }

  if (language === 'en') {
    return `You are FEZA, an AI specialist in sustainable agriculture and farming in Madagascar and tropical Africa.
Developed by Fertili'zeo.
${expertise}
${kb}
ABSOLUTE RULES :
1. Use knowledge base data FIRST. If found, cite precisely (doses, durations, NPK).
2. Always respond in ENGLISH.
3. Be DIRECT : answer immediately in 2-4 sentences. Use numbered lists ONLY for step-by-step procedures.
4. NPK : ONLY report NPK if it appears explicitly in the knowledge base. NEVER invent NPK values.
5. If the knowledge base has no data, say clearly "I don't have specific data on this" then give general advice.
6. Never repeat the same sentence structure multiple times.`;
  }

  return `Tu es FEZA, l'assistant IA spécialiste en agriculture durable et élevage à Madagascar et en Afrique tropicale.
Développé par Fertili'zeo — la première plateforme agricole numérique malgache.
${expertise}
${kb}
RÈGLES ABSOLUES — NE JAMAIS ENFREINDRE :
1. Utilise les données de la knowledge base EN PRIORITÉ. Si l'info y est, cite-la précisément (doses, durées, NPK).
2. Réponds TOUJOURS en FRANÇAIS clair, accessible à un agriculteur.
3. SOIS DIRECT : commence par la réponse, pas par une introduction générale. 2-4 phrases pour une question simple.
4. Utilise des listes numérotées UNIQUEMENT pour des procédures étape par étape. Sinon, écris en prose.
5. NPK : ne cite un ratio NPK QUE s'il figure dans la knowledge base. N'invente JAMAIS de valeurs NPK.
6. Si la knowledge base est vide sur le sujet, dis "Je n'ai pas de données précises sur ce point" puis donne un conseil général honnête.
7. N'utilise JAMAIS deux fois la même structure de phrase dans ta réponse.`;
}

// ─── DÉTECTION DE CATÉGORIE ───────────────────────────────────

function detectCategory(text: string): string | null {
  const q = text.toLowerCase();
  if (/tilapia|poisson|étang|aquapon|piscicult|trondro|fiompi|silure|carpe|truite|alevin/.test(q)) return 'pisciculture';
  if (/abeille|ruche|miel|apicult|propolis|cire|tantely|pollinisa|reine|gelée|essaim|couvain/.test(q)) return 'apiculture';
  if (/compost|vermicompost|lombri|bokashi/.test(q)) return 'compost';
  if (/fumier|fiente|zezika|urine|guano|lisier/.test(q)) return 'fumier';
  if (/engrais.?vert|couverture|mucuna|crotalaria|légumineuse/.test(q)) return 'engrais_vert';
  if (/biofertili|biostimul|rhizobium|mycorhiz|purin/.test(q)) return 'biofertilisant';
  if (/bokashi|ferment/.test(q)) return 'bokashi';
  return null;
}

// ─── MOTS LIÉS À MADAGASCAR ───────────────────────────────────

const MADAGASCAR_WORDS = new Set([
  'madagascar', 'malgache', 'malagasy', 'gasy', 'vary', 'omby', 'akoho',
  'antsirabe', 'tana', 'antananarivo', 'toamasina', 'tamatave', 'mahajanga',
  'fianarantsoa', 'toliara', 'antsiranana', 'diego', 'vakinankaratra',
  'fifamanor', 'fofifa', 'cirad', 'hautes terres', 'tanety', 'bas-fond',
  'mangahazo', 'katsaka', 'voatabia', 'trondro', 'tantely',
]);

function isMadagascarQuestion(question: string): boolean {
  const q = question.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return [...MADAGASCAR_WORDS].some(w => q.includes(w));
}

// ─── RECHERCHE RAG ─────────────────────────────────────────
// Phase 4 : enrichit la recherche avec le contexte historique
// pour les questions de suivi courtes

// Cache léger en mémoire pour éviter de refaire la même requête RAG
// dans une même session. TTL = 60 secondes.
const ragCache = new Map<string, { chunks: RAGChunk[]; ts: number }>();
const RAG_CACHE_TTL = 60_000;

function ragCacheKey(q: string, lang: string): string {
  return `${lang}:${q.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().substring(0, 80)}`;
}

async function searchKnowledgeBase(
    question: string,
    limit = 5,
    language: 'mg' | 'fr' | 'en' = 'fr',
    history: ChatMessage[] = [],
): Promise<RAGChunk[]> {
  const stopWords = new Set([
    'comment', 'faire', 'pour', 'avec', 'dans', 'quoi', 'quel', 'quelle',
    'est', 'une', 'les', 'des', 'que', 'qui', 'sur', 'par', 'pas', 'plus', 'aussi',
    'the', 'how', 'what', 'which', 'this', 'that', 'are', 'can', 'for', 'and',
    'aho', 'ianao', 'izy', 'isika', 'izahay', 'hoe', 'mba', 'efa',
    'mbola', 'koa', 'anefa', 'saingy', 'satria', 'ny', 'sy', 'ho',
    'exactement', 'donne', 'dites', 'expliquez', 'quels', 'sont',
    'il', 'elle', 'ils', 'elles', 'moi', 'toi', 'lui',
  ]);

  const wordCount = question.trim().split(/\s+/).length;
  let searchText = question;
  if (wordCount <= 6 && history.length >= 2) {
    const recentContext = history.slice(-2).map(m => m.content).join(' ');
    searchText = `${question} ${recentContext}`.substring(0, 300);
  }

  const normalize = (s: string) =>
      s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ');

  const keywords = normalize(searchText)
      .split(/\s+/)
      .filter(w => w.length > 3 && !stopWords.has(w))
      .slice(0, 6);

  if (keywords.length === 0) keywords.push(normalize(question).substring(0, 20));

  // Cache hit check
  const cacheKey = ragCacheKey(keywords.join(' '), language);
  const cached = ragCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < RAG_CACHE_TTL) {
    return cached.chunks.slice(0, limit);
  }

  const isMadagascar = isMadagascarQuestion(question) || language === 'mg';
  const targetCategory =
      detectCategory(question) ||
      (history.length > 0 ? detectCategory(history.slice(-2).map(m => m.content).join(' ')) : null);

  const primaryKeyword = keywords[0];

  // Phase 1 SQL : pre-filtre sur mot-cle principal uniquement (3 params au lieu de 56)
  const preFilterSql = `
    SELECT
      kc.id          AS chunk_id,
      kb.title,
      kb.category,
      kb.source,
      kb.language    AS kb_language,
      kc.content     AS chunk_content,
      kc.chunk_index,
      ks.fertilizer_name,
      ks.steps,
      ks.tips,
      ks.npk_ratio,
      ks.region,
      ks.best_for_crops
    FROM knowledge_chunks kc
    JOIN knowledge_base kb ON kb.id = kc.knowledge_id
    LEFT JOIN knowledge_structured ks ON ks.knowledge_id = kb.id
    WHERE
      LOWER(kc.content)                         LIKE ?
      OR LOWER(kb.title)                        LIKE ?
      OR LOWER(COALESCE(ks.fertilizer_name,'')) LIKE ?
      ${targetCategory ? `OR kb.category = '${targetCategory}'` : ''}
      ${isMadagascar ? "OR LOWER(COALESCE(ks.region,'')) LIKE '%madagascar%'" : ''}
    ORDER BY kc.chunk_index ASC
    LIMIT 60
  `;

  const p = `%${primaryKeyword}%`;

  try {
    const rows = await turso.all(preFilterSql, [p, p, p]) as any[];
    if (rows.length === 0) return [];

    // Phase 2 JS : scoring complet en memoire sur ~60 candidats
    const normQ = normalize(searchText);

    const scored: RAGChunk[] = rows.map((r: any) => {
      const title   = normalize(r.title || '');
      const content = normalize(r.chunk_content || '');
      const fname   = normalize(r.fertilizer_name || '');
      const crops   = normalize(r.best_for_crops || '');
      const region  = normalize(r.region || '');

      let score = 0;

      keywords.forEach((kw, idx) => {
        const weight = Math.max(0.4, 1 - idx * 0.1);
        if (title.includes(kw))   score += 12 * weight;
        if (fname.includes(kw))   score +=  9 * weight;
        if (content.includes(kw)) score +=  5 * weight;
        if (crops.includes(kw))   score +=  4 * weight;
      });

      if (isMadagascar && region.includes('madagascar')) score += 6;
      if (targetCategory && r.category === targetCategory) score += 7;
      if (r.source === 'expert')      score += 4;
      if (r.source === 'dataset_npk') score += 3;
      if (language === 'mg' && r.kb_language === 'mg') score += 8;
      if (r.chunk_index === 0) score += 2;
      if (r.chunk_index > 3)  score -= 1;

      return { ...r, score };
    });

    // Dedupliquer : meilleur chunk par article
    const bestByArticle = new Map<string, RAGChunk>();
    for (const row of scored) {
      const existing = bestByArticle.get(row.title);
      if (!existing || row.score > existing.score) {
        bestByArticle.set(row.title, row);
      }
    }

    const results = Array.from(bestByArticle.values())
        .filter(r => r.score >= MIN_CHUNK_SCORE)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

    ragCache.set(cacheKey, { chunks: results, ts: Date.now() });
    if (ragCache.size > 200) {
      const oldest = [...ragCache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0];
      ragCache.delete(oldest[0]);
    }

    return results;
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
  let totalLength = 0;
  const MAX_CONTEXT = 3000;

  for (const chunk of chunks) {
    if (totalLength >= MAX_CONTEXT) break;

    const key = chunk.title;
    const isNew = !seen.has(key);
    seen.add(key);

    let part = '';

    if (isNew) {
      part += `\n### ${chunk.title}`;
      if (chunk.region) part += ` [${chunk.region}]`;
      if (chunk.npk_ratio && chunk.npk_ratio !== 'inconnu') {
        part += ` | NPK: ${chunk.npk_ratio}`;
      }
      part += '\n';
    }

    part += chunk.chunk_content.substring(0, 400) + '\n';

    if (isNew && chunk.steps) {
      try {
        const steps = JSON.parse(chunk.steps) as string[];
        if (steps.length > 0) {
          part += 'Étapes : ' + steps.slice(0, 4).map(s => s.substring(0, 80)).join(' → ') + '\n';
        }
      } catch { /* ignore */ }
    }

    if (isNew && chunk.tips) {
      try {
        const tips = JSON.parse(chunk.tips) as string[];
        if (tips.length > 0) {
          part += 'Conseils : ' + tips.slice(0, 2).map(t => t.substring(0, 80)).join(' | ') + '\n';
        }
      } catch { /* ignore */ }
    }

    parts.push(part);
    totalLength += part.length;
  }

  return parts.join('\n---\n');
}

// ─── APPEL GROQ ──────────────────────────────────────────────

async function callGroq(
    question: string,
    context: string,
    history: ChatMessage[] = [],
    language: 'mg' | 'fr' | 'en' = 'fr',
): Promise<{ answer: string; tokens: number }> {
  if (!GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY manquant dans les variables d'environnement");
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
      max_tokens: 700,
      temperature: 0.25,
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
    answer: data.choices?.[0]?.message?.content || "Tsy afaka namaly aho. / Je n'ai pas pu répondre.",
    tokens: data.usage?.total_tokens || 0,
  };
}

// ─── EXTRAIRE STRUCTURE ───────────────────────────────────────
// Phase 4 : sélectionne le chunk structuré correspondant réellement
// à la question posée, et filtre les NPK invalides ("Non applicable",
// "inconnu", sans chiffres)

function extractStructured(
    answer: string,
    chunks: RAGChunk[],
    question: string,
    history: ChatMessage[] = [],
): AIResponse['structured'] {
  if (chunks.length === 0) return null;

  const normalize = (s: string) =>
      s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const q = normalize(question);
  const recentCtx = history.slice(-2).map(m => normalize(m.content)).join(' ');
  const searchCtx = q + ' ' + recentCtx;

  // Trouver le meilleur chunk correspondant à la question
  const bestChunk = chunks.find(c => {
    if (!c.fertilizer_name && !c.steps && !c.npk_ratio) return false;
    const name  = normalize(c.fertilizer_name || '');
    const title = normalize(c.title || '');
    const cat   = normalize(c.category || '');
    return (
        (name.length > 3 && searchCtx.includes(name)) ||
        (title.length > 3 && searchCtx.includes(title.substring(0, Math.min(title.length, 12)))) ||
        searchCtx.includes(cat)
    );
  }) || (chunks[0]?.steps || chunks[0]?.fertilizer_name ? chunks[0] : null);

  if (!bestChunk) return null;

  // Valider le NPK : doit contenir des chiffres et ne pas être "non applicable"
  const rawNpk = bestChunk.npk_ratio;
  const npkValid = !!(
      rawNpk &&
      rawNpk !== 'inconnu' &&
      !/non.?applic|n\/a/i.test(rawNpk) &&
      /\d/.test(rawNpk)
  );

  // Valider les steps : au moins 2, chacune > 10 chars
  let steps: string[] | undefined;
  if (bestChunk.steps) {
    try {
      const parsed = JSON.parse(bestChunk.steps) as string[];
      const filtered = parsed.filter(s => s?.trim().length > 10);
      if (filtered.length >= 2) steps = filtered;
    } catch { /* ignore */ }
  }

  // Valider les tips : au moins 1, > 10 chars
  let tips: string[] | undefined;
  if (bestChunk.tips) {
    try {
      const parsed = JSON.parse(bestChunk.tips) as string[];
      const filtered = parsed.filter(t => t?.trim().length > 10);
      if (filtered.length >= 1) tips = filtered;
    } catch { /* ignore */ }
  }

  // Si rien de valide → pas de structured
  if (!npkValid && !steps && !tips && !bestChunk.fertilizer_name) return null;

  return {
    fertilizer_name: bestChunk.fertilizer_name || undefined,
    steps,
    tips,
    npk_ratio: npkValid ? rawNpk! : undefined,
    _npk_relevant: isNPKRelevant(question, history),
  };
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

  const language: 'mg' | 'fr' | 'en' = forcedLang || detectLanguage(question);

  // Guard sujet — Phase 4 : contextuel
  if (!isOnTopic(question, language, history)) {
    return res.json({
      answer: OFF_TOPIC_REPLIES[language] || OFF_TOPIC_REPLIES['fr'],
      sources: [],
      structured: null,
      tokens_used: 0,
      kb_chunks_used: 0,
      detected_language: language,
      off_topic: true,
    });
  }

  try {
    const chunks = await searchKnowledgeBase(question, 5, language, history);
    const context = buildContext(chunks);
    const { answer, tokens } = await callGroq(question, context, history, language);

    await logApiUsage({
      user_id: req.user?.id,
      question,
      tokens,
      source: 'chat',
      language,
    });

    const structured = extractStructured(answer, chunks, question, history);

    const aiResponse: AIResponse = {
      answer,
      sources: Array.from(new Map(chunks.map(c => [c.title, {
        title: c.title,
        category: c.category,
        source: c.source,
      }])).values()).slice(0, 3),
      structured,
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
// ENDPOINT 2 — /api/ai/query (API key, usage externe)
// =============================================================

export const query = async (req: Request, res: Response) => {
  const { question, language: forcedLang } = req.body;
  const apiKeyData = (req as any).apiKeyData;

  if (!question?.trim()) {
    return res.status(400).json({ error: 'question is required' });
  }

  if (question.length > 1000) {
    return res.status(400).json({ error: 'question too long (max 1000 chars)' });
  }

  const language: 'mg' | 'fr' | 'en' = forcedLang || detectLanguage(question);

  if (!isOnTopic(question, language)) {
    return res.status(400).json({
      error: 'off_topic',
      message: OFF_TOPIC_REPLIES[language] || OFF_TOPIC_REPLIES['fr'],
    });
  }

  try {
    const chunks = await searchKnowledgeBase(question, 6, language);
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
        powered_by: "Fertili'zeo AI",
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