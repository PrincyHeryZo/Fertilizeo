import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowLeft, ShoppingCart, MapPin, User, Star, Package,
  CheckCircle, Clock, Plus, Minus, MessageSquare, Shield
} from 'lucide-react';
import api from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
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
  producer_id: number;
  is_approved: boolean;
  created_at: string;
}

interface Review {
  id: number;
  user_id: number;
  rating: number;
  comment: string;
  created_at: string;
  reviewer_name?: string;
}

const categoryColors: Record<string, string> = {
  'Compost': 'bg-amber-100 text-amber-700',
  'Engrais Liquide': 'bg-blue-100 text-blue-700',
  'Matière Première': 'bg-purple-100 text-purple-700',
  'Outils': 'bg-gray-100 text-gray-700',
};

const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      const response = await api.get(`/products/${id}`);
      setProduct(response.data);
      // Fetch reviews
      try {
        const revResponse = await api.get(`/products/${id}/reviews`);
        setReviews(revResponse.data);
      } catch {
        setReviews([]);
      }
    } catch {
      toast.error('Produit introuvable');
      navigate('/marketplace');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (!product) return;
    if (product.stock === 0) {
      toast.error('Produit en rupture de stock');
      return;
    }
    setAddingToCart(true);
    setTimeout(() => {
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');
      const existing = cart.find((item: any) => item.id === product.id);
      if (existing) {
        if (existing.quantity + quantity > product.stock) {
          toast.error(`Stock maximum : ${product.stock}`);
          setAddingToCart(false);
          return;
        }
        existing.quantity += quantity;
      } else {
        cart.push({
          id: product.id,
          name: product.name,
          price: product.price,
          quantity,
          image_url: product.image_url,
          stock: product.stock
        });
      }
      localStorage.setItem('cart', JSON.stringify(cart));
      toast.success(`${quantity}x ${product.name} ajouté au panier !`, { icon: '🛒' });
      setAddingToCart(false);
    }, 600);
  };

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="bg-gray-100 animate-pulse rounded-3xl h-96" />
          <div className="space-y-4">
            <div className="h-8 bg-gray-100 animate-pulse rounded-xl w-3/4" />
            <div className="h-6 bg-gray-100 animate-pulse rounded-xl w-1/2" />
            <div className="h-24 bg-gray-100 animate-pulse rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* Back Button */}
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-semibold mb-8 group transition-colors">
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          Retour à la marketplace
        </button>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">

          {/* Image */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
            className="relative">
            <div className="aspect-square rounded-3xl overflow-hidden bg-white shadow-xl">
              <img
                src={product.image_url || `https://picsum.photos/seed/${product.id}/800/800`}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
            {/* Category badge */}
            <div className={`absolute top-4 left-4 px-4 py-2 rounded-full text-sm font-bold ${categoryColors[product.category] || 'bg-gray-100 text-gray-700'}`}>
              {product.category}
            </div>
            {product.stock === 0 && (
              <div className="absolute inset-0 bg-black/50 rounded-3xl flex items-center justify-center">
                <span className="bg-red-500 text-white font-black px-6 py-3 rounded-2xl text-lg">Rupture de stock</span>
              </div>
            )}
          </motion.div>

          {/* Info */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            className="flex flex-col justify-center">

            {/* Title */}
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-4 leading-tight">
              {product.name}
            </h1>

            {/* Rating */}
            {avgRating && (
              <div className="flex items-center gap-2 mb-4">
                <div className="flex gap-0.5">
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} size={18}
                      className={s <= Math.round(Number(avgRating)) ? 'text-amber-400' : 'text-gray-200'}
                      fill={s <= Math.round(Number(avgRating)) ? 'currentColor' : 'currentColor'} />
                  ))}
                </div>
                <span className="font-bold text-gray-900">{avgRating}</span>
                <span className="text-gray-400 text-sm">({reviews.length} avis)</span>
              </div>
            )}

            {/* Price */}
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 mb-6">
              <p className="text-4xl font-black text-emerald-600 mb-1">
                {product.price.toLocaleString()} Ar
              </p>
              <p className="text-emerald-600/70 text-sm">par unité · TVA incluse</p>
            </div>

            {/* Description */}
            <p className="text-gray-600 leading-relaxed mb-6">{product.description}</p>

            {/* Producer Info */}
            <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center text-white font-black text-lg">
                {product.producer_name?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-900">{product.producer_name}</p>
                <div className="flex items-center gap-1 text-gray-500 text-sm">
                  <MapPin size={13} />
                  <span>{product.producer_location || 'Madagascar'}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl text-xs font-bold">
                <CheckCircle size={13} />
                Vérifié
              </div>
            </div>

            {/* Stock info */}
            <div className="flex items-center gap-2 mb-6">
              {product.stock > 10 ? (
                <div className="flex items-center gap-2 text-emerald-600 text-sm font-semibold">
                  <CheckCircle size={16} /> En stock ({product.stock} disponibles)
                </div>
              ) : product.stock > 0 ? (
                <div className="flex items-center gap-2 text-amber-600 text-sm font-semibold">
                  <Clock size={16} /> Stock limité ({product.stock} restants)
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-500 text-sm font-semibold">
                  <Package size={16} /> Rupture de stock
                </div>
              )}
            </div>

            {/* Quantity + Add to Cart */}
            {product.stock > 0 && (
              <div className="flex gap-3">
                <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-2xl px-4 py-3">
                  <button onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-all">
                    <Minus size={14} />
                  </button>
                  <span className="w-8 text-center font-black text-gray-900 text-lg">{quantity}</span>
                  <button onClick={() => setQuantity(q => Math.min(product.stock, q + 1))}
                    className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-all">
                    <Plus size={14} />
                  </button>
                </div>

                <button onClick={handleAddToCart} disabled={addingToCart}
                  className="flex-1 bg-gray-900 hover:bg-gray-800 text-white font-bold py-3 rounded-2xl flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 shadow-xl">
                  {addingToCart ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <ShoppingCart size={20} />
                      Ajouter au panier · {(product.price * quantity).toLocaleString()} Ar
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Trust badges */}
            <div className="flex flex-wrap gap-3 mt-6">
              {[
                { icon: Shield, label: 'Paiement sécurisé' },
                { icon: CheckCircle, label: 'Produit certifié bio' },
                { icon: Package, label: 'Livraison Madagascar' },
              ].map((badge, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                  <badge.icon size={13} className="text-emerald-500" />
                  {badge.label}
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Reviews Section */}
        <div className="bg-white rounded-3xl border border-gray-100 p-8">
          <h2 className="text-2xl font-black text-gray-900 mb-6">
            Avis clients
            {reviews.length > 0 && <span className="text-gray-400 font-normal text-lg ml-2">({reviews.length})</span>}
          </h2>

          {reviews.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Star size={40} className="mx-auto mb-3 opacity-30" />
              <p>Aucun avis pour ce produit.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="border border-gray-100 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 font-bold text-sm">
                        <User size={16} />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-sm">{review.reviewer_name || 'Utilisateur'}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(review.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} size={14}
                          className={s <= review.rating ? 'text-amber-400' : 'text-gray-200'}
                          fill="currentColor" />
                      ))}
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed">{review.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default ProductDetail;
