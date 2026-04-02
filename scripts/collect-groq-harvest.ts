/**
 * scripts/collect-groq-harvest.ts
 * ============================================================
 * GROQ KNOWLEDGE HARVESTER — Fertili'zeo v3
 * ============================================================
 * Stratégie : Groq (Llama-3.3-70b) connaît les données INRA,
 * FAO, CIRAD, ICRISAT, FIFAMANOR tirées de publications réelles.
 * On l'interroge avec 300+ requêtes TRÈS SPÉCIFIQUES pour extraire
 * des fiches technique basées sur ces données réelles.
 *
 * Ce n'est PAS de la génération IA aléatoire :
 * - Chaque requête cite une source réelle précise
 * - On demande des chiffres mesurés (NPK, doses, durées)
 * - Le modèle extrait sa connaissance des corpus scientifiques
 *
 * Résultat attendu : 500-1500 nouvelles fiches en base
 *
 * Usage :
 *   npm run collect:groq             (tout, ~2-3h)
 *   npm run collect:groq -- --batch=compost
 *   npm run collect:groq -- --batch=madagascar
 *   npm run collect:groq -- --batch=pisciculture
 *   npm run collect:groq -- --batch=apiculture
 *   npm run collect:groq -- --batch=sahel
 *   npm run collect:groq -- --batch=cultures
 *   npm run collect:groq -- --dry-run
 *   npm run collect:groq -- --limit=50
 * ============================================================
 */

import { turso } from '../database/turso';
import * as dotenv from 'dotenv';
import { randomUUID } from 'crypto';

dotenv.config();

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL   = 'llama-3.3-70b-versatile';
const CHUNK_SIZE   = 350;
const DELAY_MS     = 2500; // 30 RPM = 1 req/2s minimum, 2.5s = marge sécurité
const DRY_RUN      = process.argv.includes('--dry-run');
const BATCH_FILTER = process.argv.find(a => a.startsWith('--batch='))?.split('=')[1];
const LIMIT        = parseInt(process.argv.find(a => a.startsWith('--limit='))?.split('=')[1] || '9999');

const C = {
  green:  (s: string) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  red:    (s: string) => `\x1b[31m${s}\x1b[0m`,
  bold:   (s: string) => `\x1b[1m${s}\x1b[0m`,
  dim:    (s: string) => `\x1b[2m${s}\x1b[0m`,
  cyan:   (s: string) => `\x1b[36m${s}\x1b[0m`,
};

// =============================================================
// CATALOGUE DE REQUÊTES — 300+ sujets agronomiques précis
// Chaque entrée = une fiche dans la base
// Source citée = guide Groq vers les vraies données
// =============================================================

interface HarvestQuery {
  batch: string;
  category: string;
  region: string;
  climate: string;
  subject: string;         // sujet précis
  source_hint: string;     // indice de source pour guider le modèle
  lang: 'fr' | 'mg';      // langue de la fiche
}

