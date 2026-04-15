-- ============================================================
-- ÉTAPE 4: Politiques de sécurité - Forum et reviews
-- Exécutez après l'étape 3
-- ============================================================

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
AND tablename IN ('reviews', 'forum_posts', 'forum_comments', 'forum_likes')
ORDER BY tablename, policyname;
