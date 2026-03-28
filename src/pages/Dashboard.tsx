import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, ShoppingBag, Users, Package, ArrowUpRight, Clock, CheckCircle2, AlertCircle, Zap, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
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
          setStats({ orders: 0, revenue: 0, products: 0, notifications: 0 });
        }
      } catch {
        setStats({ orders: 0, revenue: 0, products: 0, notifications: 0 });
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [user]);

  const roleGradient: Record<string, string> = {
    Administrateur: 'from-red-500 to-rose-600',
    Producteur: 'from-emerald-500 to-teal-600',
    Fournisseur: 'from-blue-500 to-indigo-600',
    Agriculteur: 'from-amber-500 to-orange-600',
    Acheteur: 'from-purple-500 to-violet-600',
  };

  const gradient = roleGradient[user?.role || ''] || 'from-emerald-500 to-teal-600';

  const cards = [
    { title: 'Commandes', value: stats?.orders ?? '—', icon: ShoppingBag, color: 'bg-blue-500', trend: '+12%' },
    { title: 'Revenus (Ar)', value: stats?.revenue ? (stats.revenue / 1000).toFixed(0) + 'k' : '—', icon: TrendingUp, color: 'bg-emerald-500', trend: '+8%' },
    { title: 'Produits', value: stats?.products ?? '—', icon: Package, color: 'bg-amber-500', trend: '+5%' },
    { title: 'Utilisateurs', value: stats?.users ?? '—', icon: Users, color: 'bg-purple-500', trend: '+15%' },
  ];

  const visibleCards = user?.role === 'Administrateur' ? cards : cards.slice(0, 2);

  const activities = [
    { title: 'Nouvelle commande enregistrée', time: 'Il y a 2h', status: 'En attente', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50' },
    { title: 'Produit "Compost Bio" approuvé', time: 'Il y a 5h', status: 'Approuvé', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { title: 'Nouveau message reçu', time: 'Hier', status: 'Non lu', icon: AlertCircle, color: 'text-blue-500', bg: 'bg-blue-50' },
  ];

  const quickLinks = user?.role === 'Administrateur'
    ? [
        { to: '/admin/approvals', label: 'Voir les approbations', icon: CheckCircle2 },
        { to: '/admin/users', label: 'Gérer les utilisateurs', icon: Users },
        { to: '/admin/stats', label: 'Statistiques complètes', icon: TrendingUp },
      ]
    : user?.role === 'Producteur' || user?.role === 'Fournisseur'
    ? [
        { to: '/dashboard/products/new', label: 'Publier un produit', icon: Package },
        { to: '/dashboard/products', label: 'Mes produits', icon: Package },
        { to: '/dashboard/orders', label: 'Mes commandes', icon: ShoppingBag },
      ]
    : [
        { to: '/marketplace', label: 'Explorer la marketplace', icon: Package },
        { to: '/dashboard/orders', label: 'Mes commandes', icon: ShoppingBag },
        { to: '/forum', label: 'Aller au forum', icon: Users },
      ];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">

      {/* Header */}
      <div className="mb-10">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className={`bg-gradient-to-r ${gradient} rounded-3xl p-8 text-white relative overflow-hidden`}>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-1/2 w-32 h-32 bg-white/5 rounded-full translate-y-1/2" />
          <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Zap size={16} className="text-white/70" />
                <span className="text-white/70 text-sm font-medium">{user?.role}</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-black mb-1">Bonjour, {user?.name?.split(' ')[0]} 👋</h1>
              <p className="text-white/70">Voici un aperçu de votre activité sur FERTILI'ZEO</p>
            </div>
            <Link to="/marketplace"
              className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm px-5 py-3 rounded-2xl font-bold text-sm transition-all">
              Explorer le marché <ArrowRight size={16} />
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Stats Cards */}
      {user?.role === 'Administrateur' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {cards.map((card, idx) => (
            <motion.div key={idx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}
              className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg transition-all group">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-10 h-10 ${card.color} rounded-xl flex items-center justify-center text-white group-hover:scale-110 transition-transform`}>
                  <card.icon size={20} />
                </div>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg flex items-center gap-1">
                  {card.trend} <ArrowUpRight size={10} />
                </span>
              </div>
              <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">{card.title}</p>
              {loading
                ? <div className="h-8 bg-gray-100 animate-pulse rounded-lg w-2/3" />
                : <p className="text-2xl font-black text-gray-900">{card.value}</p>}
            </motion.div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activities */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-black text-gray-900">Activités récentes</h2>
            <button className="text-sm text-emerald-600 font-bold hover:text-emerald-700 transition-colors">Voir tout</button>
          </div>
          <div className="space-y-3">
            {activities.map((activity, idx) => (
              <motion.div key={idx} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.1 }}
                className="flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100">
                <div className={`w-10 h-10 ${activity.bg} rounded-xl flex items-center justify-center ${activity.color} flex-shrink-0`}>
                  <activity.icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{activity.title}</p>
                  <p className="text-gray-400 text-xs mt-0.5">{activity.time}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold flex-shrink-0 ${
                  activity.status === 'Approuvé' ? 'bg-emerald-100 text-emerald-700' :
                  activity.status === 'En attente' ? 'bg-amber-100 text-amber-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {activity.status}
                </span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Quick Links + Tip */}
        <div className="space-y-4">
          {/* Quick Links */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6">
            <h2 className="text-lg font-black text-gray-900 mb-4">Accès rapide</h2>
            <div className="space-y-2">
              {quickLinks.map((link, i) => (
                <Link key={i} to={link.to}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-all group">
                  <div className="w-8 h-8 bg-gray-100 group-hover:bg-emerald-100 rounded-lg flex items-center justify-center transition-colors">
                    <link.icon size={15} className="text-gray-500 group-hover:text-emerald-600 transition-colors" />
                  </div>
                  <span className="text-sm font-semibold text-gray-700 group-hover:text-gray-900 transition-colors">{link.label}</span>
                  <ArrowRight size={14} className="ml-auto text-gray-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                </Link>
              ))}
            </div>
          </div>

          {/* Tip Card */}
          <div className="bg-gradient-to-br from-emerald-900 to-teal-900 rounded-3xl p-6 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <p className="text-emerald-300 text-xs font-bold uppercase tracking-widest mb-3">Conseil du jour</p>
            <p className="text-sm text-emerald-100 leading-relaxed mb-4">
              "L'utilisation du compost mûr améliore la structure du sol et retient l'humidité pour vos cultures maraîchères."
            </p>
            <Link to="/forum" className="inline-flex items-center gap-2 text-xs font-bold text-white/80 hover:text-white transition-colors">
              Plus de conseils sur le forum <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
