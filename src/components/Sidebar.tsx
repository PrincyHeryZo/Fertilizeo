import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingBag, Users, MessageSquare, Settings, PlusCircle, CheckCircle, BarChart3, Leaf, ArrowRight, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();

  const menuItems = [
    { icon: LayoutDashboard, label: 'Tableau de bord',   path: '/dashboard',             roles: ['Agriculteur', 'Producteur', 'Fournisseur', 'Acheteur', 'Administrateur'] },
    { icon: Package,         label: 'Mes Produits',       path: '/dashboard/products',    roles: ['Producteur', 'Fournisseur'] },
    { icon: PlusCircle,      label: 'Publier un produit', path: '/dashboard/products/new',roles: ['Producteur', 'Fournisseur'] },
    { icon: ShoppingBag,     label: 'Mes Commandes',      path: '/dashboard/orders',      roles: ['Acheteur', 'Agriculteur', 'Producteur', 'Fournisseur'] },
    { icon: MessageSquare,   label: 'Messagerie',         path: '/messages',              roles: ['Agriculteur', 'Producteur', 'Fournisseur', 'Acheteur', 'Administrateur'] },
    { icon: Users,           label: 'Utilisateurs',       path: '/admin/users',           roles: ['Administrateur'] },
    { icon: CheckCircle,     label: 'Approbations',       path: '/admin/approvals',       roles: ['Administrateur'] },
    { icon: BarChart3,       label: 'Statistiques',       path: '/admin/stats',           roles: ['Administrateur'] },
    { icon: Zap,             label: 'IA & Clés API',      path: '/admin/ai',              roles: ['Administrateur'] },
    { icon: Settings,        label: 'Mon Profil',         path: '/profile',               roles: ['Agriculteur', 'Producteur', 'Fournisseur', 'Acheteur', 'Administrateur'] },
  ];

  const filteredItems = menuItems.filter(item => item.roles.includes(user?.role || ''));

  const roleGradients: Record<string, string> = {
    Administrateur: 'from-red-400 to-rose-500',
    Producteur:     'from-emerald-400 to-teal-500',
    Fournisseur:    'from-blue-400 to-indigo-500',
    Agriculteur:    'from-amber-400 to-orange-500',
    Acheteur:       'from-purple-400 to-violet-500',
  };
  const gradient = roleGradients[user?.role || ''] || 'from-emerald-400 to-teal-500';

  return (
    <aside className="w-64 bg-white border-r border-gray-100 h-[calc(100vh-64px)] sticky top-16 hidden md:flex flex-col overflow-hidden flex-shrink-0">
      {/* User Card */}
      <div className="p-4 border-b border-gray-100">
        <div className={`bg-gradient-to-br ${gradient} rounded-2xl p-4 text-white`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-lg font-black">
              {user?.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm truncate">{user?.name}</p>
              <p className="text-white/70 text-xs">{user?.role}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 px-2">Navigation</p>
        {filteredItems.map(item => {
          const isActive = location.pathname === item.path;
          const isAI = item.path === '/admin/ai';
          return (
            <Link key={item.path} to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                isActive ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                isActive ? 'bg-white/20' : isAI ? 'bg-emerald-100' : 'bg-gray-100 group-hover:bg-gray-200'
              }`}>
                <item.icon size={16} className={
                  isActive ? 'text-white' : isAI ? 'text-emerald-600' : 'text-gray-500 group-hover:text-gray-700'
                } />
              </div>
              <span className="text-sm font-semibold flex-1">{item.label}</span>
              {isActive && <ArrowRight size={13} className="text-emerald-400" />}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-2 text-gray-400">
          <Leaf size={13} className="text-emerald-500" />
          <span className="text-xs font-semibold">FERTILI'ZEO v1.0</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
