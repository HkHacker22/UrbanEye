import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Shield, Loader, AlertTriangle, CheckCircle, Clock, Trash2, RefreshCw, Eye, ChevronDown, ChevronUp, MapPin } from 'lucide-react';

const ALERT_STYLES = {
  WEAPON_DETECTED:  { badge: 'bg-red-100 text-red-700',    dot: 'bg-red-500',    icon: '🔫' },
  NO_LICENSE_PLATE: { badge: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500', icon: '🚗' },
  PERSON_LOITERING: { badge: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500', icon: '🚶' },
};

const STATUS_STYLE = {
  pending:   { bg: 'bg-gray-100',   text: 'text-gray-600',   label: 'Pending'   },
  analyzing: { bg: 'bg-blue-100',   text: 'text-blue-700',   label: 'Analyzing' },
  complete:  { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Complete' },
  failed:    { bg: 'bg-red-100',    text: 'text-red-600',    label: 'Failed'    },
};

const formatTime = (secs) => {
  if (secs == null) return '—';
  const m = Math.floor(secs / 60);
  const s = (secs % 60).toFixed(1);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
};

const timeAgo = (dateStr) => {
  if (!dateStr) return '';
  const seconds = Math.floor((new Date() - new Date(dateStr)) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return Math.floor(seconds / 86400) + 'd ago';
};

function ResultRow({ result, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const st = STATUS_STYLE[result.status] || STATUS_STYLE.pending;

  const loadDetail = async () => {
    if (detail || loadingDetail) return;
    setLoadingDetail(true);
    try {
      const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/video/results/${result._id}`);
      setDetail(data);
    } catch (e) { console.error(e); }
    setLoadingDetail(false);
  };

  const toggle = () => {
    if (!expanded) loadDetail();
    setExpanded(!expanded);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500 fill-mode-both">
      {/* Header Row */}
      <div className="flex items-center gap-4 px-5 py-4">
        <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <Shield size={18} className="text-gray-600" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 text-sm truncate">
            {result.title || result.filename}
          </p>
          <p className="text-xs text-gray-400 font-medium">{timeAgo(result.createdAt)} · {result.reporterName || 'Anonymous'}</p>
        </div>

        {/* Alert count */}
        <div className="flex items-center gap-2">
          {result.alerts?.length > 0 ? (
            <span className="flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-600 text-xs font-bold rounded-full border border-red-100">
              🚨 {result.alerts.length} alert{result.alerts.length > 1 ? 's' : ''}
            </span>
          ) : result.status === 'complete' ? (
            <span className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-full border border-emerald-100">
              ✅ Clear
            </span>
          ) : null}
        </div>

        {/* Status */}
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${st.bg} ${st.text}`}>
          {result.status === 'analyzing' && <span className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full mr-1 animate-pulse" />}
          {st.label}
        </span>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={toggle}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <button
            onClick={() => onDelete(result._id)}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Expanded Detail */}
      {expanded && (
        <div className="border-t border-gray-100 px-5 py-4 bg-gray-50/50">
          {loadingDetail ? (
            <div className="flex items-center gap-2 text-gray-400 text-sm py-2">
              <Loader size={14} className="animate-spin" /> Loading details...
            </div>
          ) : detail ? (
            <div className="space-y-5">
              {/* Incident Context */}
              <div className="flex flex-col md:flex-row gap-5">
                <div className="flex-1">
                  <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1.5">Description</p>
                  <p className="text-sm text-gray-700 font-medium leading-relaxed">
                    {detail.description || <span className="text-gray-400 italic font-normal">No description provided</span>}
                  </p>
                </div>
                {detail.location?.coordinates?.length === 2 && (
                  <div className="flex-shrink-0">
                    <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1.5">Location</p>
                    <a 
                      href={`https://www.google.com/maps?q=${detail.location.coordinates[1]},${detail.location.coordinates[0]}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-blue-600 hover:bg-blue-50 transition-colors shadow-sm"
                    >
                      <MapPin size={14} />
                      View on Maps ↗
                    </a>
                  </div>
                )}
              </div>

              <div className="h-px bg-gray-200" />
              {/* Alerts */}
              {detail.alerts?.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Anomaly Alerts</p>
                  {detail.alerts.map((alert, i) => {
                    const style = ALERT_STYLES[alert.type] || ALERT_STYLES.PERSON_LOITERING;
                    return (
                      <div key={i} className="flex items-start gap-3 bg-white rounded-xl p-3 border border-gray-100">
                        <span className="text-lg">{style.icon}</span>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${style.badge}`}>
                              {alert.type.replace(/_/g, ' ')}
                            </span>
                            <span className="text-xs font-bold text-gray-500 flex items-center gap-1">
                              <Clock size={10} /> {formatTime(alert.timestamp)}
                            </span>
                          </div>
                          <p className="text-xs font-medium text-gray-700">{alert.message}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : detail.status === 'complete' ? (
                <p className="text-sm font-bold text-emerald-600 flex items-center gap-2">
                  <CheckCircle size={16} /> No anomalies detected in this video
                </p>
              ) : null}

              {/* Object summary */}
              {detail.objects?.length > 0 && (
                <div>
                  <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-2">Detected Objects ({detail.objects.length})</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[...new Set(detail.objects.map(o => o.label))].slice(0, 15).map(label => (
                      <span key={label} className="px-2.5 py-1 bg-white border border-gray-200 text-xs font-bold text-gray-600 rounded-full capitalize">
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {detail.status === 'failed' && detail.errorMessage && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                  <p className="text-xs font-bold text-red-600">{detail.errorMessage}</p>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default function AdminSafety() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | complete | analyzing | failed | alerts

  useEffect(() => {
    fetchResults();
    // Auto-refresh if any are analyzing
    const interval = setInterval(() => {
      setResults(prev => {
        if (prev.some(r => r.status === 'analyzing' || r.status === 'pending')) {
          fetchResults();
        }
        return prev;
      });
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const fetchResults = async () => {
    try {
      const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/video/results`);
      setResults(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this analysis?')) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/video/results/${id}`);
      setResults(prev => prev.filter(r => r._id !== id));
    } catch (e) { console.error(e); }
  };

  const filtered = results.filter(r => {
    if (filter === 'all') return true;
    if (filter === 'alerts') return r.alerts?.length > 0;
    return r.status === filter;
  });

  const alertCount = results.filter(r => r.alerts?.length > 0).length;
  const analyzingCount = results.filter(r => r.status === 'analyzing' || r.status === 'pending').length;

  return (
    <div className="w-full animate-in fade-in duration-500">
      {/* Header */}
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
            <Shield size={28} className="text-red-600" /> Safety Monitor
          </h1>
          <p className="text-gray-500 font-medium mt-1">AI-powered video anomaly detection results</p>
        </div>
        <button
          onClick={fetchResults}
          className="flex items-center gap-2 border border-gray-200 bg-white text-gray-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors"
        >
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Analyses', value: results.length, icon: <Eye size={20}/>, color: 'text-blue-600 bg-blue-50' },
          { label: 'With Alerts', value: alertCount, icon: <AlertTriangle size={20}/>, color: 'text-red-600 bg-red-50' },
          { label: 'In Progress', value: analyzingCount, icon: <Loader size={20} className={analyzingCount > 0 ? 'animate-spin' : ''}/>, color: 'text-orange-600 bg-orange-50' },
          { label: 'Cleared', value: results.filter(r => r.status === 'complete' && r.alerts?.length === 0).length, icon: <CheckCircle size={20}/>, color: 'text-emerald-600 bg-emerald-50' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-3 shadow-sm">
            <div className={`p-2.5 rounded-xl ${stat.color}`}>{stat.icon}</div>
            <div>
              <div className="text-2xl font-black text-gray-900">{stat.value}</div>
              <div className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-2xl w-fit">
        {[['all', 'All'], ['alerts', '🚨 With Alerts'], ['analyzing', 'Analyzing'], ['complete', 'Complete'], ['failed', 'Failed']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-1.5 rounded-xl text-sm font-bold transition-all ${filter === key ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Results List */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader size={32} className="animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
          <Shield size={48} className="opacity-30" />
          <p className="font-bold text-lg text-gray-500">
            {filter === 'all' ? 'No video analyses yet' : `No ${filter} analyses`}
          </p>
          <p className="text-sm">Users can submit videos via the Safety page</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r, i) => (
            <div key={r._id} style={{ animationDelay: `${(i + 1) * 100}ms` }}>
              <ResultRow result={r} onDelete={handleDelete} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
