import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '../../../Documents/MUSIC LYRICS/Fertilizeo_fixed/Fertilizeo_fixed/src/context/AuthContext.tsx';
import { NotificationProvider } from '../../../Documents/MUSIC LYRICS/Fertilizeo_fixed/Fertilizeo_fixed/src/context/NotificationContext.tsx';
import { Toaster } from 'react-hot-toast';
import Navbar from '../../../Documents/MUSIC LYRICS/Fertilizeo_fixed/Fertilizeo_fixed/src/components/Navbar.tsx';
import Sidebar from '../../../Documents/MUSIC LYRICS/Fertilizeo_fixed/Fertilizeo_fixed/src/components/Sidebar.tsx';
import Home from '../../../Documents/MUSIC LYRICS/Fertilizeo_fixed/Fertilizeo_fixed/src/pages/Home.tsx';
import Login from '../../../Documents/MUSIC LYRICS/Fertilizeo_fixed/Fertilizeo_fixed/src/pages/Login.tsx';
import Register from '../../../Documents/MUSIC LYRICS/Fertilizeo_fixed/Fertilizeo_fixed/src/pages/Register.tsx';
import Marketplace from '../../../Documents/MUSIC LYRICS/Fertilizeo_fixed/Fertilizeo_fixed/src/pages/Marketplace.tsx';
import Dashboard from '../../../Documents/MUSIC LYRICS/Fertilizeo_fixed/Fertilizeo_fixed/src/pages/Dashboard.tsx';
import Forum from '../../../Documents/MUSIC LYRICS/Fertilizeo_fixed/Fertilizeo_fixed/src/pages/Forum.tsx';
import NewProduct from '../../../Documents/MUSIC LYRICS/Fertilizeo_fixed/Fertilizeo_fixed/src/pages/NewProduct.tsx';
import Cart from '../../../Documents/MUSIC LYRICS/Fertilizeo_fixed/Fertilizeo_fixed/src/pages/Cart.tsx';
import Profile from '../../../Documents/MUSIC LYRICS/Fertilizeo_fixed/Fertilizeo_fixed/src/pages/Profile.tsx';
import MyProducts from '../../../Documents/MUSIC LYRICS/Fertilizeo_fixed/Fertilizeo_fixed/src/pages/MyProducts.tsx';
import MyOrders from '../../../Documents/MUSIC LYRICS/Fertilizeo_fixed/Fertilizeo_fixed/src/pages/MyOrders.tsx';
import Messages from '../../../Documents/MUSIC LYRICS/Fertilizeo_fixed/Fertilizeo_fixed/src/pages/Messages.tsx';
import Notifications from '../../../Documents/MUSIC LYRICS/Fertilizeo_fixed/Fertilizeo_fixed/src/pages/Notifications.tsx';
import AdminUsers from '../../../Documents/MUSIC LYRICS/Fertilizeo_fixed/Fertilizeo_fixed/src/pages/AdminUsers.tsx';
import AdminApprovals from '../../../Documents/MUSIC LYRICS/Fertilizeo_fixed/Fertilizeo_fixed/src/pages/AdminApprovals.tsx';
import AdminStats from '../../../Documents/MUSIC LYRICS/Fertilizeo_fixed/Fertilizeo_fixed/src/pages/AdminStats.tsx';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen text-emerald-600 font-bold text-xl">Chargement...</div>;
  return token ? <>{children}</> : <Navigate to="/login" />;
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { token } = useAuth();
  const isDashboardPage = location.pathname.startsWith('/dashboard') || 
                          location.pathname.startsWith('/admin') || 
                          location.pathname.startsWith('/profile');
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <div className="flex flex-1">
        {token && isDashboardPage && <Sidebar />}
        <main className="flex-1">{children}</main>
      </div>
      <Toaster />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/marketplace" element={<Marketplace />} />
              <Route path="/forum" element={<Forum />} />
              <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
              <Route path="/dashboard/products" element={<PrivateRoute><MyProducts /></PrivateRoute>} />
              <Route path="/dashboard/products/new" element={<PrivateRoute><NewProduct /></PrivateRoute>} />
              <Route path="/dashboard/orders" element={<PrivateRoute><MyOrders /></PrivateRoute>} />
              <Route path="/messages" element={<PrivateRoute><Messages /></PrivateRoute>} />
              <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
              <Route path="/cart" element={<PrivateRoute><Cart /></PrivateRoute>} />
              <Route path="/notifications" element={<PrivateRoute><Notifications /></PrivateRoute>} />
              <Route path="/admin/users" element={<PrivateRoute><AdminUsers /></PrivateRoute>} />
              <Route path="/admin/approvals" element={<PrivateRoute><AdminApprovals /></PrivateRoute>} />
              <Route path="/admin/stats" element={<PrivateRoute><AdminStats /></PrivateRoute>} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Layout>
        </Router>
      </NotificationProvider>
    </AuthProvider>
  );
}
