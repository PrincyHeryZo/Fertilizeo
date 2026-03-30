-- ============================================================
-- FERTILI'ZEO — Knowledge Base Schema (Turso / SQLite)
-- Base de données IA spécialisée engrais biologiques
-- À exécuter dans Turso Shell : turso db shell <nom-db>
-- ============================================================

-- Table principale : articles de connaissance
CREATE TABLE IF NOT EXISTS knowledge_base (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    slug        TEXT UNIQUE NOT NULL,
    category    TEXT NOT NULL,   -- 'compost' | 'fumier' | 'bokashi' | 'biofertilisant' | 'engrais_vert' | 'nutriment' | 'technique' | 'culture' | 'pisciculture' | 'apiculture'
    source      TEXT NOT NULL,   -- 'wikipedia' | 'manual' | 'fao' | 'blog'
    language    TEXT DEFAULT 'fr',
    content_raw TEXT NOT NULL,   -- texte brut original
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table des chunks (morceaux pour RAG)
-- Chaque article est découpé en chunks de ~400 mots pour la recherche
CREATE TABLE IF NOT EXISTS knowledge_chunks (
    id           TEXT PRIMARY KEY,
    knowledge_id TEXT NOT NULL REFERENCES knowledge_base(id) ON DELETE CASCADE,
    chunk_index  INTEGER NOT NULL,
    content      TEXT NOT NULL,   -- le texte du chunk (400 mots max)
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table des fiches structurées (enrichies par Gemini)
CREATE TABLE IF NOT EXISTS knowledge_structured (
    id              TEXT PRIMARY KEY,
    knowledge_id    TEXT NOT NULL REFERENCES knowledge_base(id) ON DELETE CASCADE,
    fertilizer_name TEXT NOT NULL,
    category        TEXT,
    ingredients     TEXT,  -- JSON array: ["fumier bovin", "paille", "eau"]
    steps           TEXT,  -- JSON array: ["Étape 1...", "Étape 2..."]
    tips            TEXT,  -- JSON array: ["Conseil 1...", "Conseil 2..."]
    mistakes        TEXT,  -- JSON array: ["Erreur à éviter..."]
    duration        TEXT,  -- "2-3 mois"
    npk_ratio       TEXT,  -- "N:2 P:1 K:1.5" si connu
    best_for_crops  TEXT,  -- JSON array: ["riz", "maïs", "légumes"]
    climate         TEXT,  -- "tropical" | "tempéré" | "aride" | "tous"
    region          TEXT,  -- "Madagascar" | "Afrique" | "Global"
    difficulty      TEXT,  -- "facile" | "moyen" | "avancé"
    cost            TEXT,  -- "faible" | "moyen" | "élevé"
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table de logs de collecte (pour savoir ce qui a déjà été collecté)
CREATE TABLE IF NOT EXISTS collection_log (
    id         TEXT PRIMARY KEY,
    source     TEXT NOT NULL,
    query      TEXT NOT NULL,
    status     TEXT DEFAULT 'success',  -- 'success' | 'failed' | 'skipped'
    items      INTEGER DEFAULT 0,
    error      TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_chunks_knowledge ON knowledge_chunks(knowledge_id);
CREATE INDEX IF NOT EXISTS idx_chunks_content   ON knowledge_chunks(content);
CREATE INDEX IF NOT EXISTS idx_kb_category      ON knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_kb_source        ON knowledge_base(source);
CREATE INDEX IF NOT EXISTS idx_struct_category  ON knowledge_structured(category);
CREATE INDEX IF NOT EXISTS idx_struct_crops     ON knowledge_structured(best_for_crops);
CREATE INDEX IF NOT EXISTS idx_struct_region    ON knowledge_structured(region);

-- Vue utile pour récupérer tout en une query (utilisée par le RAG)
CREATE VIEW IF NOT EXISTS knowledge_full AS
SELECT
    kb.id,
    kb.title,
    kb.category,
    kb.source,
    kb.language,
    kc.chunk_index,
    kc.content      AS chunk_content,
    kc.id           AS chunk_id,
    ks.fertilizer_name,
    ks.steps,
    ks.tips,
    ks.mistakes,
    ks.duration,
    ks.npk_ratio,
    ks.best_for_crops,
    ks.climate,
    ks.region,
    ks.difficulty
FROM knowledge_base kb
JOIN knowledge_chunks kc ON kc.knowledge_id = kb.id
LEFT JOIN knowledge_structured ks ON ks.knowledge_id = kb.id;
