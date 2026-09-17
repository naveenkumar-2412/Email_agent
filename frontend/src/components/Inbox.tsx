'use client';

import { useState, useMemo } from 'react';
import { 
  Search, Star, Mail, CheckCircle2, Clock, 
  Sparkles, Filter, Inbox as InboxIcon, ArrowUpRight, Tag,
  ChevronDown, User
} from 'lucide-react';

interface Email {
  id: string;
  sender: string;
  subject: string;
  preview?: string;
  body?: string;
  date: string;
  is_read?: boolean;
  starred?: boolean;
  category?: string;
}

// Generate gradient avatar background based on string hash
const getAvatarGradient = (name: string) => {
  const gradients = [
    'from-indigo-500 to-purple-600',
    'from-blue-500 to-cyan-500',
    'from-emerald-500 to-teal-600',
    'from-pink-500 to-rose-500',
    'from-amber-500 to-orange-600',
    'from-violet-600 to-fuchsia-600'
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
};

// Get initials from sender name or email
const getInitials = (name: string) => {
  if (!name) return 'N';
  const clean = name.replace(/<.*>/, '').trim();
  const parts = clean.split(' ').filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
};

// Format date relative or localized
const formatDate = (dateStr: string) => {
  if (!dateStr) return 'Just now';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return d.toLocaleDateString([], { weekday: 'short' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
};

export default function Inbox({ emails, onOpen, onServerSearch }: { emails: Email[], onOpen: (id: string) => void, onServerSearch?: (prompt: string) => void }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'starred'>('all');
  const [starredSet, setStarredSet] = useState<Set<string>>(new Set());
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(true);
  const [senderFilter, setSenderFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('all');

  const toggleStar = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setStarredSet(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleServerSearch = () => {
    if (!onServerSearch) return;
    let prompt = "Search my emails";
    if (searchQuery.trim()) prompt += ` with keyword '${searchQuery.trim()}'`;
    if (senderFilter.trim()) prompt += ` from sender '${senderFilter.trim()}'`;
    if (dateFilter !== 'all') prompt += ` in date range '${dateFilter}'`;
    if (activeTab === 'unread') prompt += ` that are unread`;
    if (activeTab === 'starred') prompt += ` that are starred`;
    
    if (prompt === "Search my emails") {
      prompt = "Fetch my latest emails";
    }
    
    onServerSearch(prompt);
  };

  const filteredEmails = useMemo(() => {
    return emails.filter(email => {
      const isStarred = starredSet.has(email.id) || email.starred;
      if (activeTab === 'unread' && email.is_read) return false;
      if (activeTab === 'starred' && !isStarred) return false;

      if (senderFilter.trim() && !email.sender?.toLowerCase().includes(senderFilter.toLowerCase())) return false;

      if (dateFilter !== 'all' && email.date) {
        const d = new Date(email.date);
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (dateFilter === 'today' && diffDays > 1) return false;
        if (dateFilter === 'last_7_days' && diffDays > 7) return false;
        if (dateFilter === 'this_month' && diffDays > 30) return false;
      }

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        email.sender?.toLowerCase().includes(q) ||
        email.subject?.toLowerCase().includes(q) ||
        (email.preview && email.preview.toLowerCase().includes(q))
      );
    });
  }, [emails, searchQuery, activeTab, starredSet, senderFilter, dateFilter]);

  const unreadCount = useMemo(() => emails.filter(e => !e.is_read).length, [emails]);

  if (emails.length === 0) {
    return (
      <div className="glass-panel rounded-2xl p-12 text-center border border-white/10 shadow-2xl backdrop-blur-xl my-auto flex flex-col items-center justify-center space-y-4 max-w-2xl mx-auto">
        <div className="w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 animate-pulse">
          <Sparkles className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h3 className="text-xl font-bold text-slate-100">Your Inbox is Empty</h3>
          <p className="text-slate-400 text-sm max-w-sm">
            Ask the AI Assistant to fetch your latest emails or compose a new message!
          </p>
        </div>
        <div className="pt-2 flex items-center space-x-2 text-xs text-indigo-400 bg-indigo-500/10 px-4 py-2 rounded-full border border-indigo-500/20">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Try asking: "Show my latest emails"</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Search & Filter Control Bar */}
      <div className="glass-panel p-3 rounded-2xl flex flex-col items-stretch gap-3 border border-white/10 shadow-lg">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
          {/* Search Bar */}
          <div className="relative flex-1 w-full flex items-center">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by keywords..."
              className="w-full bg-slate-900/60 border border-white/10 rounded-xl pl-10 pr-[4.5rem] py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all font-sans"
            />
            
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="px-2 py-1 text-[10px] bg-slate-800 text-slate-400 hover:text-slate-200 rounded-md"
                >
                  Clear
                </button>
              )}
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`p-1.5 rounded-lg transition-all border ${
                  showAdvancedFilters || senderFilter || dateFilter !== 'all' 
                    ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' 
                    : 'bg-slate-800/50 text-slate-400 border-white/5 hover:bg-slate-800 hover:text-slate-200'
                }`}
                title="Advanced Filters"
              >
                <Filter className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center space-x-1 bg-slate-900/80 p-1 rounded-xl border border-white/5 w-full sm:w-auto justify-center shrink-0">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'all' 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              All ({emails.length})
            </button>

            <button
              onClick={() => setActiveTab('unread')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 ${
                activeTab === 'unread' 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <span>Unread</span>
              {unreadCount > 0 && (
                <span className="bg-indigo-400/30 text-indigo-200 text-[10px] px-1.5 py-0.2 rounded-full font-semibold">
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('starred')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-1 ${
                activeTab === 'starred' 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Star className="w-3 h-3 text-amber-400 fill-amber-400/20" />
              <span>Starred</span>
            </button>
          </div>
        </div>
        
        {/* Advanced Filters Row */}
        {showAdvancedFilters && (
          <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-white/5 w-full animate-in fade-in slide-in-from-top-2">
            <div className="flex-1">
              <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-1.5 block flex items-center gap-1"><User className="w-3 h-3" /> Sender</label>
              <input
                type="text"
                value={senderFilter}
                onChange={(e) => setSenderFilter(e.target.value)}
                placeholder="Filter by sender name or email..."
                className="w-full bg-slate-900/60 border border-white/5 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:bg-slate-900 transition-all"
              />
            </div>
            <div className="flex-1 relative">
              <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-1.5 block flex items-center gap-1"><Clock className="w-3 h-3" /> Date Range</label>
              <div className="relative">
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full bg-slate-900/60 border border-white/5 rounded-lg pl-3 pr-8 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500/50 focus:bg-slate-900 transition-all appearance-none cursor-pointer"
                >
                  <option value="all">Any time</option>
                  <option value="today">Today</option>
                  <option value="last_7_days">Last 7 days</option>
                  <option value="this_month">This month</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>
        )}
        
        {/* Global Server Search Action */}
        {(searchQuery || senderFilter || dateFilter !== 'all' || activeTab !== 'all') && (
          <div className="flex items-center justify-end border-t border-white/5 pt-3 mt-1 gap-2">
            <span className="text-[10px] text-slate-500 mr-2">Want to search your entire Gmail history?</span>
            <button
              onClick={() => {
                setSearchQuery('');
                setSenderFilter('');
                setDateFilter('all');
                setActiveTab('all');
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-white/5 transition-all"
            >
              Clear Filters
            </button>
            <button
              onClick={handleServerSearch}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-500/20 transition-all flex items-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Deep Search Server</span>
            </button>
          </div>
        )}
      </div>

      {/* AI Search Active Banner (If filtered or query present) */}
      {(searchQuery || emails.some(e => e.category === 'Search Result')) && (
        <div className="glass-panel p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300">
              <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
            </div>
            <div>
              <span className="font-semibold text-slate-100">
                AI Mail Search Results
              </span>
              <p className="text-slate-400 text-[11px]">
                Showing {filteredEmails.length} result{filteredEmails.length !== 1 ? 's' : ''} {searchQuery ? `for "${searchQuery}"` : 'from Gmail search query'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filter Stats Header */}
      <div className="flex items-center justify-between px-2 text-xs text-slate-400">
        <span className="flex items-center space-x-1.5">
          <InboxIcon className="w-3.5 h-3.5 text-indigo-400" />
          <span>Showing {filteredEmails.length} email{filteredEmails.length !== 1 ? 's' : ''}</span>
        </span>
        <span className="text-slate-500">Click any email to expand detail view</span>
      </div>

      {/* Email List Container */}
      <div className="space-y-2">
        {filteredEmails.length === 0 ? (
          <div className="glass-panel rounded-2xl p-8 text-center border border-white/5 text-slate-400 text-sm">
            No matching emails found for "{searchQuery}".
          </div>
        ) : (
          filteredEmails.map((email) => {
            const isUnread = !email.is_read;
            const isStarred = starredSet.has(email.id) || email.starred;
            const gradient = getAvatarGradient(email.sender || 'Unknown');
            const initials = getInitials(email.sender || 'User');

            return (
              <div
                key={email.id}
                onClick={() => onOpen(email.id)}
                className={`group glass-panel-interactive rounded-2xl p-4 cursor-pointer relative overflow-hidden transition-all duration-200 border ${
                  isUnread 
                    ? 'border-indigo-500/30 bg-slate-900/80 shadow-md shadow-indigo-500/5' 
                    : 'border-white/5 bg-slate-950/40 hover:bg-slate-900/60'
                }`}
              >
                {/* Left accent indicator for unread emails */}
                {isUnread && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500 to-purple-500 shadow-glow" />
                )}

                <div className="flex items-start gap-3.5">
                  {/* Avatar Icon */}
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-xs shadow-md shrink-0 border border-white/20 mt-0.5`}>
                    {initials}
                  </div>

                  {/* Main Content Area */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center space-x-2 min-w-0">
                        <span className={`text-sm truncate ${isUnread ? 'font-bold text-slate-100' : 'font-medium text-slate-300'}`}>
                          {email.sender}
                        </span>
                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse shrink-0" />
                        )}
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        <span className="text-xs text-slate-400 font-mono">
                          {formatDate(email.date)}
                        </span>
                        
                        {/* Star Button */}
                        <button
                          onClick={(e) => toggleStar(e, email.id)}
                          className="p-1 text-slate-500 hover:text-amber-400 transition-colors"
                          title="Star email"
                        >
                          <Star className={`w-4 h-4 ${isStarred ? 'text-amber-400 fill-amber-400' : ''}`} />
                        </button>
                      </div>
                    </div>

                    {/* Subject Line */}
                    <h4 className={`text-sm mb-1 truncate ${isUnread ? 'font-semibold text-indigo-200' : 'font-normal text-slate-200'}`}>
                      {email.subject || '(No Subject)'}
                    </h4>

                    {/* Body / Preview Snippet */}
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {email.preview || email.body || 'No preview snippet available.'}
                    </p>

                    {/* Tags / Meta Badge Footer */}
                    <div className="mt-2.5 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {email.category && (
                          <span className="inline-flex items-center space-x-1 text-[10px] bg-slate-800/80 text-slate-300 px-2 py-0.5 rounded-full border border-white/5">
                            <Tag className="w-2.5 h-2.5 text-indigo-400" />
                            <span>{email.category}</span>
                          </span>
                        )}
                        <span className="text-[10px] text-indigo-400/80 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20 group-hover:bg-indigo-500/20 transition-colors">
                          Click to view
                        </span>
                      </div>

                      <span className="text-slate-400 group-hover:text-indigo-400 transition-colors text-xs flex items-center space-x-0.5 opacity-0 group-hover:opacity-100">
                        <span>Open</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}