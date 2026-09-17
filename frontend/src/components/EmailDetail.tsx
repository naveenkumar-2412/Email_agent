'use client';

import { ArrowLeft, Sparkles, User, Calendar, CornerUpLeft, Trash2, Printer, Star } from 'lucide-react';

type Email = {
  id: string;
  sender: string;
  subject: string;
  preview?: string;
  body?: string; 
  date: string;
  is_read?: boolean;
};

// Generate avatar gradient
const getAvatarGradient = (name: string) => {
  const gradients = [
    'from-indigo-500 to-purple-600',
    'from-blue-500 to-cyan-500',
    'from-emerald-500 to-teal-600',
    'from-pink-500 to-rose-500',
    'from-amber-500 to-orange-600',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return gradients[Math.abs(hash) % gradients.length];
};

const getInitials = (name: string) => {
  if (!name) return 'N';
  const clean = name.replace(/<.*>/, '').trim();
  const parts = clean.split(' ').filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return clean.slice(0, 2).toUpperCase();
};

export default function EmailDetail({ email, onBack }: { email: Email | null, onBack: () => void }) {
  if (!email) {
    return (
      <div className="glass-panel rounded-2xl p-12 text-center text-slate-400 space-y-4 max-w-xl mx-auto my-auto">
        <p>Email content not found or removed.</p>
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-medium shadow-md shadow-indigo-500/20 hover:bg-indigo-500 transition-all"
        >
          ← Return to Inbox
        </button>
      </div>
    );
  }

  const gradient = getAvatarGradient(email.sender || 'Unknown');
  const initials = getInitials(email.sender || 'User');
  const formattedDate = email.date ? new Date(email.date).toLocaleString() : 'Recent';

  // Format HTML content inside iframe safely with dark theme styling
  const rawBody = email.body || email.preview || 'No email body available.';
  const styledSrcDoc = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: system-ui, -apple-system, sans-serif;
            color: #e2e8f0;
            background-color: transparent;
            line-height: 1.6;
            margin: 0;
            padding: 16px;
            font-size: 14px;
          }
          a { color: #818cf8; }
          table { width: 100% !important; border-collapse: collapse; }
          td, th { padding: 8px; border: 1px solid rgba(255,255,255,0.1); }
          img { max-width: 100%; height: auto; border-radius: 8px; }
        </style>
      </head>
      <body>
        ${rawBody}
      </body>
    </html>
  `;

  return (
    <div className="glass-panel rounded-2xl p-6 border border-white/10 shadow-2xl space-y-5 backdrop-blur-xl h-full flex flex-col">
      {/* Top Bar Navigation & Actions */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-indigo-400 hover:text-indigo-300 font-medium text-xs bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-1.5 rounded-xl border border-indigo-500/20 transition-all group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Inbox</span>
        </button>

        <div className="flex items-center space-x-1.5">
          <button 
            onClick={() => window.print()} 
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded-xl transition-colors"
            title="Print email"
          >
            <Printer className="w-4 h-4" />
          </button>
          <button 
            onClick={onBack} 
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
            title="Delete message"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Email Header Info */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-100 leading-snug">
          {email.subject || '(No Subject)'}
        </h2>

        {/* Sender Profile Header */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/60 border border-white/5">
          <div className="flex items-center space-x-3 min-w-0">
            <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-xs shadow-md shrink-0 border border-white/20`}>
              {initials}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-200 truncate">{email.sender}</div>
              <div className="text-xs text-slate-400 flex items-center space-x-1">
                <span>To: me</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 text-xs text-slate-400 shrink-0 font-mono">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>{formattedDate}</span>
          </div>
        </div>

        {/* AI Quick Executive Summary Pill */}
        <div className="bg-indigo-950/40 border border-indigo-500/20 p-3 rounded-xl flex items-start space-x-3 text-xs">
          <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5 animate-pulse" />
          <div className="space-y-0.5">
            <span className="font-semibold text-indigo-300">AI Context Analysis:</span>
            <p className="text-slate-300 leading-relaxed">
              This message is active in context. You can tell the AI Co-Pilot: <code className="bg-indigo-500/20 px-1.5 py-0.5 rounded text-indigo-200">"Reply to this email with..."</code> to auto-generate a response.
            </p>
          </div>
        </div>
      </div>

      {/* Email Body Iframe Container */}
      <div className="flex-1 bg-slate-950/80 border border-white/10 rounded-xl overflow-hidden min-h-[420px] shadow-inner">
        <iframe
          title="Email Body View"
          srcDoc={styledSrcDoc}
          className="w-full h-full border-none"
          sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin"
        />
      </div>
    </div>
  );
}