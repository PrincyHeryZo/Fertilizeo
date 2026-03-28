import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Users, Shield, Search, ChevronDown } from 'lucide-react';
import api from '../services/api.ts';
import toast from 'react-hot-toast';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  phone: string;
  location: string;
  created_at: string;
}

const ROLES = ['Agriculteur', 'Producteur', 'Fournisseur', 'Acheteur', 'Administrateur'];
const roleColors: Record<string, string> = {
  Administrateur: 'bg-red-100 text-red-700',
  Producteur: 'bg-emerald-100 text-emerald-700',
  Fournisseur: 'bg-blue-100 text-blue-700',
  Agriculteur: 'bg-amber-100 text-amber-700',
  Acheteur: 'bg-gray-100 text-gray-700',
};

const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filtered, setFiltered] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  useEffect(() => { fetchUsers(); }, []);
  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(users.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)));
  }, [search, users]);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/admin/users');
      setUsers(response.data);
      setFiltered(response.data);
    } catch {
      toast.error('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: number, newRole: string) => {
    setUpdatingId(userId);
    try {
      await api.put(`/admin/users/${userId}/role`, { role: newRole });
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      toast.success('Rôle mis à jour');
    } catch {
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Gestion des Utilisateurs</h1>
          <p className="text-gray-500 mt-1">{users.length} utilisateurs inscrits</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2">
          <Shield size={16}/> Admin
        </div>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher par nom ou email..."
          className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-400 shadow-sm"/>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-white rounded-2xl animate-pulse border border-gray-100"/>)}</div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left p-4 pl-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Utilisateur</th>
                <th className="text-left p-4 text-xs font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">Localisation</th>
                <th className="text-left p-4 text-xs font-bold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Inscrit le</th>
                <th className="text-left p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Rôle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((user) => (
                <motion.tr key={user.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 pl-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-bold text-lg flex-shrink-0">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{user.name}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-gray-600 text-sm hidden md:table-cell">{user.location || '—'}</td>
                  <td className="p-4 text-gray-500 text-sm hidden lg:table-cell">
                    {new Date(user.created_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="p-4">
                    <div className="relative inline-block">
                      <select value={user.role} disabled={updatingId === user.id}
                        onChange={e => handleRoleChange(user.id, e.target.value)}
                        className={`appearance-none pl-3 pr-8 py-1.5 rounded-full text-xs font-bold cursor-pointer outline-none transition-all ${roleColors[user.role] || roleColors['Acheteur']} ${updatingId === user.id ? 'opacity-50' : ''}`}>
                        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                      <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"/>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <Users size={40} className="mx-auto mb-3 opacity-30"/>
              <p>Aucun utilisateur trouvé</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
