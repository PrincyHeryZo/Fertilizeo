import React, { useState, useRef, useEffect } from 'react';
import { Leaf, Send, Loader2, Globe, BookOpen, FlaskConical,
  ListOrdered, ChevronDown, ChevronUp, Lightbulb,
  Download, Trash2, MessageSquare } from 'lucide-react';
import api from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';

// ─── Types ───────────────────────────────────────────────────

type Lang = 'fr' | 'mg' | 'en';

interface Structured {
  fertilizer_name?: string;
  steps?: string[];
  tips?: string[];
  npk_ratio?: string;
  _npk_relevant?: boolean;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{ title: string; category: string; source: string }>;
  structured?: Structured | null;
  timestamp: Date;
  isLoading?: boolean;
}

// ─── Constantes ──────────────────────────────────────────────

const SUGGESTIONS: Record<Lang, string[]> = {
  fr: [
    'Comment faire du compost rapidement ?',
    'Quel engrais bio pour le riz à Madagascar ?',
    'Comment préparer du bokashi maison ?',
    'Mon maïs jaunit — quelle carence ?',
    'Comment nourrir mes tilapias naturellement ?',
    'Comment fabriquer une ruche KTB ?',
    'Doses de fumier de zébu pour le maraîchage ?',
  ],
  mg: [
    'Ahoana ny fomba hanao komposita haingana ?',
    "Inona ny zezika tsara ho an'ny vary ?",
    'Ahoana ny fomba fikarakarana ny trondro ?',
    'Maninona no mivelokelona ny ravina varies ?',
    "Inona ny zezika tsara ho an'ny voatabia ?",
    "Ahoana ny fomba fiompiana tantely ?",
  ],
  en: [
    'How to make compost quickly?',
    'Best organic fertilizer for rice?',
    'How to prepare bokashi at home?',
    'My maize leaves are yellowing — what deficiency?',
    'How to feed tilapia naturally?',
  ],
};

