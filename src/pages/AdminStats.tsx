import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Users, Package, ShoppingBag, TrendingUp, ArrowUpRight, BarChart2, Activity } from 'lucide-react';
import api from '../../../../Documents/MUSIC LYRICS/Fertilizeo_fixed/Fertilizeo_fixed/src/services/api.ts';

interface Stats {
  users: number;
  products: number;
  orders: number;
  revenue: number;
}

const AdminStats: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/stats').then(r => setStats(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  const cards = [
    { title: 'Utilisateurs', value: stats?.users || 0, icon: Users, color: 'bg-indigo-500', lightColor: 'bg-indigo-50', textColor: 'text-indigo-600', trend: '+12%' },
    { title: 'Produits', value: stats?.products || 0, icon: Package, color: 'bg-amber-500', lightColor: 'bg-amber-50', textColor: 'text-amber-600', trend: '+5%' },
    { title: 'Commandes', value: stats?.orders || 0, icon: ShoppingBag, color: 'bg-blue-500', lightColor: 'bg-blue-50', textColor: 'text-blue-600', trend: '+18%' },
    { title: 'Chiffre d\'Affaires', value: `${(stats?.revenue || 0).toLocaleString()} Ar`, icon: TrendingUp, color: 'bg-emerald-500', lightColor: 'bg-emerald-50', textColor: 'text-emerald-600', trend: '+22%' },
  ];

  const barData = [
    { month: 'Oct', orders: 12, revenue: 1200000 },
    { month: 'Nov', orders: 18, revenue: 1850000 },
    { month: 'Déc', orders: 25, revenue: 2400000 },
    { month: 'Jan', orders: 20, revenue: 1950000 },
    { month: 'Fév', orders: 30, revenue: 3100000 },
    { month: 'Mar', orders: stats?.orders || 35, revenue: stats?.revenue || 3800000 },
  ];
  const maxRevenue = Math.max(...barData.map(d => d.revenue));

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Statistiques Globales</h1>
        <p className="text-gray-500 mt-1">Vue d'ensemble de la plateforme FERTILI'ZEO</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <motion.div key={idx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}
              className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl transition-all group">
              <div className="flex justify-between items-start mb-5">
                <div className={`w-12 h-12 ${card.lightColor} ${card.textColor} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <Icon size={24}/>
                </div>
                <div className="flex items-center gap-1 text-emerald-600 font-bold text-sm">
                  {card.trend}<ArrowUpRight size={14}/>
                </div>
              </div>
              <p className="text-gray-500 text-sm font-medium mb-1">{card.title}</p>
              {loading ? (
                <div className="h-8 bg-gray-100 animate-pulse rounded-xl w-3/4"/>
              ) : (
                <p className="text-3xl font-black text-gray-900">{card.value}</p>
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Évolution des revenus</h2>
              <p className="text-gray-500 text-sm mt-1">6 derniers mois</p>
            </div>
            <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl text-sm font-bold">
              <Activity size={16}/> En direct
            </div>
          </div>
          <div className="flex items-end gap-3 h-48">
            {barData.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <motion.div
                  initial={{ height: 0 }} animate={{ height: `${(d.revenue / maxRevenue) * 100}%` }}
                  transition={{ delay: i * 0.1, duration: 0.6, ease: 'easeOut' }}
                  className="w-full bg-emerald-500 rounded-t-xl hover:bg-emerald-600 transition-colors cursor-pointer relative group"
                  style={{ minHeight: 8 }}>
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {(d.revenue / 1000).toFixed(0)}k Ar
                  </div>
                </motion.div>
                <span className="text-xs text-gray-500 font-medium">{d.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top metrics */}
        <div className="space-y-4">
          <div className="bg-emerald-900 rounded-3xl p-6 text-white">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-emerald-700 rounded-2xl flex items-center justify-center">
                <BarChart2 size={20}/>
              </div>
              <p className="font-bold">Panier moyen</p>
            </div>
            <p className="text-3xl font-black">{stats ? Math.round(stats.revenue / (stats.orders || 1)).toLocaleString() : '—'} Ar</p>
            <p className="text-emerald-300 text-sm mt-1">par commande</p>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-4">Répartition par rôle</h3>
            <div className="space-y-3">
              {[
                { label: 'Agriculteurs', pct: 45, color: 'bg-amber-400' },
                { label: 'Producteurs', pct: 28, color: 'bg-emerald-500' },
                { label: 'Fournisseurs', pct: 15, color: 'bg-blue-400' },
                { label: 'Acheteurs', pct: 12, color: 'bg-purple-400' },
              ].map((item, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 font-medium">{item.label}</span>
                    <span className="font-bold text-gray-900">{item.pct}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${item.pct}%` }}
                      transition={{ delay: 0.3 + i * 0.1, duration: 0.6 }}
                      className={`h-full ${item.color} rounded-full`}/>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminStats;
