'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, Inbox as InboxIcon, Edit3, Send, RefreshCw, Bot, User, 
  Star, Trash2, Archive, Folder, Zap, CheckCircle2, MessageSquare, 
  ChevronRight, ArrowUpRight, Search, ShieldCheck, Mail, SlidersHorizontal
} from 'lucide-react';
import Inbox from '@/components/Inbox';
import Compose from '@/components/Compose';
import EmailDetail from '@/components/EmailDetail';

export default function MailApp() {
  // ==========================================
  // 1. DATA STATES (Controlled by the AI)
  // ==========================================
  const [uiView, setUiView] = useState<'inbox' | 'compose' | 'email_detail'>('inbox');
  const [inboxEmails, setInboxEmails] = useState<any[]>([]);
  const [openEmailId, setOpenEmailId] = useState<string | null>(null);
  const [composeDraft, setComposeDraft] = useState({ to: '', subject: '', body: '' });

  // ==========================================
  // 2. CHAT STATES
  // ==========================================
  const [messages, setMessages] = useState<{role: string, content: string}[]>([
    { role: 'assistant', content: 'Hi! I am your AI Co-Pilot. I can fetch emails, pre-fill drafts, search your inbox, or navigate for you. What would you like to do?' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // ==========================================
  // 3. AUTO-LOAD INBOX ON STARTUP (With Retry Safety)
  // ==========================================
  useEffect(() => {
    const loadInitialInbox = async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));

      try {
        const res = await fetch('http://localhost:8000/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: "user", content: "Show my latest emails" }],
            ui_view: 'inbox',
            inbox_emails: []
          })
        });
        
        const data = await res.json();
        if (data.inbox_emails && data.inbox_emails.length > 0) {
          setInboxEmails(data.inbox_emails);
        }
      } catch (err) {
        console.warn("Backend still waking up, retrying inbox load in 2s...", err);
        setTimeout(async () => {
          try {
            const retryRes = await fetch('http://localhost:8000/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                messages: [{ role: "user", content: "Show my latest emails" }],
                ui_view: 'inbox',
                inbox_emails: []
              })
            });
            const retryData = await retryRes.json();
            if (retryData.inbox_emails) setInboxEmails(retryData.inbox_emails);
          } catch (retryErr) {
            console.error("Failed to load initial inbox after retry:", retryErr);
          }
        }, 2000);
      }
    };

    loadInitialInbox();
  }, []);

  // ==========================================
  // 4. REAL-TIME PUBSUB LISTENER 
  // ==========================================
  useEffect(() => {
    const eventSource = new EventSource('http://localhost:8000/api/stream');
    
    eventSource.addEventListener('new_email', async () => {
      console.log("Real-time update triggered! Fetching latest emails...");
      
      try {
        const res = await fetch('http://localhost:8000/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: "user", content: "Fetch my latest emails silently." }],
            ui_view: 'inbox',
            open_email_id: openEmailId,
            inbox_emails: inboxEmails
          })
        });
        
        const data = await res.json();
        if (data.inbox_emails && data.inbox_emails.length > 0) {
          setInboxEmails(data.inbox_emails);
        }
      } catch (err) {
        console.error("Failed to auto-refresh inbox", err);
      }
    });

    return () => eventSource.close();
  }, [inboxEmails, openEmailId]); 

  // ==========================================
  // 5. API BRIDGE TO FASTAPI
  // ==========================================
  const sendMessage = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const query = customText || chatInput;
    if (!query.trim() || isTyping) return;

    const userMsg = { role: 'user', content: query };
    const newMessages = [...messages, userMsg];
    
    setMessages(newMessages);
    if (!customText) setChatInput('');
    setIsTyping(true);

    try {
      const res = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          ui_view: uiView,
          open_email_id: openEmailId,
          inbox_emails: inboxEmails
        })
      });

      const data = await res.json();
      
      if (data.ui_view) setUiView(data.ui_view);
      if (data.inbox_emails && data.inbox_emails.length > 0) setInboxEmails(data.inbox_emails);
      if (data.compose_draft) setComposeDraft(data.compose_draft);
      if (data.open_email_id) setOpenEmailId(data.open_email_id);
      
      if (data.messages) {
        setMessages(data.messages.filter((m: any) => m.role !== 'system'));
      }

    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error: Could not connect to the LangGraph backend.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  const refreshInboxSilently = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: "user", content: "Show my latest emails" }],
          ui_view: 'inbox',
          inbox_emails: inboxEmails
        })
      });
      const data = await res.json();
      if (data.inbox_emails && data.inbox_emails.length > 0) {
        setInboxEmails(data.inbox_emails);
      }
    } catch (err) {
      console.error("Refresh failed", err);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const unreadCount = inboxEmails.filter(e => !e.is_read).length;

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      
      {/* 1. LEFT SIDEBAR NAVIGATION RAIL */}
      <aside className="w-64 bg-slate-900/60 border-r border-white/10 flex flex-col justify-between p-4 backdrop-blur-xl shrink-0 hidden md:flex z-20">
        <div className="space-y-6">
          {/* Logo & Brand Header */}
          <div className="flex items-center space-x-3 px-2 py-1">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight bg-gradient-to-r from-indigo-200 via-white to-purple-200 bg-clip-text text-transparent">
                Nebula<span className="text-indigo-400">Mail</span>
              </h1>
              <div className="flex items-center space-x-1.5 text-[10px] text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>AI Co-Pilot Live</span>
              </div>
            </div>
          </div>

          {/* Primary Action Button: Compose */}
          <button
            onClick={() => setUiView('compose')}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold py-3 px-4 rounded-2xl shadow-lg shadow-indigo-500/20 flex items-center justify-center space-x-2.5 transition-all duration-200 active:scale-95 group border border-white/10"
          >
            <Edit3 className="w-4 h-4 group-hover:rotate-12 transition-transform" />
            <span>Compose Email</span>
          </button>

          {/* Navigation Items */}
          <nav className="space-y-1 text-sm font-medium">
            <button
              onClick={() => setUiView('inbox')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
                uiView === 'inbox' 
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 font-semibold shadow-inner' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <InboxIcon className={`w-4 h-4 ${uiView === 'inbox' ? 'text-indigo-400' : ''}`} />
                <span>Inbox</span>
              </div>
              {unreadCount > 0 && (
                <span className="bg-indigo-500 text-white text-[11px] px-2 py-0.5 rounded-full font-bold">
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setUiView('compose')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
                uiView === 'compose' 
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 font-semibold shadow-inner' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Edit3 className={`w-4 h-4 ${uiView === 'compose' ? 'text-indigo-400' : ''}`} />
                <span>Drafts</span>
              </div>
              {composeDraft.subject ? (
                <span className="w-2 h-2 rounded-full bg-amber-400" />
              ) : null}
            </button>

            <button
              onClick={() => setUiView('inbox')}
              className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-all"
            >
              <Star className="w-4 h-4" />
              <span>Starred</span>
            </button>

            <button
              onClick={() => setUiView('inbox')}
              className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-all"
            >
              <Send className="w-4 h-4" />
              <span>Sent</span>
            </button>

            <button
              onClick={() => setUiView('inbox')}
              className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-all"
            >
              <Archive className="w-4 h-4" />
              <span>Archive</span>
            </button>
          </nav>

          {/* AI Shortcuts Section */}
          <div className="pt-4 border-t border-white/5 space-y-2">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 px-3 flex items-center space-x-1.5">
              <Zap className="w-3 h-3 text-indigo-400" />
              <span>Quick AI Actions</span>
            </span>

            <div className="space-y-1 text-xs">
              <button
                onClick={() => sendMessage(undefined, "Show my unread emails")}
                className="w-full text-left px-3 py-2 rounded-xl text-slate-400 hover:text-indigo-300 hover:bg-slate-800/50 transition-all flex items-center justify-between group"
              >
                <span>"Show unread emails"</span>
                <ChevronRight className="w-3 h-3 text-slate-400 group-hover:text-indigo-400 transition-colors" />
              </button>

              <button
                onClick={() => sendMessage(undefined, "Compose a new email")}
                className="w-full text-left px-3 py-2 rounded-xl text-slate-400 hover:text-indigo-300 hover:bg-slate-800/50 transition-all flex items-center justify-between group"
              >
                <span>"Open compose view"</span>
                <ChevronRight className="w-3 h-3 text-slate-400 group-hover:text-indigo-400 transition-colors" />
              </button>

              <button
                onClick={() => sendMessage(undefined, "Summarize my latest inbox emails")}
                className="w-full text-left px-3 py-2 rounded-xl text-slate-400 hover:text-indigo-300 hover:bg-slate-800/50 transition-all flex items-center justify-between group"
              >
                <span>"Summarize inbox"</span>
                <ChevronRight className="w-3 h-3 text-slate-400 group-hover:text-indigo-400 transition-colors" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer Connection Status Pill */}
        <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>FastAPI SSE Active</span>
          </div>
          <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded-md font-mono text-slate-400">v1.0</span>
        </div>
      </aside>

      {/* 2. MAIN WORKSPACE AREA (Center) */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-950 relative">
        {/* Workspace Header */}
        <header className="bg-slate-900/40 border-b border-white/10 px-6 py-4 flex justify-between items-center backdrop-blur-md z-10">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
              <span>
                {uiView === 'inbox' && 'Inbox Workspace'}
                {uiView === 'compose' && 'Compose Message'}
                {uiView === 'email_detail' && 'Email Content Reader'}
              </span>
            </h2>

            {/* Mobile Nav Switchers */}
            <div className="md:hidden flex items-center space-x-2 bg-slate-900 p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setUiView('inbox')}
                className={`px-3 py-1 rounded-lg text-xs font-medium ${uiView === 'inbox' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
              >
                Inbox
              </button>
              <button
                onClick={() => setUiView('compose')}
                className={`px-3 py-1 rounded-lg text-xs font-medium ${uiView === 'compose' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
              >
                Compose
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Sync Refresh Button */}
            <button
              onClick={refreshInboxSilently}
              disabled={isRefreshing}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-xs font-medium text-slate-300 hover:text-white flex items-center space-x-2 transition-all active:scale-95 disabled:opacity-50"
              title="Sync with mail server"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </header>

        {/* Main Dynamic View Content */}
        <main className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full space-y-4">
          {uiView === 'inbox' && (
            <Inbox 
              emails={inboxEmails} 
              onOpen={(id) => { 
                setOpenEmailId(id); 
                setUiView('email_detail'); 
              }} 
              onServerSearch={(prompt) => sendMessage(undefined, prompt)}
            />
          )}

          {uiView === 'compose' && (
            <Compose 
              draft={composeDraft} 
              setDraft={setComposeDraft} 
            />
          )}

          {uiView === 'email_detail' && (
            <EmailDetail 
              email={inboxEmails.find((email) => email.id === openEmailId) ?? null} 
              onBack={() => setUiView('inbox')} 
            />
          )}
        </main>
      </div>

      {/* 3. AI CO-PILOT SIDEBAR (Right Side) */}
      <aside className="w-96 bg-slate-900/80 border-l border-white/10 flex flex-col shadow-2xl z-20 backdrop-blur-xl shrink-0">
        {/* Drawer Header */}
        <div className="p-4 bg-slate-900/90 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-md">
              <Bot className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100 flex items-center space-x-1.5">
                <span>AI Co-Pilot</span>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.2 rounded-md font-semibold">
                  LangGraph
                </span>
              </h3>
              <p className="text-[10px] text-slate-400">Controls DOM, routes & drafts</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center space-x-1 text-[11px] bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-500/20 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>Online</span>
            </span>
          </div>
        </div>

        {/* Chat History Messages Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-950/50">
          {messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            return (
              <div 
                key={idx} 
                className={`flex items-start space-x-2.5 ${isUser ? 'flex-row-reverse space-x-reverse' : 'flex-row'}`}
              >
                {/* Avatar Icon */}
                <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 shadow-md ${
                  isUser 
                    ? 'bg-gradient-to-tr from-indigo-500 to-purple-600 text-white' 
                    : 'bg-slate-800 text-indigo-400 border border-white/10'
                }`}>
                  {isUser ? <User className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                </div>

                {/* Message Bubble */}
                <div className={`max-w-[82%] rounded-2xl p-3 text-xs leading-relaxed transition-all shadow-md ${
                  isUser
                    ? 'bg-indigo-600 text-white rounded-tr-none shadow-indigo-500/10 font-medium'
                    : 'bg-slate-900 border border-white/10 text-slate-200 rounded-tl-none space-y-1'
                }`}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            );
          })}

          {/* Animated Typing State */}
          {isTyping && (
            <div className="flex items-start space-x-2.5">
              <div className="w-7 h-7 rounded-xl bg-slate-800 text-indigo-400 border border-white/10 flex items-center justify-center shrink-0">
                <Sparkles className="w-3.5 h-3.5 animate-spin" />
              </div>
              <div className="bg-slate-900 border border-indigo-500/30 text-indigo-300 rounded-2xl rounded-tl-none p-3 text-xs flex items-center space-x-2 animate-pulse">
                <Bot className="w-4 h-4 text-indigo-400 animate-bounce" />
                <span>Executing graph reasoning & updating UI state...</span>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input Form Bar */}
        <form onSubmit={sendMessage} className="p-3 bg-slate-900 border-t border-white/10">
          <div className="relative flex items-center">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask AI to search, compose, or navigate..."
              className="w-full bg-slate-950/80 border border-white/10 text-slate-100 placeholder-slate-500 rounded-2xl pl-4 pr-11 py-2.5 text-xs focus:outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 transition-all font-sans"
              disabled={isTyping}
            />
            <button 
              type="submit" 
              disabled={isTyping || !chatInput.trim()}
              className="absolute right-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl w-7 h-7 flex items-center justify-center transition-all disabled:opacity-40 disabled:hover:from-indigo-600"
              title="Send to AI assistant"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </aside>

    </div>
  );
}