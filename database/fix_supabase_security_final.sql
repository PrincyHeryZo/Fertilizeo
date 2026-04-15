-- ============================================================
-- FERTILI'ZEO - Correction des vulnérabilités de sécurité Supabase (VERSION FINALE)
-- Basé sur la structure exacte de votre base de données
-- Exécutez ce fichier dans l'éditeur SQL de Supabase
-- ============================================================

-- ===== 1. ACTIVER ROW LEVEL SECURITY SUR TOUTES LES TABLES =====

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- ===== 2. POLITIQUES DE SÉCURITÉ =====

-- Users: Utiliser email pour matcher avec auth.email() car id est integer
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (users.email = auth.email());
CREATE POLICY "Admin can view all users" ON users FOR SELECT USING (auth.jwt() ->> 'role' = 'Administrateur');
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (users.email = auth.email());
CREATE POLICY "Admin can update all users" ON users FOR UPDATE USING (auth.jwt() ->> 'role' = 'Administrateur');

-- Products: Tout le monde voit les produits approuvés, producteur gère ses produits
CREATE POLICY "Public can view approved products" ON products FOR SELECT USING (is_approved = true);
CREATE POLICY "Producers can view own products" ON products FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE users.email = auth.email() AND users.id = products.producer_id)
);
CREATE POLICY "Producers can insert own products" ON products FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE users.email = auth.email() AND users.id = producer_id)
);
CREATE POLICY "Producers can update own products" ON products FOR UPDATE USING (
  EXISTS (SELECT 1 FROM users WHERE users.email = auth.email() AND users.id = products.producer_id)
);
CREATE POLICY "Producers can delete own products" ON products FOR DELETE USING (
  EXISTS (SELECT 1 FROM users WHERE users.email = auth.email() AND users.id = products.producer_id)
);
CREATE POLICY "Admin can manage all products" ON products FOR ALL USING (auth.jwt() ->> 'role' = 'Administrateur');

-- Orders: Seul l'acheteur et le vendeur peuvent voir les commandes
CREATE POLICY "Buyers can view own orders" ON orders FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE users.email = auth.email() AND users.id = orders.buyer_id)
);
CREATE POLICY "Sellers can view orders for their products" ON orders FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM order_items oi 
    JOIN products p ON oi.product_id = p.id 
    WHERE oi.order_id = orders.id 
    AND EXISTS (SELECT 1 FROM users WHERE users.email = auth.email() AND users.id = p.producer_id)
  )
);
CREATE POLICY "Admin can view all orders" ON orders FOR SELECT USING (auth.jwt() ->> 'role' = 'Administrateur');

-- Order Items: Accès basé sur les permissions des commandes
CREATE POLICY "Users can view order items for accessible orders" ON order_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM orders o 
    WHERE o.id = order_items.order_id 
    AND (
      EXISTS (SELECT 1 FROM users WHERE users.email = auth.email() AND users.id = o.buyer_id)
      OR auth.jwt() ->> 'role' = 'Administrateur'
    )
  )
);

-- Reviews: Tout le monde peut voir les avis, seul l'auteur peut modifier
CREATE POLICY "Public can view all reviews" ON reviews FOR SELECT USING (true);
CREATE POLICY "Users can insert own reviews" ON reviews FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE users.email = auth.email() AND users.id = user_id)
);
CREATE POLICY "Users can update own reviews" ON reviews FOR UPDATE USING (
  EXISTS (SELECT 1 FROM users WHERE users.email = auth.email() AND users.id = reviews.user_id)
);
CREATE POLICY "Users can delete own reviews" ON reviews FOR DELETE USING (
  EXISTS (SELECT 1 FROM users WHERE users.email = auth.email() AND users.id = reviews.user_id)
);
CREATE POLICY "Admin can manage all reviews" ON reviews FOR ALL USING (auth.jwt() ->> 'role' = 'Administrateur');

-- Forum Posts: Tout le monde peut voir, seul l'auteur peut modifier (author_id, pas user_id)
CREATE POLICY "Public can view all forum posts" ON forum_posts FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create posts" ON forum_posts FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE users.email = auth.email() AND users.id = author_id)
);
CREATE POLICY "Users can update own posts" ON forum_posts FOR UPDATE USING (
  EXISTS (SELECT 1 FROM users WHERE users.email = auth.email() AND users.id = forum_posts.author_id)
);
CREATE POLICY "Users can delete own posts" ON forum_posts FOR DELETE USING (
  EXISTS (SELECT 1 FROM users WHERE users.email = auth.email() AND users.id = forum_posts.author_id)
);
CREATE POLICY "Admin can manage all posts" ON forum_posts FOR ALL USING (auth.jwt() ->> 'role' = 'Administrateur');