const HARVEST_QUERIES: HarvestQuery[] = [

  // ═══════════════════════════════════════════════════════════
  // BATCH: madagascar — fiches spécifiques Madagascar
  // ═══════════════════════════════════════════════════════════

  // Cultures vivrières
  { batch: 'madagascar', category: 'culture', region: 'Madagascar', climate: 'tropical altitude', lang: 'fr',
    subject: 'Fertilisation organique du riz irrigué (vary jeby) en rizière de bas-fonds — Lac Alaotra Madagascar',
    source_hint: 'données FOFIFA station Ambatondrazaka, MAEP Madagascar 2019, rendements, doses compost, fumier' },
  { batch: 'madagascar', category: 'culture', region: 'Madagascar', climate: 'tropical', lang: 'fr',
    subject: 'Riz pluvial (vary hitsaka) sur tanety — semis direct et fertilisation organique hautes terres',
    source_hint: 'CIRAD-Madagascar SCV, BVPI-SE/HP 2015, Mucuna pruriens, Stylosanthes' },
  { batch: 'madagascar', category: 'culture', region: 'Madagascar', climate: 'tropical altitude', lang: 'fr',
    subject: 'Pomme de terre biologique à Antsirabe — fertilisation, variétés, lutte contre le mildiou',
    source_hint: 'FIFAMANOR Antsirabe, variétés Spunta Desiree Kaurambe, données rendement 2020-2022' },
  { batch: 'madagascar', category: 'culture', region: 'Madagascar', climate: 'tropical', lang: 'fr',
    subject: 'Culture de la vanille à Madagascar (Sava) — fertilisation du vanillier et pollinisation',
    source_hint: 'CTHT Sambava, GIZ Madagascar, Vanilla planifolia, production SAVA Andapa' },
  { batch: 'madagascar', category: 'culture', region: 'Madagascar', climate: 'tropical', lang: 'fr',
    subject: 'Caféiculture biologique à Madagascar — café Robusta Boeny et café Highland Vakinankaratra',
    source_hint: 'CTHT Madagascar, FOFIFA, marché café bio export, Coffea canephora' },
  { batch: 'madagascar', category: 'culture', region: 'Madagascar', climate: 'tropical', lang: 'fr',
    subject: 'Culture du girofle à Madagascar — fertilisation organique et soins culturaux',
    source_hint: 'Syzygium aromaticum, Madagascar premier producteur mondial, CTHT' },
  { batch: 'madagascar', category: 'culture', region: 'Madagascar', climate: 'tropical', lang: 'fr',
    subject: 'Arachide (groundnut) biologique — Madagascar, Boeny et Menabe, rotation et fertilisation',
    source_hint: 'FOFIFA, Arachis hypogaea, inoculation Rhizobium, rotation avec maïs' },
  { batch: 'madagascar', category: 'culture', region: 'Madagascar', climate: 'tropical', lang: 'fr',
    subject: 'Haricot vert (tsaramaso) — cultures maraîchères hautes terres, export et fertilisation bio',
    source_hint: 'Phaseolus vulgaris, FIFAMANOR, marchés export Europe, zones Itasy Vakinankaratra' },
  { batch: 'madagascar', category: 'culture', region: 'Madagascar', climate: 'tropical', lang: 'fr',
    subject: 'Litchi de Madagascar — fertilisation organique des vergers litchi (Tamatave)',
    source_hint: 'Litchi chinensis, principal fruit exporté Madagascar, Toamasina, CTHT' },
  { batch: 'madagascar', category: 'culture', region: 'Madagascar', climate: 'tropical', lang: 'fr',
    subject: 'Culture du piment (sakay) à Madagascar — variétés locales, fertilisation et conservation',
    source_hint: 'Capsicum frutescens, sakay gasy, variétés locales Boeny Menabe' },
  { batch: 'madagascar', category: 'culture', region: 'Madagascar', climate: 'tropical', lang: 'fr',
    subject: 'Taro (saonjo) et igname (ovy) à Madagascar — fertilisation organique et pratiques culturales',
    source_hint: 'Colocasia esculenta, Dioscorea, cultures côte est, zones humides' },
  { batch: 'madagascar', category: 'culture', region: 'Madagascar', climate: 'tropical', lang: 'fr',
    subject: 'Morelle de Balbis (tsaramasoandro) et aubergine gasy — maraîchage biologique Madagascar',
    source_hint: 'Solanum aculeatissimum, légumes traditionnels malgaches, marchés locaux' },
  { batch: 'madagascar', category: 'culture', region: 'Madagascar', climate: 'tropical', lang: 'mg',
    subject: 'Fanazarana ny famokarana Voatabia amin\'ny fomba Organika — Vakinankaratra sy Itasy',
    source_hint: 'tomate biologique Madagascar, FOFIFA, FIFAMANOR, données rendement, maraîchage' },
  { batch: 'madagascar', category: 'culture', region: 'Madagascar', climate: 'tropical', lang: 'mg',
    subject: 'Aomby Madinika — Fambolena Patate Douce (Mangahazo Mena) ho an\'ny Mpamboly Kely',
    source_hint: 'Ipomoea batatas, patate douce Madagascar, côte est, hautes terres, FOFIFA' },

  // Sols et techniques Madagascar
  { batch: 'madagascar', category: 'technique', region: 'Madagascar', climate: 'tropical altitude', lang: 'fr',
    subject: 'Gestion de la fertilité des sols ferralitiques rouges des hautes terres malgaches',
    source_hint: 'IRD, FOFIFA, sols latéritiques Vakinankaratra, matière organique, pH acide 5.0-5.5' },
  { batch: 'madagascar', category: 'technique', region: 'Madagascar', climate: 'tropical', lang: 'fr',
    subject: 'Lutte antiérosive et SCV sur les tanety (collines) de Madagascar',
    source_hint: 'CIRAD AFD BVPI Madagascar, semis sous couverture végétale, tanety pente forte' },
  { batch: 'madagascar', category: 'technique', region: 'Madagascar', climate: 'tropical', lang: 'fr',
    subject: 'Riziculture de bas-fond et gestion de la fertilité — périmètres irrigués Madagascar',
    source_hint: 'MAEP, ARI stations rizicoles, bas-fonds aménagés, plaine de Marovoay Betsiboka' },
  { batch: 'madagascar', category: 'technique', region: 'Madagascar', climate: 'tropical', lang: 'fr',
    subject: 'Agroforesterie à Madagascar — association arbres fruitiers et cultures vivrières',
    source_hint: 'CIRAD, FOFIFA, World Agroforestry ICRAF, Moringa, Leucaena, Gliricidia Madagascar' },
  { batch: 'madagascar', category: 'technique', region: 'Madagascar', climate: 'tropical', lang: 'fr',
    subject: 'Compostage des déchets urbains à Antananarivo — programme municipal et fertilisation',
    source_hint: 'CUA Antananarivo, SAMVA, programme compostage déchets ménagers Tana' },
  { batch: 'madagascar', category: 'technique', region: 'Madagascar', climate: 'tropical', lang: 'mg',
    subject: 'Fomba Fanajarana ny Tany amin\'ny Organic — Karazana Tany sy Fanitsiana (pH, texture)',
    source_hint: 'analyse sol Madagascar, FIFAMANOR, laboratoire analyse tany, pH correction' },

  // ═══════════════════════════════════════════════════════════
  // BATCH: compost — techniques de compostage détaillées
  // ═══════════════════════════════════════════════════════════

  { batch: 'compost', category: 'compost', region: 'Global', climate: 'tous', lang: 'fr',
    subject: 'Compostage de la jacinthe d\'eau (Eichhornia crassipes) — valorisation des plantes aquatiques envahissantes',
    source_hint: 'ITAB, CIRAD, jacinthe d\'eau Afrique, compostage, N=1.2%, K=2.8%' },
  { batch: 'compost', category: 'compost', region: 'Afrique tropicale', climate: 'tropical', lang: 'fr',
    subject: 'Compostage des résidus de banane — peaux, tiges, régimes — valeur fertilisante',
    source_hint: 'Musa spp., K=3.5% peaux banane, compostage résidus bananier, CIRAD' },
  { batch: 'compost', category: 'compost', region: 'Afrique tropicale', climate: 'tropical', lang: 'fr',
    subject: 'Compost de vinasse de canne à sucre — sous-produit sucrerie, amendement organique',
    source_hint: 'Saccharum officinarum, vinasse N=0.3-0.5%, K=1.5-2%, industries sucrières Afrique' },
  { batch: 'compost', category: 'compost', region: 'Madagascar', climate: 'tropical', lang: 'fr',
    subject: 'Compostage des feuilles de ravintsara et plantes médicinales malgaches — compost aromatique',
    source_hint: 'Cinnamomum camphora, plantes médicinales Madagascar, compostage, antimicrobien' },
  { batch: 'compost', category: 'compost', region: 'Global', climate: 'tous', lang: 'fr',
    subject: 'Compost à base de marc de café — caractéristiques et utilisation en horticulture',
    source_hint: 'spent coffee grounds, ITAB France, N=2.3%, pH=6.2, champignons, substrat' },
  { batch: 'compost', category: 'compost', region: 'Afrique tropicale', climate: 'tropical', lang: 'fr',
    subject: 'Compostage des résidus de palme à huile (Elaeis guineensis) — EFB et POME valorisation',
    source_hint: 'palm oil mill effluent, empty fruit bunch, N=1.5%, MPOB Malaisie, Afrique Centrale' },
  { batch: 'compost', category: 'compost', region: 'Global', climate: 'tous', lang: 'fr',
    subject: 'Compostage accéléré en 21 jours — méthode Berkeley (University of California)',
    source_hint: 'UC Berkeley, ratio C/N 30:1, retournement tous les 3 jours, température 55-65°C' },
  { batch: 'compost', category: 'compost', region: 'Afrique de l\'Ouest', climate: 'tropical', lang: 'fr',
    subject: 'Compostage des déchets de karité (Vitellaria paradoxa) — tourteaux et coques',
    source_hint: 'Burkina Faso, INERA, karité, sous-produits trituration, N=3.5%' },
  { batch: 'compost', category: 'compost', region: 'Global', climate: 'tous', lang: 'fr',
    subject: 'Compost de déchets de poisson — farine de poisson maison et valorisation pêcheries',
    source_hint: 'fish waste compost, N=6-8%, fish emulsion, FAO aquaculture by-products' },
  { batch: 'compost', category: 'compost', region: 'Madagascar', climate: 'tropical', lang: 'fr',
    subject: 'Compostage de la jacinthe d\'eau du lac Itasy — programme de valorisation locale',
    source_hint: 'lac Itasy Madagascar, Eichhornia crassipes, programme ONG, compost paysan' },
  { batch: 'compost', category: 'compost', region: 'Global', climate: 'tous', lang: 'fr',
    subject: 'Thé de compost aéré (ACT) — préparation, équipement artisanal et application',
    source_hint: 'Elaine Ingham, compost tea, 10^8 bactéries/mL, aération 24-48h, SFI' },
  { batch: 'compost', category: 'compost', region: 'Sahel', climate: 'semi-aride', lang: 'fr',
    subject: 'Compostage rapide en andain au Sahel — contraintes saison sèche et adaptations',
    source_hint: 'ICRISAT Niamey, compostage andain Sahel, humidification, couverts, Burkina Faso' },
  { batch: 'compost', category: 'compost', region: 'Afrique tropicale', climate: 'tropical', lang: 'fr',
    subject: 'Compostage des résidus de rizerie — balles de riz (balle de paddy) et son de riz',
    source_hint: 'rice hull, rice bran, silice, N=0.5%, silica, IRRI, compostage lent' },
  { batch: 'compost', category: 'compost', region: 'Global', climate: 'tous', lang: 'fr',
    subject: 'Lombriculture industrielle — production de vermicompost à grande échelle',
    source_hint: 'Eisenia fetida, Lumbricus rubellus, production 10t/mois, installations commerciales' },

  // ═══════════════════════════════════════════════════════════
  // BATCH: fumier — types de fumiers et applications
  // ═══════════════════════════════════════════════════════════

  { batch: 'fumier', category: 'fumier', region: 'Afrique tropicale', climate: 'tropical', lang: 'fr',
    subject: 'Fumier de dromadaire et chameau — composition et utilisation en zones arides',
    source_hint: 'Camelus dromedarius, N=1.2%, K=0.9%, zones arides Sahel, analyse INRA' },
  { batch: 'fumier', category: 'fumier', region: 'Madagascar', climate: 'tropical', lang: 'fr',
    subject: 'Guano de chauve-souris gasy — exploitation et utilisation dans les grottes malgaches',
    source_hint: 'Madagascar, grottes Ankarana, guano Pteropus, N=6%, P=8%, exploitation traditionnelle' },
  { batch: 'fumier', category: 'fumier', region: 'Global', climate: 'tous', lang: 'fr',
    subject: 'Lisier de porc — traitement, méthanisation et valeur fertilisante du digestat',
    source_hint: 'digestat biogaz, INRA, N=3-4% total, méthanisation Afrique, biodigesteur' },
  { batch: 'fumier', category: 'fumier', region: 'Afrique tropicale', climate: 'tropical', lang: 'fr',
    subject: 'Fientes de pintade et dindon — composition et utilisation agricole en Afrique',
    source_hint: 'Numida meleagris, Meleagris gallopavo, N=2.5%, Afrique Ouest, analyse INERA' },
  { batch: 'fumier', category: 'fumier', region: 'Global', climate: 'tous', lang: 'fr',
    subject: 'Gestion et stockage du fumier — pertes en azote, couverture, durée maximale',
    source_hint: 'INRA, émissions NH3, stockage fumier couvert, perte N 30-60%, ITAB' },
  { batch: 'fumier', category: 'fumier', region: 'Madagascar', climate: 'tropical', lang: 'fr',
    subject: 'Urine humaine (Uro-Agriculture) comme engrais azoté — résultats terrain Afrique',
    source_hint: 'human urine, N=4-7g/L, K=1-2g/L, Suède EcoSanRes, Stockholm Environment Institute' },
  { batch: 'fumier', category: 'fumier', region: 'Afrique de l\'Est', climate: 'tropical', lang: 'fr',
    subject: 'Fumier de chèvre et mouton Masaï — utilisation traditionnelle et quantification Kenya',
    source_hint: 'Maasai Kenya, manure goat sheep, ILRI Nairobi, N=1.2-1.8%, usage pastoral' },
  { batch: 'fumier', category: 'fumier', region: 'Global', climate: 'tous', lang: 'fr',
    subject: 'Biodigesteur et digestat — production de biogaz et engrais liquide en Afrique tropicale',
    source_hint: 'biodigester Africa, SNV, digestate NPK, CAMARTEC Tanzania, familial 4-8m³' },
  { batch: 'fumier', category: 'fumier', region: 'Afrique tropicale', climate: 'tropical', lang: 'fr',
    subject: 'Fumier de canard — composition et utilisation pour riziculture et pisciculture',
    source_hint: 'Anas platyrhynchos, N=1.6%, riziculture canard-riz, CIRAD, système intégré' },
  { batch: 'fumier', category: 'fumier', region: 'Global', climate: 'tous', lang: 'fr',
    subject: 'Compostage des boues de station d\'épuration (biosolides) — normes et utilisation agricole',
    source_hint: 'sewage sludge, biosolids, USEPA 503, métaux lourds, N=3-6%, EU directive' },
  { batch: 'fumier', category: 'fumier', region: 'Madagascar', climate: 'tropical', lang: 'mg',
    subject: 'Sinton\'omby sy Zezika Akoho — Fiharohana Tena Mety ho an\'ny Mpamboly Kely',
    source_hint: 'urine zébu + fientes akoho, FIFAMANOR, ratio optimal, doses, pratiques paysannes' },

  // ═══════════════════════════════════════════════════════════
  // BATCH: biofertilisant — biostimulants et préparations vivantes
  // ═══════════════════════════════════════════════════════════

  { batch: 'biofertilisant', category: 'biofertilisant', region: 'Global', climate: 'tous', lang: 'fr',
    subject: 'Azolla pinnata — fougère aquatique fixatrice d\'azote, culture et utilisation en riziculture',
    source_hint: 'Azolla-Anabaena, N=4-5%, riziculture Asie Afrique, IRRI, 30-50 kgN/ha/saison' },
  { batch: 'biofertilisant', category: 'biofertilisant', region: 'Global', climate: 'tous', lang: 'fr',
    subject: 'Rhizobium inoculants pour légumineuses — inoculation semences soja, niébé, arachide',
    source_hint: 'Bradyrhizobium japonicum, inoculants IITA, fixation N 100-300 kgN/ha, NIFTAL' },
  { batch: 'biofertilisant', category: 'biofertilisant', region: 'Global', climate: 'tous', lang: 'fr',
    subject: 'Mycorhizes arbusculaires (AM fungi) — inoculants et amélioration absorption du phosphore',
    source_hint: 'Glomus, Rhizophagus irregularis, AM fungi, P uptake, INRA, World Agroforestry' },
  { batch: 'biofertilisant', category: 'biofertilisant', region: 'Global', climate: 'tous', lang: 'fr',
    subject: 'Purin de consoude (comfrey) Bocking 14 — source de potassium et biostimulant',
    source_hint: 'Symphytum officinale Bocking 14, K=1.5-2.5%, Henry Doubleday Research, HDRA' },
  { batch: 'biofertilisant', category: 'biofertilisant', region: 'Afrique tropicale', climate: 'tropical', lang: 'fr',
    subject: 'Tithonia diversifolia comme biofertilisant — découpe-incorpore et doses recommandées',
    source_hint: 'Tithonia, N=3.5% K=4%, TSBF ICRAF Kenya, P uptake, Western Kenya trials 2018' },
  { batch: 'biofertilisant', category: 'biofertilisant', region: 'Global', climate: 'tous', lang: 'fr',
    subject: 'Algues marines comme biostimulant agricole — Ascophyllum nodosum et ses effets',
    source_hint: 'Ascophyllum nodosum, Ecklonia maxima, cytokines, gibbérellines, INRA, Algomar' },
  { batch: 'biofertilisant', category: 'biofertilisant', region: 'Madagascar', climate: 'tropical', lang: 'fr',
    subject: 'Moringa oleifera comme biofertilisant foliaire — préparation et doses (Madagascar)',
    source_hint: 'Moringa oleifera, feuilles N=4.5%, extrait foliaire, +20-35% rendement, Trees for Life' },
  { batch: 'biofertilisant', category: 'biofertilisant', region: 'Global', climate: 'tous', lang: 'fr',
    subject: 'PSB (Phosphate Solubilizing Bacteria) — bactéries solubilisatrices de phosphate',
    source_hint: 'Bacillus megaterium, Pseudomonas fluorescens, PSB inoculants, ICAR India, P availability' },
  { batch: 'biofertilisant', category: 'biofertilisant', region: 'Global', climate: 'tous', lang: 'fr',
    subject: 'PGPR (Plant Growth Promoting Rhizobacteria) — bactéries de rhizosphère promotrices de croissance',
    source_hint: 'Azospirillum brasilense, IAA production, PGPR sorghum maize, EMBRAPA, CIMMYT' },
  { batch: 'biofertilisant', category: 'biofertilisant', region: 'Afrique tropicale', climate: 'tropical', lang: 'fr',
    subject: 'Extrait de neem (Azadirachta indica) comme biofertilisant et biopesticide',
    source_hint: 'neem cake N=5%, neem oil, azadirachtine, TNAU India, Afrique Ouest usage' },
  { batch: 'biofertilisant', category: 'biofertilisant', region: 'Global', climate: 'tous', lang: 'fr',
    subject: 'KNF (Korean Natural Farming) — OHN, FAA, WCA, IMO préparations naturelles complètes',
    source_hint: 'Natural Farming Han-Kyu Cho, KNF inputs, IMO indigenous microorganisms, Hawaii trials' },
  { batch: 'biofertilisant', category: 'biofertilisant', region: 'Global', climate: 'tous', lang: 'fr',
    subject: 'Préparation biodynamique 500 (bouse de corne) — technique Rudolf Steiner et résultats',
    source_hint: 'biodynamie BD 500, Rudolf Steiner, bouse de corne, IBLA Luxembourg, Demeter certification' },
  { batch: 'biofertilisant', category: 'biofertilisant', region: 'Madagascar', climate: 'tropical', lang: 'mg',
    subject: 'Rano Komby Fermenté — Biostimulant Gasy Maimaimpoana (Lactobacillus naturels)',
    source_hint: 'riz fermenté, eau de riz, Lactobacillus, biostimulant, Natural Farming, FOFIFA' },
  { batch: 'biofertilisant', category: 'biofertilisant', region: 'Afrique de l\'Ouest', climate: 'tropical', lang: 'fr',
    subject: 'Purin de Tithonia (tournesol mexicain) — préparation et fertilisation maraîchère Afrique',
    source_hint: 'Tithonia diversifolia purin, K=4%, P-availability, AVRDC, Kenya Uganda Nigeria' },

  // ═══════════════════════════════════════════════════════════
  // BATCH: engrais_vert — plantes de couverture et SCV
  // ═══════════════════════════════════════════════════════════

  { batch: 'engrais_vert', category: 'engrais_vert', region: 'Global', climate: 'tous', lang: 'fr',
    subject: 'Crotalaria juncea (chanvre de Madras) — engrais vert anti-nématodes rapide',
    source_hint: 'Crotalaria juncea, N=3.5%, monocrotaline, nématode suppression, CIRAD, 60-90 jours' },
  { batch: 'engrais_vert', category: 'engrais_vert', region: 'Afrique tropicale', climate: 'tropical', lang: 'fr',
    subject: 'Lablab purpureus (pois antaque) — engrais vert polyvalent Afrique orientale',
    source_hint: 'Lablab purpureus, N=2.8%, fixation N 60-150 kgN/ha, ILRI, double usage' },
  { batch: 'engrais_vert', category: 'engrais_vert', region: 'Sahel', climate: 'semi-aride', lang: 'fr',
    subject: 'Cowpea (niébé) comme engrais vert en Afrique Sahélienne — rotation et fixation N',
    source_hint: 'Vigna unguiculata, N=2.8%, IITA Ibadan, 60-100 kgN/ha, Sahel rotation' },
  { batch: 'engrais_vert', category: 'engrais_vert', region: 'Global', climate: 'tropical', lang: 'fr',
    subject: 'Dolichos (Macrotyloma uniflorum) et Canavalia ensiformis (haricot sabre) — engrais verts résistants',
    source_hint: 'Canavalia ensiformis, horse bean, FAO tropical cover crops, N=2.5%, CIAT' },
  { batch: 'engrais_vert', category: 'engrais_vert', region: 'Afrique tropicale', climate: 'tropical', lang: 'fr',
    subject: 'Calliandra calothyrsus — haie vive fixatrice d\'azote et fourrage',
    source_hint: 'Calliandra, N=3.2%, ICRAF, CIFOR, 100-200 kgN/ha/an, Kenya, alley cropping' },
  { batch: 'engrais_vert', category: 'engrais_vert', region: 'Afrique tropicale', climate: 'tropical', lang: 'fr',
    subject: 'Leucaena leucocephala — système alley cropping pour fertilité du sol en Afrique',
    source_hint: 'Leucaena leucocephala, N=3.5%, IITA alley cropping, Nigeria Benin, 150-200 kgN/ha' },
  { batch: 'engrais_vert', category: 'engrais_vert', region: 'Afrique tropicale', climate: 'tropical', lang: 'fr',
    subject: 'Gliricidia sepium — arbre multipurpose pour fertilité sol et fourrage',
    source_hint: 'Gliricidia sepium, N=3.8%, ICRAF, Sri Lanka Central America, alley cropping, IITA' },
  { batch: 'engrais_vert', category: 'engrais_vert', region: 'Global', climate: 'tempéré', lang: 'fr',
    subject: 'Phacélie (Phacelia tanacetifolia) — engrais vert mellifère avant légumes',
    source_hint: 'Phacelia, N=1.5%, mellifère, ITAB France, avant-culture maraîchère, gel sensible' },
  { batch: 'engrais_vert', category: 'engrais_vert', region: 'Global', climate: 'tous', lang: 'fr',
    subject: 'Mélilot (Melilotus officinalis) — engrais vert bisannuel pour sols lourds',
    source_hint: 'Melilotus, N=2.5%, coumarine, amélioration structure sol, INRA' },
  { batch: 'engrais_vert', category: 'engrais_vert', region: 'Madagascar', climate: 'tropical', lang: 'fr',
    subject: 'Brachiaria ruziziensis — graminée de couverture en SCV Madagascar (CIRAD)',
    source_hint: 'Brachiaria ruziziensis, SCV Madagascar, CIRAD, biomasse 8-12 t MS/ha, anti-striga' },
  { batch: 'engrais_vert', category: 'engrais_vert', region: 'Afrique de l\'Ouest', climate: 'tropical', lang: 'fr',
    subject: 'Velvet bean (Mucuna pruriens) sur maïs — système maïs-Mucuna Afrique Centrale',
    source_hint: 'mucuna maize system, IITA, Bénin Ghana, 1-2 t/ha maize gain, N=120 kgN/ha' },
  { batch: 'engrais_vert', category: 'engrais_vert', region: 'Global', climate: 'tous', lang: 'fr',
    subject: 'Seigle (Secale cereale) et avoine (Avena sativa) en couverture hivernale',
    source_hint: 'winter cover crops, rye oats, USDA SARE, N immobilization, C/N 40-60' },

  // ═══════════════════════════════════════════════════════════
  // BATCH: pisciculture — techniques aquacoles Afrique
  // ═══════════════════════════════════════════════════════════

  { batch: 'pisciculture', category: 'pisciculture', region: 'Afrique tropicale', climate: 'tropical', lang: 'fr',
    subject: 'Production du tilapia du Nil (Oreochromis niloticus) en étang — guide technique complet',
    source_hint: 'FAO NACA, tilapia Nile production, feed FCR, 6 mois 300-500g, WorldFish Center' },
  { batch: 'pisciculture', category: 'pisciculture', region: 'Afrique tropicale', climate: 'tropical', lang: 'fr',
    subject: 'Élevage du silure africain (Clarias gariepinus) — techniques et alimentation',
    source_hint: 'Clarias gariepinus, catfish Africa, air breathing, FAO, NACA, Nigeria Ghana production' },
  { batch: 'pisciculture', category: 'pisciculture', region: 'Madagascar', climate: 'tropical', lang: 'fr',
    subject: 'Association riz-poisson (vary-trondro) en rizière irriguée à Madagascar',
    source_hint: 'rice-fish system Madagascar, CIRAD, FAO, FOFIFA, rendement riz-tilapia associés' },
  { batch: 'pisciculture', category: 'pisciculture', region: 'Madagascar', climate: 'tropical altitude', lang: 'fr',
    subject: 'Pisciculture en eaux froides — truite (Oncorhynchus mykiss) à Madagascar (hautes terres)',
    source_hint: 'truite arc-en-ciel Madagascar, Oncorhynchus mykiss, DRDR Fianarantsoa, eau froide 12-18°C' },
  { batch: 'pisciculture', category: 'pisciculture', region: 'Afrique de l\'Ouest', climate: 'tropical', lang: 'fr',
    subject: 'Crevetticulture en eau douce — macrobrachium rosenbergii en Afrique de l\'Ouest',
    source_hint: 'Macrobrachium rosenbergii, giant freshwater prawn, FAO, Côte d\'Ivoire Cameroun' },
  { batch: 'pisciculture', category: 'pisciculture', region: 'Afrique tropicale', climate: 'tropical', lang: 'fr',
    subject: 'Alimentation naturelle des poissons en étang — plancton, insectes, Azolla, termites',
    source_hint: 'natural fish food, Azolla, duckweed Lemna, termite harvest, FAO, ICLARM' },
  { batch: 'pisciculture', category: 'pisciculture', region: 'Afrique tropicale', climate: 'tropical', lang: 'fr',
    subject: 'Fabrication d\'aliments poissons locaux — son de riz + farine termites + légumineuses',
    source_hint: 'local fish feed, rice bran, termite flour 45% protein, CIRAD, least cost formulation' },
  { batch: 'pisciculture', category: 'pisciculture', region: 'Afrique tropicale', climate: 'tropical', lang: 'fr',
    subject: 'Hétérotis niloticus (bichir du Nil) — élevage en étang en Afrique Centrale',
    source_hint: 'Heterotis niloticus, Congo Basin, République Centrafricaine, FAO, élevage extensif' },
  { batch: 'pisciculture', category: 'pisciculture', region: 'Afrique de l\'Ouest', climate: 'tropical', lang: 'fr',
    subject: 'Lac Volta (Ghana) — pisciculture en cage flottante à grande échelle',
    source_hint: 'Lake Volta Ghana, cage culture, 80,000 t/an tilapia, Volta Lake, WorldFish' },
  { batch: 'pisciculture', category: 'pisciculture', region: 'Afrique tropicale', climate: 'tropical', lang: 'fr',
    subject: 'Pathologies des poissons en étang — prévention organique et traitement naturel',
    source_hint: 'fish diseases tropical ponds, Aeromonas, Trichodina, sel, chaux, FAO Prevention' },
  { batch: 'pisciculture', category: 'pisciculture', region: 'Global', climate: 'tous', lang: 'fr',
    subject: 'Aquaponie débutant — système raft (NFT) avec tilapia et laitue',
    source_hint: 'raft aquaponics, NFT system, tilapia lettuce, FAO 2014 aquaponics guide, University Virgin Islands' },
  { batch: 'pisciculture', category: 'pisciculture', region: 'Global', climate: 'tous', lang: 'fr',
    subject: 'Aquaponie media bed — substrat gravier ou argile expansée avec tilapia et légumes fruités',
    source_hint: 'media bed aquaponics, gravel, LECA, tilapia tomato cucumber, CABI, FAO guide 2014' },
  { batch: 'pisciculture', category: 'pisciculture', region: 'Madagascar', climate: 'tropical', lang: 'mg',
    subject: 'Trondro Gasy — Fomba Fianarana ny Filatsahan\'ny Etangy sy ny Habetsaham-bokatra',
    source_hint: 'fish pond productivity Madagascar, FIFAMANOR, DRDR, tilapia karapao gourami' },
  { batch: 'pisciculture', category: 'pisciculture', region: 'Afrique tropicale', climate: 'tropical', lang: 'fr',
    subject: 'Fumure des étangs avec Azolla — azote gratuit et phytoplancton naturel',
    source_hint: 'Azolla pond fertilization, N fixation, IRRI, FAO, phytoplankton bloom, tilapia yield' },

  // ═══════════════════════════════════════════════════════════
  // BATCH: apiculture — techniques apicoles Afrique
  // ═══════════════════════════════════════════════════════════

  { batch: 'apiculture', category: 'apiculture', region: 'Afrique tropicale', climate: 'tropical', lang: 'fr',
    subject: 'Apis mellifera scutellata — biologie, comportement d\'essaimage et gestion en Afrique',
    source_hint: 'African honey bee, Apis mellifera scutellata, USDA, swarming, defensive behavior' },
  { batch: 'apiculture', category: 'apiculture', region: 'Madagascar', climate: 'tropical', lang: 'fr',
    subject: 'Apis mellifera unicolor (tantely gasy) — abeille endémique Madagascar, biologie et protection',
    source_hint: 'Apis mellifera unicolor, Madagascar endemic bee, CNRE, MAPAR, protection biodiversité' },
  { batch: 'apiculture', category: 'apiculture', region: 'Afrique de l\'Est', climate: 'tropical', lang: 'fr',
    subject: 'Apiculture au Kenya — ruche kenyane, production et marchés du miel',
    source_hint: 'Kenya beekeeping, KARI, KTB hive, 100,000 tonnes honey production Kenya, export' },
  { batch: 'apiculture', category: 'apiculture', region: 'Afrique tropicale', climate: 'tropical', lang: 'fr',
    subject: 'Production de propolis en Afrique tropicale — collecte, qualité et marché',
    source_hint: 'propolis tropical Africa, flavonoids, antibacterial, APIMONDIA, price 30-80 USD/kg' },
  { batch: 'apiculture', category: 'apiculture', region: 'Afrique tropicale', climate: 'tropical', lang: 'fr',
    subject: 'Cire d\'abeille africaine — extraction, purification et valorisation artisanale',
    source_hint: 'beeswax Africa, Apis mellifera, 1kg wax per 6-8kg honey, UNCTAD, ITC, artisanal' },
  { batch: 'apiculture', category: 'apiculture', region: 'Afrique tropicale', climate: 'tropical', lang: 'fr',
    subject: 'Pollen d\'abeille tropical — collecte, valeur nutritive et marchés en Afrique',
    source_hint: 'bee pollen collection, proteins 20-35%, amino acids, FAO, market health products Africa' },
  { batch: 'apiculture', category: 'apiculture', region: 'Afrique tropicale', climate: 'tropical', lang: 'fr',
    subject: 'Pollinisation du café par les abeilles — augmentation rendement Éthiopie, Kenya',
    source_hint: 'coffee pollination Africa bees, +20-40% yield, Ethiopia Kenya Uganda, FAO 2018' },
  { batch: 'apiculture', category: 'apiculture', region: 'Afrique de l\'Ouest', climate: 'tropical', lang: 'fr',
    subject: 'Pollinisation du cacao par les abeilles et moucherons (midges) — Afrique Centrale',
    source_hint: 'cocoa pollination, Forcipomyia midges, Meliponini, CABI, Ghana Côte d\'Ivoire, +35%' },
  { batch: 'apiculture', category: 'apiculture', region: 'Global', climate: 'tous', lang: 'fr',
    subject: 'Varroa destructor — traitement biologique et chimique autorisé en apiculture bio',
    source_hint: 'Varroa destructor, oxalic acid, thymol, ApiGuard, EFSA, treatment organic beekeeping' },
  { batch: 'apiculture', category: 'apiculture', region: 'Afrique tropicale', climate: 'tropical', lang: 'fr',
    subject: 'Apiculture Meliponini — abeilles sans dard (abeilles melipones) d\'Afrique tropicale',
    source_hint: 'stingless bees Africa Meliponini, Meliponula, Dactylurina, Congo Basin, honey medicinal' },
  { batch: 'apiculture', category: 'apiculture', region: 'Madagascar', climate: 'tropical', lang: 'fr',
    subject: 'Miel de litchi de Madagascar — production saisonnière et qualité exceptionnelle',
    source_hint: 'lychee honey Madagascar, Litchi chinensis, seasonal November honey, quality export' },
  { batch: 'apiculture', category: 'apiculture', region: 'Madagascar', climate: 'tropical', lang: 'mg',
    subject: 'Tantely sy Fambolena — Fifandraisana amin\'ny Pollinisation sy ny Vokatra Tsara Kokoa',
    source_hint: 'pollinisation Madagascar, tantely gasy, litchi voatabia café, FIFAMANOR, impacts' },
  { batch: 'apiculture', category: 'apiculture', region: 'Afrique tropicale', climate: 'tropical', lang: 'fr',
    subject: 'Nourrissage d\'urgence des abeilles en période de disette — sucre et sirop maison',
    source_hint: 'bee emergency feeding, sugar syrup 1:1 2:1, fondant bees, disette florale, INRA ITSAP' },

  // ═══════════════════════════════════════════════════════════
  // BATCH: sahel — agriculture sahélienne et semi-aride
  // ═══════════════════════════════════════════════════════════

  { batch: 'sahel', category: 'technique', region: 'Sahel', climate: 'semi-aride', lang: 'fr',
    subject: 'Technique zaï — restauration des sols dégradés au Burkina Faso (Yacouba Sawadogo)',
    source_hint: 'zaï, Yacouba Sawadogo, Burkina Faso, ICRISAT, 1980s, +300% rendement sorgho, Nobel prix' },
  { batch: 'sahel', category: 'technique', region: 'Sahel', climate: 'semi-aride', lang: 'fr',
    subject: 'Demi-lunes et cordons pierreux — CES au Sahel (Conservation Eau et Sol)',
    source_hint: 'half-moons, stone bunds, CES Sahel, Wocat, FAO, Niger Burkina, ICRISAT, +40% yield' },
  { batch: 'sahel', category: 'technique', region: 'Sahel', climate: 'semi-aride', lang: 'fr',
    subject: 'FMNR (Farmer Managed Natural Regeneration) — régénération naturelle assistée Sahel',
    source_hint: 'FMNR, Tony Rinaudo, Niger, World Vision, ICRAF, +500% vegetation cover, carbon sequestration' },
  { batch: 'sahel', category: 'culture', region: 'Sahel', climate: 'semi-aride', lang: 'fr',
    subject: 'Sorgho (Sorghum bicolor) — fertilisation organique et variétés résistantes sécheresse',
    source_hint: 'sorghum Sahel, ICRISAT, ICSAT-IS, N=60-80 kgN/ha, organique, Burkina Mali Niger' },
  { batch: 'sahel', category: 'culture', region: 'Sahel', climate: 'semi-aride', lang: 'fr',
    subject: 'Mil pénicillaire (Pennisetum glaucum) — adaptation extrême sécheresse, fertilisation',
    source_hint: 'pearl millet, Pennisetum glaucum, ICRISAT, N=30-60 kgN/ha, Sahel organic management' },
  { batch: 'sahel', category: 'culture', region: 'Sahel', climate: 'semi-aride', lang: 'fr',
    subject: 'Arachide au Sahel — culture et amélioration de la fertilité des sols pauvres',
    source_hint: 'groundnut Sahel, Senegal peanut, ISRA, IITA, N fixation, inoculant, Peanut CRSP' },
  { batch: 'sahel', category: 'culture', region: 'Sahel', climate: 'semi-aride', lang: 'fr',
    subject: 'Gombo (Abelmoschus esculentus) — culture maraîchère de saison sèche au Sahel',
    source_hint: 'okra Sahel, Abelmoschus esculentus, N=50 kgN/ha, FAO, irrigation goutte à goutte' },
  { batch: 'sahel', category: 'biofertilisant', region: 'Sahel', climate: 'semi-aride', lang: 'fr',
    subject: 'Moringa oleifera au Sahel — arbre miracle, feuilles, graines et fertilisation',
    source_hint: 'Moringa Sahel, N=4.5%, drought tolerance, Trees for Life, ECHO, seed press, floculation eau' },
  { batch: 'sahel', category: 'technique', region: 'Sahel', climate: 'semi-aride', lang: 'fr',
    subject: 'Jardins maraîchers de contre-saison sahéliens — irrigation solaire et fertilisation',
    source_hint: 'oasis gardens Sahel, solar pump, FAO smallholder, female gardeners Niger Burkina Mali' },
  { batch: 'sahel', category: 'technique', region: 'Sahel', climate: 'semi-aride', lang: 'fr',
    subject: 'Parc agroforestier à Faidherbia albida (Acacia albida) — fertilisation naturelle mil',
    source_hint: 'Faidherbia albida, winter bare deciduous, N=60-100 kgN/ha, ICRAF, Sahel parkland' },
  { batch: 'sahel', category: 'technique', region: 'Afrique de l\'Ouest', climate: 'semi-aride', lang: 'fr',
    subject: 'Jachère améliorée avec légumineuses — transition vers agriculture permanente Sahel',
    source_hint: 'improved fallow, Tephrosia vogelii, IITA, N=100 kgN/ha, Zambia Malawi, ICRAF' },

  // ═══════════════════════════════════════════════════════════
  // BATCH: cultures — cultures spécifiques et gestion
  // ═══════════════════════════════════════════════════════════

  { batch: 'cultures', category: 'culture', region: 'Afrique de l\'Ouest', climate: 'tropical humide', lang: 'fr',
    subject: 'Bananier plantain (Musa paradisiaca) — fertilisation organique et rotation',
    source_hint: 'plantain banana, N=200 kgN/ha/an, Cameroun Ghana, IITA, K=250 kgK/ha, mulch' },
  { batch: 'cultures', category: 'culture', region: 'Afrique Centrale', climate: 'tropical humide', lang: 'fr',
    subject: 'Manioc (Manihot esculenta) en Afrique Centrale — fertilisation K et rotation',
    source_hint: 'cassava Central Africa, K deficiency, N=60 kgN/ha, IITA, CIAT, Congo DRC' },
  { batch: 'cultures', category: 'culture', region: 'Afrique de l\'Est', climate: 'tropical altitude', lang: 'fr',
    subject: 'Maïs sous arbres Faidherbia — parkland farming Malawi et Zambie',
    source_hint: 'Faidherbia maize Malawi Zambia, World Agroforestry ICRAF, +280% maize yield, baseline study' },
  { batch: 'cultures', category: 'culture', region: 'Global', climate: 'tropical', lang: 'fr',
    subject: 'Ananas (Ananas comosus) — fertilisation organique et mulch en culture tropical',
    source_hint: 'pineapple organic, Côte d\'Ivoire Ghana, CIRAD, N=100 kgN/ha, K=150 kgK/ha mulch paille' },
  { batch: 'cultures', category: 'culture', region: 'Afrique tropicale', climate: 'tropical', lang: 'fr',
    subject: 'Manguier (Mangifera indica) — fertilisation organique des vergers en Afrique',
    source_hint: 'mango Africa, N=100 kgN/tree/an, IITA, West Africa, compost application, dry season' },
  { batch: 'cultures', category: 'culture', region: 'Afrique tropicale', climate: 'tropical', lang: 'fr',
    subject: 'Papaye (Carica papaya) — fertilisation organique et production maraîchère Afrique',
    source_hint: 'papaya Africa, N=150 kgN/ha, IITA, vermicompost, potassium, Nigeria Ghana' },
  { batch: 'cultures', category: 'culture', region: 'Afrique de l\'Est', climate: 'tropical altitude', lang: 'fr',
    subject: 'Avocatier (Persea americana) — fertilisation organique en altitude, Kenya et Éthiopie',
    source_hint: 'avocado Kenya Ethiopia altitude, N=100 kgN/tree, Hass, compost 15kg/tree, KARI' },
  { batch: 'cultures', category: 'culture', region: 'Afrique de l\'Ouest', climate: 'tropical', lang: 'fr',
    subject: 'Noix de cajou (Anacardium occidentale) — agroforesterie et fertilisation au Burkina',
    source_hint: 'cashew Burkina Faso, Anacardium occidentale, CNRST, N=40 kgN/ha, agroforestry' },
  { batch: 'cultures', category: 'culture', region: 'Afrique tropicale', climate: 'tropical', lang: 'fr',
    subject: 'Coton biologique (Gossypium hirsutum) — Afrique de l\'Ouest, fertilisation et prix premium',
    source_hint: 'organic cotton West Africa, Mali, Burkina, Helvetas, N=60-80 kgN/ha, FLO' },
  { batch: 'cultures', category: 'culture', region: 'Afrique tropicale', climate: 'tropical', lang: 'fr',
    subject: 'Sésame (Sesamum indicum) — culture biologique et marchés export Afrique',
    source_hint: 'sesame Africa, N=30-40 kgN/ha, Ethiopia Sudan Nigeria, organic export, USAID' },
  { batch: 'cultures', category: 'culture', region: 'Global', climate: 'tous', lang: 'fr',
    subject: 'Tomate (Lycopersicon esculentum) — diagnostic maladies fongiques et traitement bio',
    source_hint: 'tomato diseases organic, Phytophthora, Botrytis, Alternaria, INRA, cuivre soufre neem' },
  { batch: 'cultures', category: 'culture', region: 'Afrique tropicale', climate: 'tropical', lang: 'fr',
    subject: 'Oignon (Allium cepa) — production en saison sèche Afrique Sahélienne, fertilisation',
    source_hint: 'onion Sahel, N=80-100 kgN/ha, K=80 kgK/ha, Galmi variety Niger, FAO, irrigation' },
  { batch: 'cultures', category: 'culture', region: 'Global', climate: 'tous', lang: 'fr',
    subject: 'Rotation des cultures en agriculture biologique tropicale — principes et calendriers',
    source_hint: 'crop rotation organic tropical, IFOAM, FAO, nematode control, N cycling, CIRAD' },
  { batch: 'cultures', category: 'culture', region: 'Afrique de l\'Est', climate: 'tropical', lang: 'fr',
    subject: 'Maraîchage biologique péri-urbain à Nairobi — fertilisation compost et marchés',
    source_hint: 'urban agriculture Nairobi, RUAF, peri-urban horticulture, compost, kales sukuma wiki' },
  { batch: 'cultures', category: 'culture', region: 'Afrique tropicale', climate: 'tropical', lang: 'fr',
    subject: 'Patate douce (Ipomoea batatas) — variétés à chair orange et fertilisation organique',
    source_hint: 'sweet potato Africa, OFSP orange flesh, CIP, HarvestPlus, N=60 kgN/ha, K=80 kgK/ha' },
  { batch: 'cultures', category: 'culture', region: 'Afrique tropicale', climate: 'tropical', lang: 'fr',
    subject: 'Igname (Dioscorea spp.) — culture en buttes, fertilisation organique Afrique de l\'Ouest',
    source_hint: 'yam Dioscorea West Africa, mounds, N=80 kgN/ha, K=100 kgK/ha, IITA Nigeria' },

  // ═══════════════════════════════════════════════════════════
  // BATCH: technique — techniques sol et eau avancées
  // ═══════════════════════════════════════════════════════════

  { batch: 'technique', category: 'technique', region: 'Global', climate: 'tous', lang: 'fr',
    subject: 'pH du sol — mesure, importance, et correction en agriculture biologique',
    source_hint: 'soil pH, lime dolomite, INRA, Cooperative Extension, optimal pH cultures, correction' },
  { batch: 'technique', category: 'technique', region: 'Global', climate: 'tous', lang: 'fr',
    subject: 'Analyse de sol complète — comment lire et interpréter les résultats NPK',
    source_hint: 'soil test interpretation, N P K, base saturation, CEC, Mehlich-3, USDA NRCS' },
  { batch: 'technique', category: 'technique', region: 'Global', climate: 'tropical', lang: 'fr',
    subject: 'Conservation du sol sous pluies tropicales — paillage, bandes, terrasses',
    source_hint: 'soil conservation tropical rain, mulching, contour bunds, FAO, WOCAT, erosion control' },
  { batch: 'technique', category: 'technique', region: 'Afrique tropicale', climate: 'tropical', lang: 'fr',
    subject: 'Irrigation au goutte-à-goutte artisanale en Afrique — systèmes low-cost et fertilisation',
    source_hint: 'drip irrigation Africa, IDES treadle pump, IDEI India, 5-15 USD/m², IDE, low-cost drip' },
  { batch: 'technique', category: 'technique', region: 'Global', climate: 'tous', lang: 'fr',
    subject: 'Fermentation lactique et BRF (Bois Raméal Fragmenté) — amendement sol forestier',
    source_hint: 'BRF ramial chipped wood, Québec Laval University, Gilles Lemieux, C/N ratio, fungal' },
  { batch: 'technique', category: 'technique', region: 'Global', climate: 'tous', lang: 'fr',
    subject: 'Test du bocal (jar test) et autres tests de terrain pour évaluer la santé du sol',
    source_hint: 'soil health field tests, jar test, USDA NRCS, infiltration test, earthworm count' },
  { batch: 'technique', category: 'technique', region: 'Afrique tropicale', climate: 'tropical', lang: 'fr',
    subject: 'Association culturale maïs-niébé-courge (Three Sisters Africaines)',
    source_hint: 'intercropping maize cowpea squash Africa, IITA, polyculture, yield advantage, LER > 1' },
  { batch: 'technique', category: 'technique', region: 'Afrique tropicale', climate: 'tropical', lang: 'fr',
    subject: 'Push-pull (Desmodium + Napier grass) — contrôle Striga et foreur maïs sans chimie',
    source_hint: 'push-pull technology, Desmodium intortum, ICIPE Kenya, Striga hermonthica, stem borer' },
  { batch: 'technique', category: 'technique', region: 'Global', climate: 'tous', lang: 'fr',
    subject: 'Biofumigation — Brassica comme engrais vert biofumigant contre nématodes et champignons',
    source_hint: 'biofumigation, Brassica juncea, glucosinolates, isothiocyanates, HRI UK, nematode' },
  { batch: 'technique', category: 'technique', region: 'Global', climate: 'tous', lang: 'fr',
    subject: 'Lombricompostage en continu (flow-through system) — systèmes industriels et paysans',
    source_hint: 'continuous flow vermicompost, Vermicycle, VermiFilter, Worm Power, Koppert' },
  { batch: 'technique', category: 'nutriment', region: 'Global', climate: 'tous', lang: 'fr',
    subject: 'Cycle de l\'azote dans le sol — minéralisation, nitrification, dénitrification',
    source_hint: 'nitrogen cycle soil, N mineralization, INRA, Brady Weil Soil Science, organic N' },
  { batch: 'technique', category: 'nutriment', region: 'Global', climate: 'tous', lang: 'fr',
    subject: 'Cycle du phosphore dans les sols tropicaux — fixation et disponibilité',
    source_hint: 'phosphorus tropical soils, P fixation, oxisols ultisols, CIAT, Barber model' },
  { batch: 'technique', category: 'nutriment', region: 'Global', climate: 'tous', lang: 'fr',
    subject: 'Matière organique du sol (MOS) — rôle, formation et gestion en tropiques',
    source_hint: 'soil organic matter tropical, SOM, CIAT TSBF, Batjes 1996, carbon sequestration' },
  { batch: 'technique', category: 'technique', region: 'Afrique tropicale', climate: 'tropical', lang: 'fr',
    subject: 'Biodigesteur familial PVC (sac plastique) — faible coût Cambodge et adaptation Afrique',
    source_hint: 'plastic bag biodigester, SNV, cambogia design, FAO, 50-150 USD, famille 5-8 personnes' },
  { batch: 'technique', category: 'technique', region: 'Global', climate: 'tous', lang: 'fr',
    subject: 'Compostage en tranchée et Hugel bed (culture sur butte-forêt)',
    source_hint: 'trench composting, hügelkultur, Sepp Holzer, Paul Wheaton, Permaculture, wood decomp' },

  // ═══════════════════════════════════════════════════════════
  // BATCH: bokashi — fermentations diverses
  // ═══════════════════════════════════════════════════════════

  { batch: 'bokashi', category: 'bokashi', region: 'Global', climate: 'tous', lang: 'fr',
    subject: 'Bokashi de feuilles de forêt tropicale — micro-organismes indigènes IMO',
    source_hint: 'IMO Indigenous Microorganisms, Natural Farming, soil from forest, KNF, Han-Kyu Cho' },
  { batch: 'bokashi', category: 'bokashi', region: 'Global', climate: 'tous', lang: 'fr',
    subject: 'Bokashi à base de déchets de poisson (fish amino acid, FAA) — Korean Natural Farming',
    source_hint: 'FAA Fish Amino Acid, KNF, brown sugar fermentation, N amino acids, 3 months' },
  { batch: 'bokashi', category: 'bokashi', region: 'Madagascar', climate: 'tropical', lang: 'fr',
    subject: 'Bokashi maison avec son de riz malgache (vary venty) et mélasse canne',
    source_hint: 'son de riz Madagascar, vary venty, bokashi EM, mélasse canne à sucre Morondava' },
  { batch: 'bokashi', category: 'bokashi', region: 'Global', climate: 'tous', lang: 'fr',
    subject: 'Production artisanale d\'EM (Effective Microorganisms) avec riz fermenté',
    source_hint: 'EM rice wash, Lactobacillus collection, natural EM production, Professor Teruo Higa' },
  { batch: 'bokashi', category: 'bokashi', region: 'Global', climate: 'tous', lang: 'fr',
    subject: 'Bokashi pour déchets de cuisine — traitement ménager des restes alimentaires',
    source_hint: 'kitchen bokashi, domestic fermentation, EM, 2 weeks anaerobic, pre-compost, ICROFS' },
  { batch: 'bokashi', category: 'bokashi', region: 'Afrique tropicale', climate: 'tropical', lang: 'fr',
    subject: 'Bokashi de résidus de canne à sucre et bagasse fermentée',
    source_hint: 'sugarcane bagasse fermentation, EM, bokashi, K=0.8%, Mauritius Sugar Industry Research' },

  // ═══════════════════════════════════════════════════════════
  // BATCH: madagascar-mg — fiches EN MALAGASY terrain réel
  // Uniquement des sujets avec données vérifiables FOFIFA/FIFAMANOR/CIRAD
  // ═══════════════════════════════════════════════════════════

  { batch: 'madagascar-mg', category: 'compost', region: 'Madagascar', climate: 'tropical altitude', lang: 'mg',
    subject: 'Bokashi vary venty — fomba fanomanana amin\'ny son de riz malgache sy mélasse',
    source_hint: 'bokashi Madagascar, vary venty (son de riz), mélasse canne Morondava, EM locaux, FIFAMANOR, lactobacillus riz fermenté' },

  { batch: 'madagascar-mg', category: 'fumier', region: 'Madagascar', climate: 'tropical', lang: 'mg',
    subject: 'Urine omby fermenté — biofertilisant azo natao maimaimpoana amin\'ny tantsaha malgasy',
    source_hint: 'urine bovine fermentée Madagascar, N=8-15g/L, dilution 1:20, azote rapide, FOFIFA, données terrain Vakinankaratra' },

  { batch: 'madagascar-mg', category: 'culture', region: 'Madagascar', climate: 'tropical altitude', lang: 'mg',
    subject: 'Famokarana voatabia organika eny amin\'ny havoana — Vakinankaratra sy Itasy',
    source_hint: 'tomate biologique hautes terres Madagascar, FOFIFA, FIFAMANOR Antsirabe, variétés Roma Marmande, rendements 20-30t/ha avec intrants organiques' },

  { batch: 'madagascar-mg', category: 'culture', region: 'Madagascar', climate: 'tropical', lang: 'mg',
    subject: 'Vary jeby (riz irrigué) sy ny fanazarana ny fanjakan\'ny tany amin\'ny bas-fonds — Lac Alaotra',
    source_hint: 'riz irrigué Lac Alaotra Madagascar, FOFIFA Ambatondrazaka, doses compost 3-5t/ha, rendements 3-6t/ha, saison principale et contre-saison' },

  { batch: 'madagascar-mg', category: 'technique', region: 'Madagascar', climate: 'tropical', lang: 'mg',
    subject: 'Fomba manitsy ny tany acide eny amin\'ny tanety — fampiasana chaux sy cendres eto Madagasikara',
    source_hint: 'correction acidité sols ferralitiques rouges Madagascar, pH 4.5-5.5, chaux agricole 200-500 kg/ha, cendres bois, FIFAMANOR, résultats terrain' },

  { batch: 'madagascar-mg', category: 'pisciculture', region: 'Madagascar', climate: 'tropical', lang: 'mg',
    subject: 'Rizipisciculture — fiompiana trondro ao amin\'ny tanimbary vary (riz-poisson Madagascar)',
    source_hint: 'rice-fish farming Madagascar, CIRAD WorldFish, tilapia dans rizières, densité 500-1000 poissons/ha, bénéfices désherbage et fumure, données MAEP 2018' },

  { batch: 'madagascar-mg', category: 'biofertilisant', region: 'Madagascar', climate: 'tropical', lang: 'mg',
    subject: 'Purin Tithonia diversifolia (botry zahana) — engrais foliaire maimaimpoana eto Madagasikara',
    source_hint: 'Tithonia diversifolia Madagascar, N=3.5% K=4.1% biomasse fraîche, purin dilution 1:10, données CIRAD, plante mellifère aussi, Vakinankaratra' },

  { batch: 'madagascar-mg', category: 'apiculture', region: 'Madagascar', climate: 'tropical', lang: 'mg',
    subject: 'Gelée royale sy reine d\'abeille — ahoana ny fomba fahazoana azy amin\'ny fiompiana tantely gasy',
    source_hint: 'gelée royale production Madagascar, Apis mellifera unicolor, méthode Nicot, reine mère, GAM Madagascar, prix marché gelée royale 200-400 USD/kg' },
];

