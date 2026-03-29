import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, Trash2, CreditCard, ArrowRight, ShieldCheck, Plus, Minus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { CartItem, getCart, saveCart } from '../utils/cart.ts';

const Cart: React.FC = () => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    setItems(getCart(user?.id));
  }, [user?.id]);

  const updateItems = (newItems: CartItem[]) => {
    setItems(newItems);
    saveCart(newItems, user?.id);
  };

  const removeItem = (id: number) => {
    updateItems(items.filter(item => item.id !== id));
    toast.success('Produit retiré du panier');
  };

  const updateQuantity = (id: number, delta: number) => {
    const newItems = items.map(item => {
      if (item.id !== id) return item;
      const newQty = item.quantity + delta;
      if (newQty < 1) return null;
      if (newQty > item.stock) { toast.error(`Stock max: ${item.stock}`); return item; }
      return { ...item, quantity: newQty };
    }).filter(Boolean) as CartItem[];
    updateItems(newItems);
  };

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckout = async () => {
    if (!user) { navigate('/login'); return; }
    setLoading(true);
    try {
      await api.post('/orders', {
        items: items.map(i => ({ product_id: i.id, quantity: i.quantity, price: i.price })),
        total_amount: total
      });
      saveCart([], user.id);
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
          <h2 className="text-3xl font-black text-gray-900 mb-4">Votre panier est vide</h2>
          <p className="text-gray-500 mb-8">Découvrez nos produits sur la marketplace.</p>
          <button onClick={() => navigate('/marketplace')}
                  className="bg-gray-900 text-white px-8 py-4 rounded-2xl font-bold hover:bg-gray-800 transition-all">
            Explorer la Marketplace
          </button>
        </div>
    );
  }

  return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-black text-gray-900 mb-12">
          Votre Panier
          <span className="text-lg text-gray-400 font-normal ml-3">({totalItems} article{totalItems > 1 ? 's' : ''})</span>
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Items */}
          <div className="lg:col-span-2 space-y-4">
            <AnimatePresence>
              {items.map(item => (
                  <motion.div key={item.id} layout
                              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                              className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-5">
                    <img
                        src={item.image_url || `https://picsum.photos/seed/${item.id}/200/200`}
                        alt={item.name} className="w-20 h-20 object-cover rounded-2xl flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-gray-900 mb-1 truncate">{item.name}</h3>
                      <p className="text-emerald-600 font-bold text-sm">{item.price.toLocaleString()} Ar / unité</p>
                      <div className="flex items-center gap-2 mt-2">
                        <button onClick={() => updateQuantity(item.id, -1)}
                                className="w-7 h-7 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-all">
                          <Minus size={12} />
                        </button>
                        <span className="font-black text-gray-900 w-5 text-center">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, 1)}
                                className="w-7 h-7 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-all">
                          <Plus size={12} />
                        </button>
                        <span className="text-xs text-gray-400">/ {item.stock} en stock</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-black text-gray-900">{(item.price * item.quantity).toLocaleString()} Ar</p>
                      <button onClick={() => removeItem(item.id)}
                              className="mt-2 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Summary */}
          <div className="space-y-4">
            <div className="bg-white p-7 rounded-3xl shadow-xl border border-gray-100 sticky top-24">
              <h2 className="text-xl font-black mb-5">Résumé de la commande</h2>
              <div className="space-y-3 mb-6">
                {items.map(item => (
                    <div key={item.id} className="flex justify-between text-sm text-gray-600">
                      <span className="truncate mr-2">{item.name} ×{item.quantity}</span>
                      <span className="font-semibold flex-shrink-0">{(item.price * item.quantity).toLocaleString()} Ar</span>
                    </div>
                ))}
                <div className="border-t border-gray-100 pt-3 flex justify-between text-gray-500 text-sm">
                  <span>Livraison</span>
                  <span className="text-emerald-600 font-bold">Gratuit</span>
                </div>
                <div className="border-t border-gray-100 pt-3 flex justify-between text-xl font-black text-gray-900">
                  <span>Total</span>
                  <span>{total.toLocaleString()} Ar</span>
                </div>
              </div>
              <button onClick={handleCheckout} disabled={loading}
                      className="w-full bg-gray-900 hover:bg-gray-800 text-white font-bold py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-3 disabled:opacity-50 hover:scale-[1.01]">
                {loading ? (
                    <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Traitement...</>
                ) : (
                    <><span>Confirmer la commande</span><ArrowRight size={18} /></>
                )}
              </button>
              <div className="mt-4 flex items-center justify-center gap-2 text-gray-400 text-xs">
                <ShieldCheck size={14} /><span>Paiement 100% sécurisé</span>
              </div>
            </div>
            <div className="bg-emerald-50 p-5 rounded-3xl border border-emerald-100 flex items-center gap-4">
              <div className="w-11 h-11 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                <CreditCard size={22} />
              </div>
              <div>
                <p className="text-sm font-bold text-emerald-900">M-Pesa · MVola · Orange Money</p>
                <p className="text-xs text-emerald-600">Modes de paiement acceptés</p>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
};

export default Cart;