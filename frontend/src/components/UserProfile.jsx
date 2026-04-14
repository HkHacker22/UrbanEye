import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { ArrowUp, MapPin, Clock, Star, TrendingUp, Shield, Layers, ChevronRight, CheckCircle, AlertCircle, Loader } from 'lucide-react';

const TIER_STYLES = {
  'Novice Reporter':   { bg: 'bg-gray-100',   text: 'text-gray-600',   ring: 'ring-gray-300',   bar: 'bg-gray-400',   emoji: '🌱' },
  'Active Citizen':    { bg: 'bg-blue-50',    text: 'text-blue-600',   ring: 'ring-blue-400',   bar: 'bg-blue-500',   emoji: '🏙️' },
  'Neighborhood Hero': { bg: 'bg-purple-50',  text: 'text-purple-600', ring: 'ring-purple-400', bar: 'bg-purple-500', emoji: '⭐' },
  'Civic Champion':    { bg: 'bg-yellow-50',  text: 'text-yellow-600', ring: 'ring-yellow-400', bar: 'bg-yellow-500', emoji: '🏆' },
};

const STATUS_STYLE = {
  'Pending':    'bg-gray-100 text-gray-600',
  'In-Progress':'bg-orange-100 text-orange-600',
  'Resolved':   'bg-emerald-100 text-emerald-700',
  'Rejected':   'bg-red-100 text-red-600',
};