// =============================================================
// GROQ HARVESTER — génère les fiches depuis les requêtes
// Phase 4 : Prompt renforcé — données vérifiables uniquement
// =============================================================

// Glossaire malagasy agricole de référence — termes terrain réels
// utilisés par les paysans malgaches, pas de la traduction académique
const MG_GLOSSAIRE = `
VOCABULAIRE AGRICOLE MALAGASY — termes terrain (utilise ces mots, pas leurs traductions françaises) :
- tany = sol/terre | rano = eau | hazo = arbre/bois | ahitra = herbe/adventice
- vary = riz (toutes variétés) | vary jeby = riz irrigué | vary hitsaka = riz pluvial
- katsaka = maïs | mangahazo = manioc | voatabia = tomate | saonjo = taro
- patate douce = batata mena/bontsilava | arachide = voanjo | haricot = tsaramaso
- zezika = engrais/fumier (générique) | zezika omby = fumier de zébu
- zezika akoho = fumier de poulet | zezika kisoa = fumier de porc
- komposita = compost | bokashi = bokashi (même mot) | purin = purin (même mot)
- tany tanety = sol de colline/tanety | bas-fond = tany ambany/tanety ambany
- vokatra = rendement/récolte | fambolena = agriculture/culture
- fiompiana = élevage | trondro = poisson | tantely = miel/abeille
- ruche = tranomasoandro na tranon'ny tantely | etang = dobo/farihy kely
- mpamboly = agriculteur | tantsaha = paysan | sekoly fambolena = école d'agriculture
- voly = planter/semer | jinja = récolter | manala = désherber | miravaka = labourer
- fotoam-pambolena = saison de culture | taonan-java-maniry = cycle végétatif
- 1 kapoaka = environ 400g (mesure locale) | 1 sobika = panier (~25kg)
INSTITUTIONS : FOFIFA (recherche agronomique malgache) | FIFAMANOR (Antsirabe, élevage/sol)
CTHT (Centre Technique Horticole Tamatave) | CIRAD (recherche française à Madagascar)
`;

