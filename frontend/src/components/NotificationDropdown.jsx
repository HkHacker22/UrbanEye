import React from 'react';
import { Award, ArrowDownLeft, Clock, Info } from 'lucide-react';

export default function NotificationDropdown({ notifications, loading, onClose }) {
  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="absolute top-14 right-0 w-80 md:w-96 bg-white/80 backdrop-blur-xl border border-white/20 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] overflow-hidden z-50 animate-in slide-in-from-top-4 duration-300">
      <div className="p-5 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-black text-gray-900 text-lg">Notifications</h3>
        <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
          Karma Ledger
        </span>
      </div>

      <div className="max-h-[400px] overflow-y-auto scrollbar-hide py-2">
        {loading ? (
          <div className="p-8 flex flex-col items-center justify-center gap-3 text-gray-400">
            <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin"></div>
            <p className="text-xs font-bold">Fetching alerts...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center gap-4 text-gray-400 italic">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
                <Info size={28} className="text-gray-200" />
            </div>
            <p className="text-sm">No recent activity found.</p>
          </div>
        ) : (
          notifications.map((notif, i) => (
            <div 
              key={i} 
              className={`px-5 py-4 flex gap-4 transition-colors hover:bg-white/40 group relative ${notif.isNew ? 'bg-blue-50/50' : ''}`}
            >
              {notif.isNew && (
                <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
              )}
              
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110 ${
                notif.delta > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
              }`}>
                {notif.delta > 0 ? <Award size={20} /> : <ArrowDownLeft size={20} />}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 leading-tight mb-1">
                  {notif.reason}
                </p>
                <div className="flex items-center gap-3 text-[11px] font-medium text-gray-400">
                  <span className={`font-black ${notif.delta > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {notif.delta > 0 ? `+${notif.delta}` : notif.delta} Karma
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={10} /> {formatTime(notif.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-4 bg-gray-50/50 border-t border-gray-100">
        <button 
          onClick={onClose}
          className="w-full py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors shadow-sm"
        >
          Close Notifications
        </button>
      </div>
    </div>
  );
}
