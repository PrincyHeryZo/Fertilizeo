import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { useMessages } from '../context/MessageContext.tsx';
import { ShoppingCart, LogOut, Bell, MessageSquare, Leaf, Menu, X, LayoutDashboard } from 'lucide-react';
import { getCartCount } from '../utils/cart.ts';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { unreadCount: msgCount } = useMessages();
  const navigate = useNavigate();
  const location = useLocation();
  const [cartCount, setCartCount]   = useState(0);
  const [notifCount, setNotifCount] = useState(0);
  const [scrolled, setScrolled]     = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Panier : mis à jour en temps réel toutes les 500ms
  useEffect(() => {
    const update = () => setCartCount(getCartCount(user?.id));
    update();
    const interval = setInterval(update, 500);
    return () => clearInterval(interval);
  }, [user?.id]);

  // Notifications non lues : rechargées toutes les 30s
  useEffect(() => {
    if (!user) { setNotifCount(0); return; }
    const fetchNotifs = async () => {
      try {
        const { default: api } = await import('../services/api.ts');
        const res = await api.get('/notifications');
        setNotifCount(res.data.filter((n: any) => !n.is_read).length);
      } catch { /* silencieux */ }
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30_000);

    const onNotifRead = () => setNotifCount(0);
    window.addEventListener('notif-read', onNotifRead);
    return () => {
      clearInterval(interval);
      window.removeEventListener('notif-read', onNotifRead);
    };
  }, [user]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const isActive = (path: string) => location.pathname === path;

  return (
      <nav className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-white/90 backdrop-blur-xl shadow-md border-b border-gray-100' : 'bg-white border-b border-gray-100'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center gap-6">

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 flex-shrink-0 group">
              <div className="w-9 h-9 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200 group-hover:scale-110 transition-transform">
                <Leaf size={18} className="text-white" fill="currentColor" />
              </div>
              <span className="text-xl font-black tracking-tight text-gray-900">
              FERTILI<span className="text-emerald-500">'</span>ZEO
            </span>
            </Link>

            {/* Center Nav */}
            <div className="hidden md:flex items-center gap-1 flex-1 justify-center">
              {[
                { to: '/marketplace', label: 'Marketplace' },
                { to: '/forum', label: 'Forum' },
                { to: '/conseils', label: 'Conseils IA' },
              ].map(link => (
                  <Link key={link.to} to={link.to}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                            isActive(link.to) ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:text-emerald-600 hover:bg-gray-50'
                        }`}>
                    {link.label}
                  </Link>
              ))}
            </div>

            {/* Right */}
            <div className="hidden md:flex items-center gap-1.5">
              {user ? (
                  <>
                    <Link to="/messages" title="Messages"
                          className="relative p-2.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all">
                      <MessageSquare size={20} />
                      {msgCount > 0 && (
                          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-blue-500 text-white text-xs font-black rounded-full flex items-center justify-center">
                          {msgCount > 9 ? '9+' : msgCount}
                        </span>
                      )}
                    </Link>
                    <Link to="/notifications" title="Notifications"
                          className="relative p-2.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all">
                      <Bell size={20} />
                      {notifCount > 0 && (
                          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-xs font-black rounded-full flex items-center justify-center">
                          {notifCount > 9 ? '9+' : notifCount}
                        </span>
                      )}
                    </Link>
                    <Link to="/cart" title="Panier" className="relative p-2.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all">
                      <ShoppingCart size={20} />
                      {cartCount > 0 && (
                          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-emerald-500 text-white text-xs font-black rounded-full flex items-center justify-center">
                      {cartCount > 9 ? '9+' : cartCount}
                    </span>
                      )}
                    </Link>
                    <div className="w-px h-6 bg-gray-200 mx-1" />
                    <Link to="/dashboard"
                          className="flex items-center gap-2.5 bg-gray-900 hover:bg-gray-800 text-white pl-3 pr-4 py-2 rounded-xl transition-all">
                      <div className="w-6 h-6 bg-emerald-400 rounded-lg flex items-center justify-center text-xs font-black">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold max-w-24 truncate">{user.name.split(' ')[0]}</span>
                    </Link>
                    <button onClick={() => { logout(); navigate('/'); }} title="Déconnexion"
                            className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                      <LogOut size={18} />
                    </button>
                  </>
              ) : (
                  <>
                    <Link to="/login" className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-emerald-600 hover:bg-gray-50 rounded-xl transition-all">
                      Connexion
                    </Link>
                    <Link to="/register" className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-200 transition-all hover:scale-105">
                      S'inscrire
                    </Link>
                  </>
              )}
            </div>

            {/* Mobile */}
            <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-xl">
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
            <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1">
              <Link to="/marketplace" className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-700 font-semibold hover:bg-emerald-50 hover:text-emerald-700 transition-all">Marketplace</Link>
              <Link to="/forum" className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-700 font-semibold hover:bg-emerald-50 hover:text-emerald-700 transition-all">Forum</Link>
              <Link to="/conseils" className="flex items-center gap-3 px-4 py-3 rounded-xl text-emerald-600 font-semibold hover:bg-emerald-50 hover:text-emerald-700 transition-all">Conseils IA</Link>
              {user ? (
                  <>
                    <Link to="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-700 font-semibold hover:bg-emerald-50 hover:text-emerald-700 transition-all">
                      <LayoutDashboard size={18} /> Dashboard
                    </Link>
                    <Link to="/messages" className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-700 font-semibold hover:bg-emerald-50 hover:text-emerald-700 transition-all">
                      <MessageSquare size={18} /> Messages {msgCount > 0 && `(${msgCount})`}
                    </Link>
                    <Link to="/cart" className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-700 font-semibold hover:bg-emerald-50 hover:text-emerald-700 transition-all">
                      <ShoppingCart size={18} /> Panier {cartCount > 0 && `(${cartCount})`}
                    </Link>
                    <Link to="/notifications" className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-700 font-semibold hover:bg-emerald-50 hover:text-emerald-700 transition-all">
                      <Bell size={18} /> Notifications {notifCount > 0 && `(${notifCount})`}
                    </Link>
                    <button onClick={() => { logout(); navigate('/'); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 font-semibold hover:bg-red-50 transition-all">
                      <LogOut size={18} /> Déconnexion
                    </button>
                  </>
              ) : (
                  <>
                    <Link to="/login" className="flex items-center justify-center px-4 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold">Connexion</Link>
                    <Link to="/register" className="flex items-center justify-center px-4 py-3 rounded-xl bg-emerald-600 text-white font-bold">S'inscrire</Link>
                  </>
              )}
            </div>
        )}
      </nav>
  );
};

export default Navbar;
