import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ShoppingBag, Trash2, CreditCard, ArrowRight, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api.ts';

interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  image_url: string;
}

const Cart: React.FC = () => {
  // Mock cart data for demonstration
  const [items, setItems] = useState<CartItem[]>([
    { id: 1, name: 'Compost Premium', price: 50000, quantity: 2, image_url: 'https://picsum.photos/seed/1/200/200' },
    { id: 2, name: 'Engrais Liquide Bio', price: 25000, quantity: 1, image_url: 'https://picsum.photos/seed/2/200/200' },
  ]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const removeItem = (id: number) => {
    setItems(items.filter(item => item.id !== id));
    toast.success('Produit retiré du panier');
  };

  const handleCheckout = async () => {
    setLoading(true);
    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await api.post('/orders', {
        items: items.map(i => ({ product_id: i.id, quantity: i.quantity, price: i.price })),
        total_amount: total
      });

      toast.success('Paiement réussi ! Votre commande est en cours de traitement.', {
        duration: 5000,
        icon: '✅'
      });
      setItems([]);
      navigate('/dashboard/orders');
    } catch (error) {
      toast.error('Erreur lors du paiement');
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
        <button 
          onClick={() => navigate('/marketplace')}
          className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-all"
        >
          Aller à la Marketplace
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold text-gray-900 mb-12 tracking-tight">Votre Panier</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-6">
          {items.map((item) => (
            <motion.div 
              key={item.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-6"
            >
              <img src={item.image_url} alt={item.name} className="w-24 h-24 object-cover rounded-2xl" />
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900">{item.name}</h3>
                <p className="text-emerald-600 font-bold">{item.price.toLocaleString()} Ar</p>
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-sm text-gray-500 font-medium">Quantité: {item.quantity}</span>
                </div>
              </div>
              <button 
                onClick={() => removeItem(item.id)}
                className="p-3 text-red-500 hover:bg-red-50 rounded-2xl transition-all"
              >
                <Trash2 size={20} />
              </button>
            </motion.div>
          ))}
        </div>

        <div className="space-y-6">
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
            <h2 className="text-2xl font-bold mb-6">Résumé</h2>
            <div className="space-y-4 mb-8">
              <div className="flex justify-between text-gray-600">
                <span>Sous-total</span>
                <span>{total.toLocaleString()} Ar</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Livraison</span>
                <span className="text-emerald-600 font-bold">Gratuit</span>
              </div>
              <div className="border-t border-gray-100 pt-4 flex justify-between text-2xl font-black text-gray-900">
                <span>Total</span>
                <span>{total.toLocaleString()} Ar</span>
              </div>
            </div>

            <button 
              onClick={handleCheckout}
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? 'Traitement...' : (
                <>
                  Payer Maintenant
                  <ArrowRight size={20} />
                </>
              )}
            </button>

            <div className="mt-6 flex items-center justify-center gap-2 text-gray-400 text-sm">
              <ShieldCheck size={16} />
              <span>Paiement 100% sécurisé</span>
            </div>
          </div>

          <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
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
