-- ============================================================
-- ÉTAPE 5: Politiques de sécurité - Messages, favoris, notifications et vues publiques
-- Exécutez après l'étape 4
-- ============================================================

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

-- ===== VUES PUBLIQUES SÉCURISÉES =====

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

-- Les vues publiques n'ont pas besoin de politiques RLS
-- Elles sont déjà accessibles publiquement par conception

-- ===== VÉRIFICATION FINALE =====

-- Requête pour vérifier toutes les politiques créées
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

-- Compter le nombre total de politiques
SELECT 
    tablename,
    COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;
