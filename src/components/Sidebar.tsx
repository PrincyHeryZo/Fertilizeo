import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingBag, 
  Users, 
  MessageSquare, 
  Settings, 
  PlusCircle, 
  CheckCircle,
  BarChart3
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();

  const menuItems = [
    { icon: LayoutDashboard, label: 'Tableau de bord', path: '/dashboard', roles: ['Agriculteur', 'Producteur', 'Fournisseur', 'Acheteur', 'Administrateur'] },
    { icon: Package, label: 'Mes Produits', path: '/dashboard/products', roles: ['Producteur', 'Fournisseur'] },
    { icon: PlusCircle, label: 'Publier un produit', path: '/dashboard/products/new', roles: ['Producteur', 'Fournisseur'] },
    { icon: ShoppingBag, label: 'Mes Commandes', path: '/dashboard/orders', roles: ['Acheteur', 'Agriculteur', 'Producteur', 'Fournisseur'] },
    { icon: MessageSquare, label: 'Messagerie', path: '/messages', roles: ['Agriculteur', 'Producteur', 'Fournisseur', 'Acheteur', 'Administrateur'] },
    { icon: Users, label: 'Utilisateurs', path: '/admin/users', roles: ['Administrateur'] },
    { icon: CheckCircle, label: 'Approbations', path: '/admin/approvals', roles: ['Administrateur'] },
    { icon: BarChart3, label: 'Statistiques', path: '/admin/stats', roles: ['Administrateur'] },
    { icon: Settings, label: 'Profil', path: '/profile', roles: ['Agriculteur', 'Producteur', 'Fournisseur', 'Acheteur', 'Administrateur'] },
  ];

  const filteredItems = menuItems.filter(item => item.roles.includes(user?.role || ''));

  return (
    <aside className="w-64 bg-white border-r border-gray-200 h-[calc(100vh-64px)] sticky top-16 hidden md:block">
      <div className="p-6">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Menu Principal</p>
        <nav className="space-y-1">
          {filteredItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive 
                    ? 'bg-emerald-50 text-emerald-700 font-medium shadow-sm' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-emerald-600'
                }`}
              >
                <item.icon size={20} className={isActive ? 'text-emerald-600' : 'text-gray-400'} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;
