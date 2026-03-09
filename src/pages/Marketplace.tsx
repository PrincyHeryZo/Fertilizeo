import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Search, Filter, ShoppingCart, Star, MapPin, Tag } from 'lucide-react';
import api from '../services/api.ts';

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  image_url: string;
  producer_name: string;
}

const Marketplace: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');

  useEffect(() => {
    fetchProducts();
  }, [search, category]);

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products', {
        params: { search, category }
      });
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['Compost', 'Engrais Liquide', 'Matière Première', 'Outils'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2 tracking-tight">Marketplace</h1>
          <p className="text-gray-500">Trouvez les meilleurs fertilisants biologiques pour vos cultures.</p>
        </div>

        <div className="flex flex-col sm:flex-row w-full md:w-auto gap-4">
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="Rechercher un produit..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all shadow-sm"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <select 
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="pl-12 pr-10 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all shadow-sm appearance-none min-w-[180px]"
            >
              <option value="">Toutes catégories</option>
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="bg-gray-100 animate-pulse h-96 rounded-3xl"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {products.map((product) => (
            <motion.div 
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -8 }}
              className="bg-white rounded-3xl shadow-sm hover:shadow-xl border border-gray-100 overflow-hidden transition-all group"
            >
              <div className="relative h-56 overflow-hidden">
                <img 
                  src={product.image_url || `https://picsum.photos/seed/${product.id}/600/400`} 
                  alt={product.name} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-emerald-700 font-bold text-sm shadow-sm">
                  {product.category}
                </div>
              </div>

              <div className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-emerald-600 transition-colors">{product.name}</h3>
                  <div className="flex items-center text-amber-500 gap-1">
                    <Star size={16} fill="currentColor" />
                    <span className="text-sm font-bold">4.8</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-gray-500 text-sm mb-4">
                  <MapPin size={14} />
                  <span>{product.producer_name}</span>
                </div>

                <div className="flex items-center justify-between mt-6">
                  <div>
                    <span className="text-2xl font-black text-emerald-600">{product.price.toLocaleString()} Ar</span>
                    <p className="text-xs text-gray-400">par unité</p>
                  </div>
                  <button className="bg-emerald-600 hover:bg-emerald-700 text-white p-3 rounded-2xl shadow-lg shadow-emerald-100 transition-all active:scale-90">
                    <ShoppingCart size={20} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {!loading && products.length === 0 && (
        <div className="text-center py-24 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
          <Tag size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-bold text-gray-900">Aucun produit trouvé</h3>
          <p className="text-gray-500">Essayez de modifier vos filtres de recherche.</p>
        </div>
      )}
    </div>
  );
};

export default Marketplace;
