-- ============================================================
-- ÉTAPE 3: Politiques de sécurité - Commandes et transactions
-- Exécutez après l'étape 2
-- ============================================================

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
AND tablename IN ('orders', 'order_items', 'transactions')
ORDER BY tablename, policyname;
