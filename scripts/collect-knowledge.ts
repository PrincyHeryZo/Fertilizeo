/**
 * scripts/collect-knowledge.ts
 * ============================================================
 * Collecte de données TECHNIQUES et PRÉCISES pour la KB IA
 * Fertili'zeo — IA Agriculture Biologique · Afrique Tropicale
 *
 * Domaines couverts :
 *  - Fertilisation organique (compost, fumier, bokashi, biofertilisants)
 *  - Engrais verts et techniques sol
 *  - Pisciculture (étang, cage, aquaponie)
 *  - Apiculture (ruche KTB, produits de la ruche, pollinisation)
 *  - Cultures spécifiques (riz, maïs, cacao, café, sahel...)
 *
 * Régions : Madagascar · Afrique de l'Est · Afrique de l'Ouest ·
 *           Afrique Centrale · Sahel · Global tropical
 *
 * Sources :
 *  1. Fiches expertes  — rédigées à la main, ultra-précises, terrain
 *  2. Dataset NPK labo — données analytiques mesurées (INRA, ICRISAT, FIFAMANOR)
 *  3. FAO TECA         — fiches techniques officielles (API gratuite)
 *
 * Usage :
 *   npx tsx scripts/collect-knowledge.ts              (tout)
 *   npx tsx scripts/collect-knowledge.ts --source=expert
 *   npx tsx scripts/collect-knowledge.ts --source=npk
 *   npx tsx scripts/collect-knowledge.ts --source=fao
 *   npx tsx scripts/collect-knowledge.ts --dry-run
 * ============================================================
 */

import { turso } from '../database/turso.ts';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';

dotenv.config();

const GROQ_API_KEY  = process.env.GROQ_API_KEY;
const GROQ_MODEL    = 'llama-3.3-70b-versatile';
const CHUNK_SIZE    = 350;
const DELAY_MS      = 1200;
const DRY_RUN       = process.argv.includes('--dry-run');
const SOURCE_FILTER = process.argv.find(a => a.startsWith('--source='))?.split('=')[1];

const C = {
  green:  (s: string) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  red:    (s: string) => `\x1b[31m${s}\x1b[0m`,
  bold:   (s: string) => `\x1b[1m${s}\x1b[0m`,
  dim:    (s: string) => `\x1b[2m${s}\x1b[0m`,
};

// =============================================================
// SECTION 1 — FICHES EXPERTES
// Données terrain précises, doses réelles, adaptées à Madagascar
// =============================================================

interface ExpertFiche {
  title: string; category: string; region: string; climate: string;
  content: string; fertilizer_name: string;
  ingredients: string[]; steps: string[]; tips: string[]; mistakes: string[];
  duration: string; npk_ratio: string; best_for_crops: string[];
  difficulty: string; cost: string;
}

