import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Package, DollarSign, Tag, Info, Layers, AlertCircle, X, Plus, Upload } from 'lucide-react';
import api from '../services/api.ts';
import toast from 'react-hot-toast';

const MAX_PHOTOS = 5;
const categories = ['Compost', 'Engrais Liquide', 'Matière Première', 'Outils'];

const NewProduct: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: 'Compost',
    stock: '',
  });
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleImageAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (images.length + files.length > MAX_PHOTOS) {
      toast.error(`Maximum ${MAX_PHOTOS} photos autorisées`);
      return;
    }
    files.forEach(file => {
      if (file.size > 3 * 1024 * 1024) {
        toast.error(`${file.name} est trop lourd (max 3MB)`);
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const image_url = images.length === 0
          ? ''
          : images.length === 1
              ? images[0]
              : JSON.stringify(images);

      await api.post('/products', {
        ...formData,
        price: Number(formData.price),
        stock: Number(formData.stock),
        image_url,
      });
      toast.success("Produit soumis ! En attente d'approbation.");
      navigate('/dashboard/products');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors de la publication');
    } finally {
      setLoading(false);
    }
  };

  return (
      <div className="p-6 md:p-8 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-gray-900">Publier un Produit</h1>
          <p className="text-gray-500 mt-1">Ajoutez un fertilisant biologique à la marketplace.</p>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Nom du Produit <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Package className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input type="text" required value={formData.name}
                       onChange={e => setFormData({ ...formData, name: e.target.value })}
                       className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                       placeholder="Ex: Compost Premium 50kg" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Description <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Info className="absolute left-4 top-3.5 text-gray-400" size={18} />
                <textarea required rows={4} value={formData.description}
                          onChange={e => setFormData({ ...formData, description: e.target.value })}
                          className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all resize-none"
                          placeholder="Décrivez les bienfaits et la composition de votre produit..." />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Prix (Ar) <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input type="number" required min="0" value={formData.price}
                         onChange={e => setFormData({ ...formData, price: e.target.value })}
                         className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                         placeholder="50000" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Stock <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Layers className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input type="number" required min="0" value={formData.stock}
                         onChange={e => setFormData({ ...formData, stock: e.target.value })}
                         className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                         placeholder="100" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Catégorie</label>
              <div className="relative">
                <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <select value={formData.category}
                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                        className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all appearance-none">
                  {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
            </div>

            {/* Photos */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-bold text-gray-700">
                  Photos du produit
                  <span className="text-gray-400 font-normal ml-2">({images.length}/{MAX_PHOTOS})</span>
                </label>
                <span className="text-xs text-gray-400">Optionnel · Max 5 · 3MB par photo</span>
              </div>

              {images.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-3">
                    {images.map((img, index) => (
                        <div key={index} className="relative aspect-square rounded-2xl overflow-hidden border border-gray-200 group">
                          <img src={img} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
                          {index === 0 && (
                              <div className="absolute top-1.5 left-1.5 bg-emerald-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                Principale
                              </div>
                          )}
                          <button type="button" onClick={() => handleRemoveImage(index)}
                                  className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-md">
                            <X size={12} />
                          </button>
                        </div>
                    ))}
                    {images.length < MAX_PHOTOS && (
                        <label className="aspect-square rounded-2xl border-2 border-dashed border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 flex flex-col items-center justify-center cursor-pointer transition-all group">
                          <Plus size={22} className="text-gray-300 group-hover:text-emerald-500 mb-1 transition-colors" />
                          <span className="text-xs text-gray-400 group-hover:text-emerald-600 transition-colors">Ajouter</span>
                          <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageAdd} />
                        </label>
                    )}
                  </div>
              )}

              {images.length === 0 && (
                  <label className="flex flex-col items-center justify-center w-full h-32 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl hover:border-emerald-300 hover:bg-emerald-50 cursor-pointer transition-all group">
                    <Upload size={28} className="text-gray-300 group-hover:text-emerald-500 mb-2 transition-colors" />
                    <span className="text-sm font-semibold text-gray-400 group-hover:text-emerald-600 transition-colors">
                  Cliquez pour ajouter des photos
                </span>
                    <span className="text-xs text-gray-300 mt-1">Jusqu'à 5 photos · JPG, PNG · 3MB max chacune</span>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageAdd} />
                  </label>
              )}
            </div>

            <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3">
              <AlertCircle className="text-amber-600 flex-shrink-0 mt-0.5" size={18} />
              <p className="text-sm text-amber-800">
                Votre produit sera examiné par un administrateur avant d'être publié sur la marketplace.
              </p>
            </div>

            <button type="submit" disabled={loading}
                    className="w-full bg-gray-900 hover:bg-gray-800 text-white font-bold py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 hover:scale-[1.01]">
              {loading
                  ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Publication...</>
                  : 'Publier le Produit'
              }
            </button>
          </form>
        </motion.div>
      </div>
  );
};

export default NewProduct;