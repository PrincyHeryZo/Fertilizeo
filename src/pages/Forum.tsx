import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Plus, User, Clock, MessageCircle, Eye, ChevronDown, ChevronUp, Send, X } from 'lucide-react';
import api from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import toast from 'react-hot-toast';

interface Comment {
  id: number;
  author_name: string;
  content: string;
  created_at: string;
}

interface Post {
  id: number;
  title: string;
  content: string;
  author_name: string;
  category: string;
  views: number;
  comment_count: number;
  created_at: string;
  comments?: Comment[];
}

const CATEGORIES = ['Général', 'Sol & Fertilité', 'Engrais & Fertilisants', 'Riziculture', 'Témoignages', 'Marketplace'];

const Forum: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', content: '', category: 'Général' });
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [submittingPost, setSubmittingPost] = useState(false);
  const { user } = useAuth();

  useEffect(() => { fetchPosts(); }, []);

  const fetchPosts = async () => {
    try {
      const response = await api.get('/forum/posts');
      setPosts(response.data);
    } catch {
      toast.error('Erreur lors du chargement des discussions');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingPost(true);
    try {
      await api.post('/forum/posts', newPost);
      setNewPost({ title: '', content: '', category: 'Général' });
      setShowNewPost(false);
      toast.success('Discussion publiée !');
      fetchPosts();
    } catch {
      toast.error('Erreur lors de la publication');
    } finally {
      setSubmittingPost(false);
    }
  };

  const toggleComments = async (post: Post) => {
    if (expandedId === post.id) { setExpandedId(null); return; }
    if (post.comments) { setExpandedId(post.id); return; }
    try {
      const response = await api.get(`/forum/posts/${post.id}/comments`);
      setPosts(posts.map(p => p.id === post.id ? { ...p, comments: response.data } : p));
      setExpandedId(post.id);
    } catch {
      toast.error('Erreur lors du chargement des commentaires');
    }
  };

  const handleSubmitComment = async (postId: number) => {
    if (!newComment.trim()) return;
    setSubmittingComment(true);
    try {
      await api.post('/forum/comments', { post_id: postId, content: newComment.trim() });
      setNewComment('');
      // Refresh comments
      const response = await api.get(`/forum/posts/${postId}/comments`);
      setPosts(posts.map(p => p.id === postId
        ? { ...p, comments: response.data, comment_count: response.data.length }
        : p
      ));
      toast.success('Commentaire ajouté !');
    } catch {
      toast.error('Erreur lors de l\'ajout du commentaire');
    } finally {
      setSubmittingComment(false);
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
          <button onClick={() => setShowNewPost(!showNewPost)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-100">
            {showNewPost ? <X size={20} /> : <Plus size={20} />}
            {showNewPost ? 'Annuler' : 'Nouvelle Discussion'}
          </button>
        )}
      </div>

      {/* New Post Form */}
      <AnimatePresence>
        {showNewPost && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="bg-white p-8 rounded-3xl shadow-xl border border-emerald-100 mb-12">
            <h2 className="text-xl font-bold mb-6">Lancer une discussion</h2>
            <form onSubmit={handleSubmitPost} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Titre</label>
                <input type="text" required value={newPost.title}
                  onChange={e => setNewPost({ ...newPost, title: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="Ex: Comment faire un bon compost ?" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Catégorie</label>
                <select value={newPost.category} onChange={e => setNewPost({ ...newPost, category: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Message</label>
                <textarea required rows={4} value={newPost.content}
                  onChange={e => setNewPost({ ...newPost, content: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                  placeholder="Décrivez votre sujet..." />
              </div>
              <div className="flex justify-end gap-4">
                <button type="button" onClick={() => setShowNewPost(false)}
                  className="px-6 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition-all">
                  Annuler
                </button>
                <button type="submit" disabled={submittingPost}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold transition-all disabled:opacity-50">
                  {submittingPost ? 'Publication...' : 'Publier'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Posts List */}
      {loading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-32 bg-white rounded-3xl border border-gray-100 animate-pulse" />)}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-24 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
          <MessageSquare size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-bold text-gray-900">Aucune discussion</h3>
          <p className="text-gray-500">Soyez le premier à lancer une discussion !</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <motion.div key={post.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Post Header */}
              <div className="p-8">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-bold text-lg flex-shrink-0">
                    {post.author_name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full">{post.category}</span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{post.title}</h3>
                    <p className="text-gray-600 leading-relaxed mb-4">{post.content}</p>
                    <div className="flex flex-wrap items-center gap-6 text-sm text-gray-400 font-medium">
                      <div className="flex items-center gap-2">
                        <User size={15} /><span>{post.author_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock size={15} /><span>{new Date(post.created_at).toLocaleDateString('fr-FR')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Eye size={15} /><span>{post.views} vues</span>
                      </div>
                      <button onClick={() => toggleComments(post)}
                        className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-bold transition-colors">
                        <MessageCircle size={15} />
                        <span>{post.comment_count} réponse{post.comment_count !== 1 ? 's' : ''}</span>
                        {expandedId === post.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Comments Section */}
              <AnimatePresence>
                {expandedId === post.id && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="border-t border-gray-100 bg-gray-50">
                    <div className="p-6 space-y-4">
                      {post.comments && post.comments.length === 0 && (
                        <p className="text-center text-gray-400 py-4">Aucune réponse pour l'instant. Soyez le premier !</p>
                      )}
                      {post.comments?.map(comment => (
                        <div key={comment.id} className="flex gap-3">
                          <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-bold text-sm flex-shrink-0">
                            {comment.author_name?.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 bg-white p-4 rounded-2xl border border-gray-100">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-bold text-gray-900 text-sm">{comment.author_name}</span>
                              <span className="text-xs text-gray-400">{new Date(comment.created_at).toLocaleDateString('fr-FR')}</span>
                            </div>
                            <p className="text-gray-700 text-sm">{comment.content}</p>
                          </div>
                        </div>
                      ))}

                      {/* Add Comment */}
                      {user ? (
                        <div className="flex gap-3 mt-4">
                          <div className="w-9 h-9 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-bold text-sm flex-shrink-0">
                            {user.name?.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 flex gap-2">
                            <input value={newComment} onChange={e => setNewComment(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && handleSubmitComment(post.id)}
                              placeholder="Écrire une réponse..."
                              className="flex-1 bg-white border border-gray-200 rounded-2xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-300" />
                            <button onClick={() => handleSubmitComment(post.id)}
                              disabled={submittingComment || !newComment.trim()}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-2xl transition-all disabled:opacity-50 flex items-center gap-2 text-sm font-bold">
                              <Send size={15} /> Envoyer
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-center text-sm text-gray-400 py-2">
                          <a href="/login" className="text-emerald-600 font-bold hover:underline">Connectez-vous</a> pour répondre
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Forum;
