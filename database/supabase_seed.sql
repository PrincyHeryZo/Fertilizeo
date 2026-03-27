-- ============================================================
-- FERTILI'ZEO — Script complet Supabase
-- Exécutez ce fichier dans l'éditeur SQL de Supabase
-- ============================================================

-- ===== 1. TABLES =====

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    phone TEXT,
    location TEXT,
    role TEXT NOT NULL CHECK(role IN ('Agriculteur', 'Producteur', 'Fournisseur', 'Acheteur', 'Administrateur')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    category TEXT,
    stock INTEGER DEFAULT 0,
    image_url TEXT,
    producer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    is_approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    buyer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    total_amount DECIMAL(10, 2) NOT NULL,
    status TEXT DEFAULT 'En attente' CHECK(status IN ('En attente', 'Payée', 'Expédiée', 'Livrée', 'Annulée')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL,
    price_at_purchase DECIMAL(10, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS reviews (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER CHECK(rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS forum_posts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS forum_comments (
    id SERIAL PRIMARY KEY,
    post_id INTEGER REFERENCES forum_posts(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS favorites (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, product_id)
);

CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method TEXT,
    status TEXT DEFAULT 'Complétée',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index
CREATE INDEX IF NOT EXISTS idx_products_producer ON products(producer_id);
CREATE INDEX IF NOT EXISTS idx_orders_buyer ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_forum_comments_post ON forum_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);


-- ===== 2. UTILISATEURS DE DÉMO =====
-- Mot de passe pour tous: "password123" (hashé avec bcrypt, 10 rounds)
-- Hash bcrypt de "password123": $2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi

INSERT INTO users (name, email, password, phone, location, role) VALUES
('Admin Fertilizeo',    'admin@fertilizeo.mg',    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '+261 34 00 000 00', 'Antananarivo, Madagascar', 'Administrateur'),
('Jean Rakoto',         'jean@fertilizeo.mg',     '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '+261 33 11 111 11', 'Fianarantsoa, Madagascar', 'Producteur'),
('Marie Rasoa',         'marie@fertilizeo.mg',    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '+261 32 22 222 22', 'Toamasina, Madagascar', 'Fournisseur'),
('Pierre Andriamaro',   'pierre@fertilizeo.mg',   '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '+261 34 33 333 33', 'Mahajanga, Madagascar', 'Agriculteur'),
('Sophie Ravelo',       'sophie@fertilizeo.mg',   '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '+261 33 44 444 44', 'Antsiranana, Madagascar', 'Acheteur'),
('Thomas Randria',      'thomas@fertilizeo.mg',   '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '+261 32 55 555 55', 'Toliara, Madagascar', 'Producteur'),
('Hanta Rakotondrabe',  'hanta@fertilizeo.mg',    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '+261 34 66 666 66', 'Antsirabe, Madagascar', 'Agriculteur'),
('Lova Andriantsoa',    'lova@fertilizeo.mg',     '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '+261 33 77 777 77', 'Antananarivo, Madagascar', 'Acheteur')
ON CONFLICT (email) DO NOTHING;


-- ===== 3. PRODUITS APPROUVÉS =====

INSERT INTO products (name, description, price, category, stock, image_url, producer_id, is_approved) VALUES
(
    'Compost Premium BioMada',
    'Compost entièrement naturel issu de déchets organiques végétaux. Enrichit le sol en nutriments essentiels, améliore la structure du sol et favorise la vie microbienne. Idéal pour toutes cultures maraîchères et fruitières.',
    45000, 'Compost', 150,
    'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&q=80&w=600',
    2, TRUE
),
(
    'Engrais Liquide Folaire NPK',
    'Solution nutritive concentrée à base d''extraits végétaux fermentés. Riche en azote, phosphore et potassium. Application foliaire pour une absorption rapide. Convient aux légumes, fruits et céréales.',
    28000, 'Engrais Liquide', 200,
    'https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&q=80&w=600',
    2, TRUE
),
(
    'Fumier de Vers Vermiculite',
    'Humus de lombriculture de haute qualité. Produit par des vers de terre élevés en conditions contrôlées. Très riche en micro-organismes bénéfiques. Améliore la rétention d''eau et la fertilité du sol.',
    38000, 'Compost', 80,
    'https://images.unsplash.com/photo-1585320806297-9794b3e4aaae?auto=format&fit=crop&q=80&w=600',
    3, TRUE
),
(
    'Biostimulant Algues Marines',
    'Extrait concentré d''algues marines de Madagascar. Contient des acides aminés, des hormones de croissance naturelles et des oligo-éléments. Stimule la germination et la résistance aux stress hydriques.',
    55000, 'Engrais Liquide', 120,
    'https://images.unsplash.com/photo-1559181567-c3190ca9d715?auto=format&fit=crop&q=80&w=600',
    3, TRUE
),
(
    'Farine d''Os Naturelle',
    'Matière première riche en phosphore et calcium. Libération lente des nutriments pour un effet durable sur toute la saison. Renforce le système racinaire et améliore la floraison et la fructification.',
    22000, 'Matière Première', 300,
    'https://images.unsplash.com/photo-1523741543316-beb7fc7023d8?auto=format&fit=crop&q=80&w=600',
    6, TRUE
),
(
    'Cendre de Bois Potassique',
    'Cendre de bois 100% naturelle, source de potasse et de calcium. Régule le pH du sol, améliore la structure argileuse et aide à lutter contre certains pathogènes. Application directe ou en décoction.',
    12000, 'Matière Première', 500,
    'https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&q=80&w=600',
    6, TRUE
),
(
    'Compost Bokashi Fermenté',
    'Compost accéléré par fermentation anaérobique avec son de riz et micro-organismes efficaces (EM). Décomposition rapide des matières organiques. Neutre pH, idéal pour enrichir directement les bacs à plantes.',
    35000, 'Compost', 90,
    'https://images.unsplash.com/photo-1518335935020-cfd6580c1ab4?auto=format&fit=crop&q=80&w=600',
    2, TRUE
),
(
    'Purin d''Ortie Concentré',
    'Purin d''ortie bio fermenté 5 semaines. Activateur de croissance puissant, riche en azote et oligo-éléments. Diluer à 10% pour arrosage ou 2% en pulvérisation foliaire. Conditionnement 5 litres.',
    32000, 'Engrais Liquide', 160,
    'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&q=80&w=600',
    3, TRUE
),
(
    'Kit Outils Jardinage Bio',
    'Ensemble d''outils en inox et bambou pour le jardinage biologique. Comprend : transplantoir, aérateur, arrosoir 5L, paire de gants. Durable et écologique, conçu pour les agriculteurs de Madagascar.',
    75000, 'Outils', 40,
    'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&q=80&w=600',
    6, TRUE
),
(
    'Tourbe de Coco (Coco Peat)',
    'Fibre de coco naturelle pour substrat de culture. Excellente rétention d''eau (x9 son poids), aération optimale des racines, pH neutre. Idéal en horticulture, maraîchage et culture en conteneurs.',
    18000, 'Matière Première', 250,
    'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&q=80&w=600',
    2, TRUE
),
(
    'Engrais Granulé NPK Organique',
    'Granulés d''engrais organiques à libération progressive. Formulation 5-3-4 (N-P-K) + magnésium. Un seul apport par saison. Certifié agriculture biologique. Sac de 25 kg, traitement pour 500m².',
    65000, 'Engrais Liquide', 75,
    'https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&q=80&w=600',
    6, TRUE
),
(
    'Mycorrhizes Inoculant Racinaire',
    'Inoculant mycorhizien pour stimuler le développement racinaire. Contient 4 espèces de champignons symbiotiques. Augmente l''absorption des nutriments et la résistance à la sécheresse jusqu''à 60%.',
    48000, 'Matière Première', 60,
    'https://images.unsplash.com/photo-1585320806297-9794b3e4aaae?auto=format&fit=crop&q=80&w=600',
    3, TRUE
)
ON CONFLICT DO NOTHING;

-- Produit en attente d'approbation (pour tester la fonctionnalité admin)
INSERT INTO products (name, description, price, category, stock, image_url, producer_id, is_approved) VALUES
(
    'Nouveau Compost Tropical',
    'Compost spécialement adapté aux conditions climatiques tropicales de Madagascar. En cours de certification.',
    30000, 'Compost', 100,
    'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&q=80&w=600',
    7, FALSE
),
(
    'Engrais Riz Paddy',
    'Engrais spécifiquement formulé pour la riziculture malgache. Micro-éléments adaptés.',
    25000, 'Engrais Liquide', 200,
    'https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&q=80&w=600',
    6, FALSE
)
ON CONFLICT DO NOTHING;


-- ===== 4. COMMANDES =====

INSERT INTO orders (buyer_id, total_amount, status, created_at) VALUES
(5,  91000,  'Livrée',    NOW() - INTERVAL '30 days'),
(5,  45000,  'Expédiée',  NOW() - INTERVAL '12 days'),
(8,  103000, 'Payée',     NOW() - INTERVAL '7 days'),
(8,  28000,  'En attente',NOW() - INTERVAL '2 days'),
(4,  57000,  'Livrée',    NOW() - INTERVAL '45 days'),
(7,  78000,  'Annulée',   NOW() - INTERVAL '20 days'),
(5,  65000,  'Livrée',    NOW() - INTERVAL '60 days')
ON CONFLICT DO NOTHING;

-- Order items (commande 1: id=1)
INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase) VALUES
(1, 1, 1, 45000),
(1, 6, 1, 12000),
(1, 5, 1, 22000),
(1, 3, 1, 38000) -- pour 91000 total mais simplifié
ON CONFLICT DO NOTHING;

INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase) VALUES
(2, 1, 1, 45000)
ON CONFLICT DO NOTHING;

INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase) VALUES
(3, 4, 1, 55000),
(3, 8, 1, 32000)
ON CONFLICT DO NOTHING;

INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase) VALUES
(4, 2, 1, 28000)
ON CONFLICT DO NOTHING;


-- ===== 5. TRANSACTIONS =====

INSERT INTO transactions (order_id, amount, payment_method, status) VALUES
(1, 91000,  'MVola',        'Complétée'),
(2, 45000,  'Orange Money', 'Complétée'),
(3, 103000, 'M-Pesa',       'Complétée'),
(5, 57000,  'MVola',        'Complétée'),
(7, 65000,  'Orange Money', 'Complétée')
ON CONFLICT DO NOTHING;


-- ===== 6. AVIS PRODUITS =====

INSERT INTO reviews (product_id, user_id, rating, comment) VALUES
(1, 5, 5, 'Excellent compost ! Mes tomates ont doublé de rendement cette saison. Très bonne qualité, je recommande fortement.'),
(1, 4, 4, 'Très bon produit, livraison rapide. Le compost est bien mûr et sent bon la terre saine.'),
(1, 8, 5, 'Je suis producteur depuis 15 ans et c''est le meilleur compost que j''ai utilisé à Madagascar.'),
(2, 5, 4, 'L''engrais liquide est très efficace pour les légumes feuilles. Résultats visibles en 10 jours.'),
(2, 7, 5, 'Parfait pour mes cultures de laitue. Très concentré, un peu va loin. Rapport qualité/prix excellent.'),
(3, 4, 5, 'Le vermiculite est incroyable pour la rétention d''eau. Idéal pour la saison sèche à Mahajanga.'),
(4, 5, 4, 'Le biostimulant algues marines a vraiment boosté mes plants de riz. Germination plus rapide.'),
(6, 8, 3, 'Bon produit naturel mais odeur assez forte. Efficace pour corriger le pH de mon sol argileux.'),
(7, 7, 5, 'Le bokashi est révolutionnaire ! Je fais maintenant mon propre compost en 2 semaines avec cette méthode.'),
(9, 4, 4, 'Kit complet et solide. Les outils en bambou sont vraiment agréables à utiliser. Longue durée de vie.')
ON CONFLICT DO NOTHING;


-- ===== 7. FORUM =====

INSERT INTO forum_posts (user_id, title, content, created_at) VALUES
(4, 'Comment améliorer la fertilité d''un sol argileux à Madagascar ?',
 'Bonjour à tous, j''ai une parcelle de 2 hectares à Mahajanga avec un sol très argileux qui retient trop l''eau en saison des pluies et se fissure en saison sèche. Quelles sont vos recommandations pour l''améliorer durablement ? J''ai pensé au compost et à la cendre de bois. Merci !',
 NOW() - INTERVAL '15 days'),

(7, 'Quelle dose de purin d''ortie pour les haricots ?',
 'Bonjour, je viens de recevoir mon purin d''ortie concentré. Sur l''étiquette il est indiqué diluer à 10%, mais j''ai lu qu''en floraison il vaut mieux descendre à 5%. Quelqu''un a-t-il de l''expérience avec les légumineuses ? Merci d''avance pour vos conseils !',
 NOW() - INTERVAL '8 days'),

(2, 'Résultats incroyables avec la mycorrhize sur vanillier',
 'Je partage mon expérience avec l''inoculant mycorhizien sur mes vanilliers à Fianarantsoa. Après 3 mois d''application, j''observe une augmentation de 40% de la croissance des lianes et les feuilles sont beaucoup plus vertes. Le système racinaire est dense et sain. Je recommande vraiment ce produit à tous les cultivateurs de vanille !',
 NOW() - INTERVAL '5 days'),

(3, 'Calendrier de fertilisation pour la riziculture - partage expérience',
 'Après 5 ans d''agriculture biologique à Toamasina, voici mon calendrier optimisé pour la riziculture : Semis (J0) : cendre de bois + compost dans le pépinière. Transplantation (J30) : engrais NPK granulé. Tallage (J60) : purin d''ortie dilué 10%. Floraison (J90) : biostimulant algues marines. Résultats : +35% de rendement vs méthodes conventionnelles.',
 NOW() - INTERVAL '3 days'),

(8, 'Où trouver du compost bio certifié près d''Antananarivo ?',
 'Bonjour à la communauté ! Je cherche des fournisseurs de compost certifié biologique dans la région d''Antananarivo. J''ai une petite exploitation maraîchère de 5000m² et j''aimerais me convertir à l''agriculture biologique cette année. Budget autour de 200 000 Ar. Merci pour vos recommandations !',
 NOW() - INTERVAL '1 day')
ON CONFLICT DO NOTHING;


-- ===== 8. COMMENTAIRES FORUM =====

INSERT INTO forum_comments (post_id, user_id, content, created_at) VALUES
(1, 2, 'Pour un sol argileux, je recommande d''abord d''incorporer du sable grossier (environ 20% du volume) puis d''apporter du compost mûr en grande quantité (5 à 10 kg/m²). La cendre de bois aidera effectivement à améliorer la structure. Faites ça avant la saison des pluies !', NOW() - INTERVAL '14 days'),
(1, 3, 'Le bokashi est parfait pour votre situation ! Sa décomposition rapide ameublit le sol argileux. Associez-le avec des couverts végétaux (niébé ou pois d''Angole) pour drainer naturellement en saison humide.', NOW() - INTERVAL '13 days'),
(1, 6, 'J''ai eu le même problème à Toliara. La solution qui a marché pour moi : mélange 50% compost vermiculite + 30% coco peat + 20% cendre de bois. Résultat visible dès la première saison de pluies.', NOW() - INTERVAL '12 days'),

(2, 3, 'Pour les haricots verts, j''utilise le purin d''ortie à 5% pendant la croissance végétative et je stop totalement dès le début de la floraison. L''azote en excès fait trop de feuilles au détriment des gousses.', NOW() - INTERVAL '7 days'),
(2, 2, 'Entièrement d''accord avec Marie. Pour les légumineuses en général, le purin d''ortie est surtout utile au démarrage. Dès les premières fleurs, passez plutôt au biostimulant algues marines qui favorise la fructification.', NOW() - INTERVAL '6 days'),

(3, 4, 'Merci Jean pour ce retour ! Je vais tenter la mycorrhize sur mes litchis de Mahajanga. Tu recommandes quelle dose pour les arbres fruitiers ?', NOW() - INTERVAL '4 days'),
(3, 2, 'Pour les arbres fruitiers Pierre, je mets environ 20g par arbre au niveau des racines lors de la transplantation. Pour les arbres existants, faites des trous autour du tronc et incorporez le produit avec du compost.', NOW() - INTERVAL '4 days'),

(4, 7, 'Super calendrier Thomas ! Je vais l''adapter pour mon riz de montagne à Antsirabe. Question : tu utilises quel compost pour le pépinière, le premium ou le bokashi ?', NOW() - INTERVAL '2 days'),
(4, 3, 'Très bon partage d''expérience ! Chez nous à Toamasina on ajoute aussi un apport de farine d''os au tallage, ça renforce vraiment les tiges et réduit la verse.', NOW() - INTERVAL '2 days'),

(5, 2, 'Bonjour Lova ! Vous pouvez commander directement sur notre marketplace. Nous livrons dans tout Antananarivo en 48h. Pour une exploitation de 5000m², je vous recommande notre pack "Démarrage Bio" : 200kg compost premium + 20L engrais liquide + 10kg cendre de bois.', NOW() - INTERVAL '20 hours')
ON CONFLICT DO NOTHING;


-- ===== 9. MESSAGES =====

INSERT INTO messages (sender_id, receiver_id, content, is_read, created_at) VALUES
(5, 2, 'Bonjour Jean ! J''ai commandé votre compost premium la semaine dernière. Est-ce qu''il est possible de commander en vrac pour une prochaine saison ?', TRUE, NOW() - INTERVAL '10 days'),
(2, 5, 'Bonjour Sophie ! Bien sûr, nous faisons des remises à partir de 500kg. Contactez-moi par téléphone pour discuter des tarifs. Je vous envoie notre grille tarifaire.', TRUE, NOW() - INTERVAL '9 days'),
(5, 2, 'Merci beaucoup Jean ! Je vous appelle demain. En attendant, y a-t-il un minimum de commande ?', TRUE, NOW() - INTERVAL '9 days'),
(2, 5, 'Le minimum est de 100kg (2 sacs). Pour vous, je peux faire livrer gratuitement à Antananarivo pour les commandes > 300kg.', FALSE, NOW() - INTERVAL '8 days'),

(8, 3, 'Bonjour Marie, je cherche un fournisseur d''engrais liquide en grande quantité pour notre coopérative agricole. Vous pouvez fournir 500 litres par mois ?', TRUE, NOW() - INTERVAL '5 days'),
(3, 8, 'Bonjour Lova ! Oui tout à fait, nous avons la capacité de produire 1000L/mois. Je vous envoie nos conditions B2B. Quelle région livrez-vous ?', TRUE, NOW() - INTERVAL '4 days'),
(8, 3, 'Nous sommes basés à Antananarivo avec des membres dans 3 régions : Tana, Antsirabe et Toamasina.', FALSE, NOW() - INTERVAL '3 days'),

(4, 6, 'Salut Thomas, j''ai vu ton post sur le forum. Ton calendrier m''intéresse pour mes cultures de manioc. Tu peux m''en dire plus ?', FALSE, NOW() - INTERVAL '2 days')
ON CONFLICT DO NOTHING;


-- ===== 10. NOTIFICATIONS =====

INSERT INTO notifications (user_id, type, content, is_read, created_at) VALUES
-- Admin
(1, 'product', 'Nouveau produit en attente d''approbation : "Nouveau Compost Tropical"', FALSE, NOW() - INTERVAL '2 days'),
(1, 'product', 'Nouveau produit en attente d''approbation : "Engrais Riz Paddy"', FALSE, NOW() - INTERVAL '1 day'),
(1, 'order',   'Nouvelle commande #4 passée par Lova Andriantsoa', TRUE, NOW() - INTERVAL '2 days'),

-- Jean (Producteur)
(2, 'order',   'Nouvelle commande pour votre produit : Compost Premium BioMada', TRUE, NOW() - INTERVAL '30 days'),
(2, 'order',   'Nouvelle commande pour votre produit : Engrais Liquide Folaire NPK', TRUE, NOW() - INTERVAL '12 days'),
(2, 'message', 'Nouveau message de Sophie Ravelo', FALSE, NOW() - INTERVAL '8 days'),
(2, 'forum',   'Quelqu''un a commenté votre post "Résultats incroyables avec la mycorrhize"', FALSE, NOW() - INTERVAL '4 days'),

-- Marie (Fournisseur)
(3, 'order',   'Nouvelle commande pour votre produit : Fumier de Vers Vermiculite', TRUE, NOW() - INTERVAL '7 days'),
(3, 'message', 'Nouveau message de Lova Andriantsoa', FALSE, NOW() - INTERVAL '3 days'),

-- Pierre (Agriculteur)
(4, 'order',   'Votre commande #5 a été livrée avec succès', TRUE, NOW() - INTERVAL '40 days'),
(4, 'forum',   'Jean Rakoto a répondu à votre commentaire sur le forum', FALSE, NOW() - INTERVAL '4 days'),

-- Sophie (Acheteur)
(5, 'order',   'Votre commande #1 a été livrée avec succès', TRUE, NOW() - INTERVAL '25 days'),
(5, 'order',   'Votre commande #2 est en cours d''expédition', FALSE, NOW() - INTERVAL '10 days'),
(5, 'message', 'Nouveau message de Jean Rakoto', FALSE, NOW() - INTERVAL '8 days'),

-- Lova (Acheteur)
(8, 'order',   'Votre commande #3 a été confirmée et payée', TRUE, NOW() - INTERVAL '6 days'),
(8, 'order',   'Votre commande #4 a été enregistrée. En attente de traitement.', FALSE, NOW() - INTERVAL '2 days'),
(8, 'forum',   'Jean Rakoto a répondu à votre question sur le forum', FALSE, NOW() - INTERVAL '20 hours'),
(8, 'message', 'Nouveau message de Marie Rasoa', FALSE, NOW() - INTERVAL '3 days')
ON CONFLICT DO NOTHING;


-- ===== 11. FAVORIS =====

INSERT INTO favorites (user_id, product_id) VALUES
(5, 1), (5, 4), (5, 7),
(8, 2), (8, 3), (8, 11),
(4, 5), (4, 6), (4, 12),
(7, 1), (7, 8)
ON CONFLICT (user_id, product_id) DO NOTHING;


-- ===== RÉSUMÉ =====
-- Comptes de démonstration (mot de passe : password123) :
--
-- ADMIN   : admin@fertilizeo.mg  → accès complet + admin panel
-- PRODUCTEUR : jean@fertilizeo.mg   → peut créer/gérer des produits
-- FOURNISSEUR: marie@fertilizeo.mg  → peut créer/gérer des produits
-- AGRICULTEUR: pierre@fertilizeo.mg → achète et consulte
-- ACHETEUR   : sophie@fertilizeo.mg → achète, a des commandes
-- PRODUCTEUR : thomas@fertilizeo.mg → a des produits approuvés
-- AGRICULTEUR: hanta@fertilizeo.mg  → a un produit en attente
-- ACHETEUR   : lova@fertilizeo.mg   → a des commandes actives
