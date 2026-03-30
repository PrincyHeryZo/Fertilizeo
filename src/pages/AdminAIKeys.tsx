import React, { useState, useEffect } from 'react';
import { Key, Plus, Trash2, Copy, CheckCircle, AlertCircle, RefreshCw, Activity, Users, Zap } from 'lucide-react';
import api from '../services/api.ts';
import toast from 'react-hot-toast';

// ─── TYPES ───────────────────────────────────────────────────

interface ApiKey {
  id: string;
  client_name: string;
  plan: string;
  monthly_limit: number;
  calls_total: number;
  calls_this_month: number;
  is_active: number;
  last_used_at: string | null;
  created_at: string;
}

interface KbStats {
  knowledge_base: {
    total_articles: number;
    by_category: Array<{ category: string; n: number }>;
    by_source: Array<{ source: string; n: number }>;
  };
  recent_activity: Array<{
    source: string;
    query: string;
    status: string;
    items: number;
    created_at: string;
  }>;
}

const PLANS = [
  { value: 'starter',    label: 'Starter',    limit: 1000,   price: 'Gratuit / démo' },
  { value: 'pro',        label: 'Pro',         limit: 10000,  price: '~50 000 Ar/mois' },
  { value: 'enterprise', label: 'Enterprise',  limit: 100000, price: 'Sur devis' },
];

const CATEGORY_LABELS: Record<string, string> = {
  compost: 'Compostage', fumier: 'Fumiers', bokashi: 'Bokashi',
  biofertilisant: 'Biofertilisants', engrais_vert: 'Engrais verts',
  nutriment: 'Nutriments', technique: 'Techniques', culture: 'Cultures',
  pisciculture: 'Pisciculture', apiculture: 'Apiculture',
};

// ─── COMPOSANT PRINCIPAL ─────────────────────────────────────

