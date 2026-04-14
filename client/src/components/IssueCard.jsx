import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { ArrowUp, MessageCircle, MapPin, Sparkles, MousePointer2 } from 'lucide-react';

export default function IssueCard({ issue, highlighted = false, onClick }) {
  const [upvotes, setUpvotes] = useState(issue.upvotes || 0);
  const [upvoted, setUpvoted] = useState(false);
  const [burst, setBurst] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [isFocused, setIsFocused] = useState(highlighted);
  const cardRef = useRef(null);

  useEffect(() => {
    if (highlighted) {
      setIsFocused(true);
      
      // Smooth scroll to this card after a short delay to ensure render is complete
      const timer = setTimeout(() => {
        cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 500);

      const offTimer = setTimeout(() => setIsFocused(false), 4000);
      return () => {
        clearTimeout(timer);
        clearTimeout(offTimer);
      };
    }
  }, [highlighted]);

  // Lazy-load the image only when card is visible
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          observer.disconnect();
          // Fetch full issue data to get imageUrl
          axios.get(`${import.meta.env.VITE_API_URL}/issues/${issue._id}`)
            .then(res => { if (res.data.imageUrl) setImageUrl(res.data.imageUrl); })
            .catch(() => {});
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [issue._id]);

  const handleUpvote = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const newUpvoted = !upvoted;
    const direction = newUpvoted ? 1 : -1;
    setUpvotes(prev => prev + direction);
    setUpvoted(newUpvoted);
    if (newUpvoted) {
      setBurst(true);
      setTimeout(() => setBurst(false), 600);
    }
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/issues/${issue._id}/upvote`, { direction });
    } catch (err) {
      console.error(err);
      setUpvotes(prev => prev - direction);
      setUpvoted(!newUpvoted);
    }
  };

  const statusMap = {
    'Pending':     'bg-white text-gray-800 shadow-sm border border-gray-200/50',
    'In-Progress': 'bg-orange-500 text-white shadow-md border border-orange-400',
    'Resolved':    'bg-emerald-500 text-white shadow-md border border-emerald-400',
  };

  const priorityColor = {
    'critical': 'text-red-600 drop-shadow-sm',
    'high':     'text-orange-600',
    'medium':   'text-yellow-600',
    'low':      'text-gray-500',
  };

  const CATEGORY_GRADIENTS = {
    'sanitation':         'from-emerald-400 to-teal-500',
    'roads':              'from-gray-400 to-slate-500',
    'safety':             'from-red-400 to-rose-500',
    'flooding':           'from-blue-400 to-cyan-500',
    'utilities':          'from-yellow-400 to-amber-500',
    'environment':        'from-green-400 to-lime-500',
    'infrastructure':     'from-indigo-400 to-blue-500',
    'fire & hazard':      'from-orange-500 to-red-600',
    'medical emergency':  'from-rose-400 to-pink-600',
    'animals':            'from-amber-400 to-orange-500',
    'noise':              'from-purple-300 to-violet-400',
    'public property':    'from-sky-400 to-blue-500',
    'noise pollution':    'from-purple-300 to-violet-400',
  };

  const gradientClass = CATEGORY_GRADIENTS[(issue.category || '').toLowerCase()] || 'from-blue-400 to-indigo-500';

  const timeAgo = (dateStr) => {
    if (!dateStr) return 'now';
    const seconds = Math.floor((new Date() - new Date(dateStr)) / 1000);
    let interval = Math.floor(seconds / 3600);
    if (interval >= 24) return Math.floor(interval / 24) + 'd';
    if (interval >= 1) return interval + 'h';
    interval = Math.floor(seconds / 60);
    if (interval >= 1) return interval + 'm';
    return Math.max(0, Math.floor(seconds)) + 's';
  };

  return (
    <div 
      ref={cardRef} 
      onClick={onClick}
      className={`bg-white rounded-2xl border transition-all duration-300 flex flex-col overflow-hidden cursor-pointer group shadow-[0_2px_10px_rgba(0,0,0,0.04)]
        ${isFocused 
          ? 'ring-4 ring-blue-500/30 border-blue-400 scale-[1.02] shadow-xl z-20' 
          : 'border-gray-200/80 hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:-translate-y-1'
        }`}
    >
      {/* Top Half: Image */}
      <div className="relative h-48 w-full overflow-hidden bg-gray-100">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={issue.title}
            onLoad={() => setImgLoaded(true)}
            className={`w-full h-full object-cover group-hover:scale-105 transition-all duration-700 ease-out ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
          />
        ) : null}
        {/* Gradient placeholder — always present behind image */}
        <div className={`absolute inset-0 bg-gradient-to-br ${gradientClass} opacity-${imageUrl && imgLoaded ? '0' : '100'} transition-opacity duration-500 flex items-end p-4`}>
          <span className="text-white/50 font-extrabold text-4xl uppercase tracking-tight">{(issue.category || 'Issue').slice(0, 1)}</span>
        </div>

        {/* Status badge */}
        <div className="absolute top-4 right-4">
          <span className={`px-3 py-1.5 text-[11px] font-bold tracking-wider uppercase rounded-full backdrop-blur-md flex items-center gap-1 ${statusMap[issue.status] || 'bg-white text-gray-800'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${issue.status === 'Pending' ? 'bg-gray-400' : 'bg-white/80'}`} />
            {issue.status}
          </span>
        </div>

        {/* AI Pending badge */}
        {issue.aiPending && (
          <div className="absolute top-4 left-4">
            <span className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold bg-black/70 text-white rounded-full backdrop-blur-sm animate-pulse">
              <Sparkles size={10} /> AI Analyzing…
            </span>
          </div>
        )}
      </div>

      {/* Bottom Half: Content */}
      <div className="p-5 flex flex-col flex-1 relative">
        <div className="flex items-center gap-1.5 text-gray-500 text-[11px] font-bold mb-2 uppercase tracking-wide">
          <span className={`flex items-center gap-1 ${priorityColor[(issue.priority || '').toLowerCase()] || priorityColor['medium']}`}>
            <div className="w-1.5 h-1.5 rounded-full bg-current" />
            {issue.priority || 'Medium'}
          </span>
          <span className="text-gray-300">•</span>
          <span className="text-blue-600 flex items-center gap-1"><MapPin size={12} className="stroke-[2.5]" /> {issue.category}</span>
        </div>

        <h3 className="font-extrabold text-gray-900 text-lg leading-snug mb-2 line-clamp-2 pr-2">
          {issue.title}
        </h3>

        <p className="text-gray-500 text-[15px] line-clamp-2 leading-relaxed mb-6 flex-1">
          {issue.description}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-auto">
          <div className="flex items-center gap-4 text-gray-500">
            <button
              onClick={handleUpvote}
              className={`flex items-center gap-1.5 text-sm font-bold transition-all ${upvoted ? 'text-blue-600' : 'hover:text-blue-600'}`}
            >
              <div className={`p-1.5 rounded-full transition-all relative ${upvoted ? 'bg-blue-50' : 'bg-gray-50 hover:bg-blue-50'} ${burst ? 'scale-125' : 'scale-100'}`}
                style={{ transition: 'transform 0.15s cubic-bezier(0.34,1.56,0.64,1)' }}
              >
                <ArrowUp size={18} className={`stroke-[2.5] transition-transform ${burst ? '-translate-y-0.5' : ''}`} style={{ transition: 'transform 0.15s ease' }} />
                {burst && <span className="absolute inset-0 rounded-full bg-blue-400/30 animate-ping pointer-events-none" />}
              </div>
              <span className={`tabular-nums transition-all ${burst ? 'scale-110 text-blue-600' : ''}`} style={{ transition: 'transform 0.15s cubic-bezier(0.34,1.56,0.64,1)' }}>
                {upvotes}
              </span>
            </button>

            <button 
              onClick={(e) => { e.stopPropagation(); onClick(); }}
              className="flex items-center gap-1.5 text-sm font-bold hover:text-blue-600 transition-colors"
            >
              <div className="p-1.5 rounded-full bg-gray-50 hover:bg-blue-50 flex items-center justify-center transition-colors">
                <MessageCircle size={18} className="stroke-[2]" />
              </div>
              {issue.comments?.length || 0}
            </button>
          </div>

          <span className="text-xs font-semibold text-gray-400">
            {timeAgo(issue.createdAt)}
          </span>
        </div>
      </div>
    </div>
  );
}
