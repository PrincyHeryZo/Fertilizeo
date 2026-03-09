import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Package, Upload, DollarSign, Tag, Info, Layers, AlertCircle } from 'lucide-react';
import api from '../services/api.ts';
import toast from 'react-hot-toast';

const NewProduct: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: 'Compost',
    stock: '',
    image_url: ''
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('L\'image est trop lourde (max 2MB)');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, image_url: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post('/products', {
        ...formData,
        price: Number(formData.price),
        stock: Number(formData.stock)
      });
      toast.success('Produit publié avec succès ! En attente d\'approbation.');
      navigate('/dashboard/products');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors de la publication');
    } finally {
      setLoading(false);
    }
  };

  const categories = ['Compost', 'Engrais Liquide', 'Matière Première', 'Outils'];

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Publier un Produit</h1>
        <p className="text-gray-500 mt-2">Ajoutez un nouveau fertilisant biologique à la marketplace.</p>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8"
      >
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Nom du Produit</label>
            <div className="relative">
              <Package className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type="text" 
                required 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                placeholder="Ex: Compost Premium 50kg"
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
            <div className="relative">
              <Info className="absolute left-4 top-4 text-gray-400" size={20} />
              <textarea 
                required 
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                placeholder="Décrivez les bienfaits et la composition de votre produit..."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Prix (Ar)</label>
            <div className="relative">
              <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type="number" 
                required 
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: e.target.value})}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                placeholder="50000"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Stock Disponible</label>
            <div className="relative">
              <Layers className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type="number" 
                required 
                value={formData.stock}
                onChange={(e) => setFormData({...formData, stock: e.target.value})}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                placeholder="100"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Catégorie</label>
            <div className="relative">
              <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <select 
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all appearance-none"
              >
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Image du Produit</label>
            <div className="relative">
              <label className="flex items-center justify-center w-full h-[50px] bg-emerald-50 border-2 border-dashed border-emerald-200 rounded-xl cursor-pointer hover:bg-emerald-100 transition-all">
                <div className="flex items-center gap-2 text-emerald-700 font-bold">
                  <Upload size={20} />
                  <span>{formData.image_url ? 'Changer l\'image' : 'Uploader une image'}</span>
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
            </div>
          </div>

          {formData.image_url && (
            <div className="md:col-span-2">
              <p className="text-sm font-semibold text-gray-700 mb-2">Aperçu de l'image</p>
              <img 
                src={formData.image_url} 
                alt="Aperçu" 
                className="w-full h-64 object-cover rounded-2xl border border-gray-200 shadow-sm"
              />
            </div>
          )}

          <div className="md:col-span-2 p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3">
            <AlertCircle className="text-amber-600 mt-0.5" size={20} />
            <p className="text-sm text-amber-800">
              Votre produit sera examiné par un administrateur avant d'être publié sur la marketplace.
            </p>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="md:col-span-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-200 transition-all transform active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? 'Publication en cours...' : 'Publier le Produit'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default NewProduct;
