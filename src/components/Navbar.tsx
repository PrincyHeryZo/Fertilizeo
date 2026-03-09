import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { ShoppingCart, User, LogOut, Menu, Bell, MessageSquare } from 'lucide-react';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="bg-emerald-800 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center">
            <Link to="/" className="text-2xl font-bold tracking-tighter flex items-center gap-2">
              <span className="bg-white text-emerald-800 px-2 py-1 rounded-lg">F</span>
              FERTILI’ZEO
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-8">
            <Link to="/marketplace" className="hover:text-emerald-200 transition">Marketplace</Link>
            <Link to="/forum" className="hover:text-emerald-200 transition">Forum</Link>
            {user && (
              <>
                <Link to="/messages" className="relative hover:text-emerald-200 transition">
                  <MessageSquare size={20} />
                </Link>
                <Link to="/notifications" className="relative hover:text-emerald-200 transition">
                  <Bell size={20} />
                </Link>
                <Link to="/cart" className="relative hover:text-emerald-200 transition">
                  <ShoppingCart size={20} />
                </Link>
              </>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-4">
                <Link to="/dashboard" className="flex items-center gap-2 bg-emerald-700 px-4 py-2 rounded-full hover:bg-emerald-600 transition">
                  <User size={18} />
                  <span className="hidden sm:inline">{user.name}</span>
                </Link>
                <button onClick={() => { logout(); navigate('/'); }} className="p-2 hover:bg-emerald-700 rounded-full transition">
                  <LogOut size={20} />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link to="/login" className="px-4 py-2 hover:text-emerald-200 transition">Connexion</Link>
                <Link to="/register" className="bg-white text-emerald-800 px-4 py-2 rounded-full font-medium hover:bg-emerald-100 transition">Inscription</Link>
              </div>
            )}
            <button className="md:hidden p-2">
              <Menu size={24} />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
