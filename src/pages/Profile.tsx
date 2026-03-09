import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { User, Mail, Phone, MapPin, Briefcase, Save, Navigation } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import api from '../services/api.ts';
import toast from 'react-hot-toast';

const Profile: React.FC = () => {
  const { user, login } = useAuth();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    location: user?.location || ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        phone: user.phone || '',
        location: user.location || ''
      });
    }
  }, [user]);

  const handleGetLocation = () => {
    if ("geolocation" in navigator) {
      toast.promise(
        new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              // In a real app, we'd use reverse geocoding here
              // For this demo, we'll just set a mock location string
              const mockLocation = "Antananarivo, Madagascar";
              setFormData(prev => ({ ...prev, location: mockLocation }));
              resolve(mockLocation);
            },
            (error) => reject(error)
          );
        }),
        {
          loading: 'Récupération de votre position...',
          success: 'Position récupérée !',
          error: 'Impossible de récupérer votre position.',
        }
      );
    } else {
      toast.error("La géolocalisation n'est pas supportée par votre navigateur.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.put('/auth/profile', formData);
      // Update local auth context
      if (user) {
        login(localStorage.getItem('token')!, { ...user, ...formData });
      }
      toast.success('Profil mis à jour avec succès !');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour du profil');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Mon Profil</h1>
        <p className="text-gray-500 mt-2">Gérez vos informations personnelles et votre localisation.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 text-center">
            <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <User size={48} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">{user?.name}</h2>
            <p className="text-emerald-600 font-bold text-sm mt-1">{user?.role}</p>
            <div className="mt-6 pt-6 border-t border-gray-100 space-y-4 text-left">
              <div className="flex items-center gap-3 text-gray-500">
                <Mail size={18} />
                <span className="text-sm">{user?.email}</span>
              </div>
              <div className="flex items-center gap-3 text-gray-500">
                <Briefcase size={18} />
                <span className="text-sm">Membre depuis 2024</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8"
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Nom Complet</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input 
                    type="text" 
                    required 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Téléphone</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input 
                    type="tel" 
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Localisation</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input 
                      type="text" 
                      value={formData.location}
                      onChange={(e) => setFormData({...formData, location: e.target.value})}
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      placeholder="Antananarivo, Madagascar"
                    />
                  </div>
                  <button 
                    type="button"
                    onClick={handleGetLocation}
                    className="p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-all border border-emerald-100"
                    title="Ma position actuelle"
                  >
                    <Navigation size={24} />
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Enregistrement...' : (
                  <>
                    <Save size={20} />
                    Enregistrer les modifications
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
