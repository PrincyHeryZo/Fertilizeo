import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, Trash2, CreditCard, ArrowRight, ShieldCheck, Plus, Minus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api.ts';

interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  image_url: string;
  stock: number;
}

const Cart: React.FC = () => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    setItems(cart);
  }, []);

  const saveCart = (newItems: CartItem[]) => {
    setItems(newItems);
    localStorage.setItem('cart', JSON.stringify(newItems));
  };

  const removeItem = (id: number) => {
    saveCart(items.filter(item => item.id !== id));
    toast.success('Produit retiré du panier');
  };

  const updateQuantity = (id: number, delta: number) => {
    const newItems = items.map(item => {
      if (item.id !== id) return item;
      const newQty = item.quantity + delta;
      if (newQty < 1) return null;
      if (newQty > item.stock) {
        toast.error(`Stock maximum : ${item.stock}`);
        return item;
      }
      return { ...item, quantity: newQty };
    }).filter(Boolean) as CartItem[];
    saveCart(newItems);
  };

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      await api.post('/orders', {
        items: items.map(i => ({ product_id: i.id, quantity: i.quantity, price: i.price })),
        total_amount: total
      });
      localStorage.removeItem('cart');
      setItems([]);
      toast.success('Commande passée avec succès !', { duration: 5000, icon: '✅' });
      navigate('/dashboard/orders');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors de la commande');
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShoppingBag size={48} className="text-gray-300" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Votre panier est vide</h2>
        <p className="text-gray-500 mb-8">Découvrez nos meilleurs produits sur la marketplace.</p>
        <button onClick={() => navigate('/marketplace')}
          className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-all">
          Aller à la Marketplace
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold text-gray-900 mb-12 tracking-tight">
        Votre Panier <span className="text-lg text-gray-400 font-normal">({totalItems} article{totalItems > 1 ? 's' : ''})</span>
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Items */}
        <div className="lg:col-span-2 space-y-4">
          <AnimatePresence>
            {items.map((item) => (
              <motion.div key={item.id} layout
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-6">
                <img
                  src={item.image_url || `https://picsum.photos/seed/${item.id}/200/200`}
                  alt={item.name}
                  className="w-20 h-20 object-cover rounded-2xl flex-shrink-0"
                />
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{item.name}</h3>
                  <p className="text-emerald-600 font-bold">{item.price.toLocaleString()} Ar / unité</p>
                  <div className="flex items-center gap-3 mt-3">
                    <button onClick={() => updateQuantity(item.id, -1)}
                      className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-all">
                      <Minus size={14} />
                    </button>
                    <span className="font-bold text-gray-900 w-6 text-center">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)}
                      className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-all">
                      <Plus size={14} />
                    </button>
                    <span className="text-xs text-gray-400 ml-1">({item.stock} en stock)</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xl font-black text-gray-900">{(item.price * item.quantity).toLocaleString()} Ar</p>
                  <button onClick={() => removeItem(item.id)}
                    className="mt-2 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                    <Trash2 size={18} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Summary */}
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 sticky top-24">
            <h2 className="text-2xl font-bold mb-6">Résumé</h2>
            <div className="space-y-3 mb-8">
              {items.map(item => (
                <div key={item.id} className="flex justify-between text-sm text-gray-600">
                  <span className="truncate mr-2">{item.name} × {item.quantity}</span>
                  <span className="font-medium flex-shrink-0">{(item.price * item.quantity).toLocaleString()} Ar</span>
                </div>
              ))}
              <div className="border-t border-gray-100 pt-3 flex justify-between text-gray-600">
                <span>Livraison</span>
                <span className="text-emerald-600 font-bold">Gratuit</span>
              </div>
              <div className="border-t border-gray-100 pt-3 flex justify-between text-2xl font-black text-gray-900">
                <span>Total</span>
                <span>{total.toLocaleString()} Ar</span>
              </div>
            </div>

            <button onClick={handleCheckout} disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
              {loading ? (
                <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Traitement...</>
              ) : (
                <><span>Passer la commande</span><ArrowRight size={20} /></>
              )}
            </button>

            <div className="mt-4 flex items-center justify-center gap-2 text-gray-400 text-sm">
              <ShieldCheck size={16} />
              <span>Paiement 100% sécurisé</span>
            </div>
          </div>

          <div className="bg-emerald-50 p-5 rounded-3xl border border-emerald-100 flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center flex-shrink-0">
              <CreditCard size={24} />
            </div>
            <div>
              <p className="text-sm font-bold text-emerald-900">M-Pesa / MVola / Orange Money</p>
              <p className="text-xs text-emerald-700">Modes de paiement acceptés</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
