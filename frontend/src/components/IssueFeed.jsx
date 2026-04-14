import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import IssueCard from './IssueCard';
import IssueDetailModal from './IssueDetailModal';
import SkeletonGrid from './SkeletonGrid';
import { MapPin, ArrowRight, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function IssueFeed() {
  const [searchParams] = useSearchParams();
  const highlightedId = searchParams.get('highlight');
  
  const [issues, setIssues] = useState([]);
  const [selectedIssueId, setSelectedIssueId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [refreshing, setRefreshing] = useState(false);
  const pollRef = useRef(null);

  const fetchIssues = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/issues`);
      setIssues(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => { fetchIssues(); }, [fetchIssues]);

  // Auto-poll while any issue is still AI-analyzing
  useEffect(() => {
    const hasPending = (Array.isArray(issues) ? issues : []).some(i => i.aiPending);
    if (hasPending && !pollRef.current) {
      pollRef.current = setInterval(() => fetchIssues(true), 6000);
    } else if (!hasPending && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };
  }, [issues, fetchIssues]);

  const filters = ['All', 'Pending', 'In-Progress', 'Resolved'];
  const issuesList = Array.isArray(issues) ? issues : [];
  const filteredIssues = filter === 'All' ? issuesList : issuesList.filter(i => i.status === filter);

  return (
    <div className="w-full animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4 px-1">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Community Feed</h1>
            <button
              onClick={() => fetchIssues(true)}
              disabled={refreshing}
              title="Refresh feed"
              className="p-2 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={16} className={`text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            {(Array.isArray(issues) ? issues : []).some(i => i.aiPending) && (
              <span className="px-2.5 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-600 rounded-full border border-blue-100 animate-pulse">
                AI analyzing…
              </span>
            )}
          </div>
          <p className="text-gray-500 font-medium mt-1.5">Discover and discuss issues reported in your local area.</p>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide shrink-0 snap-x">
          {filters.map(f => (
            <button 
              key={f} 
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all shadow-sm snap-center ${filter === f ? 'bg-gray-900 text-white shadow-md scale-105' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:text-gray-900'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      
      {loading ? (
        <SkeletonGrid count={6} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* Neighborhood Overview Card */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-800 rounded-2xl p-6 md:p-8 text-white shadow-lg flex flex-col justify-between overflow-hidden relative group cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1 col-span-1 min-h-[420px]">
             <div className="absolute -right-8 -top-8 opacity-[0.08] group-hover:scale-110 group-hover:rotate-12 transition-all duration-700">
               <MapPin size={220} />
             </div>
             <div className="relative z-10">
               <div className="bg-white/20 w-12 h-12 rounded-xl flex items-center justify-center mb-6 backdrop-blur-md border border-white/10 shadow-inner">
                 <MapPin size={24} className="text-white" />
               </div>
               <h3 className="text-2xl font-black mb-3 tracking-tight">Neighborhood Overview</h3>
               <p className="text-blue-100 text-[15px] leading-relaxed max-w-[90%] font-medium">
                 You are currently viewing reports in the downtown district. Switch to map mode for precise geospatial insights and hotzones tailored to you.
               </p>
             </div>
             <Link to="/map" className="mt-8 flex items-center gap-2 font-bold text-sm bg-white/10 w-fit px-5 py-3 rounded-full backdrop-blur-md hover:bg-white/20 transition-colors shadow-sm relative z-10 border border-white/5 group-hover:bg-white group-hover:text-blue-600">
               Open Live Map <ArrowRight size={16} />
             </Link>
          </div>

          {filteredIssues.length === 0 ? (
            <div className="col-span-1 md:col-span-2 p-10 bg-white rounded-2xl border-2 border-gray-100 border-dashed flex flex-col items-center justify-center text-center gap-3">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-2">
                 <span className="text-2xl">🎉</span>
              </div>
              <p className="text-gray-900 font-bold text-lg">No {filter !== 'All' ? filter : ''} issues reported yet!</p>
              <p className="text-gray-500 text-sm max-w-sm">Your neighborhood is looking great right now.</p>
            </div>
          ) : (
            filteredIssues.map((issue, index) => (
              <div 
                key={issue._id} 
                className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both"
                style={{ animationDelay: `${(index + 1) * 100}ms` }}
              >
                <IssueCard 
                  issue={issue} 
                  highlighted={highlightedId === issue._id} 
                  onClick={() => setSelectedIssueId(issue._id)}
                />
              </div>
            ))
          )}
        </div>
      )}

      {selectedIssueId && (
        <IssueDetailModal 
          issueId={selectedIssueId} 
          onClose={() => setSelectedIssueId(null)}
          onUpdate={(updatedIssue) => {
            setIssues(prev => prev.map(i => i._id === updatedIssue._id ? updatedIssue : i));
          }}
        />
      )}
    </div>
  );
}