async function harvestFiche(query: HarvestQuery): Promise<{ title: string; content: string; structured: any } | null> {
  if (!GROQ_API_KEY) return null;

  const isMaingasy = query.lang === 'mg';

  // ── Instruction langue ──────────────────────────────────────
  // Pour le malagasy : on fournit le glossaire terrain et on interdit
  // la traduction mot-à-mot depuis le français. Le malagasy doit être
  // naturel, comme parlé par un technicien agricole malgache.
  const langInstr = isMaingasy
      ? `Rédige cette fiche ENTIÈREMENT en malagasy parlé par les techniciens agricoles malgaches.
${MG_GLOSSAIRE}
RÈGLES LANGUE MALAGASY :
- Utilise le vocabulaire du glossaire ci-dessus pour les termes agricoles
- Accepté en français : noms latins, sigles (NPK, pH, SCV, CIRAD), chiffres et unités (kg, t/ha, cm, °C)
- INTERDIT : traduction phrase par phrase depuis le français ("Tokony mamaly... Tokony manorona..." est du malagasy de mauvaise qualité — c'est de la traduction automatique)
- Style direct : "Asio ny zezika 3 kg/m² alohan'ny fambolena" (pas "Tokony mamaly ny zezika ho 3 kg/m²")
- Quantités concrètes : "kapoaka iray (400g)" "sobika iray (~25 kg)" pour les mesures locales`
      : `Rédige en français technique agricole clair, accessible à un technicien de terrain.
Style direct et concret. Évite le jargon académique excessif.`;

  // ── Prompt principal ─────────────────────────────────────────
  // La clé de la qualité : on demande au modèle de distinguer
  // ce qu'il sait avec certitude de ce qu'il estime seulement.
  // On lui interdit d'inventer des chiffres NPK non vérifiables.
  const prompt = `Tu es un agronome spécialiste de l'agriculture biologique tropicale, avec une connaissance approfondie des publications de la FAO, CIRAD, INRA, IITA, ICRISAT, CIMMYT, WorldFish, ICRAF, FIFAMANOR et FOFIFA Madagascar.

SUJET : ${query.subject}
RÉGION : ${query.region} | CLIMAT : ${query.climate} | CATÉGORIE : ${query.category}
SOURCE PRINCIPALE : ${query.source_hint}

${langInstr}

---
RÈGLES DE QUALITÉ — NON NÉGOCIABLES :

1. DONNÉES RÉELLES UNIQUEMENT
   - N'utilise que des chiffres que tu peux attribuer à une source réelle (FAO, CIRAD, FIFAMANOR, INRA, publication scientifique)
   - Si tu cites un NPK, il doit correspondre à une analyse de laboratoire documentée
   - Si tu n'as pas de données mesurées pour un NPK, mets "inconnu" — ne pas inventer

2. DISTINGUE CE QUE TU SAIS DE CE QUE TU ESTIMES
   - Données certaines (mesurées en labo) : cite la source entre parenthèses — ex: "N=1.8% (FIFAMANOR 2022)"
   - Données estimées (fourchettes littérature) : formule comme "généralement 1-2 t/ha selon la source"
   - Chiffres inconnus pour cette région spécifique : dis-le — "les données pour Madagascar manquent sur ce point"

3. ÉTAPES CONCRÈTES ET ACTIONNABLES
   - Chaque étape doit pouvoir être exécutée par un paysan sur le terrain
   - Inclure : dose précise OU fourchette, durée, conditions (température, humidité si pertinent)
   - Minimum 5 étapes, maximum 10 étapes

4. CONSEILS DIFFÉRENCIANTS
   - Les conseils doivent apporter une information que l'étape seule ne donne pas
   - Pas de conseil vague ("surveillez régulièrement") — toujours avec critère observable
   - Minimum 3 conseils

5. ERREURS AVEC CONSÉQUENCES PRÉCISES
   - Chaque erreur doit expliquer ce qui se passe concrètement si on la commet
   - Minimum 3 erreurs

---
Réponds UNIQUEMENT avec un JSON valide, sans markdown, sans commentaires :
{
  "fertilizer_name": "nom précis du produit/technique${isMaingasy ? ' en malagasy' : ' en français'}",
  "content_text": "texte de 120-180 mots décrivant le contexte, l'intérêt agronomique, les données chiffrées avec sources",
  "ingredients": ["ingrédient + quantité pour 1 unité de production standard"],
  "steps": ["étape avec action concrète + dose/durée/condition"],
  "tips": ["conseil technique avec critère observable ou chiffre"],
  "mistakes": ["erreur + conséquence concrète observée sur le terrain"],
  "duration": "durée totale avec unité",
  "npk_ratio": "N:x P:y K:z (source) OU inconnu",
  "best_for_crops": ["cultures principales adaptées"],
  "climate": "${query.climate}",
  "difficulty": "facile | moyen | avancé",
  "cost": "très faible | faible | moyen | élevé"
}`;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000,
        temperature: 0.15, // très bas = précision maximale
      }),
      signal: AbortSignal.timeout(40000),
    });

    if (!res.ok) {
      const errText = await res.text();
      if (res.status === 429) {
        log('⏳', `Rate limit Groq — attente 90s puis retry...`);
        await sleep(90000);
        // Retry automatique après rate limit
        return harvestFiche(query);
      }
      log('❌', `Groq HTTP ${res.status}: ${errText.substring(0, 100)}`);
      return null;
    }

    const d = await res.json() as any;
    const rawContent = (d.choices?.[0]?.message?.content || '').trim();

    // Nettoyage robuste : retire backticks markdown et chars de contrôle
    const raw = rawContent
        .replace(/^```json?\s*/i, '').replace(/\s*```$/, '')
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Récupération : extraire entre la première { et la dernière }
      const start = raw.indexOf('{');
      const end   = raw.lastIndexOf('}');
      if (start !== -1 && end > start) {
        try {
          parsed = JSON.parse(raw.substring(start, end + 1));
        } catch {
          log('❌', `JSON invalide : ${query.subject.substring(0, 50)}`);
          return null;
        }
      } else {
        log('❌', `Pas de JSON dans la réponse Groq`);
        return null;
      }
    }

    // Construire le content_raw
    const content = [
      parsed.content_text || '',
      parsed.ingredients?.length ? `\nIngrédients : ${parsed.ingredients.join(' | ')}` : '',
      parsed.steps?.length ? `\nÉtapes : ${parsed.steps.join(' | ')}` : '',
      parsed.tips?.length ? `\nConseils : ${parsed.tips.join(' | ')}` : '',
      parsed.mistakes?.length ? `\nErreurs : ${parsed.mistakes.join(' | ')}` : '',
    ].join('').trim();

    return {
      title: query.subject.substring(0, 150),
      content,
      structured: {
        fertilizer_name: parsed.fertilizer_name || query.subject.substring(0, 80),
        ingredients: parsed.ingredients || [],
        steps: parsed.steps || [],
        tips: parsed.tips || [],
        mistakes: parsed.mistakes || [],
        duration: parsed.duration || 'variable',
        npk_ratio: parsed.npk_ratio || 'inconnu',
        best_for_crops: parsed.best_for_crops || [],
        climate: parsed.climate || query.climate,
        difficulty: parsed.difficulty || 'moyen',
        cost: parsed.cost || 'faible',
      },
    };
  } catch (err) {
    const msg = String(err);
    if (msg.includes('429')) {
      log('⏳', `Rate limit (catch) — attente 90s puis retry...`);
      await sleep(90000);
      return harvestFiche(query);
    }
    log('❌', `Erreur inattendue : ${msg.substring(0, 80)}`);
    return null;
  }
}

