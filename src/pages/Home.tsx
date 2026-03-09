import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Leaf, ShieldCheck, TrendingUp, Users } from 'lucide-react';

const Home: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[600px] flex items-center justify-center text-white overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?auto=format&fit=crop&q=80&w=2000" 
            alt="Agriculture Madagascar" 
            className="w-full h-full object-cover brightness-50"
            referrerPolicy="no-referrer"
          />
        </div>
        
        <div className="relative z-10 max-w-4xl mx-auto text-center px-4">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-bold mb-6 tracking-tight"
          >
            L'Avenir de l'Agriculture <span className="text-emerald-400">Biologique</span> à Madagascar
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl md:text-2xl mb-10 text-gray-200"
          >
            Connectez-vous avec les meilleurs producteurs d'engrais naturels et transformez vos terres durablement.
          </motion.p>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link to="/marketplace" className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-4 rounded-full text-lg font-semibold transition-all shadow-lg">
              Explorer le Marché
            </Link>
            <Link to="/register" className="bg-white/10 backdrop-blur-md border border-white/30 hover:bg-white/20 text-white px-8 py-4 rounded-full text-lg font-semibold transition-all">
              Devenir Partenaire
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Pourquoi Choisir FERTILI’ZEO ?</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">Une plateforme complète pour dynamiser l'écosystème agricole malgache.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Leaf, title: '100% Biologique', desc: 'Des produits naturels pour une terre saine et productive.' },
              { icon: ShieldCheck, title: 'Qualité Garantie', desc: 'Tous nos produits sont vérifiés et approuvés par nos experts.' },
              { icon: Users, title: 'Communauté Active', desc: 'Un forum pour partager conseils et expériences agricoles.' },
              { icon: TrendingUp, title: 'Croissance Durable', desc: 'Optimisez vos rendements tout en préservant l’environnement.' }
            ].map((feature, idx) => (
              <div key={idx} className="p-8 rounded-3xl bg-emerald-50 border border-emerald-100 hover:shadow-xl transition-all group">
                <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform">
                  <feature.icon size={28} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-emerald-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-8">Prêt à cultiver la différence ?</h2>
          <p className="text-xl text-emerald-200 mb-12 max-w-2xl mx-auto">Rejoignez des milliers d'agriculteurs et producteurs qui font confiance à FERTILI’ZEO.</p>
          <Link to="/register" className="bg-emerald-500 hover:bg-emerald-400 text-white px-10 py-5 rounded-full text-xl font-bold transition-all inline-block shadow-2xl">
            Commencer Maintenant
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;
