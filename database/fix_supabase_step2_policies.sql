-- ============================================================
-- ÉTAPE 2: Politiques de sécurité - Tables utilisateurs et produits
-- Exécutez après l'étape 1
-- ============================================================

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

-- Vérification
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('users', 'products')
ORDER BY tablename, policyname;
