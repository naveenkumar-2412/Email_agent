'use client';

import { useState, useRef, useEffect } from 'react';
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
    { role: 'assistant', content: 'Hi! I can help you write emails, search your inbox, or navigate. What do you need?' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = { role: 'user', content: chatInput };
    const newMessages = [...messages, userMsg];
    
    setMessages(newMessages);
    setChatInput('');
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

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden text-gray-900">
      
      {/* MAIN CONTENT AREA (Left Side) */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b px-6 py-4 flex justify-between items-center shadow-sm z-10">
          <h1 className="text-2xl font-black tracking-tight text-blue-600">Nebula<span className="text-gray-800">Mail</span></h1>
          <nav className="space-x-6 font-medium">
            <button onClick={() => setUiView('inbox')} className={`hover:text-blue-600 transition-colors ${uiView === 'inbox' ? 'text-blue-600' : 'text-gray-500'}`}>Inbox</button>
            <button onClick={() => setUiView('compose')} className={`hover:text-blue-600 transition-colors ${uiView === 'compose' ? 'text-blue-600' : 'text-gray-500'}`}>Compose</button>
          </nav>
        </header>

        <main className="flex-1 overflow-y-auto p-8 w-full max-w-5xl mx-auto">
          {uiView === 'inbox' && <Inbox emails={inboxEmails} onOpen={(id) => { setOpenEmailId(id); setUiView('email_detail'); }} />}
          {uiView === 'compose' && <Compose draft={composeDraft} setDraft={setComposeDraft} />}
          {uiView === 'email_detail' && (
            <EmailDetail 
              email={inboxEmails.find((email) => email.id === openEmailId) ?? null} 
              onBack={() => setUiView('inbox')} 
            />
          )}
        </main>
      </div>

      {/* AI ASSISTANT SIDEBAR (Right Side) */}
      <div className="w-96 bg-white border-l flex flex-col shadow-2xl z-20">
        <div className="p-4 bg-gray-900 text-white font-semibold flex items-center justify-between">
          <span>AI Co-Pilot</span>
          <span className="text-xs bg-blue-600 px-2 py-1 rounded-full">Online</span>
        </div>
        
        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border text-gray-800 rounded-bl-none shadow-sm'}`}>
                {msg.content}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-gray-200 text-gray-500 rounded-2xl rounded-bl-none px-4 py-2 text-sm animate-pulse">
                Thinking...
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Box */}
        <form onSubmit={sendMessage} className="p-4 bg-white border-t">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Tell the AI what to do..."
              className="flex-1 border bg-gray-50 text-gray-900 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isTyping}
            />
            <button 
              type="submit" 
              disabled={isTyping}
              className="bg-blue-600 text-white rounded-full p-2 w-9 h-9 flex items-center justify-center hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              ↑
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}