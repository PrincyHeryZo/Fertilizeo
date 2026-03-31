import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, Leaf, ChevronDown, BookOpen, Lightbulb, Globe } from 'lucide-react';
import api from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';

// ─── TYPES ───────────────────────────────────────────────────

type Lang = 'fr' | 'mg' | 'en';

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
  detected_language?: string;
  timestamp: Date;
  isLoading?: boolean;
}

// ─── SUGGESTIONS PAR LANGUE ──────────────────────────────────

const SUGGESTIONS: Record<Lang, string[]> = {
  fr: [
    'Comment faire du compost rapidement ?',
    'Quel engrais pour le riz à Madagascar ?',
    'Comment préparer du bokashi maison ?',
    'Mon maïs jaunit, c\'est quoi la carence ?',
    'Comment nourrir mes tilapias naturellement ?',
  ],
  mg: [
    'Ahoana ny fomba hanao komposita haingana ?',
    'Inona ny zezika tsara ho an\'ny vary ?',
    'Ahoana ny fomba fikarakarana ny trondro ?',
    'Maninona no mivelokelona ny ravina varies ?',
    'Inona ny zezika tsara ho an\'ny tomaty ?',
  ],
  en: [
    'How to make compost quickly?',
    'Best organic fertilizer for rice?',
    'How to prepare bokashi at home?',
    'My maize leaves are yellowing, what deficiency?',
    'How to feed tilapia naturally?',
  ],
};

// ─── LABELS UI PAR LANGUE ────────────────────────────────────

const UI: Record<Lang, {
  placeholder: string;
  welcome: string;
  suggestions: string;
  thinking: string;
  footer: string;
  auto: string;
}> = {
  fr: {
    placeholder: 'Posez votre question...',
    welcome: 'Bonjour ! Je suis **FEZA**, votre assistant spécialiste en agriculture biologique.\n\nPosez-moi vos questions sur les engrais, le compostage, la pisciculture ou l\'apiculture.',
    suggestions: 'Questions fréquentes',
    thinking: 'FEZA réfléchit...',
    footer: 'Fertili\'zeo · IA agriculture bio',
    auto: 'Auto',
  },
  mg: {
    placeholder: 'Manontania eto...',
    welcome: 'Manao ahoana ! Izaho dia **FEZA**, mpanampy IA momba ny fambolena.\n\nAnontanio ahy momba ny zezika, komposita, fiompiana trondro na tantely.',
    suggestions: 'Fanontaniana mahazatra',
    thinking: 'FEZA mieritreritra...',
    footer: 'Fertili\'zeo · IA fambolena',
    auto: 'Auto',
  },
  en: {
    placeholder: 'Ask your question...',
    welcome: 'Hello! I\'m **FEZA**, your specialist AI in organic agriculture.\n\nAsk me about fertilizers, composting, fish farming or beekeeping.',
    suggestions: 'Common questions',
    thinking: 'FEZA is thinking...',
    footer: 'Fertili\'zeo · Organic farming AI',
    auto: 'Auto',
  },
};

const LANG_LABELS: Record<Lang, string> = { fr: 'FR', mg: 'MG', en: 'EN' };
const LANG_FLAGS: Record<Lang, string> = { fr: '🇫🇷', mg: '🇲🇬', en: '🇬🇧' };

// ─── COMPOSANT PRINCIPAL ─────────────────────────────────────

