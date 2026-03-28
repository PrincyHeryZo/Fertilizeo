import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'motion/react';
import { Leaf, ShieldCheck, TrendingUp, Users, ArrowRight, Star, MapPin, Sprout, Zap, Globe } from 'lucide-react';

const stats = [
  { value: '2,400+', label: 'Agriculteurs', icon: Users },
  { value: '380+', label: 'Produits Bio', icon: Leaf },
  { value: '18', label: 'Régions', icon: MapPin },
  { value: '98%', label: 'Satisfaction', icon: Star },
];

const features = [
  {
    icon: Sprout,
    title: '100% Biologique',
    desc: 'Chaque produit est certifié naturel, sans produits chimiques, pour une terre vivante et productive.',
    color: 'from-emerald-400 to-teal-500',
    bg: 'bg-emerald-50',
  },
  {
    icon: ShieldCheck,
    title: 'Qualité Garantie',
    desc: 'Tous les produits passent par un processus de validation rigoureux avant publication.',
    color: 'from-blue-400 to-indigo-500',
    bg: 'bg-blue-50',
  },
  {
    icon: Users,
    title: 'Communauté Active',
    desc: 'Forum dédié pour partager expériences, conseils et bonnes pratiques agricoles.',
    color: 'from-amber-400 to-orange-500',
    bg: 'bg-amber-50',
  },
  {
    icon: TrendingUp,
    title: 'Croissance Durable',
    desc: 'Optimisez vos rendements tout en préservant l\'écosystème pour les générations futures.',
    color: 'from-purple-400 to-violet-500',
    bg: 'bg-purple-50',
  },
];

const testimonials = [
  { name: 'Jean Rakoto', role: 'Producteur, Fianarantsoa', text: 'Grâce à FERTILI\'ZEO, j\'ai multiplié mes ventes par 3. La plateforme est intuitive et les acheteurs sont sérieux.', avatar: 'J' },
  { name: 'Marie Rasoa', role: 'Fournisseur, Toamasina', text: 'Le meilleur moyen de connecter avec des agriculteurs de toute Madagascar. Livraison simple, paiement sécurisé.', avatar: 'M' },
  { name: 'Pierre Andriamaro', role: 'Agriculteur, Mahajanga', text: 'J\'ai trouvé du compost premium à prix juste. Mon sol s\'est transformé dès la première saison.', avatar: 'P' },
];

