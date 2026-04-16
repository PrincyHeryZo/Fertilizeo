#!/usr/bin/env tsx
/**
 * scripts/test-ai-improvements.ts
 * Test des améliorations de l'IA FEZA après corrections RAG
 */

import { turso } from '../database/turso';

// Import des fonctions du contrôleur IA
import { 
  searchKnowledgeBase, 
  detectLanguage, 
  buildContext,
  isOnTopic 
} from '../backend/controllers/aiController';

interface TestQuestion {
  question: string;
  expectedCategory?: string;
  expectedLang: 'mg' | 'fr' | 'en';
}

const testQuestions: TestQuestion[] = [
  {
    question: "Ahoana ny fomba fambolena vary an tanety",
    expectedLang: 'mg',
    expectedCategory: 'culture'
  },
  {
    question: "Comment faire du compost avec du fumier de zébu",
    expectedLang: 'fr',
    expectedCategory: 'compost'
  },
  {
    question: "NPK du compost thermophile FIFAMANOR",
    expectedLang: 'fr',
    expectedCategory: 'compost'
  },
  {
    question: "trondro fiompiana etang",
    expectedLang: 'mg',
    expectedCategory: 'pisciculture'
  },
  {
    question: "tilapia cage flottante",
    expectedLang: 'fr',
    expectedCategory: 'pisciculture'
  },
  {
    question: "miel ruche kenyane",
    expectedLang: 'fr',
    expectedCategory: 'apiculture'
  },
  {
    question: "zezika komposita",
    expectedLang: 'mg',
    expectedCategory: 'fumier'
  }
];

async function runTests() {
  console.log('🧪 Test des améliorations IA FEZA\n');
  console.log(`📊 Paramètres actuels :`);
  console.log(`   - MIN_CHUNK_SCORE : 3 (abaissé de 5)`);
  console.log(`   - Limit chunks : 8 (augmenté de 5)`);
  console.log(`   - Prompts MG : simplifiés\n`);

  let totalTests = 0;
  let passedTests = 0;

  for (const test of testQuestions) {
    totalTests++;
    console.log(`🔍 Test ${totalTests}: "${test.question}"`);

    try {
      // 1. Détection langue
      const detectedLang = detectLanguage(test.question);
      const langOk = detectedLang === test.expectedLang;
      console.log(`   🌍 Langue: ${detectedLang} ${langOk ? '✅' : '❌ (attendu: ' + test.expectedLang + ')'}`);

      // 2. Vérification sujet
      const onTopic = isOnTopic(test.question, detectedLang);
      console.log(`   📌 Sujet: ${onTopic ? '✅ Pertinent' : '❌ Hors sujet'}`);

      // 3. Recherche RAG
      const chunks = await searchKnowledgeBase(test.question, 8, detectedLang);
      console.log(`   📚 Chunks trouvés: ${chunks.length}`);
      
      if (chunks.length > 0) {
        console.log(`   🏆 Meilleurs scores: ${chunks.slice(0, 3).map(c => `${c.score} (${c.category})`).join(', ')}`);
        
        // 4. Vérification catégorie attendue
        if (test.expectedCategory) {
          const hasExpectedCategory = chunks.some(c => c.category === test.expectedCategory);
          console.log(`   📂 Catégorie attendue: ${hasExpectedCategory ? '✅' : '❌'} (${test.expectedCategory})`);
        }

        // 5. Construction contexte
        const context = buildContext(chunks);
        console.log(`   📝 Contexte généré: ${context.length} caractères`);
        
        if (context.length > 100) {
          console.log(`   ✅ Contexte suffisant pour génération IA`);
          passedTests++;
        } else {
          console.log(`   ❌ Contexte trop court pour réponse de qualité`);
        }
      } else {
        console.log(`   ❌ Aucun chunk trouvé - problème RAG`);
      }

    } catch (error) {
      console.log(`   ❌ Erreur: ${error}`);
    }

    console.log('');
  }

  console.log(`📈 Résultats: ${passedTests}/${totalTests} tests réussis (${Math.round(passedTests/totalTests*100)}%)`);
  
  if (passedTests >= totalTests * 0.8) {
    console.log(`✅ Les améliorations sont significatives !`);
  } else {
    console.log(`⚠️  Nécessite encore des ajustements`);
  }
}

runTests().catch(console.error);
