import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShoppingBag, Trash2, ArrowRight, Plus, Minus,
  Smartphone, CheckCircle2, Copy, MessageSquare,
  AlertCircle, Package
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { CartItem, getCart, saveCart } from '../utils/cart.ts';

type Step = 'cart' | 'payment' | 'confirmed';

const Cart: React.FC = () => {
  const [items, setItems]     = useState<CartItem[]>([]);
  const [step, setStep]       = useState<Step>('cart');
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState<number | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => { setItems(getCart(user?.id)); }, [user?.id]);

  const updateItems = (newItems: CartItem[]) => { setItems(newItems); saveCart(newItems, user?.id); };
  const removeItem  = (id: number) => { updateItems(items.filter(i => i.id !== id)); toast.success('Retiré du panier'); };

  const updateQty = (id: number, delta: number) => {
    const updated = items.map(item => {
      if (item.id !== id) return item;
      const q = item.quantity + delta;
      if (q < 1) return null;
      if (q > item.stock) { toast.error(`Stock max: ${item.stock}`); return item; }
      return { ...item, quantity: q };
    }).filter(Boolean) as CartItem[];
    updateItems(updated);
  };

  const total      = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const totalItems = items.reduce((s, i) => s + i.quantity, 0);

  const handleProceedToPayment = async () => {
    if (!user) { navigate('/login'); return; }
    setLoading(true);
    try {
      const res = await api.post('/orders', {
        items: items.map(i => ({ product_id: i.id, quantity: i.quantity, price: i.price })),
        total_amount: total,
      });
      setOrderId(res.data.id);
      saveCart([], user.id);
      setItems([]);
      setStep('payment');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur lors de la commande');
    } finally {
      setLoading(false);
    }
  };

  // Panier vide
  if (items.length === 0 && step === 'cart') {
    return (
        <div className="max-w-7xl mx-auto px-4 py-24 text-center">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingBag size={48} className="text-gray-300" />
          </div>
          <h2 className="text-3xl font-black text-gray-900 mb-4">Votre panier est vide</h2>
          <p className="text-gray-500 mb-8">Découvrez nos produits sur la marketplace.</p>
          <button onClick={() => navigate('/marketplace')} className="bg-gray-900 text-white px-8 py-4 rounded-2xl font-bold hover:bg-gray-800 transition-all">
            Explorer la Marketplace
          </button>
        </div>
    );
  }

  // Étape 2 : instructions paiement
  if (step === 'payment') {
    return (
        <div className="max-w-2xl mx-auto px-4 py-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
                <Smartphone size={24} className="text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-gray-900">Paiement Mobile Money</h1>
                <p className="text-gray-500 text-sm">Commande #{orderId} enregistrée ✓</p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 mb-5">
              <h3 className="font-bold text-blue-900 mb-4 text-sm">Paiement en 3 étapes simples :</h3>
              <div className="space-y-4">
                {[
                  { n: 1, title: 'Contactez le vendeur', desc: 'Écrivez-lui via la messagerie pour obtenir son numéro MVola ou Orange Money.' },
                  { n: 2, title: 'Envoyez le paiement', desc: `Transférez ${total.toLocaleString()} Ar en indiquant la référence : Commande #${orderId}.` },
                  { n: 3, title: 'Attendez la livraison', desc: 'Le vendeur expédie dès confirmation du paiement. Suivez dans "Mes Commandes".' },
                ].map(s => (
                    <div key={s.n} className="flex gap-3">
                      <span className="w-6 h-6 bg-blue-600 text-white rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{s.n}</span>
                      <div>
                        <p className="font-bold text-blue-900 text-sm">{s.title}</p>
                        <p className="text-blue-700 text-xs mt-0.5 leading-relaxed">{s.desc}</p>
                      </div>
                    </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-500 text-sm">Référence</span>
                <button onClick={() => { navigator.clipboard.writeText(`Commande #${orderId}`); toast.success('Copié !'); }}
                        className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-bold">
                  <Copy size={11} /> Commande #{orderId}
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700 font-bold">Total à payer</span>
                <span className="text-2xl font-black text-emerald-600">{total.toLocaleString()} Ar</span>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-6">
              <div className="flex items-start gap-2 mb-3">
                <AlertCircle size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-amber-800 text-sm leading-relaxed">
                  <span className="font-bold">Paiement direct</span> — Fertili'zeo ne prend aucune commission. Contactez le vendeur via la messagerie pour convenir du numéro et de la livraison.
                </p>
              </div>
              <button onClick={() => navigate('/messages')}
                      className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold py-2.5 rounded-xl transition-all">
                <MessageSquare size={15} /> Ouvrir la messagerie
              </button>
            </div>

            <div className="flex gap-3">
              <button onClick={() => navigate('/dashboard/orders')}
                      className="flex-1 flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3.5 rounded-2xl transition-all text-sm">
                <Package size={15} /> Mes commandes
              </button>
              <button onClick={() => setStep('confirmed')}
                      className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-2xl transition-all text-sm">
                <CheckCircle2 size={15} /> J'ai payé
              </button>
            </div>
          </motion.div>
        </div>
    );
  }

  // Étape 3 : confirmation
  if (step === 'confirmed') {
    return (
        <div className="max-w-md mx-auto px-4 py-16 text-center">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={40} className="text-emerald-600" />
            </div>
            <h1 className="text-2xl font-black text-gray-900 mb-3">Merci pour votre commande !</h1>
            <p className="text-gray-400 text-sm mb-2">Commande #{orderId}</p>
            <p className="text-gray-500 text-sm mb-8 leading-relaxed">
              Le vendeur a été notifié et vous contactera pour confirmer le paiement et organiser la livraison.
            </p>
            <div className="space-y-3">
              <button onClick={() => navigate('/dashboard/orders')}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2">
                <Package size={18} /> Suivre ma commande
              </button>
              <button onClick={() => navigate('/messages')}
                      className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2">
                <MessageSquare size={18} /> Messagerie vendeur
              </button>
              <button onClick={() => navigate('/marketplace')} className="text-gray-400 hover:text-gray-600 text-sm py-2 transition-all">
                Continuer mes achats
              </button>
            </div>
          </motion.div>
        </div>
    );
  }

  // Étape 1 : liste du panier
  return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-black text-gray-900 mb-12">
          Votre Panier
          <span className="text-lg text-gray-400 font-normal ml-3">({totalItems} article{totalItems > 1 ? 's' : ''})</span>
        </h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-4">
            <AnimatePresence>
              {items.map(item => (
                  <motion.div key={item.id} layout initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                              className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-5">
                    <img src={item.image_url || `https://picsum.photos/seed/${item.id}/200/200`} alt={item.name} className="w-20 h-20 object-cover rounded-2xl flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-gray-900 mb-1 truncate">{item.name}</h3>
                      <p className="text-emerald-600 font-bold text-sm">{item.price.toLocaleString()} Ar / unité</p>
                      <div className="flex items-center gap-2 mt-2">
                        <button onClick={() => updateQty(item.id, -1)} className="w-7 h-7 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-all"><Minus size={12} /></button>
                        <span className="font-black text-gray-900 w-5 text-center">{item.quantity}</span>
                        <button onClick={() => updateQty(item.id, 1)} className="w-7 h-7 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-all"><Plus size={12} /></button>
                        <span className="text-xs text-gray-400">/ {item.stock} en stock</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-black text-gray-900">{(item.price * item.quantity).toLocaleString()} Ar</p>
                      <button onClick={() => removeItem(item.id)} className="mt-2 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={16} /></button>
                    </div>
                  </motion.div>
              ))}
            </AnimatePresence>
          </div>
          <div className="space-y-4">
            <div className="bg-white p-7 rounded-3xl shadow-xl border border-gray-100 sticky top-24">
              <h2 className="text-xl font-black mb-5">Résumé</h2>
              <div className="space-y-3 mb-6">
                {items.map(item => (
                    <div key={item.id} className="flex justify-between text-sm text-gray-600">
                      <span className="truncate mr-2">{item.name} ×{item.quantity}</span>
                      <span className="font-semibold flex-shrink-0">{(item.price * item.quantity).toLocaleString()} Ar</span>
                    </div>
                ))}
                <div className="border-t border-gray-100 pt-3 flex justify-between text-gray-500 text-sm">
                  <span>Frais de service</span><span className="text-emerald-600 font-bold">Gratuit</span>
                </div>
                <div className="border-t border-gray-100 pt-3 flex justify-between text-xl font-black text-gray-900">
                  <span>Total</span><span>{total.toLocaleString()} Ar</span>
                </div>
              </div>
              <button onClick={handleProceedToPayment} disabled={loading}
                      className="w-full bg-gray-900 hover:bg-gray-800 text-white font-bold py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-3 disabled:opacity-50 hover:scale-[1.01]">
                {loading ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Traitement...</> : <><span>Commander</span><ArrowRight size={18} /></>}
              </button>
              <p className="text-center text-xs text-gray-400 mt-3">Paiement Mobile Money direct, sans commission</p>
            </div>
            <div className="bg-emerald-50 p-5 rounded-3xl border border-emerald-100">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center"><Smartphone size={18} className="text-emerald-600" /></div>
                <p className="font-bold text-emerald-900 text-sm">MVola · Orange Money</p>
              </div>
              <p className="text-xs text-emerald-700 leading-relaxed">Paiement direct entre acheteur et vendeur. Fertili'zeo ne prend aucune commission.</p>
            </div>
          </div>
        </div>
      </div>
  );
};

export default Cart;