const EXPERT_FICHES: ExpertFiche[] = [
  {
    title: 'Compost thermophile en fosse (méthode FIFAMANOR Madagascar)',
    category: 'compost', region: 'Madagascar', climate: 'tropical',
    fertilizer_name: 'Compost thermophile en fosse',
    content: `Méthode développée par FIFAMANOR (Centre Fihaonana Fifamanor, Antsirabe) pour les hautes terres malgaches.
Fosse de 2m x 1m x 1m, montée en température 55-70°C qui pasteurise le compost.
Ratio C/N cible = 25-30:1. Apport : 2-3 kg compost mûr/m² sol cultivé.
Analyse typique : N=1.8%, P=0.9%, K=1.4%, MO=45%, pH=6.8-7.2.
Durée : 8-10 semaines saison chaude (nov-mars), 12-14 semaines saison froide.
Densité : maraîchage 5-10 t/ha, riz 3-5 t/ha, maïs 4-6 t/ha.`,
    ingredients: [
      'Matières vertes azotées 60% : fanes légumineuses, herbes, déchets cuisine, fumier frais',
      'Matières brunes carbonées 30% : paille de riz, tiges maïs sèches, feuilles mortes',
      'Activateur 10% : fumier de volaille OU farine de sang',
      'Eau propre (maintien 50-60% humidité)',
      'Terre de surface comme inoculant (1 poignée par couche de 20cm)',
    ],
    steps: [
      'Creuser fosse 2m×1m×1m ou enclos 4 piquets + grillage',
      'Couche drainante fond : 10cm branchages grossiers ou cailloux',
      'Alterner : 15cm matière brune → 10cm matière verte → 2cm fumier volaille → arrosage léger → 1 poignée terre',
      'Répéter jusqu\'à 1,2m de hauteur (dépassement au-dessus fosse)',
      'Couvrir bâche perforée (retient humidité, laisse passer air)',
      'Vérifier J+3 : température dépasse 50°C au centre (main brûlée = bon signe)',
      'Premier retournement J+14 : extérieur vers intérieur, haut vers bas',
      'Deuxième retournement J+28, troisième J+42 si nécessaire',
      'Test maturité J+60 : odeur terre de forêt, brun-noir homogène, vers de terre présents',
      'Tamiser 5mm, stocker à l\'abri pluie en sacs ou andain couvert',
    ],
    tips: [
      'Ratio C/N pratique sans calcul : 1 volume matière verte pour 2 volumes matière sèche',
      'Test humidité : presser poignée = quelques gouttes max. Ruissellement = trop humide',
      'Cendres de bois (1-2 kg/m³) : apport potassium + correction pH acide',
      'Planter courges sur tas en cours : utilisent la chaleur, ventilent par les racines',
      'Saison sèche : arroser copieusement avant chaque retournement (cœur se dessèche vite)',
    ],
    mistakes: [
      'Trop de fumier zébu frais (> 15% volume) : excès ammoniaque, odeur forte, brûlure',
      'Tas trop petit (< 1m³) : pas de montée en température, pas de pasteurisation',
      'Pas de drainage sous le tas : anaérobie, odeur putride, perte nutriments par lessivage',
      'Retourner avant J+14 : interrompt phase thermophile avant destruction pathogènes',
      'Compost immature sur tomates/oignons : flétrissure, brûlure racinaire',
    ],
    duration: '8-14 semaines selon saison',
    npk_ratio: 'N:1.8 P:0.9 K:1.4',
    best_for_crops: ['riz', 'maïs', 'tomate', 'oignon', 'carotte', 'chou', 'haricot', 'manioc'],
    difficulty: 'facile', cost: 'très faible',
  },

  {
    title: 'Lombricompostage Eisenia fetida (vermicompost tropical)',
    category: 'compost', region: 'Madagascar', climate: 'tropical',
    fertilizer_name: 'Vermicompost (compost de vers)',
    content: `Vermicompost produit par Eisenia fetida (ver de fumier, disponible à Madagascar).
Analyse : N=2.5-3.5%, P=1.5-2.5%, K=1.5-2.0%, pH=6.5-7.0.
Surface spécifique agrégats 10-50μm : assimilation racinaire 5x plus rapide que compost classique.
Thé de vermicompost : 10^8 bactéries/mL, biostimulant foliaire.
Densité application : 500g-1kg/m² (vs 3-5kg/m² compost classique).
Le lombric traite 50-100% de son poids en matière organique par jour.
Température idéale : 15-25°C. Létal > 35°C.`,
    ingredients: [
      'Vers Eisenia fetida 500g-1kg pour démarrage (pépinières bio Antsirabe, Antananarivo)',
      'Litière départ : carton humidifié ou copeaux bois non traité',
      'Nourriture : épluchures légumes, marc café, feuilles bananier, son de riz',
      'Caisse bois 60x40x30cm OU bac plastique avec trous drainage 5mm',
      'Paille ou carton pour couvrir (maintien humidité + obscurité)',
    ],
    steps: [
      'Percer trous 5mm fond et côtés du bac pour drainage et aération',
      'Remplir 2/3 litière humide (carton déchiqueté + copeaux) — pas de sol',
      'Introduire vers en surface à l\'ombre : s\'enfouissent seuls en 30 min si conditions bonnes',
      'Attendre 3-4 jours avant première nourriture (acclimatation)',
      'Ajouter déchets 2x/semaine en couche 2-3cm, couvrir avec litière',
      'Test humidité : main ressort humide sans dégouliner = parfait',
      'Récolter vermicompost à partir de 3 mois : repousser vers d\'un côté, récolter l\'autre',
      'Collecter thé (liquide drainage) : diluer 1:10 pour arrosage pied des plantes',
    ],
    tips: [
      'Au-delà de 35°C les vers meurent : mettre à l\'ombre impérativement en saison chaude',
      'Vers remontent en surface = trop humide, ou trop acide (ajouter cendres), ou agression',
      'Ne jamais ajouter : oignons/ail (répulsifs), agrumes excès (acide), sel, huiles, viande',
      'Multiplication : doublent en 3 mois avec bonne alimentation',
    ],
    mistakes: [
      'Trop d\'eau : vers se noient, odeur putride. Drainage obligatoire',
      'Un seul aliment en excès (ex: uniquement marc café) : déséquilibre pH',
      'Bac au soleil direct : température létale > 35°C',
      'Ajouter déchets trop vite avant acclimatation des vers',
    ],
    duration: '2-3 mois premier cycle, continu ensuite',
    npk_ratio: 'N:2.8 P:1.8 K:1.7',
    best_for_crops: ['semis', 'pepiniere', 'tomate', 'salade', 'oignon', 'poivron'],
    difficulty: 'moyen', cost: 'faible',
  },

  {
    title: 'Biofertilisant FPJ (Fermented Plant Juice) — Natural Farming',
    category: 'biofertilisant', region: 'Global', climate: 'tous',
    fertilizer_name: 'FPJ — Jus fermenté de plante',
    content: `Technique fermentation lactique issue Natural Farming coréenne (Han-Kyu Cho).
Préserve hormones de croissance des jeunes pousses : auxines, gibbérellines.
Sucre brut 1:1 en poids avec plante crée milieu hypertonique qui extrait sucs cellulaires.
Conservation 12 mois. Dilution standard : 1:500 végétation, 1:1000 floraison.
Chaque plante donne FPJ spécifique : bambou = silice + minéraux, ortie = azote, comfrey = potassium, banane = K.`,
    ingredients: [
      'Jeunes pousses à 1/3 de croissance (NOT mature) : bambou, tiges maïs, feuilles courge',
      'Sucre roux OU mélasse de canne — poids ÉGAL à la plante',
      'Récipient terre cuite ou plastique alimentaire (JAMAIS métal)',
      'Pierre pour peser/comprimer les plantes',
      'Tissu respirant + élastique (pas hermétique)',
    ],
    steps: [
      'Récolter tôt le matin avant chaleur (concentration en sève maximale)',
      'NE PAS laver les plantes : microbes de surface nécessaires',
      'Hacher grossièrement ou déchirer à la main',
      'Alterner dans récipient : couche plantes → couche sucre égal en poids',
      'Finir par couche sucre en surface (couvercle protecteur)',
      'Poser pierre propre pour comprimer, maintenir plantes immergées',
      'Couvrir tissu, fermenter 7 jours à l\'ombre température ambiante',
      'Filtrer : liquide ambré = FPJ concentré, résidu → compost',
      'Stocker bocal verre à l\'ombre : conservation 12 mois',
      'Diluer 1:500 (2ml pour 1L eau) pour arrosage ou pulvérisation foliaire',
    ],
    tips: [
      'FPJ patate douce = excellent biostimulant racinaire (riche en auxines)',
      'FPJ banane verte = riche potassium, idéal avant floraison',
      'Mélanger 3-5 FPJ différents = spectre nutritif complet',
      'Appliquer tôt matin ou tard soir : évite photodégradation des hormones',
    ],
    mistakes: [
      'Plantes malades ou traitées pesticides : contamination du FPJ',
      'Fermer hermétiquement : fermentation lactique dégage CO2, risque explosion',
      'Plantes matures ou en fleurs : faible concentration hormones de croissance',
      'Récipient métallique : oxydation + destruction enzymes',
    ],
    duration: '7 jours fermentation, 12 mois conservation',
    npk_ratio: 'Variable selon plante — biostimulant hormonal',
    best_for_crops: ['toutes cultures', 'semis', 'repiquage'],
    difficulty: 'moyen', cost: 'quasi nul',
  },

  {
    title: 'Purin d\'ortie concentré — engrais azoté foliaire',
    category: 'biofertilisant', region: 'Global', climate: 'tous',
    fertilizer_name: 'Purin d\'ortie',
    content: `Ortie fraîche (Urtica dioica) : N=4-6% matière sèche, Fe=80mg/100g, Si=8-10%.
Purin dilué 5% (ITAB France 2019) : N-NH4=180 mg/L, K=220 mg/L, Ca=85 mg/L.
Efficace contre pucerons (acides aminés répulsifs), stimule défenses naturelles (SAR).
Fermentation 8-14 jours selon température (30°C=8 jours, 20°C=14 jours).
Conservation 6 mois en récipient fermé à l\'abri lumière.`,
    ingredients: [
      'Orties fraîches tiges + feuilles 1kg (avant floraison obligatoire)',
      'Eau de pluie OU eau robinet déchlorifiée 24h — 10L',
      'Récipient plastique ou bois 15L minimum (JAMAIS métal)',
      'Tissu fin ou bas nylon pour filtrer',
    ],
    steps: [
      'Porter gants : ortie fraîche pique',
      'Hacher grossièrement (accélère extraction sucs)',
      'Immerger dans 10L eau : orties totalement sous l\'eau',
      'Mélanger vigoureusement 1x/jour pour oxygéner (évite putréfaction)',
      'Couvrir tissu (laisse passer air, bloque insectes)',
      'Fermentation terminée : plus de bulles + odeur stabilisée (10-14 jours)',
      'Filtrer : liquide sombre = purin concentré',
      'Dilution arrosage sol : 1L purin + 10L eau (10%)',
      'Dilution pulvérisation foliaire : 0,5L + 10L eau (5%), tôt le matin',
      'Utiliser immédiatement après dilution (efficacité max dans 2h)',
    ],
    tips: [
      'Accélérateur : ajouter 10g levure boulangère ou morceau compost mûr',
      'Odeur forte = concentré actif. Odeur oeuf pourri = trop fermenté, utiliser immédiatement',
      'Associer purin ortie (N) + purin comfrey (K) = profil NPK complet',
      'Résidu filtré = paillis répulsif limaces autour des tomates',
    ],
    mistakes: [
      'Ortie en fleurs ou graines : nutriments migrés vers reproduction',
      'Ne pas remuer : fermentation anaérobie, putréfaction, odeur insupportable',
      'Arroser sur feuilles en plein soleil à forte concentration : brûlures',
      'Purin non dilué sur racines : brûle même les plantes vigoureuses',
    ],
    duration: '10-14 jours macération',
    npk_ratio: 'N:0.4 P:0.1 K:0.7 (dilution 10%)',
    best_for_crops: ['tomate', 'courge', 'maïs', 'chou', 'poireau', 'pomme de terre'],
    difficulty: 'facile', cost: 'quasi nul',
  },

  {
    title: 'Bokashi EM locaux — fermentation lactique anaérobie',
    category: 'bokashi', region: 'Madagascar', climate: 'tropical',
    fertilizer_name: 'Bokashi EM maison',
    content: `Bokashi = matière fermentée (japonais). Micro-organismes efficaces (EM) : Lactobacillus, Saccharomyces, bactéries photosynthétiques.
Fermentation lactique pH final 3.5-4.0 préserve TOUS les nutriments (vs compostage : perte 30-40% N).
Composition son de riz traité : N=0.8-1.2%, P=1.5-2.1%, K=0.8-1.2% + enzymes actives.
Liquide draîné dilué 1:100 : action visible en 48h sur les plantes.
EM locaux fabriqués avec Lactobacillus naturels du riz fermenté malgache.`,
    ingredients: [
      'Son de riz (vary venty) 5kg : base carbonée pour microbes',
      'EM artisanal (riz cuit + eau source, 5-7 jours) OU levure boulangère 20g',
      'Mélasse canne à sucre 50ml : sucre pour activer les EM',
      'Eau non chlorée tiède 300-400ml',
      'Seau hermétique 10-15L avec robinet drainage en bas',
    ],
    steps: [
      '[EM LOCAUX] Cuire 200g riz, refroidir, mettre bocal avec eau de source',
      'Couvrir tissu, laisser 5-7 jours à l\'ombre (moisissure blanche surface = normal)',
      'Filtrer : liquide trouble = EM maison. Conservation 30 jours au frigo.',
      '[BOKASHI] Dissoudre mélasse dans 200ml eau tiède, ajouter EM (ou levure)',
      'Humidifier son de riz : consistance sable humide (tenir en boule sans dégouliner)',
      'Tasser hermétiquement en seau, couches 5cm, chasser l\'air à chaque couche',
      'Fermer hermétiquement. Placer endroit chaud 25-35°C',
      'Drainer liquide (leachate) tous 2-3 jours via robinet',
      'Fermentation terminée J+14 : odeur aigre type vinaigre ou cornichon',
      'NE PAS ouvrir avant J+14 sauf drainage (air = échec)',
    ],
    tips: [
      'Leachate dilué 1:100 : arroser pied des plantes, effet visible 48h',
      'Leachate dilué 1:1000 : débouche canalisations (colonies bactériennes)',
      'Bokashi fini : enfouir 10-15cm profondeur, NE PAS planter immédiatement',
      'Attendre 2 semaines après enfouissement : sol s\'ajuste au pH acide',
    ],
    mistakes: [
      'Ouvrir seau pendant fermentation : air tue bactéries lactiques, moisissures noires = raté',
      'Pas assez tasser : poches d\'air = zones moisissures noires nauséabondes',
      'Drainer trop tôt J+1-2 : leachate trop acide, inefficace',
      'Contact direct bokashi acide avec racines : brûlures chimiques',
    ],
    duration: '14 jours fermentation + 14 jours intégration sol',
    npk_ratio: 'N:1.0 P:1.8 K:1.0 + enzymes actives',
    best_for_crops: ['légumes-feuilles', 'tomate', 'piment', 'oignon', 'haricot', 'concombre'],
    difficulty: 'moyen', cost: 'faible',
  },

  {
    title: 'Fumiers animaux Madagascar — doses et qualité comparative',
    category: 'fumier', region: 'Madagascar', climate: 'tropical',
    fertilizer_name: 'Fumiers animaux comparatifs Madagascar',
    content: `Données analytiques FIFAMANOR (Antsirabe), analyses labo 2018-2022.
Fumier zébu frais : N=0.45%, P=0.25%, K=0.40%, H2O=78%, C/N=18.
Fumier zébu composté 8 semaines : N=0.85%, P=0.55%, K=0.80%, C/N=12.
Fumier volaille frais : N=1.80%, P=1.50%, K=0.90%, H2O=55%, C/N=7 — TOUJOURS composter, brûlant.
Fumier porc frais : N=0.65%, P=0.50%, K=0.40%, H2O=82%.
Fumier lapin frais : N=2.40%, P=1.40%, K=0.80% — utilisable frais faible dose.
Fiente chauve-souris (guano grotte) : N=6.00%, P=8.00%, K=1.50%.
Urine zébu diluée 1:20 : N=7-15g/L, K=8-12g/L (azote immédiatement disponible).
Doses recommandées t/ha : riz 3-5t, maïs 5-8t, maraîchage 15-20t, haricot 4-6t.`,
    ingredients: [
      'Fumier zébu composté : apport de base universel',
      'Fumier volaille composté : renforcement azoté (mélanger paille 3:1 avant compostage)',
      'Urine zébu : azote rapide en solution, utiliser en cours de végétation',
      'Paille de riz pour litière et compostage (ratio 1 paille pour 3 fumier)',
    ],
    steps: [
      'COLLECTE : Ramasser quotidiennement (éviter lessivage par pluie)',
      'STOCKAGE ZÉBU : Sous abri couvert, mélanger paille 2-3cm, andain 1m hauteur',
      'COMPOSTAGE : 6-8 semaines sous bâche (humide mais pas trempé)',
      'TEST MATURITÉ : Odeur terre, brun-noir, plus de chaleur perceptible',
      'ÉPANDAGE : Incorporer au sol 2-3 semaines avant plantation',
      'DOSE SOL MARAÎCHER : 3-4 kg/m² incorporé + 1 kg/m² surface après plantation',
      'URINE ZÉBU : 1L urine + 20L eau, arroser en végétation',
    ],
    tips: [
      'Mélange optimal : fumier zébu 80% + fumier volaille 20%',
      'Guano chauve-souris : 0.5 kg/m² maximum (ultra-concentré)',
      'Cendre cuisine mélangée au fumier : K+ additionnel + ajustement pH',
      'Saison des pluies : couvrir IMPÉRATIVEMENT (perte 40-60% N et K en 24h)',
    ],
    mistakes: [
      'Fumier volaille frais directement : brûlure totale en 48h',
      'Fumier zébu frais sur semis : graines mauvaises herbes + risque E. coli',
      'Stocker à découvert saison des pluies : lessivage total des nutriments solubles',
      'Urine non diluée : sel et ammoniaque tuent les microbes du sol',
    ],
    duration: '6-8 semaines compostage',
    npk_ratio: 'N:0.85 P:0.55 K:0.80 (zébu composté)',
    best_for_crops: ['riz', 'maïs', 'manioc', 'haricot', 'arachide', 'patate douce', 'maraichage'],
    difficulty: 'facile', cost: 'très faible',
  },

  {
    title: 'SCV — Engrais verts Mucuna/Vigna/Stylosanthes (CIRAD Madagascar)',
    category: 'engrais_vert', region: 'Madagascar', climate: 'tropical',
    fertilizer_name: 'Engrais verts SCV',
    content: `SCV (Semis sur Couverture Végétale) développé CIRAD-AFD Madagascar depuis 2000.
Mucuna pruriens : fixation N=100-200 kgN/ha/an, biomasse 8-15 t MS/ha. Équivalent 120-150 kg urée/ha économisé.
Vigna unguiculata (niébé) : fixation N=60-100 kgN/ha/an, comestible (double valorisation).
Stylosanthes guianensis : pérenne, fixation N=80-120 kgN/ha/an, résiste sécheresse.
Résultats terrain BVPI-SE/HP 2015 : +45% rendement riz pluvial après 2 ans SCV avec Mucuna.
Semences Mucuna : FIFAMANOR Antsirabe 15 000 Ar/kg.`,
    ingredients: [
      'Semences Mucuna pruriens (FIFAMANOR Antsirabe)',
      'Semences Vigna unguiculata/niébé (marchés locaux)',
      'Semences Stylosanthes guianensis (CIRAD, MAEP)',
      'Machette/faucille pour fauchage',
    ],
    steps: [
      'CALENDRIER : Semer plante de couverture début saison pluies (oct-nov)',
      'MUCUNA : 3-4 graines/poquet, espacement 50x50cm, 15-20 kg semences/ha',
      'CROISSANCE : 90-120 jours (couverture totale sol, étouffement adventices)',
      'FAUCHE : Couper 3-4 semaines avant semis culture principale',
      'MULCH SURFACE : Laisser biomasse fauchée EN SURFACE (pas de labour SCV)',
      'SEMER EN DIRECT dans mulch avec bâton plantoir ou semoir manuel',
      'Décomposition lente mulch libère N progressivement, protège sol érosion',
      'Année 2+ : semer directement sans préparation sol (sol vivant préservé)',
    ],
    tips: [
      'Mucuna + maïs en association intercalaire = combinaison gagnante',
      'Vigna = double usage engrais vert + alimentation famille',
      'Stylosanthes pérenne : garder touffes sur parcelle, se resème seul',
      'SCV + fumier zébu : complémentaires, ne pas choisir l\'un ou l\'autre',
    ],
    mistakes: [
      'Enfouir biomasse Mucuna : perd effet couverture anti-érosion',
      'Laisser Mucuna monter à graine sans contrôle (envahissement)',
      'Labourer après SCV : détruit structure sol reconstruite par vers de terre',
      'Planter culture trop tôt après fauche : chaleur et gaz toxiques pour semis',
    ],
    duration: '90-120 jours croissance engrais vert',
    npk_ratio: 'N:2.5-3.5 P:0.4 K:2.0 (Mucuna biomasse fraîche)',
    best_for_crops: ['riz pluvial', 'maïs', 'manioc', 'sorgho', 'arachide'],
    difficulty: 'moyen', cost: 'très faible',
  },

  {
    title: 'Diagnostic des carences minérales par symptômes visuels',
    category: 'nutriment', region: 'Global', climate: 'tous',
    fertilizer_name: 'Diagnostic carences visuelles',
    content: `Guide diagnostic terrain carences minérales.
AZOTE (N) — carence la plus courante : jaunissement feuilles INFÉRIEURES (N mobile), plant chétif. Correction : purin ortie (rapide), fumier composté (lent).
PHOSPHORE (P) : coloration rouge-violacée tiges et face inférieure feuilles, racines peu développées. Correction : compost mûr, poudre d\'os, phosphate naturel.
POTASSIUM (K) : nécrose bords feuilles SUPÉRIEURES (K immobile), sensibilité maladies. Correction : cendres bois (40-50% K2O), purin comfrey.
CALCIUM (Ca) : déformation nouvelles feuilles (APEX), tip-burn laitues. Correction : chaux agricole.
MAGNÉSIUM (Mg) : chlorose internervaire feuilles ÂGÉES, nervures vertes. Correction : dolomite.
FER (Fe) : chlorose internervaire JEUNES feuilles (Fe immobile), sol trop alcalin. Correction : soufre pour acidifier.
BORE (B) : déformation bourgeons terminaux, fruits malformés. Correction : borax 1g/10L.
Règle : vieilles feuilles = éléments mobiles (N,P,K,Mg). Jeunes feuilles = éléments immobiles (Ca,Fe,B).`,
    ingredients: [
      'Correctif N : purin ortie 1:10, fumier composté, farine de sang',
      'Correctif P : compost mûr, phosphate naturel de roche, poudre d\'os torréfiée',
      'Correctif K : cendres de bois, purin de comfrey',
      'Correctif Ca/Mg : dolomite (Ca+Mg), chaux vive (Ca seulement)',
    ],
    steps: [
      'Observer : vieilles ou jeunes feuilles affectées en premier ?',
      'Vieilles feuilles = carence N, P, K ou Mg (éléments mobiles)',
      'Jeunes feuilles déformées = carence Ca, Fe, B, Mn (éléments immobiles)',
      'Jaunissement complet feuille = N ou S',
      'Jaunissement inter-nervaire (nervures vertes) = Mg (âgées) ou Fe (jeunes)',
      'Nécrose des bords = K ou sel (test : verser eau sur sol, goûter)',
      'Appliquer correctif : liquide (effet 48-72h) vs solide (2-3 semaines)',
    ],
    tips: [
      'Carences souvent dues au pH : pH > 7.5 bloque Fe, Mn, B même si présents dans sol',
      'Test pH rapide : vinaigre sur sol (effervescence = alcalin) ou bicarbonate (effervescence = acide)',
      'Carence multiple fréquente : sol épuisé après maïs → corriger avec compost + fumier',
    ],
    mistakes: [
      'Traiter carence sans connaître pH sol : apport Fe inutile si pH > 7.5',
      'Confondre carence et maladie : chlorose virale vs carence Fe = même aspect',
      'Sur-corriger N à la floraison : pousse végétative au détriment fruits/graines',
    ],
    duration: 'Diagnostic immédiat, correction 48h à 3 semaines',
    npk_ratio: 'Variable selon carence diagnostiquée',
    best_for_crops: ['toutes cultures', 'maraichage', 'riz', 'maïs', 'tomate'],
    difficulty: 'moyen', cost: 'faible à moyen',
  },

  {
    title: 'Biochar — fabrication et utilisation en sol tropical dégradé',
    category: 'technique', region: 'Global', climate: 'tropical',
    fertilizer_name: 'Biochar activé',
    content: `Charbon végétal pyrolysé 400-700°C en oxygène limité.
Surface spécifique 200-400 m²/g : héberge communautés microbiennes, retient eau 50-300% de son poids.
OBLIGATOIREMENT charger en nutriments avant utilisation (2-4 semaines dans purin ortie ou compost).
Biochar seul est quasi inerte (C/N > 200) : absorbe nutriments du sol, effet dépressif.
Dose : 0.5-2.5 t/ha maximum (excès bloque P, modifie pH).
Sol sableux tropical dégradé : effet +40-60% rétention eau. Sol argilo-limoneux : peu bénéfique.
Séquestration C : stable > 1000 ans dans sol.`,
    ingredients: [
      'Bois sec (branches, tiges maïs, bambou) : matière première',
      'Fût métallique 200L OU méthode fosse conique ("cone pit")',
      'Eau pour éteindre la pyrolyse',
      'Purin d\'ortie ou compost liquide pour activation (obligatoire)',
    ],
    steps: [
      'MÉTHODE CONE PIT : Creuser fosse conique 50cm profondeur',
      'Allumer feu branchages fins au fond, laisser braise former',
      'Ajouter progressivement bois en couches, toujours EN AVANCE sur flammes',
      'Fumée blanche = pyrolyse active (bon). Fumée noire = combustion incomplète (mauvais)',
      'Quand fosse remplie braise incandescente : éteindre eau abondante IMMÉDIATEMENT',
      'Biochar formé quand braises noires et froides',
      'ACTIVATION : Immerger biochar dans purin ortie dilué 1:10 pendant 2 semaines',
      'Mélanger biochar activé + compost : 10% biochar + 90% compost',
      'Appliquer 500g-1kg/m² incorporé lors préparation sol',
    ],
    tips: [
      'Jamais biochar seul : lessivage K et Na, alcalinisation sol, effet négatif',
      'Mélange idéal : 1 vol biochar + 5 vol compost + 2 vol terre = "super soil"',
      'En substrat semis : 5-10% volume améliore drainage et aération',
      'Tester 10m² avant application tout le champ : sols réagissent différemment',
    ],
    mistakes: [
      'Biochar non activé : absorbe nutriments sol, effet dépressif premières cultures',
      'Dose excessive > 3 t/ha : bloque absorption phosphore',
      'Bois carbonisé en surface = pas du biochar (transformation incomplète)',
    ],
    duration: 'Fabrication 2-4h, activation 2 semaines, persistance > 100 ans',
    npk_ratio: 'Quasi nul — activateur sol et rétenteur nutriments',
    best_for_crops: ['toutes cultures sol dégradé', 'riz pluvial', 'maïs sol sableux'],
    difficulty: 'avancé', cost: 'faible',
  },

  // ── PISCICULTURE ─────────────────────────────────────────────
  {
    title: 'Pisciculture en étang : fertilisation organique et alimentation naturelle',
    category: 'pisciculture', region: 'Afrique tropicale', climate: 'tropical',
    fertilizer_name: 'Fertilisation étang piscicole',
    content: `La fertilisation organique des étangs piscicoles stimule la production de phytoplancton et zooplancton
qui constituent la base alimentaire naturelle des poissons. Source CIRAD/FAO AquaCulture (2020) :
l'apport de fumier bovin à raison de 250-500 kg/ha/semaine augmente la production de tilapia de 40-60%.
L'azote du fumier fertilise le phytoplancton (algues vertes, diatomées) qui nourrit le zooplancton,
lui-même consommé par les poissons. Espèces adaptées Afrique tropicale : Tilapia niloticus (Oreochromis niloticus),
Clarias gariepinus (silure africain), Heterotis niloticus.
Rendement étang fertilisé organiquement : 800-2000 kg/ha/an vs 300-500 kg/ha/an sans intrant.
Densité d'empoissonnement : 2-3 alevins/m² pour étang fertilisé organique.`,
    ingredients: [
      'Fumier bovin ou porcin frais OU composté : 250-500 kg/ha/semaine',
      'Fientes de volaille : 100-200 kg/ha/semaine (plus concentré)',
      'Plantes aquatiques (lentilles d\'eau, azolla) : biomasse verte flottante',
      'Chaux agricole : 200 kg/ha pour désinfection avant mise en eau',
      'Compost végétal : 500 kg/ha en début de saison pour démarrage',
    ],
    steps: [
      'PRÉPARATION : Assécher et chauler l\'étang 2 semaines avant mise en eau (200 kg/ha chaux)',
      'FERTILISATION DÉMARRAGE : Épandre 500 kg/ha de fumier composté sur fond d\'étang sec',
      'MISE EN EAU : Remplir progressivement, laisser verdir 10-15 jours avant empoissonnement',
      'Couleur eau verte-brunâtre = phytoplancton dense = bon. Eau claire = insuffisamment fertilisée',
      'EMPOISSONNEMENT : Introduire 2-3 alevins/m² quand eau bien verte',
      'FERTILISATION ENTRETIEN : Épandre fumier frais 250-500 kg/ha chaque semaine uniformément',
      'CONTRÔLE OXYGÈNE : Matin tôt = risque asphyxie si trop de fumier. Observer comportement des poissons',
      'RÉCOLTE : Après 6-8 mois selon espèce, vider étang et récolter. Boue = excellent engrais pour champs',
    ],
    tips: [
      'Boue de fond d\'étang après récolte : compost très riche, N=2.5%, excellent pour maraîchage',
      'Association riz-poisson : introduire tilapias dans rizières inondées = contrôle adventices + protéines',
      'Azolla (fougère aquatique fixatrice N) : doubler la croissance du phytoplancton gratuitement',
      'Si eau trop verte/noire : réduire apports, ouvrir vannes partiellement (excès ammoniaque)',
      'Canards sur étang : fertilisation gratuite + contrôle insectes + production œufs',
    ],
    mistakes: [
      'Trop de fumier d\'un coup : consommation O2 nocturne excessive, asphyxie des poissons',
      'Fumier de porc en excès : toxique pour poissons à forte dose (métaux lourds)',
      'Négliger la chaux avant empoissonnement : pathogènes, faible production',
      'Étang trop peu profond (< 80cm) : variations température létales + eau trop chaude en saison sèche',
    ],
    duration: '6-8 mois par cycle de production',
    npk_ratio: 'N:0.45 P:0.25 K:0.40 (fumier bovin appliqué)',
    best_for_crops: ['tilapia', 'silure', 'carpe', 'hétérotis'],
    difficulty: 'moyen', cost: 'faible',
  },

  {
    title: 'Aquaponie : intégration poisson-plante en circuit fermé',
    category: 'pisciculture', region: 'Afrique tropicale', climate: 'tous',
    fertilizer_name: 'Système aquaponique',
    content: `L'aquaponie combine l'élevage de poissons et la culture de plantes hors-sol en circuit fermé.
Les déjections des poissons (ammoniaque NH4) sont converties par des bactéries nitrifiantes (Nitrosomonas,
Nitrobacter) en nitrates NO3 assimilables par les plantes. Rendements aquaponie (source FAO 2019) :
eau consommée 90% moins qu'agriculture conventionnelle, surface 5x moins qu'agriculture soil.
Tilapia du Nil = espèce recommandée Afrique : résistant, croissance rapide, herbivore, tolère densité élevée.
Ratio poissons/plantes : 1 kg de poisson produit assez de nutriments pour 6-8 plants de tomate.
pH optimal : 6.8-7.2. Température eau : 22-28°C pour tilapia.`,
    ingredients: [
      'Bac poissons : 500L minimum (IBC récupéré ou béton)',
      'Bac culture (grow bed) : 50-100L de substrat (gravier 10-20mm, argile expansée)',
      'Pompe submersible : débit 2x volume bac poissons/heure',
      'Tilapia du Nil alevins (Oreochromis niloticus) : 20-30 poissons/m³',
      'Semences légumes adaptés : tomate, laitue, basilic, épinard, concombre',
    ],
    steps: [
      'CYCLAGE (4-6 semaines) : Lancer le système sans poissons, ajouter ammoniaque pure ou urine',
      'Attendre apparition Nitrosomonas (NO2 monte puis descend) puis Nitrobacter (NO3 monte)',
      'Eau prête quand : NO2=0, NO3 détectable, ammoniaque=0',
      'EMPOISSONNEMENT : Introduire 5-10 tilapias/m³ en phase démarrage, monter progressivement',
      'ALIMENTATION : 1-2% du poids corporel des poissons par jour en aliment pellets',
      'PLANTATION : Semer en pépinière sur substrat humide, repiquer à 2-3 semaines dans grow bed',
      'ENTRETIEN QUOTIDIEN : Nourrir poissons, vérifier pH et températures, observer comportements',
      'RÉCOLTE : Laitues 4-6 semaines, tomates 8-12 semaines, poissons 6-8 mois',
    ],
    tips: [
      'Laitue, cresson, basilic = cultures les plus faciles et rentables pour démarrer',
      'pH bas (< 6.5) : ajouter bicarbonate de soude. pH haut (> 7.5) : ajouter vinaigre blanc',
      'Compléter les minéraux manquants (Fe, Ca, K) avec chélates organiques si plantes jaunissent',
      'Vers de compost dans les grow beds : améliorent la décomposition des matières solides',
      'Commencer petit (200L) pour apprendre avant de scale up',
    ],
    mistakes: [
      'Sur-nourrir les poissons : ammoniaque explose, poissons meurent en 24h',
      'Changer plus de 20% de l\'eau d\'un coup : choc osmotique pour les poissons',
      'Ajouter poissons avant fin du cyclage : ammoniaque toxique',
      'Manque d\'aération : O2 insuffisant pour poissons ET bactéries nitrifiantes',
    ],
    duration: 'Cyclage 4-6 semaines, premier récolte légumes 6-8 semaines',
    npk_ratio: 'Fourni par les poissons selon alimentation',
    best_for_crops: ['laitue', 'tomate', 'basilic', 'cresson', 'concombre', 'poivron'],
    difficulty: 'avancé', cost: 'moyen',
  },

  {
    title: 'Pisciculture en cage flottante — lacs et retenues d\'eau',
    category: 'pisciculture', region: 'Afrique tropicale', climate: 'tropical',
    fertilizer_name: 'Élevage en cage flottante',
    content: `L'élevage en cage flottante utilise les plans d'eau naturels (lacs, retenues, barrages) pour produire
du poisson à haute densité sans construction d'étang. Adapté aux lacs de barrage nombreux en Afrique de l'Ouest
et Afrique Centrale. Lac Volta (Ghana) : 80 000 tonnes/an de tilapia en cages flottantes.
Cage standard : 5x5x2m = 50m³. Densité : 50-100 kg de tilapia/m³ en système semi-intensif.
Alimentation : aliments composés 28-32% protéines OU aliments locaux (son riz + farine poisson).
Cycle production : 6-8 mois pour tilapia de 300-500g poids marchand.
Coût construction cage bambou local : 50 000-100 000 Ar ou équivalent CFA.`,
    ingredients: [
      'Filets moustiquaire ou filet nylon 12-16mm maille pour cage',
      'Bambou ou PVC pour armature flottante',
      'Bouées (bidons vides, styrofoam) pour flottabilité',
      'Alevins tilapia certifiés mono-sexe mâle (croissance 2x plus rapide)',
      'Aliment pellété 28-32% protéines OU son riz + farine termites/vers de terre',
    ],
    steps: [
      'CONSTRUCTION CAGE : Armature bambou 5x5m, filet nylon autour, ancrage fond avec corde',
      'CHOISIR EMPLACEMENT : Eau 3-5m profondeur, courant modéré, loin des berges polluées',
      'EMPOISSONNEMENT : 200-300 alevins/m³ pour phase démarrage (50g/poisson)',
      'ALIMENTATION : 3% du poids corporel/jour, 2 repas matin et soir',
      'CONTRÔLE HEBDOMADAIRE : Peser 20 poissons au hasard, adapter ration alimentaire',
      'NETTOYAGE CAGE : Nettoyer filets toutes les 2 semaines (colmatage par algues)',
      'TRI/CALIBRAGE : À 4 mois, séparer gros et petits poissons (compétition alimentaire)',
      'RÉCOLTE : Vider cage quand poissons atteignent 300-500g, vendre frais ou fumer',
    ],
    tips: [
      'Aliment local économique : son riz 60% + farine termites 20% + sons de légumineuses 20%',
      'Termites = 45-55% protéines, collectables gratuitement en brousse',
      'Groupement de pisciculteurs : mutualiser l\'achat d\'alevins et la vente = meilleur prix',
      'Fumage du poisson : valorisation locale, conservation 2-3 semaines sans réfrigération',
    ],
    mistakes: [
      'Alevins non sexés : femelles reproductrices surpeuplent la cage, croissance divisée par 3',
      'Ration trop élevée : gaspillage alimentaire, pollution de l\'eau, mort par excès NH4',
      'Cage en zone stagnante : O2 insuffisant, mortalité massive',
      'Négliger le nettoyage des filets : colmatage → O2 insuffisant',
    ],
    duration: '6-8 mois par cycle',
    npk_ratio: 'N/A — production animale',
    best_for_crops: ['tilapia', 'silure', 'carpe commune'],
    difficulty: 'moyen', cost: 'moyen',
  },

  // ── APICULTURE ───────────────────────────────────────────────
  {
    title: 'Apiculture africaine : ruche kenyane (KTB) et production de miel',
    category: 'apiculture', region: 'Afrique tropicale', climate: 'tropical',
    fertilizer_name: 'Apiculture avec ruche kenyane KTB',
    content: `La ruche kenyane à barrettes (Kenya Top Bar Hive - KTB) est le système le plus adapté à l'apiculture
africaine traditionnelle modernisée. Fabriquée localement en bois, elle coûte 5-10x moins qu'une ruche Langstroth
importée et s'adapte à l'abeille africaine (Apis mellifera scutellata) plus agressive mais plus productive
en milieu tropical. Production KTB : 10-20 kg de miel/ruche/an selon floraison locale.
Les abeilles africaines sont les meilleures pollinisatrices pour les cultures tropicales :
cacao, café, mangue, avocat, macadamia voient leur rendement augmenter de 20-40% avec pollinisation apicole.
Lien direct agriculture-apiculture : les engrais verts fleuris (Tithonia, Crotalaria, Calliandra)
sont d'excellentes plantes mellifères.`,
    ingredients: [
      'Bois local non résineux et non traité (acajou, eucalyptus) pour la ruche',
      'Barrettes de bois 3.2cm largeur × longueur interne ruche',
      'Loque américaine/européenne : traitement thymol ou acide oxalique si contamination',
      'Combinaison protection, voile, gants',
      'Enfumoir avec combustible (sciure, feuilles sèches)',
    ],
    steps: [
      'CONSTRUCTION KTB : Caisse trapézoïdale 90cm long × 30cm haut, pente 30°, 25-30 barrettes',
      'INSTALLATION : Poser la ruche à 80cm du sol, ombre partielle, face à l\'est (soleil matin)',
      'CAPTURE ESSAIM : Frotter la ruche avec cire+citronnelle. Placer en avril-mai (début essaimage)',
      'INSPECTION MENSUELLE : Ouvrir côté opposé au couvain, enfumer, soulever barrettes délicatement',
      'RÉCOLTE MIEL : Prélever barrettes de miel (operculées) côté opposé à la reine',
      'Couper les rayons de miel, presser dans tamis, laisser décanter 48h',
      'HIVERNAGE/SAISON SÈCHE : Réduire l\'entrée de la ruche, laisser réserves de miel suffisantes',
      'DIVISION : Quand ruche forte (20+ barrettes occupées), créer une colonie fille',
    ],
    tips: [
      'Planter autour des ruches : Tithonia diversifolia, Calliandra, Crotalaria = mellifères + engrais verts',
      'Ne jamais utiliser pesticides dans un rayon de 3km des ruches',
      'Miel brut non chauffé = meilleur prix, propriétés thérapeutiques conservées',
      'Cire d\'abeille : cosmétique, bougies, imperméabilisation - valorisation complémentaire',
      'Ruche KTB peut être fabriquée par un charpentier local en 1 journée',
    ],
    mistakes: [
      'Ouvrir la ruche en plein soleil aux heures chaudes : abeilles très agressives',
      'Récolter trop de miel : laisser impérativement 30-40% comme réserve pour la colonie',
      'Utiliser bois résineux (pin, sapin) : les abeilles abandonnent',
      'Négliger le varroa (parasite) : traitement acide oxalique 1x/an en période sans couvain',
    ],
    duration: 'Premier miel en 3-6 mois après installation',
    npk_ratio: 'N/A — production miel + pollinisation',
    best_for_crops: ['pollinisation café', 'cacao', 'mangue', 'avocat', 'toutes cultures fleuries'],
    difficulty: 'moyen', cost: 'faible',
  },

  {
    title: 'Apiculture : production de cire, propolis et pain d\'abeilles',
    category: 'apiculture', region: 'Afrique tropicale', climate: 'tous',
    fertilizer_name: 'Produits de la ruche — valorisation complète',
    content: `Au-delà du miel, la ruche produit des substances à haute valeur ajoutée largement sous-exploitées
en Afrique. Propolis : résine antibactérienne collectée par les abeilles, N=1.8% protéines, flavonoïdes
actifs, prix mondial 30-80 USD/kg. Cire d'abeille : 100% valorisable (cosmétique, bougies, batik, lutherie).
Rendement cire : 1 kg cire pour 6-8 kg miel produit. Pain d'abeilles (pollen fermenté) : protéines=20-35%,
richesse en acides aminés essentiels, marché santé en pleine croissance. Gelée royale : 200-400 USD/kg,
production difficile nécessitant équipement spécialisé. Le lien engrais-apiculture est fort :
une haie de Calliandra calothyrsus produit 15-20 kg miel/ha/an en plus de fixer l'azote.`,
    ingredients: [
      'Trappes à pollen (grille en entrée de ruche) pour récolte pollen',
      'Trappes à propolis (grille plastique perforée en dessus cadres)',
      'Presse à cire ou casserole + eau pour fondre la cire',
      'Filtres tamis maille fine pour purifier cire et miel',
    ],
    steps: [
      'RÉCOLTE PROPOLIS : Poser grille propolis sur cadres, les abeilles colmatent les trous',
      'Gratter la propolis quand la grille est bien couverte (4-8 semaines)',
      'Congeler la grille : la propolis devient cassante et se détache facilement',
      'RÉCOLTE POLLEN : Installer trappe à pollen 2-3 jours/semaine maximum (ne pas affamer les larves)',
      'Sécher le pollen à 40°C max 24h pour conservation (sinon fermente)',
      'EXTRACTION CIRE : Faire fondre les vieux rayons dans eau chaude, écumer, filtrer, mouler',
      'PROPOLIS BRUTE : Dissoudre dans alcool à 70° (10% propolis) = teinture mère utilisable',
      'VALORISATION : Vente directe marché, cosmétique artisanale, pharmacies traditionnelles',
    ],
    tips: [
      'Propolis locale = composition unique selon la flore = argument de vente différenciant',
      'Pollen frais peut être consommé immédiatement ou congelé (conservation 1 an)',
      'Cire d\'abeille échangeable avec menuisiers, artisans : troc local sans argent',
      'Groupement apiculteurs : certifier miel bio ensemble = accès marchés export',
    ],
    mistakes: [
      'Chauffer miel > 40°C : destruction enzymes et arômes, perd la valeur "brut"',
      'Installer trop de trappes à pollen : affaiblit la colonie et la reine pond moins',
      'Mélanger miels de différentes floraisons : perd la traçabilité et le label "monofloral"',
    ],
    duration: 'Variable selon produit : pollen en continu, cire lors des récoltes',
    npk_ratio: 'N/A — produits de la ruche',
    best_for_crops: ['pollinisation toutes cultures', 'marchés miel-propolis-cire'],
    difficulty: 'moyen', cost: 'très faible',
  },

  {
    title: 'Synergie apiculture-agriculture : abeilles et fertilisation organique',
    category: 'apiculture', region: 'Afrique tropicale', climate: 'tous',
    fertilizer_name: 'Intégration abeilles-cultures-engrais verts',
    content: `La synergie entre apiculture et agriculture biologique est documentée par de nombreuses études.
FAO (2018) : la pollinisation par les abeilles augmente les rendements de 20-40% pour cacao, café, tournesol,
colza, légumineuses. L'abeille africaine est 30% plus efficace que l'abeille européenne pour les fleurs tropicales.
Les engrais verts mellifères créent un cercle vertueux : ils fixent l'azote ET nourrissent les abeilles.
Calliandra calothyrsus : fixe 100-200 kgN/ha/an + produit 15 kg miel/ha/an.
Tithonia diversifolia : engrais vert ultra-riche en K ET source mellifère majeure.
Mucuna pruriens : fixe l'azote mais peu mellifère (fleurs peu accessibles).
Les déjections des abeilles et la décomposition des rayons de cire abandonnés enrichissent le sol sous les ruches.`,
    ingredients: [
      'Plantes mellifères doubles usage : Calliandra, Tithonia, Leucaena, Gliricidia',
      'Haies vives mellifères en bordure de parcelles agricoles',
      'Ruches KTB placées stratégiquement dans les champs',
    ],
    steps: [
      'PLANIFICATION : Placer les ruches à moins de 500m des cultures à polliniser',
      'PLANTER HAIES MELLIFÈRES : Calliandra en bordure de parcelles + Tithonia entre rangs',
      'CALENDRIER : Coordonner floraison des cultures avec période de miellée forte',
      'Éviter tous pesticides 3 jours avant et pendant floraison des cultures',
      'ROTATION : Faire tourner les ruches selon calendrier de floraison régional',
      'MESURER L\'IMPACT : Compter les abeilles visitant les fleurs en début vs fin de saison',
    ],
    tips: [
      'Clôturer les ruches avec Gliricidia sepium (repousse le bétail ET nourrit les abeilles)',
      'Les agriculteurs bio peuvent louer leurs ruches aux arboriculteurs au moment de floraison',
      'Signaler aux voisins la présence de ruches : réduire l\'usage de pesticides de toute la zone',
      'Label "miel de Tithonia" ou "miel de Calliandra" = produit haut de gamme valorisable',
    ],
    mistakes: [
      'Traiter les cultures avec insecticides pendant floraison : tuerie massive des colonies',
      'Placer les ruches trop loin des cultures (> 1km) : pollinisation insuffisante',
      'Ignorer la floraison sauvage environnante : elle définit la qualité et la saveur du miel',
    ],
    duration: 'Bénéfices pollinisation dès la 1ère saison de floraison',
    npk_ratio: 'N/A — service de pollinisation + engrais verts associés',
    best_for_crops: ['café', 'cacao', 'mangue', 'avocat', 'légumineuses', 'tournesol', 'coton'],
    difficulty: 'facile', cost: 'très faible',
  },

  // ── RÉGIONS ÉLARGIES — Afrique de l'Ouest ───────────────────
  {
    title: 'Fertilisation organique du cacao — Afrique de l\'Ouest (Côte d\'Ivoire, Ghana)',
    category: 'culture', region: 'Afrique de l\'Ouest', climate: 'tropical humide',
    fertilizer_name: 'Fertilisation organique cacaoyer',
    content: `La cacaoculture d'Afrique de l'Ouest représente 70% de la production mondiale. Le cacaoyer
(Theobroma cacao) est une plante de sous-bois tropical qui répond exceptionnellement bien aux apports
organiques. Déficiences majeures relevées par ICCO (2022) : K, Mg, B et Zn dans 80% des exploitations.
Dose compost recommandée : 10-15 kg/arbre/an incorporé au pied (rayon 1m du tronc).
Mulch de cosses de cacao : 30-40 kg de cosses fraîches/arbre/an = N:0.5%, K:0.8%, retour 60-70% des
nutriments exportés par la récolte. Association avec légumineuses fixatrices (Gliricidia sepium,
Leucaena) = 80-120 kgN/ha/an apporté sans intrant.`,
    ingredients: [
      'Cosses de cacao fermentées 6-8 semaines : 30-40 kg/arbre/an',
      'Compost organique : 10-15 kg/arbre/an en application au pied',
      'Gliricidia sepium ou Leucaena leucocephala comme ombrage fixateur N',
      'Cendres de bois : 200g/arbre 2x/an pour K et Ca',
    ],
    steps: [
      'MULCH COSSES : Collecter cosses après extraction fèves, broyer ou couper, déposer 10-15cm autour des arbres',
      'FERMENTATION COSSES (optionnel) : Tas de cosses 6-8 semaines avec retournements → compost spécialisé cacao',
      'COMPOSTAGE FERMENTIER : Mélange cosses + fientes volaille 3:1, 8 semaines, 15 kg/arbre/an',
      'LÉGUMINEUSES : Planter Gliricidia entre les rangées de cacaoyers, tailler 3x/an, déposer biomasse au sol',
      'APPLICATION : En début et fin de grande saison des pluies (2x/an)',
      'APICULTURE : Installer ruches dans cacaoyère = pollinisation +25-35% rendement',
    ],
    tips: [
      'Cosses de cacao fraîches contiennent des anthocyanes antibactériennes : très bon paillage',
      'Gliricidia : ombrage naturel + légumineuse fixatrice + mellifère + bois de chauffe',
      'Certification bio premium : +20-40% prix vente sur marchés européens',
      'Fèves de cacao fermentées et séchées sous mulch = meilleure qualité aromatique',
    ],
    mistakes: [
      'Cosses fraîches non fermentées directement sur sol humide : Phytophthora (maladie fongique grave)',
      'Surcharger en N sans K et Mg : crops de cabosses vides sans fèves',
      'Défricher l\'ombrage naturel : cacaoyer plein soleil = stress hydrique, rendement divisé par 2',
    ],
    duration: 'Application 2x/an, bénéfices visibles dès 6 mois',
    npk_ratio: 'N:0.5 P:0.3 K:0.8 (cosses fermentées)',
    best_for_crops: ['cacao', 'café sous ombrage', 'poivre', 'vanille'],
    difficulty: 'facile', cost: 'très faible',
  },

  {
    title: 'Fertilisation organique du café — Éthiopie, Kenya, Afrique Centrale',
    category: 'culture', region: 'Afrique de l\'Est', climate: 'tropical altitude',
    fertilizer_name: 'Fertilisation organique caféier',
    content: `Le café (Coffea arabica, C. robusta) est la première exportation de nombreux pays africains.
Éthiopie (berceau du café), Kenya, Ouganda, Tanzanie : 60% du café africain. Le caféier pousse en altitude
(800-2000m), sous ombrage, sol légèrement acide pH 5.5-6.5. Besoins NPK élevés à la fructification :
N=150-180 kgN/ha/an, K=120-150 kgK/ha/an, P=30-40 kgP/ha/an.
Compost de pulpe de café : NPK = N:2.3%, P:0.5%, K:2.8% — retourne 80% des nutriments exportés.
Association Coffea + Macadamia + Grevillea = système agroforestier très rentable.`,
    ingredients: [
      'Pulpe de café fermentée (dépulpeur) : 15-20 kg/arbre/an',
      'Compost enrichi : pulpe café + fumier volaille 3:1',
      'Gliricidia ou Grevillea en ombrage-fertilisation',
      'Chaux dolomitique si pH < 5.5 : 200-400 kg/ha',
    ],
    steps: [
      'COMPOSTAGE PULPE : Tas de pulpe + fumier 3:1, retourner 3x en 3 mois',
      'APPLICATION : 10-15 kg compost/arbre en 2 apports (début pluies + fin pluies)',
      'MULCH PERMANENT : 10-15cm de paille, feuilles mortes ou pulpe séchée autour du pied',
      'LÉGUMINEUSES : Planter Gliricidia entre rangs, tailler 2x/an en couronne au sol',
      'GESTION OMBRAGE : 30-40% ombrage optimal (Grevillea, Macadamia, Avocatier)',
    ],
    tips: [
      'Pulpe de café compostée = meilleur amendement pour caféier, mieux que tout engrais chimique',
      'Label "café d\'ombrage" + "bio" = prix 2-3x supérieur au café conventionnel',
      'Eau de lavage des cerises (eau de dépulpage) = biofertilisant liquide dilué 1:5',
      'Les fèves de café triées (défauts) = aliment pour lapins + fumier retour',
    ],
    mistakes: [
      'Pulpe fraîche directement au pied : phytotoxique, brûlure racinaire + attraction nuisibles',
      'Fertiliser sans ombrage : caféier stressé, rendement et qualité chutent',
      'pH trop élevé (> 6.8) : carence en manganèse et zinc, feuilles malformées',
    ],
    duration: 'Application 2x/an, bénéfices complets après 2 saisons',
    npk_ratio: 'N:2.3 P:0.5 K:2.8 (pulpe café compostée)',
    best_for_crops: ['café arabica', 'café robusta', 'épices sous ombrage'],
    difficulty: 'facile', cost: 'très faible',
  },

  {
    title: 'Maraîchage biologique en zone sahélienne — Burkina, Mali, Niger, Sénégal',
    category: 'technique', region: 'Afrique de l\'Ouest Sahel', climate: 'semi-aride',
    fertilizer_name: 'Fertilisation maraîchage sahélien',
    content: `Le maraîchage sahélien fait face à des contraintes spécifiques : sols sableux pauvres en MO (<0.5%),
pluies concentrées 3-4 mois/an, chaleur extrême (40-45°C). La technique du zaï (poquets de plantation avec
apport organique concentré) multiplie les rendements par 2-5 sur sols dégradés.
Zaï optimisé : poquet 20-30cm diamètre, 10-15cm profondeur, 250-300g de fumier composté + 50g de cendres.
Technique Demi-Lune : demi-cercle de pierres contre l'érosion = récupération eau de pluie concentrée.
Zaï + demi-lune + fumier = 30-50% de restauration des sols dégradés (étude ICRISAT 2020).
Plantes adaptées : moringa (tolérant sécheresse), niébé, sorgho, millet, gombo, oignon.`,
    ingredients: [
      'Fumier de petits ruminants (mouton, chèvre) composté : 250-300g/zaï',
      'Cendres de bois : 50g/zaï pour K + micro-organismes',
      'Moringa oleifera : feuilles comme engrais vert liquide (N=4.5%, K=1.5%)',
      'Pierres locales pour construction demi-lunes',
      'Paillage de mil ou sorgho : 5-8cm contre évaporation',
    ],
    steps: [
      'ZAÏ : Creuser poquets 30cm diamètre × 10-15cm profondeur, espacement 80×80cm',
      'REMPLISSAGE : 250-300g fumier composté + 50g cendres par poquet, mélanger avec terre',
      'DEMI-LUNE : Aligner pierres en demi-cercle de 5m rayon, côté ouvert face à la pente',
      'PLANTATION : Semer ou repiquer au fond du zaï après premières pluies',
      'MULCH : Couvrir entre les poquets avec paille pour réduire évaporation 60-70%',
      'PURIN MORINGA : Broyer 1kg feuilles moringa dans 10L eau, filtrer, diluer 1:10, arroser',
      'COMPLÉMENT LIQUIDE : Urine fermentée 15 jours diluée 1:10 = apport N rapide en saison sèche',
    ],
    tips: [
      'Moringa : planter en haie, couper à 1m, feuilles = engrais foliaire ET alimentation humaine',
      'Fosse à fumier couverte : réduit pertes N par volatilisation de 30-40% en climat chaud',
      'Termitières : ramasser la terre de termitière = engrais naturel riche en minéraux',
      'Récolter eau de pluie des toits : 1m² de toit = 100L par 100mm de pluie',
    ],
    mistakes: [
      'Zaï trop petits (< 20cm) : volume insuffisant pour stocker eau et nutriments',
      'Fumier non composté dans zaï : brûle les jeunes plants en saison chaude',
      'Paillage insuffisant : évaporation × 3, irrigation ×2 nécessaire',
      'Planter avant les pluies : semis sèche si pluie absente, replanter = perte temps',
    ],
    duration: 'Zaï préparés en saison sèche, effets dès 1ère saison',
    npk_ratio: 'N:1.2 P:0.6 K:0.9 (fumier petits ruminants composté)',
    best_for_crops: ['sorgho', 'mil', 'niébé', 'gombo', 'oignon', 'moringa'],
    difficulty: 'facile', cost: 'très faible',
  },
];