const timeAgo = (dateStr) => {
  if (!dateStr) return '';
  const seconds = Math.floor((new Date() - new Date(dateStr)) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return Math.floor(hours / 24) + 'd ago';
};

export default function UserProfile() {
  const { currentUser } = useAuth();
  const [tab, setTab] = useState('overview');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.uid) return;

    const load = async () => {
      try {
        // 1. Fetch (or auto-create) the profile
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/users/me/${currentUser.uid}`);
        setData(res.data);

        // 2. Backfill Firebase display info in case the record was auto-created
        //    with placeholder values (happens when syncUser failed on login)
        if (currentUser.email) {
          await axios.post(`${import.meta.env.VITE_API_URL}/users/sync`, {
            uid: currentUser.uid,
            displayName: currentUser.displayName || '',
            email: currentUser.email,
            photoURL: currentUser.photoURL || '',
          });
        }
      } catch (err) {
        console.error('Profile load error:', err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [currentUser]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader size={32} className="animate-spin text-blue-500" />
    </div>
  );

  if (!data) {
    // This should be rare now that getMyProfile auto-creates users.
    // Offer a sync button instead of a dead-end message.
    const handleRetrySync = async () => {
      setLoading(true);
      try {
        await axios.post(`${import.meta.env.VITE_API_URL}/users/sync`, {
          uid: currentUser.uid,
          displayName: currentUser.displayName || '',
          email: currentUser.email,
          photoURL: currentUser.photoURL || '',
        });
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/users/me/${currentUser.uid}`);
        setData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-gray-400">
        <AlertCircle size={40} />
        <p className="font-bold text-lg text-gray-600">Couldn't load profile</p>
        <p className="text-sm text-center max-w-xs">This is usually a connection issue. Click below to try again.</p>
        <button
          onClick={handleRetrySync}
          className="px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors"
        >
          Retry &amp; Sync Profile
        </button>
      </div>
    );
  }

  const { profile, tierInfo, myIssues } = data;
  const tierStyle = TIER_STYLES[tierInfo?.name] || TIER_STYLES['Novice Reporter'];
  const karma = profile.karmaPoints || 0;
  const progress = tierInfo?.progress ?? 0;

  return (
    <div className="w-full max-w-4xl mx-auto animate-in fade-in duration-500">
      {/* Hero Card */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden mb-6">
        <div className="h-24 bg-gradient-to-r from-blue-600 to-indigo-700 relative">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        </div>
        <div className="px-8 pb-8 relative">
          {/* Avatar */}
          <div className={`absolute -top-10 w-20 h-20 rounded-2xl ring-4 ${tierStyle.ring} ring-offset-2 overflow-hidden shadow-lg`}>
            {currentUser?.photoURL ? (
              <img src={currentUser.photoURL} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-2xl">
                {(currentUser?.displayName || 'U').charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="pt-14 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-gray-900">{currentUser?.displayName || 'Citizen'}</h1>
              <p className="text-gray-500 font-medium text-sm">{currentUser?.email}</p>
              <div className={`inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-sm font-bold ${tierStyle.bg} ${tierStyle.text}`}>
                <span>{tierStyle.emoji}</span> {tierInfo?.name}
              </div>
            </div>

            {/* Karma Score */}
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-4xl font-black text-gray-900 tabular-nums">{karma}</div>
                <div className="text-[11px] font-extrabold text-gray-400 uppercase tracking-widest">Karma Points</div>
              </div>
              <div className={`w-14 h-14 rounded-xl ${tierStyle.bg} flex items-center justify-center text-2xl shadow-inner border border-white`}>
                {tierStyle.emoji}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          {tierInfo?.nextTier && (
            <div className="mt-6">
              <div className="flex justify-between text-[12px] font-bold text-gray-500 mb-2">
                <span>{tierInfo.name}</span>
                <span className="text-gray-400">{tierInfo.nextThreshold - karma} pts to <span className="font-extrabold text-gray-700">{tierInfo.nextTier}</span></span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${tierStyle.bar}`}
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
              <div className="text-right text-[11px] text-gray-400 font-medium mt-1">{progress}%</div>
            </div>
          )}
          {!tierInfo?.nextTier && (
            <div className="mt-4 flex items-center gap-2 text-yellow-600 text-sm font-bold bg-yellow-50 px-4 py-2 rounded-xl w-fit">
              🏆 Max Tier Reached — Civic Champion!
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-2xl w-fit">
        {[['overview', 'Overview'], ['reports', 'My Reports'], ['ledger', 'Karma Ledger']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${tab === key ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab: Overview */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Stat Cards */}
          {[
            { label: 'Total Reports', value: myIssues.length, icon: <MapPin size={20} />, color: 'text-blue-600 bg-blue-50' },
            { label: 'Resolved', value: myIssues.filter(i => i.status === 'Resolved').length, icon: <CheckCircle size={20} />, color: 'text-emerald-600 bg-emerald-50' },
            { label: 'Karma Points', value: karma, icon: <Star size={20} />, color: 'text-yellow-600 bg-yellow-50' },
          ].map((stat, i) => (
            <div 
              key={stat.label} 
              className="bg-white rounded-2xl border border-gray-200 p-6 flex items-center gap-4 shadow-sm animate-in fade-in slide-in-from-bottom-3 duration-500 fill-mode-both"
              style={{ animationDelay: `${(i + 1) * 100}ms` }}
            >
              <div className={`p-3 rounded-xl ${stat.color}`}>{stat.icon}</div>
              <div>
                <div className="text-3xl font-black text-gray-900">{stat.value}</div>
                <div className="text-[11px] font-extrabold text-gray-400 uppercase tracking-widest">{stat.label}</div>
              </div>
            </div>
          ))}

          {/* Tier breakdown */}
          <div className="col-span-full bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h3 className="font-extrabold text-gray-900 mb-4">Karma Tier Roadmap</h3>
            <div className="space-y-3">
              {[
                { name: 'Novice Reporter',   range: '0 – 100 pts',   emoji: '🌱', style: TIER_STYLES['Novice Reporter'] },
                { name: 'Active Citizen',    range: '101 – 500 pts', emoji: '🏙️', style: TIER_STYLES['Active Citizen'] },
                { name: 'Neighborhood Hero', range: '501 – 1500 pts',emoji: '⭐', style: TIER_STYLES['Neighborhood Hero'] },
                { name: 'Civic Champion',    range: '1500+ pts',     emoji: '🏆', style: TIER_STYLES['Civic Champion'] },
              ].map(tier => {
                const isCurrent = tierInfo?.name === tier.name;
                return (
                  <div key={tier.name} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${isCurrent ? `${tier.style.bg} border-current ${tier.style.text}` : 'border-gray-100 bg-gray-50'}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{tier.emoji}</span>
                      <div>
                        <p className={`text-sm font-bold ${isCurrent ? tier.style.text : 'text-gray-700'}`}>{tier.name}</p>
                        <p className="text-xs text-gray-400 font-medium">{tier.range}</p>
                      </div>
                    </div>
                    {isCurrent && <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full ${tier.style.bg} ${tier.style.text} border`}>Current</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab: My Reports */}
      {tab === 'reports' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {myIssues.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
              <Layers size={40} className="opacity-30" />
              <p className="font-bold text-lg text-gray-500">No reports submitted yet</p>
              <p className="text-sm">Submit your first civic issue to start earning karma.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {myIssues.map((issue, i) => (
                <li 
                  key={issue._id} 
                  className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors group animate-in fade-in slide-in-from-left-4 duration-500 fill-mode-both"
                  style={{ animationDelay: `${(i + 1) * 50}ms` }}
                >
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0 group-hover:scale-105 transition-transform">
                      {issue.imageUrl ? (
                        <img src={issue.imageUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-100 to-indigo-50 flex items-center justify-center">
                          <MapPin size={16} className="text-blue-300" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 text-sm truncate">{issue.title}</p>
                      <p className="text-xs text-gray-400 font-medium mt-0.5">{timeAgo(issue.createdAt)} · {issue.category}</p>
                    </div>
                  </div>
                  <span className={`ml-4 flex-shrink-0 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full ${STATUS_STYLE[issue.status] || 'bg-gray-100 text-gray-600'}`}>
                    {issue.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Tab: Karma Ledger */}
      {tab === 'ledger' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {(!profile.karmaLedger || profile.karmaLedger.length === 0) ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
              <TrendingUp size={40} className="opacity-30" />
              <p className="font-bold text-lg text-gray-500">No karma events yet</p>
              <p className="text-sm">Submit issues and get them resolved to earn points.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {profile.karmaLedger.map((entry, i) => {
                const isPositive = entry.delta >= 0;
                return (
                  <li key={i} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isPositive ? 'bg-emerald-50' : 'bg-red-50'}`}>
                        {isPositive ? <TrendingUp size={16} className="text-emerald-600" /> : <AlertCircle size={16} className="text-red-500" />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-800">{entry.reason}</p>
                        <p className="text-xs text-gray-400 font-medium">{timeAgo(entry.createdAt)}</p>
                      </div>
                    </div>
                    <span className={`text-base font-black tabular-nums ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
                      {isPositive ? '+' : ''}{entry.delta}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