const ChatBot: React.FC = () => {
  const { token, user } = useAuth();
  const [isOpen, setIsOpen]       = useState(false);
  const [isMin, setIsMin]         = useState(false);
  const [messages, setMessages]   = useState<Message[]>([]);
  const [input, setInput]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [unread, setUnread]       = useState(0);
  const [lang, setLang]           = useState<Lang>('fr');
  const [autoLang, setAutoLang]   = useState(true); // détection auto activée
  const bottomRef                 = useRef<HTMLDivElement>(null);
  const inputRef                  = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen && !isMin) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setUnread(0);
    }
  }, [isOpen, isMin]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const firstName = user?.name?.split(' ')[0] || '';
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: UI[lang].welcome.replace('Bonjour !', `Bonjour ${firstName} !`)
            .replace('Manao ahoana !', `Manao ahoana ${firstName} !`)
            .replace('Hello!', `Hello ${firstName}!`),
        timestamp: new Date(),
      }]);
    }
  }, [isOpen]);

  // Quand on change de langue manuellement → remettre le welcome
  const switchLang = (newLang: Lang) => {
    setLang(newLang);
    setAutoLang(false);
    // Mettre à jour le message de bienvenue si c'est le seul message
    if (messages.length <= 1) {
      const firstName = user?.name?.split(' ')[0] || '';
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: UI[newLang].welcome
            .replace('Bonjour !', `Bonjour ${firstName} !`)
            .replace('Manao ahoana !', `Manao ahoana ${firstName} !`)
            .replace('Hello!', `Hello ${firstName}!`),
        timestamp: new Date(),
      }]);
    }
  };

  const sendMessage = async (text?: string) => {
    const question = (text || input).trim();
    if (!question || loading) return;

    setInput('');

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: question,
      timestamp: new Date(),
    };

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
      const history = messages
          .filter(m => !m.isLoading && m.id !== 'welcome')
          .slice(-6)
          .map(m => ({ role: m.role, content: m.content }));

      // Si auto-détection activée, ne pas forcer la langue
      const payload: any = { question, history };
      if (!autoLang) payload.language = lang;

      const response = await api.post('/ai/chat', payload);
      const data = response.data;

      // Si auto-détection, mettre à jour la langue affichée
      if (autoLang && data.detected_language) {
        setLang(data.detected_language as Lang);
      }

      const assistantMsg: Message = {
        id: Date.now().toString() + '_ai',
        role: 'assistant',
        content: data.answer,
        sources: data.sources,
        structured: data.structured,
        detected_language: data.detected_language,
        timestamp: new Date(),
      };

      setMessages(prev => prev.filter(m => m.id !== 'loading').concat(assistantMsg));
      if (isMin) setUnread(n => n + 1);

    } catch (err: any) {
      const errContent = lang === 'mg'
          ? 'Miala tsiny, misy olana teknika. Andao azafady ny fanontaniana indray.'
          : lang === 'en'
              ? 'Sorry, there was a technical issue. Please try again.'
              : 'Désolé, je rencontre une difficulté technique. Réessayez.';

      setMessages(prev => prev.filter(m => m.id !== 'loading').concat({
        id: Date.now().toString() + '_err',
        role: 'assistant',
        content: errContent,
        timestamp: new Date(),
      }));
    } finally {
      setLoading(false);
    }
  };

  if (!token) return null;

  // ── BOUTON FLOTTANT ─────────────────────────────────────────
  if (!isOpen) {
    return (
        <button
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-2xl flex items-center justify-center transition-all duration-200 hover:scale-110"
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

  const ui = UI[lang];

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
            <p className="text-xs text-emerald-100">Fertili'zeo Agriculture</p>
          </div>

          {/* Sélecteur de langue */}
          {!isMin && (
              <div className="flex items-center gap-1 bg-white/10 rounded-lg p-0.5">
                <button
                    onClick={() => { setAutoLang(true); }}
                    className={`text-xs px-1.5 py-1 rounded-md font-semibold transition-all ${
                        autoLang ? 'bg-white text-emerald-700' : 'text-white/80 hover:text-white'
                    }`}
                    title="Détection automatique"
                >
                  <Globe size={11} />
                </button>
                {(['fr', 'mg', 'en'] as Lang[]).map(l => (
                    <button
                        key={l}
                        onClick={() => switchLang(l)}
                        className={`text-xs px-1.5 py-1 rounded-md font-bold transition-all ${
                            !autoLang && lang === l ? 'bg-white text-emerald-700' : 'text-white/80 hover:text-white'
                        }`}
                    >
                      {LANG_LABELS[l]}
                    </button>
                ))}
              </div>
          )}

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
              {/* Indicateur langue détectée */}
              {autoLang && messages.length > 1 && (
                  <div className="px-3 py-1.5 bg-emerald-50 border-b border-emerald-100 flex items-center gap-1.5">
                    <Globe size={11} className="text-emerald-500" />
                    <span className="text-xs text-emerald-600 font-medium">
                {LANG_FLAGS[lang]} Langue détectée : {lang === 'mg' ? 'Malagasy' : lang === 'fr' ? 'Français' : 'English'}
              </span>
                  </div>
              )}

              {/* Zone de messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className="max-w-[85%]">
                        <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                            msg.role === 'user'
                                ? 'bg-emerald-600 text-white rounded-br-sm'
                                : 'bg-gray-50 text-gray-800 border border-gray-100 rounded-bl-sm'
                        }`}>
                          {msg.isLoading ? (
                              <div className="flex items-center gap-2 text-gray-400">
                                <Loader2 size={14} className="animate-spin" />
                                <span className="text-xs">{ui.thinking}</span>
                              </div>
                          ) : (
                              <FormattedMessage content={msg.content} />
                          )}
                        </div>

                        {/* NPK badge */}
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

                        {/* Étapes structurées */}
                        {msg.structured?.steps && msg.structured.steps.length > 0 && msg.role === 'assistant' && !msg.isLoading && (
                            <StepsCard steps={msg.structured.steps} lang={lang} />
                        )}
                      </div>
                    </div>
                ))}

                {/* Suggestions */}
                {messages.length <= 1 && !loading && (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-400 font-medium flex items-center gap-1">
                        <Lightbulb size={11} /> {ui.suggestions}
                      </p>
                      {SUGGESTIONS[lang].map((s, i) => (
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
                      placeholder={ui.placeholder}
                      disabled={loading}
                      className="flex-1 text-sm border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 disabled:opacity-50 bg-gray-50"
                  />
                  <button
                      onClick={() => sendMessage()}
                      disabled={!input.trim() || loading}
                      className="w-10 h-10 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl flex items-center justify-center transition-all flex-shrink-0"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  </button>
                </div>
                <p className="text-center text-xs text-gray-300 mt-1.5">{ui.footer}</p>
              </div>
            </>
        )}
      </div>
  );
};

// ─── Message formaté ─────────────────────────────────────────

const FormattedMessage: React.FC<{ content: string }> = ({ content }) => {
  const lines = content.split('\n');
  return (
      <div className="space-y-1">
        {lines.map((line, i) => {
          if (!line.trim()) return <br key={i} />;
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

// ─── Étapes structurées ──────────────────────────────────────

const StepsCard: React.FC<{ steps: string[]; lang: Lang }> = ({ steps, lang }) => {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? steps : steps.slice(0, 3);
  const label = lang === 'mg' ? 'Dingana' : lang === 'en' ? 'Steps' : 'Étapes';
  const more  = lang === 'mg' ? `+ dingana ${steps.length - 3} hafa` : lang === 'en' ? `+ ${steps.length - 3} more steps` : `+ ${steps.length - 3} étapes de plus`;
  const less  = lang === 'mg' ? 'Halaviro' : lang === 'en' ? 'Show less' : 'Voir moins';

  return (
      <div className="mt-2 bg-white border border-emerald-200 rounded-xl overflow-hidden">
        <div className="bg-emerald-50 px-3 py-2 border-b border-emerald-100">
          <p className="text-xs font-bold text-emerald-700">{label} ({steps.length})</p>
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
              {expanded ? less : more}
            </button>
        )}
      </div>
  );
};

export default ChatBot;