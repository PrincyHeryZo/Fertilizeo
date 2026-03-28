import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Package, CheckCircle, XCircle, MapPin, User } from 'lucide-react';
import api from '../services/api.ts';
import toast from 'react-hot-toast';

interface PendingProduct {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  image_url: string;
  producer_name: string;
  producer_location: string;
  created_at: string;
}

const AdminApprovals: React.FC = () => {
  const [products, setProducts] = useState<PendingProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);

  useEffect(() => { fetchPending(); }, []);

  const fetchPending = async () => {
    try {
      const response = await api.get('/admin/products/pending');
      setProducts(response.data);
    } catch {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: number) => {
    setProcessingId(id);
    try {
      await api.put(`/admin/products/${id}/approve`);
      setProducts(products.filter(p => p.id !== id));
      toast.success('Produit approuvé et publié !', { icon: '✅' });
    } catch {
      toast.error("Erreur lors de l'approbation");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: number) => {
    setProcessingId(id);
    try {
      await api.delete(`/products/${id}`);
      setProducts(products.filter(p => p.id !== id));
      toast.success('Produit refusé et supprimé');
    } catch {
      toast.error('Erreur lors du refus');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Approbations de Produits</h1>
        <p className="text-gray-500 mt-1">
          {loading ? '...' : products.length === 0 ? 'Aucun produit en attente' : `${products.length} produit(s) en attente`}
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => <div key={i} className="bg-white rounded-3xl border border-gray-100 animate-pulse h-80" />)}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-gray-200">
          <CheckCircle size={56} className="mx-auto text-emerald-400 mb-4" />
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Tout est validé !</h3>
          <p className="text-gray-500">Aucun produit n'attend votre approbation.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {products.map((product) => (
              <motion.div key={product.id}
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl border border-amber-200 shadow-sm overflow-hidden">
                <div className="relative h-48 overflow-hidden">
                  <img src={product.image_url || `https://picsum.photos/seed/${product.id}/600/400`}
                    alt={product.name} className="w-full h-full object-cover" />
                  <div className="absolute top-3 left-3 bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                    <Package size={12} /> En attente
                  </div>
                  <div className="absolute top-3 right-3 bg-white/90 px-3 py-1 rounded-full text-emerald-700 font-bold text-sm">
                    {product.category}
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-gray-900 text-lg mb-1">{product.name}</h3>
                  <p className="text-gray-500 text-sm mb-3 line-clamp-2">{product.description}</p>
                  <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                    <User size={14} /><span className="font-medium">{product.producer_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400 text-sm mb-4">
                    <MapPin size={14} /><span>{product.producer_location || 'Madagascar'}</span>
                  </div>
                  <div className="flex justify-between items-center mb-5">
                    <span className="text-2xl font-black text-emerald-600">{product.price.toLocaleString()} Ar</span>
                    <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-lg">Stock: {product.stock}</span>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => handleApprove(product.id)} disabled={processingId === product.id}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-sm">
                      {processingId === product.id
                        ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        : <><CheckCircle size={16} /> Approuver</>}
                    </button>
                    <button onClick={() => handleReject(product.id)} disabled={processingId === product.id}
                      className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 py-2.5 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-sm">
                      <XCircle size={16} /> Refuser
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default AdminApprovals;
