import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, Clock, CheckCircle2, Truck, Package, XCircle,
  ChevronDown, ChevronUp, Star, Send, MessageSquare } from 'lucide-react';
import api from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import toast from 'react-hot-toast';

interface OrderItem {
  id: number; product_id: number; product_name: string;
  quantity: number; price_at_purchase: number; image_url: string;
}
interface Order {
  id: number; total_amount: number; status: string;
  created_at: string; buyer_name?: string; items?: OrderItem[];
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  'En attente': { label: 'En attente', color: 'bg-amber-100 text-amber-700',     icon: Clock },
  'Payée':      { label: 'Payée',      color: 'bg-blue-100 text-blue-700',       icon: CheckCircle2 },
  'Expédiée':   { label: 'Expédiée',   color: 'bg-purple-100 text-purple-700',   icon: Truck },
  'Livrée':     { label: 'Livrée',     color: 'bg-emerald-100 text-emerald-700', icon: Package },
  'Annulée':    { label: 'Annulée',    color: 'bg-red-100 text-red-700',         icon: XCircle },
};

const SELLER_ROLES = ['Producteur', 'Fournisseur', 'Administrateur'];
const STATUS_FLOW  = ['En attente', 'Payée', 'Expédiée', 'Livrée'];

const MyOrders: React.FC = () => {
  const { user } = useAuth();
  const isSeller = SELLER_ROLES.includes(user?.role || '');

  const [orders, setOrders]           = useState<Order[]>([]);
  const [loading, setLoading]         = useState(true);
  const [expandedId, setExpandedId]   = useState<number | null>(null);
  const [loadingId, setLoadingId]     = useState<number | null>(null);
  const [updatingId, setUpdatingId]   = useState<number | null>(null);
  const [reviewState, setReviewState] = useState<Record<number, { rating: number; comment: string; sent: boolean }>>({});

  useEffect(() => { fetchOrders(); }, [isSeller]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const endpoint = isSeller ? '/orders/seller/mine' : '/orders';
      const res = await api.get(endpoint);
      setOrders(res.data);
    } catch {
      toast.error('Erreur lors du chargement des commandes');
    } finally {
      setLoading(false);
    }
  };

  const toggleDetails = async (order: Order) => {
    if (expandedId === order.id) { setExpandedId(null); return; }
    if (order.items) { setExpandedId(order.id); return; }
    setLoadingId(order.id);
    try {
      const res = await api.get(`/orders/${order.id}`);
      setOrders(orders.map(o => o.id === order.id ? { ...o, items: res.data.items } : o));
      setExpandedId(order.id);
    } catch { toast.error('Erreur détails'); }
    finally { setLoadingId(null); }
  };

  const updateStatus = async (orderId: number, newStatus: string) => {
    setUpdatingId(orderId);
    try {
      await api.put(`/orders/${orderId}/status`, { status: newStatus });
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      toast.success(`Commande marquée : ${newStatus}`);
    } catch { toast.error('Erreur mise à jour statut'); }
    finally { setUpdatingId(null); }
  };

  const submitReview = async (productId: number, orderId: number) => {
    const r = reviewState[productId];
    if (!r?.rating) { toast.error('Choisissez une note'); return; }
    try {
      await api.post(`/products/${productId}/reviews`, { rating: r.rating, comment: r.comment });
      setReviewState(prev => ({ ...prev, [productId]: { ...prev[productId], sent: true } }));
      toast.success('Avis publié !');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur');
    }
  };

  return (
      <div className="p-8 max-w-5xl mx-auto">
        <div className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 tracking-tight">
              {isSeller ? 'Commandes reçues' : 'Mes Commandes'}
            </h1>
            <p className="text-gray-500 mt-1">
              {isSeller ? 'Gérez les commandes de vos acheteurs.' : 'Suivez l\'état de vos commandes.'}
            </p>
          </div>
        </div>

        {loading ? (
            <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="bg-white rounded-3xl p-6 border border-gray-100 animate-pulse h-24" />)}</div>
        ) : orders.length === 0 ? (
            <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-gray-200">
              <ShoppingBag size={56} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Aucune commande</h3>
              <p className="text-gray-500">{isSeller ? 'Vous n\'avez pas encore reçu de commande.' : 'Vous n\'avez pas encore passé de commande.'}</p>
            </div>
        ) : (
            <div className="space-y-4">
              {orders.map(order => {
                const status    = statusConfig[order.status] || statusConfig['En attente'];
                const StatusIcon = status.icon;
                const isExpanded = expandedId === order.id;
                const currentIdx = STATUS_FLOW.indexOf(order.status);
                const nextStatus = STATUS_FLOW[currentIdx + 1];

                return (
                    <motion.div key={order.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">

                      {/* Header commande */}
                      <div className="p-6 flex items-center gap-6">
                        <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 flex-shrink-0">
                          <ShoppingBag size={24} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1 flex-wrap">
                            <h3 className="font-bold text-gray-900 text-lg">Commande #{order.id}</h3>
                            <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${status.color}`}>
                        <StatusIcon size={12} />{status.label}
                      </span>
                          </div>
                          <p className="text-gray-500 text-sm">
                            {new Date(order.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                            {isSeller && order.buyer_name && <span className="ml-2 text-gray-400">· {order.buyer_name}</span>}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-2xl font-black text-emerald-600">{order.total_amount.toLocaleString()} Ar</p>
                        </div>
                        <button onClick={() => toggleDetails(order)} className="p-2 hover:bg-gray-100 rounded-xl transition-all text-gray-500">
                          {loadingId === order.id
                              ? <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                              : isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </button>
                      </div>

                      {/* Boutons statut vendeur */}
                      {isSeller && order.status !== 'Livrée' && order.status !== 'Annulée' && (
                          <div className="px-6 pb-4 flex gap-2 flex-wrap">
                            {nextStatus && (
                                <button onClick={() => updateStatus(order.id, nextStatus)} disabled={updatingId === order.id}
                                        className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl transition-all disabled:opacity-50">
                                  {updatingId === order.id ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Truck size={12} />}
                                  Marquer "{nextStatus}"
                                </button>
                            )}
                            <button onClick={() => updateStatus(order.id, 'Annulée')} disabled={updatingId === order.id}
                                    className="flex items-center gap-1.5 text-xs bg-red-50 hover:bg-red-100 text-red-600 font-bold px-4 py-2 rounded-xl transition-all disabled:opacity-50">
                              <XCircle size={12} /> Annuler
                            </button>
                            <button onClick={() => window.open('/messages')}
                                    className="flex items-center gap-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold px-4 py-2 rounded-xl transition-all">
                              <MessageSquare size={12} /> Contacter l'acheteur
                            </button>
                          </div>
                      )}

                      {/* Détails articles */}
                      <AnimatePresence>
                        {isExpanded && order.items && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                        className="border-t border-gray-100 bg-gray-50 overflow-hidden">
                              <div className="p-6">
                                <h4 className="font-bold text-gray-700 mb-4 text-sm uppercase tracking-wider">Articles</h4>
                                <div className="space-y-3">
                                  {order.items.map(item => (
                                      <div key={item.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                                        <div className="flex items-center gap-4 p-4">
                                          <img src={item.image_url || `https://picsum.photos/seed/${item.id}/100/100`}
                                               alt={item.product_name} className="w-14 h-14 rounded-xl object-cover" />
                                          <div className="flex-1">
                                            <p className="font-bold text-gray-900">{item.product_name}</p>
                                            <p className="text-sm text-gray-500">Qté: {item.quantity}</p>
                                          </div>
                                          <p className="font-bold text-emerald-600">{(item.price_at_purchase * item.quantity).toLocaleString()} Ar</p>
                                        </div>

                                        {/* Section avis — acheteur uniquement, commande livrée */}
                                        {!isSeller && order.status === 'Livrée' && (
                                            <div className="border-t border-gray-100 p-4 bg-gray-50">
                                              {reviewState[item.product_id]?.sent ? (
                                                  <p className="text-xs text-emerald-600 font-bold flex items-center gap-1"><CheckCircle2 size={12} /> Avis publié — merci !</p>
                                              ) : (
                                                  <div>
                                                    <p className="text-xs text-gray-500 mb-2 font-bold">Laisser un avis :</p>
                                                    <div className="flex gap-1 mb-2">
                                                      {[1,2,3,4,5].map(n => (
                                                          <button key={n} onClick={() => setReviewState(prev => ({ ...prev, [item.product_id]: { ...prev[item.product_id], rating: n, comment: prev[item.product_id]?.comment || '', sent: false }}))}
                                                                  className={`text-lg transition-all ${(reviewState[item.product_id]?.rating || 0) >= n ? 'text-amber-400' : 'text-gray-200 hover:text-amber-300'}`}>
                                                            <Star size={18} fill={(reviewState[item.product_id]?.rating || 0) >= n ? 'currentColor' : 'none'} />
                                                          </button>
                                                      ))}
                                                    </div>
                                                    <div className="flex gap-2">
                                                      <input type="text" placeholder="Votre commentaire (optionnel)"
                                                             value={reviewState[item.product_id]?.comment || ''}
                                                             onChange={e => setReviewState(prev => ({ ...prev, [item.product_id]: { ...prev[item.product_id], rating: prev[item.product_id]?.rating || 0, comment: e.target.value, sent: false }}))}
                                                             className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-emerald-400 bg-white" />
                                                      <button onClick={() => submitReview(item.product_id, order.id)}
                                                              disabled={!reviewState[item.product_id]?.rating}
                                                              className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-40 transition-all">
                                                        <Send size={14} />
                                                      </button>
                                                    </div>
                                                  </div>
                                              )}
                                            </div>
                                        )}
                                      </div>
                                  ))}
                                </div>
                              </div>
                            </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                );
              })}
            </div>
        )}
      </div>
  );
};

export default MyOrders;