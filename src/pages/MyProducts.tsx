import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Plus, Package, Edit, Trash2, Clock, CheckCircle } from 'lucide-react';
import api from '../services/api.ts';
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

// Helper: get first image from image_url (could be JSON array or single string)
const getFirstImage = (image_url: string, id: number): string => {
  if (!image_url) return `https://picsum.photos/seed/${id}/600/400`;
  try {
    const parsed = JSON.parse(image_url);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
  } catch {
    // not JSON, use as-is
  }
  return image_url;
};

const MyProducts: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => { fetchMyProducts(); }, []);

  const fetchMyProducts = async () => {
    try {
      const response = await api.get('/products/my');
      setProducts(response.data);
    } catch {
      toast.error('Erreur lors du chargement des produits');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Supprimer ce produit définitivement ?')) return;
    try {
      await api.delete(`/products/${id}`);
      setProducts(products.filter(p => p.id !== id));
      toast.success('Produit supprimé');
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleEdit = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/dashboard/products/edit/${id}`);
  };

  return (
      <div className="p-6 md:p-8 max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-black text-gray-900">Mes Produits</h1>
            <p className="text-gray-500 mt-1">
              {products.length > 0 ? `${products.length} produit${products.length > 1 ? 's' : ''}` : 'Gérez vos produits'}
            </p>
          </div>
          <Link to="/dashboard/products/new"
                className="bg-gray-900 hover:bg-gray-800 text-white px-5 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-lg">
            <Plus size={18} /> Nouveau Produit
          </Link>
        </div>

        {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1,2,3].map(i => (
                  <div key={i} className="bg-white rounded-3xl p-6 border border-gray-100 animate-pulse space-y-4">
                    <div className="h-40 bg-gray-100 rounded-2xl" />
                    <div className="h-5 bg-gray-100 rounded w-3/4" />
                    <div className="h-4 bg-gray-100 rounded w-1/2" />
                  </div>
              ))}
            </div>
        ) : products.length === 0 ? (
            <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-gray-200">
              <Package size={56} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-2xl font-black text-gray-900 mb-2">Aucun produit</h3>
              <p className="text-gray-500 mb-6">Commencez par ajouter votre premier produit.</p>
              <Link to="/dashboard/products/new"
                    className="bg-gray-900 text-white px-6 py-3 rounded-2xl font-bold hover:bg-gray-800 transition-all inline-flex items-center gap-2">
                <Plus size={18} /> Ajouter un produit
              </Link>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                  <motion.div key={product.id}
                              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                              className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all overflow-hidden group">
                    <div className="relative h-44 overflow-hidden">
                      <img
                          src={getFirstImage(product.image_url, product.id)}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className={`absolute top-3 right-3 flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                          product.is_approved ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {product.is_approved ? <CheckCircle size={11} /> : <Clock size={11} />}
                        {product.is_approved ? 'Approuvé' : 'En attente'}
                      </div>
                    </div>
                    <div className="p-5">
                      <h3 className="font-black text-gray-900 text-base mb-1 truncate">{product.name}</h3>
                      <p className="text-emerald-600 font-bold text-lg mb-3">{product.price.toLocaleString()} Ar</p>
                      <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
                        <span className="bg-gray-100 px-2.5 py-1 rounded-lg text-xs font-semibold">{product.category}</span>
                        <span className="text-xs">Stock: <span className="font-bold text-gray-700">{product.stock}</span></span>
                      </div>
                      <div className="flex gap-2">
                        <button
                            onClick={e => handleEdit(product.id, e)}
                            className="flex-1 flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white py-2.5 rounded-xl font-bold transition-all text-sm shadow-md">
                          <Edit size={15} /> Modifier
                        </button>
                        <button
                            onClick={e => handleDelete(product.id, e)}
                            className="flex items-center justify-center gap-1.5 border border-red-100 hover:bg-red-50 text-red-500 px-4 py-2.5 rounded-xl transition-all text-sm">
                          <Trash2 size={15} />
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