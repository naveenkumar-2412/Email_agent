'use client';

import { useState } from 'react';
import { Send, Sparkles, User, FileText, CheckCircle2, Wand2, X, Paperclip } from 'lucide-react';

interface ComposeProps {
  draft: {
    to: string;
    subject: string;
    body: string;
  };
  setDraft: React.Dispatch<React.SetStateAction<{ to: string; subject: string; body: string }>>;
}

export default function Compose({ draft, setDraft }: ComposeProps) {
  const [isSending, setIsSending] = useState(false);
  const [sentNotice, setSentNotice] = useState(false);

  const applyAiTone = (tone: string) => {
    let currentBody = draft.body || '';
    if (!currentBody.trim()) {
      currentBody = "Dear Team,\n\nI hope this email finds you well. I wanted to reach out regarding our upcoming project sync.";
    }

    if (tone === 'formal') {
      setDraft(prev => ({
        ...prev,
        body: `Dear Recipient,\n\nI am writing to formally follow up on our previous correspondence. Please find the details outlining our next steps below:\n\n${currentBody.replace(/Dear [^\n]+,\n\n/, '')}\n\nSincerely,\n[Your Name]`
      }));
    } else if (tone === 'shorten') {
      const summary = currentBody.split('. ')[0] || currentBody;
      setDraft(prev => ({
        ...prev,
        body: `${summary}.\n\nBest regards.`
      }));
    } else if (tone === 'cta') {
      setDraft(prev => ({
        ...prev,
        body: `${currentBody}\n\nCould you please confirm your availability by end of day today?`
      }));
    }
  };

  const handleSend = () => {
    if (!draft.to) {
      alert("Please specify a recipient (To).");
      return;
    }
    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      setSentNotice(true);
      setTimeout(() => setSentNotice(false), 4000);
    }, 800);
  };

  return (
    <div className="glass-panel rounded-2xl border border-white/10 shadow-2xl p-6 space-y-5 max-w-4xl mx-auto backdrop-blur-xl relative overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
              <span>New Message</span>
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-medium flex items-center space-x-1">
                <Sparkles className="w-3 h-3 text-indigo-400" />
                <span>AI Pre-Fill Active</span>
              </span>
            </h2>
            <p className="text-xs text-slate-400">Draft your email or let the AI co-pilot compose it for you</p>
          </div>
        </div>

        {sentNotice && (
          <div className="flex items-center space-x-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20 animate-fade-in">
            <CheckCircle2 className="w-4 h-4" />
            <span>Message sent successfully!</span>
          </div>
        )}
      </div>

      {/* Inputs Form */}
      <div className="space-y-3.5">
        {/* Recipient To */}
        <div className="relative flex items-center">
          <User className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="email"
            placeholder="Recipient (e.g. alex@example.com)"
            value={draft.to || ''}
            onChange={(e) => setDraft({ ...draft, to: e.target.value })}
            className="w-full bg-slate-900/60 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all font-mono"
          />
        </div>

        {/* Subject */}
        <div className="relative flex items-center">
          <FileText className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Subject line..."
            value={draft.subject || ''}
            onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
            className="w-full bg-slate-900/60 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 font-semibold placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all"
          />
        </div>

        {/* AI Quick Polish Toolbar */}
        <div className="bg-slate-900/40 p-2.5 rounded-xl border border-white/5 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center space-x-1.5 text-indigo-300 font-medium">
            <Wand2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>AI Quick Refine:</span>
          </div>

          <div className="flex items-center space-x-1.5 flex-wrap gap-1">
            <button
              onClick={() => applyAiTone('formal')}
              className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-indigo-600/30 border border-white/5 transition-all text-xs"
            >
              Make Formal
            </button>
            <button
              onClick={() => applyAiTone('shorten')}
              className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-indigo-600/30 border border-white/5 transition-all text-xs"
            >
              Concise / Shorten
            </button>
            <button
              onClick={() => applyAiTone('cta')}
              className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-indigo-600/30 border border-white/5 transition-all text-xs"
            >
              Add Call to Action
            </button>
          </div>
        </div>

        {/* Body Textarea */}
        <div className="relative">
          <textarea
            placeholder="Write your email body here or instruct the AI assistant to compose..."
            value={draft.body || ''}
            rows={10}
            onChange={(e) => setDraft({ ...draft, body: e.target.value })}
            className="w-full bg-slate-900/60 border border-white/10 rounded-xl p-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all leading-relaxed resize-y font-sans"
          />
        </div>
      </div>

      {/* Bottom Action Footer */}
      <div className="flex items-center justify-between border-t border-white/10 pt-4">
        <div className="flex items-center space-x-2">
          <button
            onClick={handleSend}
            disabled={isSending}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-500/25 flex items-center space-x-2 transition-all duration-200 disabled:opacity-50 active:scale-95 text-sm"
          >
            <Send className={`w-4 h-4 ${isSending ? 'animate-bounce' : ''}`} />
            <span>{isSending ? 'Sending...' : 'Send Email'}</span>
          </button>

          <button
            onClick={() => setDraft({ to: '', subject: '', body: '' })}
            className="px-4 py-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-white/5 text-sm transition-all"
          >
            Clear Draft
          </button>
        </div>

        <div className="flex items-center space-x-2 text-xs text-slate-500">
          <Paperclip className="w-3.5 h-3.5" />
          <span>Auto-Saved locally</span>
        </div>
      </div>
    </div>
  );
}