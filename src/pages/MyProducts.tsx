import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Plus, Package, Edit, Trash2, Clock, CheckCircle, XCircle } from 'lucide-react';
import api from '../../../../Documents/MUSIC LYRICS/Fertilizeo_fixed/Fertilizeo_fixed/src/services/api.ts';
import toast from 'react-hot-toast';

interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  stock: number;
  image_url: string;
  is_approved: boolean;
  created_at: string;
}

const MyProducts: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchMyProducts(); }, []);

  const fetchMyProducts = async () => {
    try {
      const response = await api.get('/products/my');
      setProducts(response.data);
    } catch (error) {
      toast.error('Erreur lors du chargement des produits');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer ce produit ?')) return;
    try {
      await api.delete(`/products/${id}`);
      setProducts(products.filter(p => p.id !== id));
      toast.success('Produit supprimé');
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Mes Produits</h1>
          <p className="text-gray-500 mt-1">Gérez vos produits sur la marketplace.</p>
        </div>
        <Link to="/dashboard/products/new" className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-100">
          <Plus size={20} /> Nouveau Produit
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => (
            <div key={i} className="bg-white rounded-3xl p-6 border border-gray-100 animate-pulse space-y-4">
              <div className="h-40 bg-gray-100 rounded-2xl"/>
              <div className="h-5 bg-gray-100 rounded w-3/4"/>
              <div className="h-4 bg-gray-100 rounded w-1/2"/>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-gray-200">
          <Package size={56} className="mx-auto text-gray-300 mb-4"/>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Aucun produit</h3>
          <p className="text-gray-500 mb-6">Commencez par ajouter votre premier produit.</p>
          <Link to="/dashboard/products/new" className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-emerald-700 transition-all inline-flex items-center gap-2">
            <Plus size={20}/> Ajouter un produit
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <motion.div key={product.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all overflow-hidden group">
              <div className="relative h-44 overflow-hidden">
                <img src={product.image_url || `https://picsum.photos/seed/${product.id}/600/400`}
                  alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
                <div className={`absolute top-3 right-3 flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${product.is_approved ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {product.is_approved ? <CheckCircle size={12}/> : <Clock size={12}/>}
                  {product.is_approved ? 'Approuvé' : 'En attente'}
                </div>
              </div>
              <div className="p-5">
                <h3 className="font-bold text-gray-900 text-lg mb-1">{product.name}</h3>
                <p className="text-emerald-600 font-bold text-xl mb-3">{product.price.toLocaleString()} Ar</p>
                <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
                  <span className="bg-gray-100 px-2 py-1 rounded-lg">{product.category}</span>
                  <span>Stock: <span className="font-bold text-gray-700">{product.stock}</span></span>
                </div>
                <div className="flex gap-2">
                  <button className="flex-1 flex items-center justify-center gap-2 border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 text-gray-700 py-2 rounded-xl font-medium transition-all text-sm">
                    <Edit size={16}/> Modifier
                  </button>
                  <button onClick={() => handleDelete(product.id)}
                    className="flex items-center justify-center gap-2 border border-red-100 hover:bg-red-50 text-red-500 px-4 py-2 rounded-xl font-medium transition-all text-sm">
                    <Trash2 size={16}/>
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyProducts;
