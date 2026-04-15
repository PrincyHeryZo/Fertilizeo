import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './AuthContext.tsx';
import api from '../services/api.ts';

interface MessageContextType {
  unreadCount: number;
  markConversationRead: (senderId: number) => Promise<void>;
  refreshUnreadCount: () => Promise<void>;
}

const MessageContext = createContext<MessageContextType>({
  unreadCount: 0,
  markConversationRead: async () => {},
  refreshUnreadCount: async () => {},
});

export const MessageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  // Ref pour éviter les setState après unmount
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const refreshUnreadCount = useCallback(async () => {
    if (!user) { setUnreadCount(0); return; }
    try {
      const res = await api.get('/messages/unread-count');
      if (mountedRef.current) {
        setUnreadCount(res.data.count ?? 0);
      }
    } catch {
      // Silencieux — on garde le compteur précédent
    }
  }, [user]);

  // Poll toutes les 30s — endpoint léger (COUNT seulement)
  useEffect(() => {
    if (!user) { setUnreadCount(0); return; }
    refreshUnreadCount();
    const interval = setInterval(refreshUnreadCount, 30_000);
    return () => clearInterval(interval);
  }, [user, refreshUnreadCount]);

  const markConversationRead = useCallback(async (senderId: number) => {
    // 1. Mise à jour optimiste immédiate
    setUnreadCount(0);
    try {
      // 2. Persister en base
      await api.put('/messages/read', { sender_id: senderId });
      // 3. Recharger le vrai compteur depuis la DB (au cas où d'autres convs ont des non-lus)
      await refreshUnreadCount();
    } catch (err) {
      // L'appel backend a échoué mais le badge reste à 0 localement
      // Le prochain poll (30s) remettra le bon état
      console.warn('markConversationRead: backend error, badge reset locally', err);
    }
  }, [refreshUnreadCount]);

  return (
    <MessageContext.Provider value={{ unreadCount, markConversationRead, refreshUnreadCount }}>
      {children}
    </MessageContext.Provider>
  );
};

export const useMessages = () => useContext(MessageContext);
