#!/usr/bin/env tsx
/**
 * scripts/check-kb.ts
 * Vérification rapide de l'état de la Knowledge Base Turso
 */

import { turso } from '../database/turso';

async function checkKnowledgeBase() {
  try {
    console.log('🔍 Vérification de la Knowledge Base Turso...\n');

    // 1. Nombre total d'articles
    const total = await turso.get('SELECT COUNT(*) as total FROM knowledge_base');
    console.log(`📚 Total articles: ${total.total}`);

    // 2. Répartition par catégorie
    const byCat = await turso.all('SELECT category, COUNT(*) as n FROM knowledge_base GROUP BY category ORDER BY n DESC');
    console.log('\n📂 Articles par catégorie:');
    byCat.forEach((row: any) => {
      console.log(`   ${row.category}: ${row.n} articles`);
    });

    // 3. Répartition par langue
    const byLang = await turso.all('SELECT language, COUNT(*) as n FROM knowledge_base GROUP BY language ORDER BY n DESC');
    console.log('\n🌍 Articles par langue:');
    byLang.forEach((row: any) => {
      console.log(`   ${row.language}: ${row.n} articles`);
    });

    // 4. Nombre de chunks
    const chunks = await turso.get('SELECT COUNT(*) as total FROM knowledge_chunks');
    console.log(`\n🧩 Total chunks: ${chunks.total}`);

    // 5. Quelques exemples récents
    const recent = await turso.all(`
      SELECT title, category, language, source 
      FROM knowledge_base 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    console.log('\n📝 Articles récents:');
    recent.forEach((row: any) => {
      console.log(`   ${row.title} (${row.category}, ${row.language}, ${row.source})`);
    });

    // 6. Test recherche simple
    console.log('\n🔎 Test recherche "compost":');
    const testSearch = await turso.all(`
      SELECT kb.title, kb.category, kc.content 
      FROM knowledge_chunks kc
      JOIN knowledge_base kb ON kb.id = kc.knowledge_id
      WHERE LOWER(kc.content) LIKE '%compost%' OR LOWER(kb.title) LIKE '%compost%'
      LIMIT 3
    `);
    testSearch.forEach((row: any) => {
      console.log(`   ✓ ${row.title} - ${row.category}`);
    });

    console.log('\n✅ Vérification terminée');

  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error);
    process.exit(1);
  }
}

checkKnowledgeBase();
