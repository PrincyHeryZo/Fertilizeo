import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ShoppingBag, Clock, CheckCircle2, Truck, Package, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../services/api.ts';
import toast from 'react-hot-toast';

interface Order {
  id: number;
  total_amount: number;
  status: string;
  created_at: string;
  items?: OrderItem[];
}

interface OrderItem {
  id: number;
  product_name: string;
  quantity: number;
  price_at_purchase: number;
  image_url: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  'En attente': { label: 'En attente', color: 'bg-amber-100 text-amber-700', icon: Clock },
  'Payée': { label: 'Payée', color: 'bg-blue-100 text-blue-700', icon: CheckCircle2 },
  'Expédiée': { label: 'Expédiée', color: 'bg-purple-100 text-purple-700', icon: Truck },
  'Livrée': { label: 'Livrée', color: 'bg-emerald-100 text-emerald-700', icon: Package },
  'Annulée': { label: 'Annulée', color: 'bg-red-100 text-red-700', icon: XCircle },
};

const MyOrders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [loadingDetails, setLoadingDetails] = useState<number | null>(null);

  useEffect(() => { fetchOrders(); }, []);

  const fetchOrders = async () => {
    try {
      const response = await api.get('/orders');
      setOrders(response.data);
    } catch {
      toast.error('Erreur lors du chargement des commandes');
    } finally {
      setLoading(false);
    }
  };

  const toggleDetails = async (order: Order) => {
    if (expandedId === order.id) { setExpandedId(null); return; }
    if (order.items) { setExpandedId(order.id); return; }
    setLoadingDetails(order.id);
    try {
      const response = await api.get(`/orders/${order.id}`);
      setOrders(orders.map(o => o.id === order.id ? { ...o, items: response.data.items } : o));
      setExpandedId(order.id);
    } catch {
      toast.error('Erreur lors du chargement des détails');
    } finally {
      setLoadingDetails(null);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Mes Commandes</h1>
        <p className="text-gray-500 mt-1">Suivez l'état de vos commandes.</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="bg-white rounded-3xl p-6 border border-gray-100 animate-pulse h-24"/>)}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-gray-200">
          <ShoppingBag size={56} className="mx-auto text-gray-300 mb-4"/>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Aucune commande</h3>
          <p className="text-gray-500">Vous n'avez pas encore passé de commande.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const status = statusConfig[order.status] || statusConfig['En attente'];
            const StatusIcon = status.icon;
            const isExpanded = expandedId === order.id;
            return (
              <motion.div key={order.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 flex items-center gap-6">
                  <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 flex-shrink-0">
                    <ShoppingBag size={24}/>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-bold text-gray-900 text-lg">Commande #{order.id}</h3>
                      <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${status.color}`}>
                        <StatusIcon size={12}/>{status.label}
                      </span>
                    </div>
                    <p className="text-gray-500 text-sm">{new Date(order.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-emerald-600">{order.total_amount.toLocaleString()} Ar</p>
                  </div>
                  <button onClick={() => toggleDetails(order)}
                    className="p-2 hover:bg-gray-100 rounded-xl transition-all text-gray-500">
                    {loadingDetails === order.id ? (
                      <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"/>
                    ) : isExpanded ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                  </button>
                </div>
                {isExpanded && order.items && (
                  <div className="border-t border-gray-100 p-6 bg-gray-50">
                    <h4 className="font-bold text-gray-700 mb-4 text-sm uppercase tracking-wider">Détail des articles</h4>
                    <div className="space-y-3">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-gray-100">
                          <img src={item.image_url || `https://picsum.photos/seed/${item.id}/100/100`}
                            alt={item.product_name} className="w-14 h-14 rounded-xl object-cover"/>
                          <div className="flex-1">
                            <p className="font-bold text-gray-900">{item.product_name}</p>
                            <p className="text-sm text-gray-500">Qté: {item.quantity}</p>
                          </div>
                          <p className="font-bold text-emerald-600">{(item.price_at_purchase * item.quantity).toLocaleString()} Ar</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyOrders;