// =============================================================
// SECTION 2 — DATASET NPK LABORATOIRE
// Données analytiques mesurées : INRA, ICRISAT, FIFAMANOR, AfSIS
// =============================================================

const NPK_DATASET = [
  // FUMIERS
  { name: 'Fumier bovin frais',          cat: 'fumier',        N: 0.45, P: 0.25, K: 0.40, moisture: 78, pH: 7.2, region: 'Global',     note: 'Composter avant usage. Attention aux graines adventices.' },
  { name: 'Fumier bovin composté 8s',    cat: 'fumier',        N: 0.85, P: 0.55, K: 0.80, moisture: 35, pH: 7.0, region: 'Global',     note: 'Après 8 semaines compostage. Prêt emploi. C/N=12.' },
  { name: 'Fumier volaille frais',       cat: 'fumier',        N: 1.80, P: 1.50, K: 0.90, moisture: 55, pH: 8.0, region: 'Global',     note: 'TOUJOURS composter - brûle cultures. C/N=7.' },
  { name: 'Fumier volaille composté',    cat: 'fumier',        N: 2.20, P: 1.80, K: 1.20, moisture: 30, pH: 7.5, region: 'Global',     note: 'Plus concentré des fumiers courants. Dose 1-2 t/ha maraîchage.' },
  { name: 'Fumier porcin',              cat: 'fumier',        N: 0.65, P: 0.50, K: 0.40, moisture: 82, pH: 7.3, region: 'Global',     note: 'Compostage 3 mois minimum. Attention pathogènes.' },
  { name: 'Fumier lapin',               cat: 'fumier',        N: 2.40, P: 1.40, K: 0.80, moisture: 40, pH: 7.0, region: 'Madagascar', note: 'Utilisable frais faible dose 0.5 kg/m². Non brûlant.' },
  { name: 'Guano chauve-souris grotte', cat: 'fumier',        N: 6.00, P: 8.00, K: 1.50, moisture: 15, pH: 6.5, region: 'Madagascar', note: 'Ultra-concentré. 200g/m² maximum. Très riche en P.' },
  { name: 'Urine bovine fraîche',       cat: 'fumier',        N: 0.80, P: 0.05, K: 1.20, moisture: 95, pH: 8.5, region: 'Global',     note: 'Azote immédiatement disponible. Diluer 1:20 avant épandage.' },
  // COMPOSTS
  { name: 'Compost végétal mûr',        cat: 'compost',       N: 1.50, P: 0.80, K: 1.20, organic_matter: 45, pH: 7.0, region: 'Global',     note: 'Standard après 10-12 semaines. C/N < 15.' },
  { name: 'Vermicompost Eisenia fetida', cat: 'compost',       N: 2.80, P: 1.80, K: 1.70, organic_matter: 55, pH: 6.8, region: 'Global',     note: 'Le plus concentré. 500g/m² suffit (vs 3-5 kg/m² compost).' },
  { name: 'Compost fumier volaille',    cat: 'compost',       N: 2.00, P: 1.60, K: 1.10, organic_matter: 40, pH: 7.2, region: 'Global',     note: 'Mélanger fumier volaille + paille 1:3 avant compostage.' },
  { name: 'Compost déchets ménagers',   cat: 'compost',       N: 1.20, P: 0.60, K: 0.90, organic_matter: 42, pH: 7.1, region: 'Madagascar', note: 'Variable selon déchets. Risque métaux lourds si mixtes.' },
  // ENGRAIS VERTS — biomasse fraîche
  { name: 'Mucuna pruriens biomasse',   cat: 'engrais_vert',  N: 3.20, P: 0.35, K: 2.10, region: 'Madagascar', note: 'Fixation N 100-200 kgN/ha/an. Équivaut 120-150 kg urée/ha.' },
  { name: 'Vigna unguiculata niébé',    cat: 'engrais_vert',  N: 2.80, P: 0.38, K: 1.80, region: 'Madagascar', note: 'Double usage : engrais vert + alimentation. Fixation 60-100 kgN/ha.' },
  { name: 'Stylosanthes guianensis',    cat: 'engrais_vert',  N: 2.50, P: 0.28, K: 1.40, region: 'Madagascar', note: 'Pérenne. Résiste sécheresse. Fixation 80-120 kgN/ha/an.' },
  { name: 'Crotalaria juncea',          cat: 'engrais_vert',  N: 3.50, P: 0.40, K: 2.20, region: 'Global',     note: 'Croissance ultra-rapide. Antagoniste nématodes. 60-90 jours.' },
  { name: 'Tithonia diversifolia',      cat: 'engrais_vert',  N: 3.50, P: 0.37, K: 4.10, region: 'Global',     note: 'Tournesol mexicain. Riche en K. Couper avant floraison.' },
  // AMENDEMENTS MINÉRAUX NATURELS
  { name: 'Cendres de bois',           cat: 'technique',     N: 0.00, P: 1.50, K: 6.00, pH: 11.5, region: 'Global',     note: 'pH très alcalin. Max 100g/m². Correcteur pH acide + K.' },
  { name: 'Poudre d\'os torréfiée',    cat: 'technique',     N: 1.00, P: 12.00, K: 0.20, pH: 7.5, region: 'Global',    note: 'Phosphore lentement disponible. Fruitiers et tubercules.' },
  { name: 'Dolomite',                  cat: 'technique',     N: 0.00, P: 0.00, K: 0.00, pH: 9.5, region: 'Global',     note: 'Ca+Mg. Corriger pH acide. 200-500 kg/ha. Ne pas sur-doser.' },
  { name: 'Phosphate naturel de roche', cat: 'technique',     N: 0.00, P: 25.00, K: 0.20, pH: 7.0, region: 'Global',   note: 'Sol acide seulement (pH < 6). Disponibilité lente. 200-400 kg/ha.' },
  // BIOFERTILISANTS LIQUIDES
  { name: 'Purin ortie concentré',     cat: 'biofertilisant', N: 0.40, P: 0.10, K: 0.70, region: 'Global',     note: 'Dilution 1:10 arrosage. Azote rapide. Répulsif pucerons.' },
  { name: 'Purin comfrey concentré',   cat: 'biofertilisant', N: 0.70, P: 0.30, K: 2.10, region: 'Global',     note: 'Riche en K. Idéal fruits et tubercules. Dilution 1:10.' },
  { name: 'Bokashi leachate',          cat: 'bokashi',        N: 0.05, P: 0.05, K: 0.15, pH: 3.8, region: 'Global', note: 'Très acide. Diluer 1:100 minimum. Biostimulant microbien.' },
  { name: 'Thé de compost aéré 24h',  cat: 'biofertilisant', N: 0.10, P: 0.05, K: 0.12, region: 'Global',     note: '10^8 bactéries/mL. Effet biologique > nutritif. Utiliser < 4h.' },
  // PISCICULTURE — amendements et sous-produits
  { name: 'Boue d\'étang piscicole',   cat: 'pisciculture',   N: 2.50, P: 1.80, K: 1.20, organic_matter: 35, pH: 7.0, region: 'Afrique tropicale', note: 'Récupérée après vidange étang. Excellent amendement maraîchage. 3-5 t/ha.' },
  { name: 'Eau d\'aquaponie (effluent)', cat: 'pisciculture',  N: 0.08, P: 0.04, K: 0.10, region: 'Global',     note: 'Arrosage direct cultures. N-NO3 immédiatement assimilable. Gratuit.' },
  // APICULTURE — sous-produits valorisables
  { name: 'Cire d\'abeille brute',     cat: 'apiculture',     N: 0.00, P: 0.00, K: 0.00, region: 'Global',     note: 'Pas d\'NPK mais mulch protecteur naturel. Greffe arbres fruitiers.' },
  { name: 'Sol sous ruche (apidéchets)', cat: 'apiculture',   N: 1.20, P: 0.80, K: 0.60, organic_matter: 25, region: 'Afrique tropicale', note: 'Dépôts de cire, propolis, abeilles mortes = amendement naturel riche.' },
  // RÉGIONS SPÉCIFIQUES
  { name: 'Cosses de cacao compostées', cat: 'culture',       N: 0.50, P: 0.30, K: 0.80, organic_matter: 40, pH: 6.5, region: 'Afrique de l\'Ouest', note: 'Retourne 80% nutriments exportés. 30-40 kg/arbre/an.' },
  { name: 'Pulpe de café compostée',   cat: 'culture',        N: 2.30, P: 0.50, K: 2.80, organic_matter: 45, pH: 6.0, region: 'Afrique de l\'Est', note: 'Meilleur amendement pour caféier. 10-15 kg/arbre/an.' },
  { name: 'Fumier petit ruminant',     cat: 'fumier',         N: 1.20, P: 0.60, K: 0.90, moisture: 35, pH: 7.5, region: 'Afrique de l\'Ouest Sahel', note: 'Mouton, chèvre. Plus concentré que bovins. Zaï : 250-300g/poquet.' },
  { name: 'Terre de termitière',       cat: 'technique',      N: 0.15, P: 0.20, K: 0.30, organic_matter: 8, pH: 7.8, region: 'Afrique tropicale', note: 'Riche en minéraux et microorganismes. Ajouter 500g/zaï ou 200 kg/ha.' },
] as const;

