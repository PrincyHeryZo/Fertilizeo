import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Bell, ShoppingBag, MessageSquare, Package, CheckCheck } from 'lucide-react';
import api from '../services/api.ts';
import toast from 'react-hot-toast';

interface Notification {
  id: number;
  type: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

const typeConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  order:   { icon: ShoppingBag,   color: 'text-blue-600',    bg: 'bg-blue-50' },
  message: { icon: MessageSquare, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  product: { icon: Package,       color: 'text-amber-600',   bg: 'bg-amber-50' },
  forum:   { icon: Bell,          color: 'text-purple-600',  bg: 'bg-purple-50' },
};

const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchNotifications(); }, []);

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/notifications');
      setNotifications(response.data);
    } catch {
      toast.error('Erreur lors du chargement des notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
      toast.success('Toutes les notifications marquées comme lues');
    } catch {
      toast.error('Erreur');
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Notifications</h1>
          <p className="text-gray-500 mt-1">{unreadCount > 0 ? `${unreadCount} non lue(s)` : 'Tout est à jour'}</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead}
            className="flex items-center gap-2 text-emerald-600 font-bold hover:bg-emerald-50 px-4 py-2 rounded-xl transition-all text-sm">
            <CheckCheck size={18} /> Tout marquer lu
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4].map(i => <div key={i} className="h-20 bg-white rounded-2xl border border-gray-100 animate-pulse" />)}
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-gray-200">
          <Bell size={56} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Aucune notification</h3>
          <p className="text-gray-500">Vous êtes à jour !</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif) => {
            const config = typeConfig[notif.type] || typeConfig['order'];
            const Icon = config.icon;
            return (
              <motion.div key={notif.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                className={`flex items-center gap-4 p-5 rounded-2xl border transition-all ${notif.is_read ? 'bg-white border-gray-100' : 'bg-blue-50 border-blue-100 shadow-sm'}`}>
                <div className={`w-12 h-12 ${config.bg} ${config.color} rounded-2xl flex items-center justify-center flex-shrink-0`}>
                  <Icon size={22} />
                </div>
                <div className="flex-1">
                  <p className={`text-sm ${notif.is_read ? 'text-gray-700' : 'text-gray-900 font-bold'}`}>{notif.content}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(notif.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {!notif.is_read && <div className="w-2.5 h-2.5 bg-blue-500 rounded-full flex-shrink-0" />}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Notifications;
