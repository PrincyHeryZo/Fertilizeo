import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  TrendingUp, 
  ShoppingBag, 
  Users, 
  Package, 
  ArrowUpRight, 
  ArrowDownRight, 
  Clock, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import api from '../services/api.ts';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        if (user?.role === 'Administrateur') {
          const response = await api.get('/admin/stats');
          setStats(response.data);
        } else {
          // Mock stats for other roles
          setStats({
            orders: 12,
            revenue: 450000,
            products: 5,
            notifications: 3
          });
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [user]);

  const cards = [
    { title: 'Commandes Totales', value: stats?.orders || 0, icon: ShoppingBag, color: 'bg-blue-500', trend: '+12%', up: true },
    { title: 'Chiffre d\'Affaires', value: `${(stats?.revenue || 0).toLocaleString()} Ar`, icon: TrendingUp, color: 'bg-emerald-500', trend: '+8%', up: true },
    { title: 'Produits Actifs', value: stats?.products || 0, icon: Package, color: 'bg-amber-500', trend: '-2%', up: false },
    { title: 'Utilisateurs', value: stats?.users || 0, icon: Users, color: 'bg-indigo-500', trend: '+5%', up: true },
  ];

  const filteredCards = user?.role === 'Administrateur' ? cards : cards.slice(0, 3);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Bonjour, {user?.name} 👋</h1>
          <p className="text-gray-500 mt-1">Voici un aperçu de votre activité sur FERTILI’ZEO.</p>
        </div>
        <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full font-bold text-sm border border-emerald-100 shadow-sm">
          Rôle: {user?.role}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {filteredCards.map((card, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl transition-all group"
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`w-12 h-12 ${card.color} text-white rounded-2xl flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform`}>
                <card.icon size={24} />
              </div>
              <div className={`flex items-center gap-1 text-sm font-bold ${card.up ? 'text-emerald-600' : 'text-red-500'}`}>
                {card.trend}
                {card.up ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
              </div>
            </div>
            <h3 className="text-gray-500 font-medium mb-1">{card.title}</h3>
            <p className="text-3xl font-black text-gray-900">{card.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Activités Récentes</h2>
            <button className="text-emerald-600 font-bold text-sm hover:underline">Voir tout</button>
          </div>
          
          <div className="space-y-6">
            {[
              { type: 'order', title: 'Nouvelle commande #1234', time: 'Il y a 2h', status: 'En attente', icon: Clock, color: 'text-amber-500' },
              { type: 'product', title: 'Produit "Compost Bio" approuvé', time: 'Il y a 5h', status: 'Approuvé', icon: CheckCircle2, color: 'text-emerald-500' },
              { type: 'message', title: 'Nouveau message de Jean', time: 'Il y a 1j', status: 'Non lu', icon: AlertCircle, color: 'text-blue-500' },
            ].map((activity, idx) => (
              <div key={idx} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100">
                <div className={`w-10 h-10 bg-gray-100 ${activity.color} rounded-xl flex items-center justify-center`}>
                  <activity.icon size={20} />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900">{activity.title}</h4>
                  <p className="text-sm text-gray-500">{activity.time}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  activity.status === 'Approuvé' ? 'bg-emerald-100 text-emerald-700' : 
                  activity.status === 'En attente' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {activity.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-emerald-900 rounded-3xl shadow-xl p-8 text-white relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-2xl font-bold mb-4">Conseil du jour</h2>
            <p className="text-emerald-100 mb-8 leading-relaxed">
              "L'utilisation du compost mûr permet d'améliorer la structure du sol et de retenir l'humidité pour vos cultures maraîchères."
            </p>
            <button className="bg-white text-emerald-900 px-6 py-3 rounded-2xl font-bold hover:bg-emerald-50 transition-all shadow-lg">
              Lire plus de conseils
            </button>
          </div>
          <div className="absolute -bottom-10 -right-10 opacity-10">
            <Package size={200} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
