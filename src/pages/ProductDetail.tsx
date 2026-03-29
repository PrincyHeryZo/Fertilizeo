import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, ShoppingCart, MapPin, Star, Package, CheckCircle, Clock, Plus, Minus, Shield, Leaf } from 'lucide-react';
import api from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { addToCart, getCart, saveCart } from '../utils/cart.ts';
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
  created_at: string;
}

const getProductImages = (image_url: string, id: number): string[] => {
  if (!image_url) return [`https://picsum.photos/seed/${id}/800/800`];
  try {
    const parsed = JSON.parse(image_url);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {}
  return [image_url];
};

interface Review {
  id: number;
  user_id: number;
  reviewer_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => { fetchProduct(); }, [id]);

  const fetchProduct = async () => {
    try {
      const [productRes, reviewsRes] = await Promise.allSettled([
        api.get(`/products/${id}`),
        api.get(`/products/${id}/reviews`)
      ]);
      if (productRes.status === 'fulfilled') {
        setProduct(productRes.value.data);
      } else {
        toast.error('Produit introuvable');
        navigate('/marketplace');
        return;
      }
      if (reviewsRes.status === 'fulfilled') setReviews(reviewsRes.value.data);
    } catch {
      navigate('/marketplace');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (!product) return;
    if (product.stock === 0) { toast.error('Rupture de stock'); return; }
    setAddingToCart(true);

    // Add with correct quantity directly
    const cart = getCart(user?.id);
    const existing = cart.find((i: any) => i.id === product.id);
    const currentQty = existing ? existing.quantity : 0;
    const newQty = currentQty + quantity;

    if (newQty > product.stock) {
      toast.error(`Stock maximum : ${product.stock}`);
      setAddingToCart(false);
      return;
    }

    if (existing) {
      existing.quantity = newQty;
    } else {
      cart.push({ id: product.id, name: product.name, price: product.price, quantity, image_url: product.image_url, stock: product.stock });
    }
    saveCart(cart, user?.id);
    toast.success(`${quantity}x ${product.name} ajouté au panier !`, { icon: '🛒' });
    setTimeout(() => setAddingToCart(false), 600);
  };

  const avgRating = reviews.length > 0
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : 0;

  if (loading) {
    return (
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="bg-gray-100 animate-pulse rounded-3xl aspect-square" />
            <div className="space-y-4 pt-4">
              <div className="h-8 bg-gray-100 animate-pulse rounded-xl w-3/4" />
              <div className="h-6 bg-gray-100 animate-pulse rounded-xl w-1/2" />
              <div className="h-24 bg-gray-100 animate-pulse rounded-xl" />
              <div className="h-12 bg-gray-100 animate-pulse rounded-2xl" />
            </div>
          </div>
        </div>
    );
  }

  if (!product) return null;

  return (
      <div className="min-h-screen bg-gray-50 pb-16">
        <div className="max-w-6xl mx-auto px-4 py-8">

          {/* Back */}
          <button onClick={() => navigate('/marketplace')}
                  className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-semibold mb-8 group transition-colors">
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            Retour à la marketplace
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">

            {/* Image Gallery */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              {(() => {
                const productImages = getProductImages(product.image_url, product.id);
                return (
                    <div className="space-y-3">
                      {/* Main image */}
                      <div className="aspect-square rounded-3xl overflow-hidden bg-white shadow-xl border border-gray-100 relative">
                        <img
                            src={productImages[selectedImageIndex]}
                            alt={product.name}
                            className="w-full h-full object-cover transition-all duration-300"
                        />
                        {product.stock === 0 && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <span className="bg-red-500 text-white font-black px-6 py-3 rounded-2xl text-lg">Rupture de stock</span>
                            </div>
                        )}
                        {productImages.length > 1 && (
                            <div className="absolute bottom-3 right-3 bg-black/50 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                              {selectedImageIndex + 1} / {productImages.length}
                            </div>
                        )}
                      </div>
                      {/* Thumbnails */}
                      {productImages.length > 1 && (
                          <div className="flex gap-2 overflow-x-auto pb-1">
                            {productImages.map((img, i) => (
                                <button key={i} onClick={() => setSelectedImageIndex(i)}
                                        className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                                            i === selectedImageIndex ? 'border-emerald-500 shadow-md' : 'border-gray-200 hover:border-gray-300 opacity-70 hover:opacity-100'
                                        }`}>
                                  <img src={img} alt={`Photo ${i+1}`} className="w-full h-full object-cover" />
                                </button>
                            ))}
                          </div>
                      )}
                    </div>
                );
              })()}
            </motion.div>

            {/* Info */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col">

              {/* Category + Stock */}
              <div className="flex items-center gap-3 mb-4">
              <span className="bg-emerald-100 text-emerald-700 font-bold text-sm px-4 py-1.5 rounded-full">
                {product.category}
              </span>
                {product.stock > 10 ? (
                    <span className="flex items-center gap-1.5 text-emerald-600 text-sm font-semibold">
                  <CheckCircle size={15} /> En stock ({product.stock})
                </span>
                ) : product.stock > 0 ? (
                    <span className="flex items-center gap-1.5 text-amber-600 text-sm font-semibold">
                  <Clock size={15} /> Limité ({product.stock} restants)
                </span>
                ) : (
                    <span className="flex items-center gap-1.5 text-red-500 text-sm font-semibold">
                  <Package size={15} /> Rupture de stock
                </span>
                )}
              </div>

              <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-4 leading-tight">{product.name}</h1>

              {/* Rating */}
              {reviews.length > 0 && (
                  <div className="flex items-center gap-2 mb-5">
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(s => (
                          <Star key={s} size={16} fill="currentColor"
                                className={s <= Math.round(avgRating) ? 'text-amber-400' : 'text-gray-200'} />
                      ))}
                    </div>
                    <span className="font-bold text-gray-900">{avgRating.toFixed(1)}</span>
                    <span className="text-gray-400 text-sm">({reviews.length} avis)</span>
                  </div>
              )}

              {/* Price */}
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl p-5 mb-5">
                <p className="text-4xl font-black text-emerald-600">{product.price.toLocaleString()} <span className="text-2xl">Ar</span></p>
                <p className="text-emerald-600/60 text-sm mt-1">par unité · livraison incluse</p>
              </div>

              {/* Description */}
              <p className="text-gray-600 leading-relaxed mb-5">{product.description}</p>

              {/* Producer */}
              <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-5 flex items-center gap-3 shadow-sm">
                <div className="w-11 h-11 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center text-white font-black text-lg flex-shrink-0">
                  {product.producer_name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900">{product.producer_name}</p>
                  <div className="flex items-center gap-1 text-gray-400 text-sm">
                    <MapPin size={12} /><span>{product.producer_location || 'Madagascar'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg text-xs font-bold">
                  <CheckCircle size={12} /> Vérifié
                </div>
              </div>

              {/* Quantity + Cart */}
              {product.stock > 0 && (
                  <div className="flex gap-3 mb-5">
                    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
                      <button onClick={() => setQuantity(q => Math.max(1, q - 1))}
                              className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-all font-bold">
                        <Minus size={14} />
                      </button>
                      <span className="w-8 text-center font-black text-gray-900 text-xl">{quantity}</span>
                      <button onClick={() => setQuantity(q => Math.min(product.stock, q + 1))}
                              className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-all font-bold">
                        <Plus size={14} />
                      </button>
                    </div>
                    <button onClick={handleAddToCart} disabled={addingToCart}
                            className="flex-1 bg-gray-900 hover:bg-gray-800 text-white font-bold py-3 rounded-2xl flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 shadow-xl">
                      {addingToCart ? (
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                          <>
                            <ShoppingCart size={19} />
                            Ajouter · {(product.price * quantity).toLocaleString()} Ar
                          </>
                      )}
                    </button>
                  </div>
              )}

              {/* Trust badges */}
              <div className="flex flex-wrap gap-4">
                {[
                  { icon: Shield, label: 'Paiement sécurisé' },
                  { icon: Leaf, label: 'Certifié biologique' },
                  { icon: Package, label: 'Livraison Madagascar' },
                ].map((badge, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                      <badge.icon size={13} className="text-emerald-500" />
                      {badge.label}
                    </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Reviews */}
          <div className="mt-12 bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
            <h2 className="text-2xl font-black text-gray-900 mb-6">
              Avis clients
              {reviews.length > 0 && <span className="text-gray-400 font-normal text-base ml-2">({reviews.length} avis)</span>}
            </h2>
            {reviews.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Star size={40} className="mx-auto mb-3 opacity-20" />
                  <p>Aucun avis pour ce produit.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {reviews.map(review => (
                      <div key={review.id} className="border border-gray-100 rounded-2xl p-5 hover:border-emerald-100 transition-colors">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-9 h-9 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-black text-sm">
                              {review.reviewer_name?.charAt(0).toUpperCase() || '?'}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 text-sm">{review.reviewer_name || 'Utilisateur'}</p>
                              <p className="text-xs text-gray-400">{new Date(review.created_at).toLocaleDateString('fr-FR')}</p>
                            </div>
                          </div>
                          <div className="flex gap-0.5">
                            {[1,2,3,4,5].map(s => (
                                <Star key={s} size={13} fill="currentColor"
                                      className={s <= review.rating ? 'text-amber-400' : 'text-gray-200'} />
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