const Home: React.FC = () => {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 500], [0, 150]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);

  return (
    <div className="flex flex-col min-h-screen overflow-hidden">

      {/* ===== HERO ===== */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gray-950" ref={heroRef}>
        {/* Animated background */}
        <motion.div style={{ y }} className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?auto=format&fit=crop&q=80&w=2000"
            alt="Agriculture Madagascar"
            className="w-full h-full object-cover opacity-30"
          />
        </motion.div>

        {/* Gradient overlays */}
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-gray-950/60 via-gray-950/40 to-gray-950" />
        <div className="absolute inset-0 z-0 bg-gradient-to-r from-emerald-950/40 via-transparent to-transparent" />

        {/* Floating orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

        {/* Content */}
        <motion.div style={{ opacity }} className="relative z-10 max-w-5xl mx-auto text-center px-4">
          {/* Badge */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-2 rounded-full text-sm font-semibold mb-8 backdrop-blur-sm">
            <Zap size={14} fill="currentColor" />
            Plateforme #1 d'agriculture biologique à Madagascar
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="text-5xl md:text-7xl lg:text-8xl font-black text-white mb-6 leading-none tracking-tight">
            L'Agriculture
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400">
              Biologique
            </span>
            Réinventée
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed font-light">
            Connectez producteurs, fournisseurs et agriculteurs. Achetez et vendez des engrais naturels en toute confiance.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/marketplace"
              className="group inline-flex items-center gap-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white px-8 py-4 rounded-2xl text-lg font-bold transition-all shadow-2xl shadow-emerald-500/25 hover:scale-105">
              Explorer le Marché
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link to="/register"
              className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm hover:bg-white/20 border border-white/20 text-white px-8 py-4 rounded-2xl text-lg font-bold transition-all">
              <Globe size={20} />
              Rejoindre la plateforme
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-20 max-w-3xl mx-auto">
            {stats.map((stat, i) => (
              <div key={i} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
                <p className="text-3xl font-black text-white">{stat.value}</p>
                <p className="text-gray-400 text-sm mt-1">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-gray-500">
          <div className="w-6 h-10 border-2 border-gray-600 rounded-full flex items-start justify-center p-1">
            <motion.div animate={{ y: [0, 12, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}
              className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
          </div>
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section className="py-32 bg-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-gray-50 to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center mb-20">
            <span className="text-emerald-600 font-bold text-sm uppercase tracking-widest">Pourquoi nous choisir</span>
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mt-3 mb-4">
              Tout ce dont vous avez besoin
            </h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">
              Une plateforme complète pour dynamiser l'écosystème agricole malgache.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature, idx) => (
              <motion.div key={idx}
                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: idx * 0.1 }}
                className="group relative bg-white border border-gray-100 hover:border-transparent rounded-3xl p-8 hover:shadow-2xl transition-all duration-300 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white via-white to-gray-50 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className={`w-14 h-14 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg group-hover:scale-110 transition-transform`}>
                    <feature.icon size={26} />
                  </div>
                  <h3 className="text-xl font-black text-gray-900 mb-3">{feature.title}</h3>
                  <p className="text-gray-500 leading-relaxed">{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== TESTIMONIALS ===== */}
      <section className="py-32 bg-gray-950 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-950/50 via-gray-950 to-gray-950" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center mb-16">
            <span className="text-emerald-400 font-bold text-sm uppercase tracking-widest">Témoignages</span>
            <h2 className="text-4xl md:text-5xl font-black text-white mt-3">
              Ils nous font confiance
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.15 }}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8 hover:bg-white/10 transition-all">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => <Star key={j} size={14} className="text-amber-400" fill="currentColor" />)}
                </div>
                <p className="text-gray-300 leading-relaxed mb-6 italic">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center text-white font-black">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">{t.name}</p>
                    <p className="text-gray-500 text-xs">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="py-32 bg-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-teal-50" />
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}>
            <span className="text-emerald-600 font-bold text-sm uppercase tracking-widest">Rejoignez-nous</span>
            <h2 className="text-4xl md:text-6xl font-black text-gray-900 mt-4 mb-6 leading-tight">
              Prêt à cultiver<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-500">la différence ?</span>
            </h2>
            <p className="text-gray-500 text-xl mb-12 max-w-2xl mx-auto">
              Rejoignez des milliers d'agriculteurs qui transforment leur pratique agricole avec FERTILI'ZEO.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register"
                className="group inline-flex items-center gap-3 bg-gray-900 hover:bg-gray-800 text-white px-10 py-5 rounded-2xl text-xl font-bold transition-all shadow-2xl hover:scale-105">
                Commencer gratuitement
                <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link to="/marketplace"
                className="inline-flex items-center gap-3 border-2 border-gray-200 hover:border-emerald-300 text-gray-700 px-10 py-5 rounded-2xl text-xl font-bold transition-all hover:bg-emerald-50">
                Voir les produits
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-950 text-gray-500 py-12 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-lg flex items-center justify-center">
              <Leaf size={14} className="text-white" fill="currentColor" />
            </div>
            <span className="text-white font-black">FERTILI'ZEO</span>
          </div>
          <p className="text-sm">© 2026 FERTILI'ZEO — Agriculture biologique à Madagascar</p>
          <div className="flex gap-6 text-sm">
            <Link to="/marketplace" className="hover:text-white transition-colors">Marketplace</Link>
            <Link to="/forum" className="hover:text-white transition-colors">Forum</Link>
            <Link to="/register" className="hover:text-white transition-colors">S'inscrire</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