// =============================================================
// SECTION 3 — FAO TECA (API gratuite)
// =============================================================

const FAO_TECA_SEARCHES = [
  'organic fertilizer compost tropical Africa',
  'bokashi fermentation organic waste',
  'vermicompost earthworm organic',
  'green manure legume nitrogen fixation',
  'biofertilizer soil health Africa',
  'integrated soil fertility management',
  // Pisciculture
  'aquaculture pond fish organic fertilization Africa',
  'tilapia production smallholder Africa',
  'aquaponics fish vegetable integrated',
  'cage culture fish lake Africa',
  // Apiculture
  'beekeeping honey Africa smallholder',
  'top bar hive Kenya Africa bee',
  'pollination crop yield Africa',
  // Régions étendues
  'cacao organic fertilization West Africa',
  'coffee agroforestry Ethiopia Kenya',
  'sahel dryland farming zai technique',
  'moringa organic fertilizer Sahel',
];

async function fetchFaoTeca(q: string) {
  try {
    const url = `https://teca.apps.fao.org/teca/api/v1/technologies?q=${encodeURIComponent(q)}&per_page=3&language=en`;
    const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10000) });
    if (!res.ok) return [];
    const data = await res.json() as any;
    return (data.data || []).map((t: any) => ({
      title: t.title || 'FAO Technology',
      content: [t.description, t.how_to_use, t.advantages, t.limitations].filter(Boolean).join('\n\n').substring(0, 3000),
    })).filter((t: any) => t.content.length > 120);
  } catch { return []; }
}

