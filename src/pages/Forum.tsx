import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { MessageSquare, Plus, User, Clock, MessageCircle } from 'lucide-react';
import api from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface Post {
  id: number;
  title: string;
  content: string;
  author_name: string;
  created_at: string;
}

const Forum: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', content: '' });
  const { user } = useAuth();

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const response = await api.get('/forum/posts');
      setPosts(response.data);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/forum/posts', newPost);
      setNewPost({ title: '', content: '' });
      setShowNewPost(false);
      fetchPosts();
    } catch (error) {
      console.error('Error creating post:', error);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Forum Agricole</h1>
          <p className="text-gray-500">Partagez vos conseils et posez vos questions à la communauté.</p>
        </div>
        {user && (
          <button 
            onClick={() => setShowNewPost(!showNewPost)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-100"
          >
            <Plus size={20} />
            Nouvelle Discussion
          </button>
        )}
      </div>

      {showNewPost && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-3xl shadow-xl border border-emerald-100 mb-12"
        >
          <h2 className="text-xl font-bold mb-6">Lancer une discussion</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Titre</label>
              <input 
                type="text" 
                required 
                value={newPost.title}
                onChange={(e) => setNewPost({...newPost, title: e.target.value})}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                placeholder="Ex: Comment faire un bon compost ?"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Message</label>
              <textarea 
                required 
                rows={4}
                value={newPost.content}
                onChange={(e) => setNewPost({...newPost, content: e.target.value})}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                placeholder="Décrivez votre sujet..."
              />
            </div>
            <div className="flex justify-end gap-4">
              <button 
                type="button" 
                onClick={() => setShowNewPost(false)}
                className="px-6 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition-all"
              >
                Annuler
              </button>
              <button 
                type="submit" 
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold transition-all"
              >
                Publier
              </button>
            </div>
          </form>
        </motion.div>
      )}

      <div className="space-y-6">
        {posts.map((post) => (
          <motion.div 
            key={post.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-all group cursor-pointer"
          >
            <div className="flex gap-6">
              <div className="hidden sm:flex flex-col items-center gap-2">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                  <User size={24} />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 group-hover:text-emerald-600 transition-colors mb-2">{post.title}</h3>
                <p className="text-gray-600 line-clamp-2 mb-6 leading-relaxed">{post.content}</p>
                
                <div className="flex flex-wrap items-center gap-6 text-sm text-gray-400 font-medium">
                  <div className="flex items-center gap-2">
                    <User size={16} />
                    <span>{post.author_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={16} />
                    <span>{new Date(post.created_at).toLocaleDateString('fr-FR')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-600">
                    <MessageCircle size={16} />
                    <span>12 réponses</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {!loading && posts.length === 0 && (
        <div className="text-center py-24 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
          <MessageSquare size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-bold text-gray-900">Aucune discussion</h3>
          <p className="text-gray-500">Soyez le premier à lancer une discussion !</p>
        </div>
      )}
    </div>
  );
};

export default Forum;