const LANG_FLAGS: Record<Lang, string> = { fr: '🇫🇷', mg: '🇲🇬', en: '🇬🇧' };
const LANG_LABELS: Record<Lang, string> = { fr: 'FR', mg: 'MG', en: 'EN' };

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  compost:        { bg: 'bg-green-50',   text: 'text-green-700',   border: 'border-green-200' },
  fumier:         { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200' },
  pisciculture:   { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200' },
  apiculture:     { bg: 'bg-yellow-50',  text: 'text-yellow-700',  border: 'border-yellow-200' },
  biofertilisant: { bg: 'bg-teal-50',    text: 'text-teal-700',    border: 'border-teal-200' },
  engrais_vert:   { bg: 'bg-lime-50',    text: 'text-lime-700',    border: 'border-lime-200' },
  bokashi:        { bg: 'bg-orange-50',  text: 'text-orange-700',  border: 'border-orange-200' },
  culture:        { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  nutriment:      { bg: 'bg-purple-50',  text: 'text-purple-700',  border: 'border-purple-200' },
};

// ─── Composant principal ──────────────────────────────────────

const ConseilsIA: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [lang, setLang]         = useState<Lang>('fr');
  const [autoLang, setAutoLang] = useState(true);
  const bottomRef               = useRef<HTMLDivElement>(null);
  const inputRef                = useRef<HTMLTextAreaElement>(null);
  const hasMessages             = messages.length > 0;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
          .filter(m => !m.isLoading)
          .slice(-8)
          .map(m => ({ role: m.role, content: m.content }));

      const payload: any = { question, history };
      if (!autoLang) payload.language = lang;

      const { data } = await api.post('/ai/chat', payload);

      if (autoLang && data.detected_language) setLang(data.detected_language as Lang);

      setMessages(prev => prev.filter(m => m.id !== 'loading').concat({
        id: Date.now().toString() + '_ai',
        role: 'assistant',
        content: data.answer,
        sources: data.sources,
        structured: data.structured,
        timestamp: new Date(),
      }));
    } catch {
      setMessages(prev => prev.filter(m => m.id !== 'loading').concat({
        id: Date.now().toString() + '_err',
        role: 'assistant',
        content: lang === 'mg'
            ? 'Miala tsiny, misy olana teknika. Andao azafady ny fanontaniana indray.'
            : lang === 'en'
                ? 'Sorry, there was a technical issue. Please try again.'
                : 'Désolé, une erreur technique est survenue. Réessayez.',
        timestamp: new Date(),
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const clearHistory = () => setMessages([]);

  const exportHistory = () => {
    if (messages.length === 0) return;

    const lines = messages.map(m => {
      const who  = m.role === 'user' ? 'Vous' : 'FEZA';
      const time = new Date(m.timestamp).toLocaleTimeString('fr-FR');
      let text   = `[${who}] ${time}\n${m.content}`;

      // Ajouter les étapes structurées si présentes
      if (m.role === 'assistant' && m.structured?.steps && m.structured.steps.length > 0) {
        const stepsLabel = lang === 'mg' ? 'Dingana' : lang === 'en' ? 'Steps' : 'Étapes';
        text += `\n\n${stepsLabel} :`;
        m.structured.steps.forEach((step, i) => {
          text += `\n  ${i + 1}. ${step}`;
        });
      }

      // Ajouter le NPK si présent et pertinent
      if (m.role === 'assistant' && m.structured?.npk_ratio && m.structured._npk_relevant) {
        text += `\n\nNPK : ${m.structured.npk_ratio}`;
      }

      // Ajouter les sources
      if (m.role === 'assistant' && m.sources && m.sources.length > 0) {
        const srcs = m.sources.map(s => s.category).join(', ');
        text += `\n[Sources : ${srcs}]`;
      }

      return text;
    }).join('\n\n' + '─'.repeat(50) + '\n\n');

    const header = [
      "FEZA — Conseils Agriculture Biologique",
      `Fertili'zeo · Export du ${new Date().toLocaleDateString('fr-FR')}`,
      '='.repeat(50),
      '',
    ].join('\n');

    const blob = new Blob([header + lines], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `feza-conseils-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
      <div className="flex flex-col h-[calc(100vh-64px)] bg-gray-50">

        {/* ── Header ── */}
        <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-4 flex-shrink-0">
          <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center">
            <Leaf size={18} className="text-white" />
          </div>
          <div className="flex-1">
            <h1 className="font-bold text-gray-900 text-sm">FEZA — Assistant IA Agriculture</h1>
            <p className="text-xs text-gray-400">Fertili'zeo · {messages.length > 0 ? `${messages.filter(m => m.role === 'assistant' && !m.isLoading).length} réponses` : 'Prêt à répondre'}</p>
          </div>

          {/* Sélecteur langue */}
          <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">
            <button
                onClick={() => setAutoLang(true)}
                className={`w-7 h-6 flex items-center justify-center rounded-md text-xs transition-all ${autoLang ? 'bg-white shadow-sm text-emerald-700' : 'text-gray-500 hover:text-gray-700'}`}
                title="Détection automatique"
            >
              <Globe size={12} />
            </button>
            {(['fr', 'mg', 'en'] as Lang[]).map(l => (
                <button key={l} onClick={() => { setLang(l); setAutoLang(false); }}
                        className={`text-xs px-2 h-6 rounded-md font-bold transition-all ${!autoLang && lang === l ? 'bg-white shadow-sm text-emerald-700' : 'text-gray-500 hover:text-gray-700'}`}>
                  {LANG_LABELS[l]}
                </button>
            ))}
          </div>

          {/* Actions */}
          {hasMessages && (
              <div className="flex items-center gap-1">
                <button onClick={exportHistory}
                        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-emerald-600 bg-gray-50 hover:bg-emerald-50 border border-gray-200 hover:border-emerald-200 px-3 py-1.5 rounded-lg transition-all"
                        title="Exporter l'historique">
                  <Download size={13} /> Exporter
                </button>
                <button onClick={clearHistory}
                        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600 bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-200 px-3 py-1.5 rounded-lg transition-all"
                        title="Effacer l'historique">
                  <Trash2 size={13} /> Effacer
                </button>
              </div>
          )}
        </div>

        {/* ── Zone messages ── */}
        <div className="flex-1 overflow-y-auto">
          {!hasMessages ? (
              /* Écran d'accueil */
              <div className="max-w-2xl mx-auto px-6 py-12">
                <div className="text-center mb-10">
                  <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Leaf size={32} className="text-emerald-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Bonjour{user?.name ? `, ${user.name.split(' ')[0]}` : ''} !
                  </h2>
                  <p className="text-gray-500 text-sm leading-relaxed max-w-md mx-auto">
                    Je suis FEZA, votre assistant spécialiste en agriculture biologique, pisciculture et apiculture à Madagascar.
                  </p>
                </div>

                <div className="mb-4">
                  <p className="text-xs text-gray-400 font-medium flex items-center gap-1.5 mb-3">
                    <Lightbulb size={12} /> Questions fréquentes
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {SUGGESTIONS[lang].map((s, i) => (
                        <button key={i} onClick={() => sendMessage(s)}
                                className="text-left text-sm text-gray-600 bg-white hover:bg-emerald-50 hover:text-emerald-700 border border-gray-200 hover:border-emerald-200 rounded-xl px-4 py-3 transition-all duration-150 flex items-start gap-2">
                          <MessageSquare size={14} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                          {s}
                        </button>
                    ))}
                  </div>
                </div>

                {autoLang && (
                    <p className="text-center text-xs text-gray-400 mt-6">
                      {LANG_FLAGS[lang]} Langue détectée automatiquement — ou choisissez manuellement en haut
                    </p>
                )}
              </div>
          ) : (
              /* Messages */
              <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
                {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] space-y-2 ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>

                        {/* Bulle */}
                        <div className={`rounded-2xl px-5 py-3.5 text-sm leading-relaxed ${
                            msg.role === 'user'
                                ? 'bg-emerald-600 text-white rounded-br-sm'
                                : 'bg-white text-gray-800 border border-gray-100 shadow-sm rounded-bl-sm'
                        }`}>
                          {msg.isLoading ? (
                              <div className="flex items-center gap-2 text-gray-400">
                                <Loader2 size={14} className="animate-spin" />
                                <span>FEZA réfléchit...</span>
                              </div>
                          ) : (
                              <FormattedMessage content={msg.content} />
                          )}
                        </div>

                        {/* Badge NPK */}
                        {!msg.isLoading && msg.role === 'assistant' && msg.structured?.npk_ratio && msg.structured._npk_relevant && (
                            <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">
                              <FlaskConical size={12} className="text-emerald-600" />
                              <span className="text-xs font-mono font-bold text-emerald-700">NPK {msg.structured.npk_ratio}</span>
                            </div>
                        )}

                        {/* Sources */}
                        {!msg.isLoading && msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {msg.sources.map((s, i) => {
                                const c = CATEGORY_COLORS[s.category] || { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' };
                                return (
                                    <span key={i} className={`inline-flex items-center gap-1 text-xs border rounded-md px-2 py-0.5 ${c.bg} ${c.text} ${c.border}`}>
                            <BookOpen size={9} /> {s.category}
                          </span>
                                );
                              })}
                            </div>
                        )}

                        {/* Steps */}
                        {!msg.isLoading && msg.role === 'assistant' && msg.structured?.steps && msg.structured.steps.length >= 2 && (
                            <StepsCard steps={msg.structured.steps} lang={lang} />
                        )}

                        {/* Timestamp */}
                        <span className="text-xs text-gray-400 px-1">
                    {new Date(msg.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                      </div>
                    </div>
                ))}
                <div ref={bottomRef} />
              </div>
          )}
        </div>

        {/* ── Zone de saisie ── */}
        <div className="bg-white border-t border-gray-100 px-6 py-4 flex-shrink-0">
          <div className="max-w-3xl mx-auto">
            {autoLang && hasMessages && (
                <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                  <Globe size={11} /> {LANG_FLAGS[lang]} {lang === 'mg' ? 'Malagasy' : lang === 'fr' ? 'Français' : 'English'} détecté
                </p>
            )}
            <div className="flex gap-3 items-end">
            <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={lang === 'mg' ? 'Manontania eto...' : lang === 'en' ? 'Ask your question...' : 'Posez votre question...'}
                disabled={loading}
                rows={1}
                className="flex-1 text-sm border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 disabled:opacity-50 bg-gray-50 resize-none"
                style={{ minHeight: '44px', maxHeight: '120px' }}
                onInput={e => {
                  const t = e.target as HTMLTextAreaElement;
                  t.style.height = 'auto';
                  t.style.height = Math.min(t.scrollHeight, 120) + 'px';
                }}
            />
              <button onClick={() => sendMessage()} disabled={!input.trim() || loading}
                      className="w-11 h-11 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl flex items-center justify-center transition-all flex-shrink-0">
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </div>
            <p className="text-center text-xs text-gray-300 mt-2">Fertili'zeo · IA agriculture bio — Entrée pour envoyer, Maj+Entrée pour nouvelle ligne</p>
          </div>
        </div>
      </div>
  );
};

// ─── FormattedMessage ─────────────────────────────────────────

const FormattedMessage: React.FC<{ content: string }> = ({ content }) => {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  const renderInline = (text: string, key: number) => {
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
    return (
        <span key={key}>
        {parts.map((p, j) => {
          if (p.startsWith('**') && p.endsWith('**')) return <strong key={j} className="font-semibold">{p.slice(2, -2)}</strong>;
          if (p.startsWith('*') && p.endsWith('*')) return <em key={j} className="italic">{p.slice(1, -1)}</em>;
          return p;
        })}
      </span>
    );
  };

  while (i < lines.length) {
    const line = lines[i];
    const t = line.trim();
    if (!t) { elements.push(<div key={i} className="h-1.5" />); i++; continue; }
    if (/^-{3,}$/.test(t)) { elements.push(<hr key={i} className="border-gray-200 my-1" />); i++; continue; }
    if (/^#{2,3}\s/.test(t)) {
      elements.push(<p key={i} className="font-bold text-emerald-700 text-xs uppercase tracking-wide mt-2 mb-0.5">{renderInline(t.replace(/^#{2,3}\s/, ''), 0)}</p>);
      i++; continue;
    }
    if (/^\d+\.\s/.test(t)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) { items.push(lines[i].trim().replace(/^\d+\.\s/, '')); i++; }
      elements.push(<ol key={`ol-${i}`} className="space-y-1 my-1">{items.map((item, idx) => (
          <li key={idx} className="flex gap-2 items-start">
            <span className="flex-shrink-0 w-5 h-5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold flex items-center justify-center mt-0.5">{idx + 1}</span>
            <span className="text-sm leading-relaxed">{renderInline(item, idx)}</span>
          </li>
      ))}</ol>);
      continue;
    }
    if (/^[*\-]\s/.test(t)) {
      const items: string[] = [];
      while (i < lines.length && /^[*\-]\s/.test(lines[i].trim())) { items.push(lines[i].trim().replace(/^[*\-]\s/, '')); i++; }
      elements.push(<ul key={`ul-${i}`} className="space-y-0.5 my-1">{items.map((item, idx) => (
          <li key={idx} className="flex gap-2 items-start">
            <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2" />
            <span className="text-sm leading-relaxed">{renderInline(item, idx)}</span>
          </li>
      ))}</ul>);
      continue;
    }
    elements.push(<p key={i} className="text-sm leading-relaxed">{renderInline(t, 0)}</p>);
    i++;
  }
  return <div className="space-y-0.5">{elements}</div>;
};

// ─── StepsCard ────────────────────────────────────────────────

const StepsCard: React.FC<{ steps: string[]; lang: Lang }> = ({ steps, lang }) => {
  const [expanded, setExpanded] = useState(false);
  const PREVIEW = 3;
  const shown = expanded ? steps : steps.slice(0, PREVIEW);
  const labels = {
    title: lang === 'mg' ? 'Dingana' : lang === 'en' ? 'Steps' : 'Étapes',
    more:  lang === 'mg' ? `+ ${steps.length - PREVIEW} hafa` : lang === 'en' ? `+ ${steps.length - PREVIEW} more` : `+ ${steps.length - PREVIEW} de plus`,
    less:  lang === 'mg' ? 'Halaviro' : lang === 'en' ? 'Show less' : 'Réduire',
  };
  return (
      <div className="bg-white border border-emerald-200 rounded-xl overflow-hidden w-full">
        <div className="bg-emerald-50 px-3 py-2 border-b border-emerald-100 flex items-center gap-1.5">
          <ListOrdered size={13} className="text-emerald-600" />
          <p className="text-xs font-bold text-emerald-700">{labels.title} ({steps.length})</p>
        </div>
        <div className="p-3 space-y-2">
          {shown.map((step, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span className="flex-shrink-0 w-5 h-5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                <p className="text-xs text-gray-700 leading-relaxed">{step}</p>
              </div>
          ))}
        </div>
        {steps.length > PREVIEW && (
            <button onClick={() => setExpanded(!expanded)}
                    className="w-full flex items-center justify-center gap-1 text-xs text-emerald-600 hover:bg-emerald-50 py-2 border-t border-emerald-100 font-medium transition-colors">
              {expanded ? <><ChevronUp size={12} /> {labels.less}</> : <><ChevronDown size={12} /> {labels.more}</>}
            </button>
        )}
      </div>
  );
};

export default ConseilsIA;