// =============================================================
// GROQ — structuration
// =============================================================

async function structureWithGroq(title: string, content: string, category: string) {
  if (!GROQ_API_KEY) return null;
  const prompt = `Tu es agronome spécialisé fertilisation organique tropicale Madagascar.
Texte sur "${title}" (catégorie: ${category}) :
---
${content.substring(0, 3500)}
---
Réponds UNIQUEMENT avec un JSON valide strict :
{
  "fertilizer_name": "nom précis",
  "ingredients": ["ingrédients avec quantités si disponibles"],
  "steps": ["Étape précise avec dose/durée/température si connue"],
  "tips": ["Conseil technique actionnable"],
  "mistakes": ["Erreur grave à éviter"],
  "duration": "durée précise",
  "npk_ratio": "N:x P:y K:z ou 'inconnu'",
  "best_for_crops": ["cultures"],
  "climate": "tropical | tempéré | aride | tous",
  "difficulty": "facile | moyen | avancé",
  "cost": "très faible | faible | moyen | élevé"
}
Minimum : 4 étapes, 3 conseils, 2 erreurs. Précis et technique.`;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: GROQ_MODEL, messages: [{ role: 'user', content: prompt }], max_tokens: 1800, temperature: 0.2 }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return null;
    const d = await res.json() as any;
    const raw = (d.choices?.[0]?.message?.content || '').trim().replace(/^```json?\s*/i, '').replace(/\s*```$/, '');
    return JSON.parse(raw);
  } catch { return null; }
}

