import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import Navbar from './components/Navbar.tsx';
import Sidebar from './components/Sidebar.tsx';
import Home from './pages/Home.tsx';
import Login from './pages/Login.tsx';
import Register from './pages/Register.tsx';
import Marketplace from './pages/Marketplace.tsx';
import Dashboard from './pages/Dashboard.tsx';
import Forum from './pages/Forum.tsx';

const Messages = () => <div className="p-8">Messagerie (En construction)</div>;
const Profile = () => <div className="p-8">Profil Utilisateur (En construction)</div>;
const AdminUsers = () => <div className="p-8">Gestion des Utilisateurs (Admin)</div>;
const AdminApprovals = () => <div className="p-8">Approbations de Produits (Admin)</div>;
const AdminStats = () => <div className="p-8">Statistiques Globales (Admin)</div>;
const Cart = () => <div className="p-8">Panier (En construction)</div>;
const Notifications = () => <div className="p-8">Notifications (En construction)</div>;
const MyProducts = () => <div className="p-8">Mes Produits (En construction)</div>;
const NewProduct = () => <div className="p-8">Publier un Produit (En construction)</div>;
const MyOrders = () => <div className="p-8">Mes Commandes (En construction)</div>;

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen">Chargement...</div>;
  return token ? <>{children}</> : <Navigate to="/login" />;
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { token } = useAuth();
  
  const isAuthPage = ['/login', '/register'].includes(location.pathname);
  const isDashboardPage = location.pathname.startsWith('/dashboard') || 
                          location.pathname.startsWith('/admin') || 
                          location.pathname.startsWith('/profile');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <div className="flex flex-1">
        {token && isDashboardPage && <Sidebar />}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/forum" element={<Forum />} />
            
            <Route path="/dashboard" element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            } />

            <Route path="/dashboard/products" element={
              <PrivateRoute>
                <MyProducts />
              </PrivateRoute>
            } />

            <Route path="/dashboard/products/new" element={
              <PrivateRoute>
                <NewProduct />
              </PrivateRoute>
            } />

            <Route path="/dashboard/orders" element={
              <PrivateRoute>
                <MyOrders />
              </PrivateRoute>
            } />

            <Route path="/messages" element={
              <PrivateRoute>
                <Messages />
              </PrivateRoute>
            } />

            <Route path="/profile" element={
              <PrivateRoute>
                <Profile />
              </PrivateRoute>
            } />

            <Route path="/cart" element={
              <PrivateRoute>
                <Cart />
              </PrivateRoute>
            } />

            <Route path="/notifications" element={
              <PrivateRoute>
                <Notifications />
              </PrivateRoute>
            } />

            <Route path="/admin/users" element={
              <PrivateRoute>
                <AdminUsers />
              </PrivateRoute>
            } />

            <Route path="/admin/approvals" element={
              <PrivateRoute>
                <AdminApprovals />
              </PrivateRoute>
            } />

            <Route path="/admin/stats" element={
              <PrivateRoute>
                <AdminStats />
              </PrivateRoute>
            } />
            
            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Layout>
      </Router>
    </AuthProvider>
  );
}
