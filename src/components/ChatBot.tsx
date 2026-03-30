import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, Leaf, ChevronDown, BookOpen, Lightbulb } from 'lucide-react';
import api from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';

// ─── TYPES ───────────────────────────────────────────────────

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{ title: string; category: string; source: string }>;
  structured?: {
    fertilizer_name?: string;
    steps?: string[];
    tips?: string[];
    npk_ratio?: string;
  } | null;
  timestamp: Date;
  isLoading?: boolean;
}

// ─── SUGGESTIONS DE DÉMARRAGE ────────────────────────────────

const SUGGESTIONS = [
  'Comment faire du compost rapidement ?',
  'Quel engrais pour le riz à Madagascar ?',
  'Comment préparer du bokashi maison ?',
  'Mon maïs jaunit, c\'est quoi la carence ?',
  'Différence fumier zébu vs fumier volaille ?',
];

// ─── COMPOSANT PRINCIPAL ─────────────────────────────────────

const ChatBot: React.FC = () => {
  const { token, user } = useAuth();
  const [isOpen, setIsOpen]       = useState(false);
  const [isMin, setIsMin]         = useState(false);
  const [messages, setMessages]   = useState<Message[]>([]);
  const [input, setInput]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [unread, setUnread]       = useState(0);
  const bottomRef                 = useRef<HTMLDivElement>(null);
  const inputRef                  = useRef<HTMLInputElement>(null);

  // Scroll auto vers le bas
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input quand on ouvre
  useEffect(() => {
    if (isOpen && !isMin) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setUnread(0);
    }
  }, [isOpen, isMin]);

  // Message de bienvenue au premier ouverture
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: `Bonjour ${user?.name?.split(' ')[0] || ''} ! Je suis **FEZA**, votre assistant spécialiste en fertilisation biologique.\n\nPosez-moi vos questions sur les engrais organiques, le compostage, les cultures tropicales ou les carences de vos plantes.`,
        timestamp: new Date(),
      }]);
    }
  }, [isOpen]);

  const sendMessage = async (text?: string) => {
    const question = (text || input).trim();
    if (!question || loading) return;

    setInput('');

    // Ajouter le message utilisateur
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: question,
      timestamp: new Date(),
    };

    // Ajouter placeholder de chargement
    const loadingMsg: Message = {
      id: 'loading',
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
    };

    setMessages(prev => [...prev, userMsg, loadingMsg]);
    setLoading(true);

    try {
      // Construire l'historique pour le contexte (3 derniers échanges)
      const history = messages
        .filter(m => !m.isLoading && m.id !== 'welcome')
        .slice(-6)
        .map(m => ({ role: m.role, content: m.content }));

      const response = await api.post('/ai/chat', { question, history });
      const data = response.data;

      const assistantMsg: Message = {
        id: Date.now().toString() + '_ai',
        role: 'assistant',
        content: data.answer,
        sources: data.sources,
        structured: data.structured,
        timestamp: new Date(),
      };

      setMessages(prev => prev.filter(m => m.id !== 'loading').concat(assistantMsg));

      // Incrémenter unread si chat est minimisé
      if (isMin) setUnread(n => n + 1);

    } catch (err: any) {
      const errMsg: Message = {
        id: Date.now().toString() + '_err',
        role: 'assistant',
        content: 'Désolé, je rencontre une difficulté technique. Vérifiez votre connexion et réessayez.',
        timestamp: new Date(),
      };
      setMessages(prev => prev.filter(m => m.id !== 'loading').concat(errMsg));
    } finally {
      setLoading(false);
    }
  };

  if (!token) return null; // Visible uniquement si connecté

  // ── BOUTON FLOTTANT ─────────────────────────────────────────
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-2xl flex items-center justify-center transition-all duration-200 hover:scale-110 group"
        title="Assistant FEZA"
      >
        <MessageCircle size={24} />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs font-bold flex items-center justify-center">
            {unread}
          </span>
        )}
      </button>
    );
  }

  // ── FENÊTRE DE CHAT ─────────────────────────────────────────
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-200 transition-all duration-300 ${
      isMin ? 'h-14 w-80' : 'w-96 h-[600px] max-h-[85vh]'
    }`}>

      {/* En-tête */}
      <div className="flex items-center gap-3 p-3 bg-emerald-600 rounded-t-2xl text-white flex-shrink-0">
        <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
          <Leaf size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm">FEZA — Assistant IA</p>
          <p className="text-xs text-emerald-100">Spécialiste fertilisation bio</p>
        </div>
        <button
          onClick={() => { setIsMin(!isMin); setUnread(0); }}
          className="w-8 h-8 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors"
        >
          <ChevronDown size={16} className={`transition-transform ${isMin ? 'rotate-180' : ''}`} />
        </button>
        <button
          onClick={() => setIsOpen(false)}
          className="w-8 h-8 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {!isMin && (
        <>
          {/* Zone de messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">

            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] ${msg.role === 'user' ? 'order-1' : 'order-2'}`}>

                  {/* Bulle de message */}
                  <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-emerald-600 text-white rounded-br-sm'
                      : 'bg-gray-50 text-gray-800 border border-gray-100 rounded-bl-sm'
                  }`}>
                    {msg.isLoading ? (
                      <div className="flex items-center gap-2 text-gray-400">
                        <Loader2 size={14} className="animate-spin" />
                        <span className="text-xs">FEZA réfléchit...</span>
                      </div>
                    ) : (
                      <FormattedMessage content={msg.content} />
                    )}
                  </div>

                  {/* NPK badge si disponible */}
                  {msg.structured?.npk_ratio && msg.structured.npk_ratio !== 'inconnu' && (
                    <div className="mt-1.5 inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-1">
                      <span className="text-xs font-mono font-bold text-emerald-700">
                        NPK {msg.structured.npk_ratio}
                      </span>
                    </div>
                  )}

                  {/* Sources */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {msg.sources.map((s, i) => (
                        <span key={i} className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-600 border border-blue-100 rounded-md px-2 py-0.5">
                          <BookOpen size={10} />
                          {s.category}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Étapes structurées (si la réponse en contient) */}
                  {msg.structured?.steps && msg.structured.steps.length > 0 && msg.role === 'assistant' && !msg.isLoading && (
                    <StepsCard steps={msg.structured.steps} />
                  )}

                </div>
              </div>
            ))}

            {/* Suggestions (seulement au début) */}
            {messages.length <= 1 && !loading && (
              <div className="space-y-2">
                <p className="text-xs text-gray-400 font-medium flex items-center gap-1">
                  <Lightbulb size={11} /> Questions fréquentes
                </p>
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(s)}
                    className="w-full text-left text-xs text-gray-600 bg-gray-50 hover:bg-emerald-50 hover:text-emerald-700 border border-gray-200 hover:border-emerald-200 rounded-xl px-3 py-2 transition-all duration-150"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Zone de saisie */}
          <div className="p-3 border-t border-gray-100 flex-shrink-0">
            <div className="flex gap-2 items-end">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder="Posez votre question..."
                disabled={loading}
                className="flex-1 text-sm border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 disabled:opacity-50 bg-gray-50"
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                className="w-10 h-10 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center transition-all flex-shrink-0"
              >
                {loading
                  ? <Loader2 size={16} className="animate-spin" />
                  : <Send size={16} />
                }
              </button>
            </div>
            <p className="text-center text-xs text-gray-300 mt-1.5">
              Fertili'zeo · IA spécialisée agriculture bio
            </p>
          </div>
        </>
      )}
    </div>
  );
};

// ─── SOUS-COMPOSANT : Message formaté (markdown basique) ──────

const FormattedMessage: React.FC<{ content: string }> = ({ content }) => {
  // Convertir **bold** et sauts de ligne
  const lines = content.split('\n');
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (!line.trim()) return <br key={i} />;
        // Gras : **texte**
        const parts = line.split(/\*\*(.*?)\*\*/g);
        return (
          <p key={i}>
            {parts.map((part, j) =>
              j % 2 === 1
                ? <strong key={j} className="font-semibold">{part}</strong>
                : part
            )}
          </p>
        );
      })}
    </div>
  );
};

// ─── SOUS-COMPOSANT : Étapes structurées ─────────────────────

const StepsCard: React.FC<{ steps: string[] }> = ({ steps }) => {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? steps : steps.slice(0, 3);

  return (
    <div className="mt-2 bg-white border border-emerald-200 rounded-xl overflow-hidden">
      <div className="bg-emerald-50 px-3 py-2 border-b border-emerald-100">
        <p className="text-xs font-bold text-emerald-700">Étapes ({steps.length})</p>
      </div>
      <div className="p-2 space-y-1">
        {shown.map((step, i) => (
          <div key={i} className="flex gap-2 items-start">
            <span className="w-5 h-5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
              {i + 1}
            </span>
            <p className="text-xs text-gray-700 leading-relaxed">{step}</p>
          </div>
        ))}
      </div>
      {steps.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-xs text-emerald-600 hover:bg-emerald-50 py-2 border-t border-emerald-100 font-medium transition-colors"
        >
          {expanded ? 'Voir moins' : `+ ${steps.length - 3} étapes de plus`}
        </button>
      )}
    </div>
  );
};

export default ChatBot;
