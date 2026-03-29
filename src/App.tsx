import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { NotificationProvider } from './context/NotificationContext.tsx';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar.tsx';
import Sidebar from './components/Sidebar.tsx';
import Home from './pages/Home.tsx';
import Login from './pages/Login.tsx';
import Register from './pages/Register.tsx';
import Marketplace from './pages/Marketplace.tsx';
import ProductDetail from './pages/ProductDetail.tsx';
import Dashboard from './pages/Dashboard.tsx';
import Forum from './pages/Forum.tsx';
import NewProduct from './pages/NewProduct.tsx';
import Cart from './pages/Cart.tsx';
import Profile from './pages/Profile.tsx';
import MyProducts from './pages/MyProducts.tsx';
import MyOrders from './pages/MyOrders.tsx';
import Messages from './pages/Messages.tsx';
import Notifications from './pages/Notifications.tsx';
import AdminUsers from './pages/AdminUsers.tsx';
import AdminApprovals from './pages/AdminApprovals.tsx';
import AdminStats from './pages/AdminStats.tsx';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, loading } = useAuth();
  if (loading) return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
  );
  return token ? <>{children}</> : <Navigate to="/login" replace />;
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { token } = useAuth();
  const isDashboardPage =
      location.pathname.startsWith('/dashboard') ||
      location.pathname.startsWith('/admin') ||
      location.pathname.startsWith('/profile') ||
      location.pathname.startsWith('/messages') ||
      location.pathname.startsWith('/notifications') ||
      location.pathname.startsWith('/cart');

  return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex flex-1">
          {token && isDashboardPage && <Sidebar />}
          <main className="flex-1 min-w-0">{children}</main>
        </div>
        <Toaster
            position="top-right"
            toastOptions={{ style: { borderRadius: '16px', fontWeight: '600', fontSize: '14px' } }}
        />
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
                {/* Public routes */}
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/marketplace" element={<Marketplace />} />
                <Route path="/marketplace/:id" element={<ProductDetail />} />
                <Route path="/forum" element={<Forum />} />

                {/* Private routes */}
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

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          </Router>
        </NotificationProvider>
      </AuthProvider>
  );
}