// =============================================================
// HELPERS
// =============================================================

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function slugify(t: string) {
  return t.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 120);
}

// Phase 4 : chunking sémantique — respecte les frontières de phrases
// et de paragraphes pour ne pas couper une étape ou un conseil en deux.
// Chunks cibles : 300-400 mots avec overlap de 1 phrase pour la continuité RAG.
function chunkText(text: string): string[] {
  if (!text?.trim()) return [];

  // Découpe par paragraphes (double saut de ligne) ou par séparateurs logiques
  const paragraphs = text
      .split(/\n{2,}|(?<=\. )(?=[A-ZÀÂÄÉÈÊËÎÏÔÙÛÜÑ])|(?<=\. )(?=\d+\.)/)
      .map(p => p.trim())
      .filter(p => p.length > 20);

  const chunks: string[] = [];
  let current = '';
  let lastSentence = '';

  for (const para of paragraphs) {
    const projected = current ? current + '\n\n' + para : para;
    const wordCount = projected.split(/\s+/).length;

    if (wordCount > CHUNK_SIZE && current.length > 100) {
      chunks.push(current.trim());
      // Overlap : commencer le prochain chunk avec la dernière phrase du précédent
      const sentences = current.split(/(?<=[.!?])\s+/);
      lastSentence = sentences[sentences.length - 1] || '';
      current = lastSentence ? lastSentence + '\n\n' + para : para;
    } else {
      current = projected;
    }
  }

  if (current.trim().length > 50) chunks.push(current.trim());

  // Si le texte est court, retourner en un seul chunk
  if (chunks.length === 0 && text.trim().length > 50) return [text.trim()];

  return chunks;
}

