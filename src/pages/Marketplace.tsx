import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Search, Filter, ShoppingCart, Star, MapPin, ChevronLeft, ChevronRight, Tag, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { addToCart } from '../utils/cart.ts';
import toast from 'react-hot-toast';

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  image_url: string;
  producer_name: string;
  producer_location: string;
}

interface PaginationData {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const Marketplace: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => { fetchProducts(); }, [search, category, page]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await api.get('/products', { params: { search, category, page, limit: 8 } });
      setProducts(response.data.products);
      setPagination(response.data.pagination);
    } catch {
      toast.error('Erreur lors du chargement des produits');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation(); // prevent navigation to detail page
    const result = addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      image_url: product.image_url,
      stock: product.stock
    }, user?.id);
    if (result.success) {
      toast.success(result.message, { icon: '🛒' });
    } else {
      toast.error(result.message);
    }
  };

  const categories = ['Compost', 'Engrais Liquide', 'Matière Première', 'Outils'];

  return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
          <div>
            <h1 className="text-4xl font-black text-gray-900 mb-2">Marketplace</h1>
            <p className="text-gray-500">Les meilleurs fertilisants biologiques de Madagascar.</p>
          </div>
          <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3">
            <div className="relative flex-1 sm:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input type="text" placeholder="Rechercher..."
                     value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                     className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm text-sm" />
            </div>
            <div className="relative">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <select value={category} onChange={e => { setCategory(e.target.value); setPage(1); }}
                      className="pl-11 pr-8 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm appearance-none min-w-[180px] text-sm">
                <option value="">Toutes catégories</option>
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Grid */}
        {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1,2,3,4,5,6,7,8].map(i => (
                  <div key={i} className="bg-white rounded-3xl overflow-hidden border border-gray-100 animate-pulse">
                    <div className="h-52 bg-gray-100" />
                    <div className="p-5 space-y-3">
                      <div className="h-5 bg-gray-100 rounded-lg w-3/4" />
                      <div className="h-4 bg-gray-100 rounded-lg w-1/2" />
                      <div className="h-8 bg-gray-100 rounded-xl" />
                    </div>
                  </div>
              ))}
            </div>
        ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {products.map((product) => (
                    <motion.div key={product.id}
                                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                                whileHover={{ y: -6 }}
                                onClick={() => navigate(`/marketplace/${product.id}`)}
                                className="bg-white rounded-3xl shadow-sm hover:shadow-xl border border-gray-100 overflow-hidden transition-all group cursor-pointer">

                      <div className="relative h-52 overflow-hidden">
                        <img
                            src={product.image_url || `https://picsum.photos/seed/${product.id}/600/400`}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-emerald-700 font-bold text-xs shadow-sm">
                          {product.category}
                        </div>
                        {product.stock === 0 && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                              <span className="bg-red-500 text-white font-bold px-3 py-1.5 rounded-full text-xs">Rupture de stock</span>
                            </div>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 transition-all bg-white/95 backdrop-blur-sm px-4 py-2 rounded-full flex items-center gap-2 text-sm font-bold text-gray-900 shadow-lg">
                            <Eye size={14} /> Voir le détail
                          </div>
                        </div>
                      </div>

                      <div className="p-5">
                        <div className="flex justify-between items-start mb-1">
                          <h3 className="font-black text-gray-900 group-hover:text-emerald-600 transition-colors leading-tight flex-1 mr-2 text-sm">
                            {product.name}
                          </h3>
                          <div className="flex items-center gap-0.5 flex-shrink-0">
                            <Star size={12} fill="currentColor" className="text-amber-400" />
                            <span className="text-xs font-bold text-gray-500">4.8</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-gray-400 text-xs mb-1">
                          <MapPin size={11} /><span>{product.producer_location || 'Madagascar'}</span>
                        </div>
                        <p className="text-xs text-gray-400 mb-4">par {product.producer_name}</p>

                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-xl font-black text-emerald-600">{product.price.toLocaleString()}</span>
                            <span className="text-emerald-600 font-bold text-sm"> Ar</span>
                            <p className="text-xs text-gray-400">Stock: {product.stock}</p>
                          </div>
                          <button
                              onClick={e => handleAddToCart(e, product)}
                              disabled={product.stock === 0}
                              className="bg-gray-900 hover:bg-gray-700 disabled:bg-gray-200 text-white p-2.5 rounded-xl shadow-md transition-all active:scale-90 disabled:cursor-not-allowed">
                            <ShoppingCart size={17} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                ))}
              </div>

              {pagination && pagination.totalPages > 1 && (
                  <div className="mt-12 flex justify-center items-center gap-3">
                    <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                            className="p-3 bg-white border border-gray-200 rounded-2xl hover:bg-gray-50 disabled:opacity-40 transition-all">
                      <ChevronLeft size={22} />
                    </button>
                    <span className="font-bold text-gray-700">Page {page} / {pagination.totalPages}</span>
                    <button disabled={page === pagination.totalPages} onClick={() => setPage(p => p + 1)}
                            className="p-3 bg-white border border-gray-200 rounded-2xl hover:bg-gray-50 disabled:opacity-40 transition-all">
                      <ChevronRight size={22} />
                    </button>
                  </div>
              )}
            </>
        )}

        {!loading && products.length === 0 && (
            <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-gray-200">
              <Tag size={48} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-black text-gray-900">Aucun produit trouvé</h3>
              <p className="text-gray-500 mt-2">Essayez de modifier vos filtres.</p>
            </div>
        )}
      </div>
  );
};

export default Marketplace;