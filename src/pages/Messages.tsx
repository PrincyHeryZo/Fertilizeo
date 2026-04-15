import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Send, MessageSquare, Search, Plus } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import toast from 'react-hot-toast';

interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  is_read: boolean;
  created_at: string;
  sender_name?: string;
  receiver_name?: string;
}

interface Conversation {
  userId: number;
  userName: string;
  lastMessage: string;
  unread: number;
}

const Messages: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [locallyReadConversations, setLocallyReadConversations] = useState<Set<number>>(() => {
  // Charger depuis localStorage au démarrage
  const saved = localStorage.getItem('locallyReadConversations');
  const parsed = saved ? new Set(JSON.parse(saved)) : new Set();
  console.log('localStorage chargé:', Array.from(parsed));
  return parsed;
});

  useEffect(() => { fetchMessages(); }, [locallyReadConversations]);

  // Sauvegarder dans localStorage quand l'état change
  useEffect(() => {
    localStorage.setItem('locallyReadConversations', JSON.stringify(Array.from(locallyReadConversations)));
  }, [locallyReadConversations]);

  // Ouvrir directement la conversation avec un vendeur si ?to= est présent dans l'URL
  useEffect(() => {
    const toParam = searchParams.get('to');
    if (toParam) {
      const targetId = parseInt(toParam);
      if (!isNaN(targetId)) {
        setSelectedUserId(targetId);
        // Marquer les messages comme lus si la conversation est ouverte via URL
        markMessagesAsRead(targetId);
      }
    }
  }, [searchParams]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const fetchMessages = async () => {
    try {
      const response = await api.get('/messages');
      const allMessages: Message[] = response.data;
      
      // Détecter les nouveaux messages reçus depuis la dernière vérification
      const newMessages = allMessages.filter(msg => 
        msg.receiver_id === user?.id && 
        !msg.is_read && 
        !locallyReadConversations.has(msg.sender_id)
      );
      
      // Si on reçoit un nouveau message, nettoyer le localStorage pour cette conversation
      if (newMessages.length > 0) {
        const senderIds = new Set(newMessages.map(msg => msg.sender_id));
        setLocallyReadConversations(prev => {
          const newSet = new Set(prev);
          senderIds.forEach(id => newSet.delete(id));
          return newSet;
        });
      }
      
      setMessages(allMessages);
      const convMap = new Map<number, Conversation>();
      allMessages.forEach(msg => {
        const otherId = msg.sender_id === user?.id ? msg.receiver_id : msg.sender_id;
        const otherName = msg.sender_id === user?.id ? (msg.receiver_name || 'Utilisateur') : (msg.sender_name || 'Utilisateur');
        
        // Ignorer les messages non lus si la conversation est marquée comme lue localement
        const isLocallyRead = locallyReadConversations.has(otherId);
        const isUnread = !msg.is_read && msg.receiver_id === user?.id && !isLocallyRead;
        
        if (!msg.is_read && msg.receiver_id === user?.id) {
          console.log(`Message non lu de ${otherId}: localementRead=${isLocallyRead}, isUnread=${isUnread}`);
        }
        
        if (!convMap.has(otherId)) {
          convMap.set(otherId, { userId: otherId, userName: otherName, lastMessage: msg.content, unread: isUnread ? 1 : 0 });
        } else {
          const existing = convMap.get(otherId)!;
          if (isUnread) existing.unread++;
        }
      });
      setConversations(Array.from(convMap.values()));
      if (convMap.size > 0 && !selectedUserId) setSelectedUserId(Array.from(convMap.keys())[0]);
    } catch {
      toast.error('Erreur lors du chargement des messages');
    } finally {
      setLoading(false);
    }
  };

  const currentMessages = messages
      .filter(m => (m.sender_id === user?.id && m.receiver_id === selectedUserId) || (m.receiver_id === user?.id && m.sender_id === selectedUserId))
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const selectedConv = conversations.find(c => c.userId === selectedUserId);

  const markMessagesAsRead = async (userId: number) => {
    try {
      console.log('https://fertilizeo.onrender.com/messages/read', userId);
      
      // Ajouter un timeout de 5 secondes
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout après 5 secondes')), 5000);
      });
      
      const response = await Promise.race([
        api.put('/messages/read', { sender_id: userId }),
        timeoutPromise
      ]);
      
      console.log('https://fertilizeo.onrender.com/messages/read:', response);
      setConversations(prev => prev.map(c =>
          c.userId === userId ? { ...c, unread: 0 } : c
      ));
      // Signaler à la Navbar de décrémenter le badge
      console.log('https://fertilizeo.onrender.com/messages/read (automatique)');
      window.dispatchEvent(new CustomEvent('msg-read'));
    } catch (error) {
      console.error('https://fertilizeo.onrender.com/messages/read:', error);
      
      // Solution alternative : mise à jour locale uniquement
      console.log('https://fertilizeo.onrender.com/messages/read (solution locale)');
      setConversations(prev => prev.map(c =>
          c.userId === userId ? { ...c, unread: 0 } : c
      ));
      // Ajouter à l'état local des conversations lues
      setLocallyReadConversations(prev => new Set([...prev, userId]));
      // Signaler à la Navbar de décrémenter le badge
      window.dispatchEvent(new CustomEvent('msg-read'));
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedUserId) return;
    setSending(true);
    try {
      await api.post('/messages', { receiver_id: selectedUserId, content: newMessage.trim() });
      setNewMessage('');
      // Nettoyer le localStorage pour cette conversation car on vient d'envoyer un message
      setLocallyReadConversations(prev => {
        const newSet = new Set(prev);
        newSet.delete(selectedUserId);
        return newSet;
      });
      fetchMessages();
    } catch {
      toast.error("Erreur lors de l'envoi");
    } finally {
      setSending(false);
    }
  };

  return (
      <div className="p-6 max-w-6xl mx-auto h-[calc(100vh-80px)]">
        <h1 className="text-3xl font-bold text-gray-900 mb-6 tracking-tight">Messagerie</h1>
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm flex h-[calc(100%-80px)] overflow-hidden">
          <div className="w-80 border-r border-gray-100 flex flex-col flex-shrink-0">
            <div className="p-4 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input placeholder="Rechercher..." className="w-full pl-9 pr-4 py-2 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-300" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                  <div className="p-4 space-y-3">
                    {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />)}
                  </div>
              ) : conversations.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">
                    <MessageSquare size={40} className="mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Aucune conversation</p>
                  </div>
              ) : conversations.map(conv => (
                  <button key={conv.userId} onClick={async () => {
                    setSelectedUserId(conv.userId);
                    // Marquer les messages de cette conv comme lus
                    if (conv.unread > 0) {
                      await markMessagesAsRead(conv.userId);
                    }
                  }}
                          className={`w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-all text-left ${selectedUserId === conv.userId ? 'bg-emerald-50 border-r-4 border-emerald-500' : ''}`}>
                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-bold flex-shrink-0">
                      {conv.userName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <p className="font-bold text-gray-900 text-sm truncate">{conv.userName}</p>
                        {conv.unread > 0 && <span className="bg-emerald-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">{conv.unread}</span>}
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{conv.lastMessage}</p>
                    </div>
                  </button>
              ))}
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            {selectedUserId && selectedConv ? (
                <>
                  <div className="p-5 border-b border-gray-100 flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-bold">
                      {selectedConv.userName.charAt(0).toUpperCase()}
                    </div>
                    <p className="font-bold text-gray-900">{selectedConv.userName}</p>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {currentMessages.map((msg) => {
                      const isMe = msg.sender_id === user?.id;
                      return (
                          <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                      className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[70%] px-4 py-3 rounded-2xl text-sm ${isMe ? 'bg-emerald-600 text-white rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'}`}>
                              <p>{msg.content}</p>
                              <p className={`text-xs mt-1 ${isMe ? 'text-emerald-200' : 'text-gray-400'}`}>
                                {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </motion.div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                  <div className="p-4 border-t border-gray-100">
                    <div className="flex gap-3">
                      <input value={newMessage} onChange={e => setNewMessage(e.target.value)}
                             onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                             placeholder="Écrivez votre message..."
                             className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-300 text-sm" />
                      <button onClick={handleSend} disabled={sending || !newMessage.trim()}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white p-3 rounded-2xl transition-all disabled:opacity-50">
                        {sending ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send size={20} />}
                      </button>
                    </div>
                  </div>
                </>
            ) : (
                <div className="flex-1 flex items-center justify-center text-center text-gray-400">
                  <div>
                    <MessageSquare size={56} className="mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium">Sélectionnez une conversation</p>
                  </div>
                </div>
            )}
          </div>
        </div>
      </div>
  );
};

export default Messages;