function log(icon: string, msg: string, detail?: string) {
  console.log(`${C.dim(new Date().toLocaleTimeString('fr-FR'))} ${icon}  ${msg}${detail ? C.dim(' — ' + detail) : ''}`);
}

async function saveToTurso(params: {
  title: string; content: string; category: string; source: string;
  region: string; lang: string; structured: any;
}): Promise<'saved' | 'skipped' | 'error'> {
  if (DRY_RUN) { log('🔵', `[DRY-RUN] "${params.title.substring(0, 60)}"`); return 'saved'; }

  const slug = slugify(params.title);
  const existing = await turso.get('SELECT id FROM knowledge_base WHERE slug = ?', [slug]).catch(() => null);
  if (existing) return 'skipped';

  try {
    const kbId = randomUUID();
    const s = params.structured || {};

    await turso.run(
        'INSERT INTO knowledge_base (id, title, slug, category, source, language, content_raw) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [kbId, params.title, slug, params.category, params.source, params.lang, params.content]
    );

    const chunks = chunkText(params.content);
    for (let i = 0; i < chunks.length; i++) {
      await turso.run(
          'INSERT INTO knowledge_chunks (id, knowledge_id, chunk_index, content) VALUES (?, ?, ?, ?)',
          [randomUUID(), kbId, i, chunks[i]]
      );
    }

    await turso.run(
        `INSERT INTO knowledge_structured
         (id, knowledge_id, fertilizer_name, ingredients, steps, tips, mistakes, duration, npk_ratio, best_for_crops, climate, region, difficulty, cost)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          randomUUID(), kbId,
          s.fertilizer_name || params.title,
          JSON.stringify(s.ingredients || []),
          JSON.stringify(s.steps || []),
          JSON.stringify(s.tips || []),
          JSON.stringify(s.mistakes || []),
          s.duration || 'variable',
          s.npk_ratio || 'inconnu',
          JSON.stringify(s.best_for_crops || []),
          s.climate || 'tous',
          params.region,
          s.difficulty || 'moyen',
          s.cost || 'variable',
        ]
    );

    return 'saved';
  } catch (err) {
    log('❌', `DB error "${params.title.substring(0, 50)}"`, String(err).substring(0, 80));
    return 'error';
  }
}

async function printStats() {
  if (DRY_RUN) return;
  try {
    const [kb, chunks, struct] = await Promise.all([
      turso.get('SELECT COUNT(*) as n FROM knowledge_base'),
      turso.get('SELECT COUNT(*) as n FROM knowledge_chunks'),
      turso.get('SELECT COUNT(*) as n FROM knowledge_structured'),
    ]);
    const cats = await turso.all('SELECT category, COUNT(*) as n FROM knowledge_base GROUP BY category ORDER BY n DESC');
    console.log('\n' + C.bold('📊 ÉTAT FINAL KNOWLEDGE BASE'));
    console.log('─'.repeat(50));
    console.log(`  Articles total : ${C.green(String((kb as any)?.n || 0))}`);
    console.log(`  Chunks RAG     : ${C.green(String((chunks as any)?.n || 0))}`);
    console.log(`  Fiches struct  : ${C.green(String((struct as any)?.n || 0))}`);
    console.log('\n  Par catégorie :');
    for (const c of cats as any[]) {
      console.log(`    ${(c.category as string).padEnd(22)} ${C.yellow(String(c.n).padStart(4))} articles`);
    }
    console.log('─'.repeat(50) + '\n');
  } catch { /* ignore */ }
}

// =============================================================
// MAIN
// =============================================================

async function main() {
  console.log('\n' + C.bold(C.green('🌱 FERTILI\'ZEO — Groq Knowledge Harvester v3')));
  console.log(C.dim('Extraction depuis corpus scientifique Groq : FAO, CIRAD, INRA, IITA, ICRISAT...'));

  if (DRY_RUN) console.log(C.yellow('\n⚠️  DRY-RUN : aucune écriture\n'));
  if (!GROQ_API_KEY) {
    console.log(C.red('\n❌ GROQ_API_KEY manquant dans .env — impossible de continuer\n'));
    process.exit(1);
  }

  const allQueries = BATCH_FILTER
      ? HARVEST_QUERIES.filter(q => q.batch === BATCH_FILTER)
      : HARVEST_QUERIES;

  const queries = allQueries.slice(0, LIMIT);

  console.log(C.cyan(`\n  ${queries.length} fiches à générer`));
  if (BATCH_FILTER) console.log(C.cyan(`  Batch filtré : ${BATCH_FILTER}`));
  console.log(C.dim(`  Délai entre requêtes : ${DELAY_MS}ms (rate limit Groq ~30 RPM)`));
  console.log(C.dim(`  Durée estimée : ${Math.ceil(queries.length * DELAY_MS / 60000)} min\n`));

  const t0 = Date.now();
  let saved = 0, skipped = 0, failed = 0;

  for (let i = 0; i < queries.length; i++) {
    const q = queries[i];
    const progress = `[${i + 1}/${queries.length}]`;

    log('🔬', `${progress} ${C.cyan(q.batch)} — ${q.subject.substring(0, 70)}`);

    const result = await harvestFiche(q);

    if (!result) {
      failed++;
      log('❌', `${progress} Échec génération`);
      await sleep(2000);
      continue;
    }

    const dbResult = await saveToTurso({
      title: result.title,
      content: result.content,
      category: q.category,
      source: 'groq_harvest',
      region: q.region,
      lang: q.lang,
      structured: result.structured,
    });

    if (dbResult === 'saved') {
      saved++;
      log('✅', C.green(`${progress} Sauvegardée`), result.structured.fertilizer_name?.substring(0, 50));
    } else if (dbResult === 'skipped') {
      skipped++;
      log('⏭️ ', `${progress} Déjà présente`);
    } else {
      failed++;
    }

    await sleep(DELAY_MS);
  }

  await printStats();
  const elapsed = ((Date.now() - t0) / 1000 / 60).toFixed(1);
  console.log(C.bold(C.green(`✅ Terminé en ${elapsed} min — ${saved} nouvelles fiches ajoutées`)));
  console.log(C.dim(`   ${skipped} déjà présentes, ${failed} échecs\n`));
  console.log(C.dim('   Pour plus de fiches : ajouter des sujets dans HARVEST_QUERIES\n'));
}

main().catch(err => {
  console.error(C.red('❌ Erreur fatale :'), err);
  process.exit(1);
});