const AdminAIKeys: React.FC = () => {
  const [keys, setKeys]         = useState<ApiKey[]>([]);
  const [stats, setStats]       = useState<KbStats | null>(null);
  const [loading, setLoading]   = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newKey, setNewKey]     = useState<string | null>(null);
  const [copied, setCopied]     = useState(false);
  const [activeTab, setActiveTab] = useState<'keys' | 'stats'>('keys');

  const [form, setForm] = useState({
    client_name: '',
    plan: 'starter',
  });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [keysRes, statsRes] = await Promise.all([
        api.get('/admin/ai/keys'),
        api.get('/ai/kb/stats'),
      ]);
      setKeys(keysRes.data.keys || []);
      setStats(statsRes.data);
    } catch {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const createKey = async () => {
    if (!form.client_name.trim()) {
      toast.error('Nom du client requis');
      return;
    }
    setCreating(true);
    try {
      const res = await api.post('/admin/ai/keys', form);
      setNewKey(res.data.api_key);
      setShowForm(false);
      setForm({ client_name: '', plan: 'starter' });
      await fetchAll();
      toast.success(`Clé créée pour ${form.client_name}`);
    } catch {
      toast.error('Erreur lors de la création');
    } finally {
      setCreating(false);
    }
  };

  const revokeKey = async (id: string, name: string) => {
    if (!confirm(`Révoquer la clé de "${name}" ? Cette action est irréversible.`)) return;
    try {
      await api.delete(`/admin/ai/keys/${id}`);
      setKeys(prev => prev.map(k => k.id === id ? { ...k, is_active: 0 } : k));
      toast.success('Clé révoquée');
    } catch {
      toast.error('Erreur révocation');
    }
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Clé copiée !');
  };

  const planColor = (plan: string) => ({
    starter:    'bg-gray-100 text-gray-700',
    pro:        'bg-blue-100 text-blue-700',
    enterprise: 'bg-purple-100 text-purple-700',
  }[plan] || 'bg-gray-100 text-gray-700');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">

      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Zap size={24} className="text-emerald-500" />
            IA Fertili'zeo
          </h1>
          <p className="text-sm text-gray-500 mt-1">Gestion des clés API et statistiques de la knowledge base</p>
        </div>
        <button onClick={fetchAll} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 bg-gray-100 px-3 py-2 rounded-xl transition-colors">
          <RefreshCw size={14} /> Actualiser
        </button>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Articles KB', value: stats?.knowledge_base.total_articles || 0, icon: Activity, color: 'emerald' },
          { label: 'Clés actives', value: keys.filter(k => k.is_active).length, icon: Key, color: 'blue' },
          { label: 'Appels ce mois', value: keys.reduce((s, k) => s + k.calls_this_month, 0), icon: Zap, color: 'amber' },
          { label: 'Clients', value: keys.length, icon: Users, color: 'purple' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className={`w-9 h-9 bg-${stat.color}-100 rounded-xl flex items-center justify-center mb-3`}>
              <stat.icon size={16} className={`text-${stat.color}-600`} />
            </div>
            <p className="text-2xl font-black text-gray-900">{stat.value.toLocaleString()}</p>
            <p className="text-xs text-gray-500 font-medium">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {[{ id: 'keys', label: 'Clés API' }, { id: 'stats', label: 'Knowledge Base' }].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB CLÉS API ─────────────────────────────────────── */}
      {activeTab === 'keys' && (
        <div className="space-y-4">

          {/* Nouvelle clé générée */}
          {newKey && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <p className="text-sm font-bold text-amber-800 mb-2 flex items-center gap-2">
                <AlertCircle size={16} /> Sauvegardez cette clé — elle ne sera plus affichée
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-white border border-amber-200 rounded-xl px-4 py-2.5 text-sm font-mono text-gray-800 overflow-x-auto">
                  {newKey}
                </code>
                <button
                  onClick={() => copyKey(newKey)}
                  className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors flex-shrink-0"
                >
                  {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
                  {copied ? 'Copié !' : 'Copier'}
                </button>
                <button onClick={() => setNewKey(null)} className="text-amber-600 hover:text-amber-800 p-2">
                  <X size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Formulaire création */}
          {showForm ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
              <h3 className="font-bold text-gray-900">Créer une nouvelle clé API</h3>
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1.5">Nom du client</label>
                <input
                  type="text"
                  placeholder="ex: App AgroMada, ONG SAHA..."
                  value={form.client_name}
                  onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1.5">Plan</label>
                <div className="grid grid-cols-3 gap-3">
                  {PLANS.map(p => (
                    <button
                      key={p.value}
                      onClick={() => setForm(f => ({ ...f, plan: p.value }))}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        form.plan === p.value ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <p className="font-bold text-sm text-gray-900">{p.label}</p>
                      <p className="text-xs text-gray-500">{p.limit.toLocaleString()} req/mois</p>
                      <p className="text-xs text-emerald-600 font-medium">{p.price}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={createKey}
                  disabled={creating}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors"
                >
                  {creating ? <><RefreshCw size={14} className="animate-spin" /> Création...</> : <><Plus size={14} /> Créer la clé</>}
                </button>
                <button onClick={() => setShowForm(false)} className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors"
            >
              <Plus size={16} /> Nouvelle clé API
            </button>
          )}

          {/* Liste des clés */}
          {keys.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Key size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-semibold">Aucune clé API créée</p>
              <p className="text-sm">Créez une clé pour donner accès à l'API publique.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {keys.map(key => (
                <div key={key.id} className={`bg-white border rounded-2xl p-4 transition-all ${key.is_active ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-gray-900">{key.client_name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${planColor(key.plan)}`}>
                          {key.plan}
                        </span>
                        {!key.is_active && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-semibold">Révoquée</span>
                        )}
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Zap size={11} />
                          {key.calls_this_month.toLocaleString()} / {key.monthly_limit.toLocaleString()} ce mois
                        </span>
                        <span>{key.calls_total.toLocaleString()} appels total</span>
                        {key.last_used_at && (
                          <span>Dernier appel : {new Date(key.last_used_at).toLocaleDateString('fr-FR')}</span>
                        )}
                        <span>Créée le {new Date(key.created_at).toLocaleDateString('fr-FR')}</span>
                      </div>

                      {/* Barre de progression */}
                      <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            key.calls_this_month / key.monthly_limit > 0.8 ? 'bg-red-400' :
                            key.calls_this_month / key.monthly_limit > 0.5 ? 'bg-amber-400' : 'bg-emerald-400'
                          }`}
                          style={{ width: `${Math.min(100, (key.calls_this_month / key.monthly_limit) * 100)}%` }}
                        />
                      </div>
                    </div>

                    {key.is_active && (
                      <button
                        onClick={() => revokeKey(key.id, key.client_name)}
                        className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
                      >
                        <Trash2 size={13} /> Révoquer
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB KNOWLEDGE BASE ──────────────────────────────── */}
      {activeTab === 'stats' && stats && (
        <div className="grid md:grid-cols-2 gap-6">

          {/* Par catégorie */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Activity size={16} className="text-emerald-500" /> Articles par catégorie
            </h3>
            <div className="space-y-3">
              {stats.knowledge_base.by_category.map(cat => (
                <div key={cat.category}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-700 font-medium">
                      {CATEGORY_LABELS[cat.category] || cat.category}
                    </span>
                    <span className="text-sm font-bold text-gray-900">{cat.n}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 rounded-full"
                      style={{ width: `${(cat.n / stats.knowledge_base.total_articles) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Par source */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Key size={16} className="text-blue-500" /> Articles par source
            </h3>
            <div className="space-y-3">
              {stats.knowledge_base.by_source.map(src => (
                <div key={src.source} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 font-medium capitalize">
                    {src.source.replace('_', ' ')}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-400 rounded-full"
                        style={{ width: `${(src.n / stats.knowledge_base.total_articles) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-gray-900 w-6 text-right">{src.n}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Bouton pour lancer la collecte */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-2">Pour enrichir la KB :</p>
              <code className="block text-xs bg-gray-900 text-green-400 rounded-lg p-3 font-mono">
                npm run collect
              </code>
            </div>
          </div>

          {/* Activité récente */}
          <div className="md:col-span-2 bg-white border border-gray-200 rounded-2xl p-5">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Zap size={16} className="text-amber-500" /> Activité récente (API)
            </h3>
            {stats.recent_activity.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Aucune activité enregistrée</p>
            ) : (
              <div className="space-y-2">
                {stats.recent_activity.map((log, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm py-2 border-b border-gray-50 last:border-0">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${log.status === 'success' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                    <span className="text-gray-400 text-xs flex-shrink-0">{log.source}</span>
                    <span className="text-gray-700 flex-1 truncate">{log.query}</span>
                    <span className="text-gray-400 text-xs flex-shrink-0">
                      {new Date(log.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Missing import fix
const X: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

export default AdminAIKeys;