-- Forum Comments: Tout le monde peut voir, seul l'auteur peut modifier (author_id, pas user_id)
CREATE POLICY "Public can view all forum comments" ON forum_comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create comments" ON forum_comments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE users.email = auth.email() AND users.id = author_id)
);
CREATE POLICY "Users can update own comments" ON forum_comments FOR UPDATE USING (
  EXISTS (SELECT 1 FROM users WHERE users.email = auth.email() AND users.id = forum_comments.author_id)
);
CREATE POLICY "Users can delete own comments" ON forum_comments FOR DELETE USING (
  EXISTS (SELECT 1 FROM users WHERE users.email = auth.email() AND users.id = forum_comments.author_id)
);
CREATE POLICY "Admin can manage all comments" ON forum_comments FOR ALL USING (auth.jwt() ->> 'role' = 'Administrateur');

-- Forum Likes: Seul l'utilisateur peut gérer ses likes
CREATE POLICY "Users can view own likes" ON forum_likes FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE users.email = auth.email() AND users.id = user_id)
);
CREATE POLICY "Users can insert own likes" ON forum_likes FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE users.email = auth.email() AND users.id = user_id)
);
CREATE POLICY "Users can delete own likes" ON forum_likes FOR DELETE USING (
  EXISTS (SELECT 1 FROM users WHERE users.email = auth.email() AND users.id = user_id)
);

-- Messages: Seul l'expéditeur et le destinataire peuvent voir les messages
CREATE POLICY "Users can view own messages" ON messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE users.email = auth.email() AND (users.id = sender_id OR users.id = receiver_id))
);
CREATE POLICY "Users can send messages" ON messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE users.email = auth.email() AND users.id = sender_id)
);
CREATE POLICY "Users can update read status of received messages" ON messages FOR UPDATE USING (
  EXISTS (SELECT 1 FROM users WHERE users.email = auth.email() AND users.id = receiver_id)
);
CREATE POLICY "Admin can view all messages" ON messages FOR SELECT USING (auth.jwt() ->> 'role' = 'Administrateur');

-- Favorites: Seul l'utilisateur peut gérer ses favoris
CREATE POLICY "Users can view own favorites" ON favorites FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE users.email = auth.email() AND users.id = user_id)
);
CREATE POLICY "Users can insert own favorites" ON favorites FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE users.email = auth.email() AND users.id = user_id)
);
CREATE POLICY "Users can delete own favorites" ON favorites FOR DELETE USING (
  EXISTS (SELECT 1 FROM users WHERE users.email = auth.email() AND users.id = user_id)
);

-- Notifications: Seul l'utilisateur peut voir/gérer ses notifications
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE users.email = auth.email() AND users.id = user_id)
);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (
  EXISTS (SELECT 1 FROM users WHERE users.email = auth.email() AND users.id = user_id)
);
CREATE POLICY "Admin can manage all notifications" ON notifications FOR ALL USING (auth.jwt() ->> 'role' = 'Administrateur');

-- Transactions: Accès basé sur les permissions des commandes
CREATE POLICY "Users can view transactions for accessible orders" ON transactions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM orders o 
    WHERE o.id = transactions.order_id 
    AND (
      EXISTS (SELECT 1 FROM users WHERE users.email = auth.email() AND users.id = o.buyer_id)
      OR auth.jwt() ->> 'role' = 'Administrateur'
    )
  )
);

-- ===== 3. MASQUER LES DONNÉES SENSIBLES =====

-- Créer des vues sécurisées pour exposer publiquement certaines données sans infos sensibles
CREATE OR REPLACE VIEW public_products AS
SELECT 
  id, 
  name, 
  description, 
  price, 
  category, 
  stock, 
  image_url, 
  producer_id,
  created_at
FROM products 
WHERE is_approved = true;

CREATE OR REPLACE VIEW public_user_profiles AS
SELECT 
  id, 
  name, 
  location, 
  role,
  created_at
FROM users;

-- Politique pour les vues publiques
CREATE POLICY "Public can view public products" ON public_products FOR SELECT USING (true);
CREATE POLICY "Public can view public user profiles" ON public_user_profiles FOR SELECT USING (true);

-- ===== 4. VALIDATION SUPPLÉMENTAIRE =====

-- Fonction pour vérifier si l'utilisateur est authentifié
CREATE OR REPLACE FUNCTION is_authenticated() RETURNS boolean AS $$
BEGIN
  RETURN auth.uid() IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour vérifier si l'utilisateur est admin
CREATE OR REPLACE FUNCTION is_admin() RETURNS boolean AS $$
BEGIN
  RETURN auth.jwt() ->> 'role' = 'Administrateur';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== 5. VÉRIFICATION =====

-- Requête pour vérifier que toutes les tables ont RLS activé
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'users', 'products', 'orders', 'order_items', 'reviews', 
    'forum_posts', 'forum_comments', 'forum_likes', 'messages', 
    'favorites', 'notifications', 'transactions'
)
ORDER BY tablename;

-- Requête pour vérifier toutes les politiques
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