// =============================================================
// HELPERS
// =============================================================

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
function slugify(t: string) { return t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 80); }
function chunkText(text: string) {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += CHUNK_SIZE) {
    const c = words.slice(i, i + CHUNK_SIZE).join(' ');
    if (c.trim().length > 80) chunks.push(c);
  }
  return chunks;
}
function log(icon: string, msg: string, detail?: string) {
  console.log(`${C.dim(new Date().toLocaleTimeString('fr-FR'))} ${icon}  ${msg}${detail ? C.dim(' — ' + detail) : ''}`);
}

async function saveToTurso(params: { title: string; content: string; category: string; source: string; region: string; structured: any }): Promise<'saved' | 'skipped' | 'error'> {
  if (DRY_RUN) { log('🔵', `[DRY-RUN] "${params.title}"`); return 'saved'; }
  const slug = slugify(params.title);
  const existing = await turso.get('SELECT id FROM knowledge_base WHERE slug = ?', [slug]).catch(() => null);
  if (existing) return 'skipped';
  try {
    const kbId = randomUUID();
    const s = params.structured || {};
    await turso.run('INSERT INTO knowledge_base (id, title, slug, category, source, language, content_raw) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [kbId, params.title, slug, params.category, params.source, 'fr', params.content]);
    const chunks = chunkText(params.content);
    for (let i = 0; i < chunks.length; i++)
      await turso.run('INSERT INTO knowledge_chunks (id, knowledge_id, chunk_index, content) VALUES (?, ?, ?, ?)', [randomUUID(), kbId, i, chunks[i]]);
    await turso.run(
      `INSERT INTO knowledge_structured (id, knowledge_id, fertilizer_name, ingredients, steps, tips, mistakes, duration, npk_ratio, best_for_crops, climate, region, difficulty, cost)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [randomUUID(), kbId, s.fertilizer_name || params.title, JSON.stringify(s.ingredients || []), JSON.stringify(s.steps || []),
       JSON.stringify(s.tips || []), JSON.stringify(s.mistakes || []), s.duration || 'variable', s.npk_ratio || 'inconnu',
       JSON.stringify(s.best_for_crops || []), s.climate || 'tous', params.region, s.difficulty || 'moyen', s.cost || 'variable']);
    return 'saved';
  } catch (err) { log('❌', `DB error "${params.title}"`, String(err).substring(0, 80)); return 'error'; }
}

// =============================================================
// COLLECTEURS
// =============================================================

async function collectExpert() {
  log('✍️ ', C.bold('=== FICHES EXPERTES (données terrain Madagascar) ==='));
  let saved = 0, skipped = 0;
  for (const f of EXPERT_FICHES) {
    const result = await saveToTurso({ title: f.title, content: f.content, category: f.category, source: 'expert', region: f.region,
      structured: { fertilizer_name: f.fertilizer_name, ingredients: f.ingredients, steps: f.steps, tips: f.tips, mistakes: f.mistakes,
        duration: f.duration, npk_ratio: f.npk_ratio, best_for_crops: f.best_for_crops, climate: f.climate, difficulty: f.difficulty, cost: f.cost } });
    if (result === 'saved') { saved++; log('✅', C.green(f.title)); }
    else skipped++;
  }
  console.log(`   ${C.green(saved + ' sauvegardées')}, ${skipped} déjà présentes\n`);
  return { saved };
}

async function collectNPKDataset() {
  log('🧪', C.bold('=== DATASET NPK (données analytiques laboratoire) ==='));
  let saved = 0, skipped = 0;
  for (const item of NPK_DATASET) {
    const moisture = 'moisture' in item ? `\n- Humidité : ${(item as any).moisture}%` : '';
    const om = 'organic_matter' in item ? `\n- Matière organique : ${(item as any).organic_matter}%` : '';
    const ph = 'pH' in item ? `\n- pH : ${(item as any).pH}` : '';
    const content = `Analyse analytique : ${item.name}\nCatégorie : ${item.cat}\nRégion : ${item.region}\n\nComposition (% matière sèche) :\n- Azote total (N) : ${item.N}%\n- Phosphore (P2O5) : ${item.P}%\n- Potassium (K2O) : ${item.K}%${om}${moisture}${ph}\n\nNote d\'utilisation : ${item.note}`;
    const result = await saveToTurso({ title: `Analyse NPK : ${item.name}`, content, category: item.cat, source: 'dataset_npk', region: item.region,
      structured: { fertilizer_name: item.name, ingredients: [item.name], steps: [`Calculer dose selon N:${item.N} P:${item.P} K:${item.K}`, item.note],
        tips: [`Ratio NPK : N=${item.N}% P=${item.P}% K=${item.K}%`, item.note], mistakes: ['Ne pas sur-doser : calculer selon besoins de la culture'],
        duration: 'Selon mode application', npk_ratio: `N:${item.N} P:${item.P} K:${item.K}`, best_for_crops: ['toutes cultures'],
        climate: 'tous', difficulty: 'facile', cost: item.cat === 'fumier' ? 'très faible' : 'faible' } });
    if (result === 'saved') { saved++; log('✅', C.green(item.name), `N:${item.N} P:${item.P} K:${item.K}`); }
    else skipped++;
  }
  console.log(`   ${C.green(saved + ' sauvegardés')}, ${skipped} déjà présents\n`);
  return { saved };
}

async function collectFao() {
  log('🌍', C.bold('=== FAO TECA (fiches techniques officielles) ==='));
  let saved = 0, skipped = 0, failed = 0;
  for (const q of FAO_TECA_SEARCHES) {
    log('🔍', `FAO TECA: "${q}"`);
    const techs = await fetchFaoTeca(q);
    if (techs.length === 0) { failed++; await sleep(1000); continue; }
    for (const tech of techs) {
      if (tech.content.length < 100) continue;
      log('🤖', `Groq: "${tech.title.substring(0, 50)}"`);
      const structured = await structureWithGroq(tech.title, tech.content, 'technique');
      const result = await saveToTurso({ title: `FAO TECA : ${tech.title}`, content: tech.content, category: 'technique', source: 'fao_teca', region: 'Global', structured });
      if (result === 'saved') { saved++; log('✅', C.green(tech.title.substring(0, 55))); }
      else skipped++;
      await sleep(DELAY_MS);
    }
    await sleep(1500);
  }
  console.log(`   ${C.green(saved + ' sauvegardées')}, ${skipped} déjà présentes, ${failed} sources inaccessibles\n`);
  return { saved };
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
    console.log('─'.repeat(44));
    console.log(`  Articles      : ${C.green(String((kb as any)?.n || 0))}`);
    console.log(`  Chunks RAG    : ${C.green(String((chunks as any)?.n || 0))}`);
    console.log(`  Fiches struct : ${C.green(String((struct as any)?.n || 0))}`);
    console.log('\n  Par catégorie :');
    for (const c of cats as any[]) console.log(`    ${c.category.padEnd(22)} ${C.yellow(String(c.n).padStart(3))} articles`);
    console.log('─'.repeat(44) + '\n');
  } catch { /* dry-run ou pas de connexion */ }
}

// =============================================================
// MAIN
// =============================================================

async function main() {
  console.log('\n' + C.bold(C.green('🌱 FERTILI\'ZEO — Knowledge Base Collector v2')));
  console.log(C.dim('Fiches expertes terrain + Dataset NPK labo + FAO TECA'));
  if (DRY_RUN) console.log(C.yellow('\n⚠️  DRY-RUN : aucune écriture\n'));
  if (!GROQ_API_KEY) console.log(C.yellow('⚠️  GROQ_API_KEY absent : FAO TECA non structuré\n'));
  console.log('');

  const t0 = Date.now();
  let total = 0;

  if (!SOURCE_FILTER || SOURCE_FILTER === 'expert') { const r = await collectExpert(); total += r.saved; }
  if (!SOURCE_FILTER || SOURCE_FILTER === 'npk')    { const r = await collectNPKDataset(); total += r.saved; }
  if (!SOURCE_FILTER || SOURCE_FILTER === 'fao')    { const r = await collectFao(); total += r.saved; }

  await printStats();
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(C.bold(C.green(`✅ Terminé en ${elapsed}s — ${total} nouveaux articles`)));
  console.log(C.dim('  Pour ajouter des fiches : éditer EXPERT_FICHES dans ce script et relancer.\n'));
}

main().catch(err => { console.error(C.red('❌ Erreur fatale :'), err); process.exit(1); });
