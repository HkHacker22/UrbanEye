import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { BarChart3, ShieldCheck, Trash2, RefreshCw, Bell, BellOff, Clock, Loader, AlertCircle, CheckCircle, Activity } from 'lucide-react';

const ACTION_LABELS = {
  STATUS_CHANGE: { label: 'Status Changed', icon: <RefreshCw size={14} />, color: 'bg-blue-50 text-blue-600' },
  AUTHORITY_REGISTERED: { label: 'Authority Registered', icon: <ShieldCheck size={14} />, color: 'bg-purple-50 text-purple-600' },
  ISSUE_DELETED: { label: 'Issue Deleted', icon: <Trash2 size={14} />, color: 'bg-red-50 text-red-600' },
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

export default function AdminProfile() {
  const { currentUser } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notifyOnCritical, setNotifyOnCritical] = useState(true);
  const [notifyOnNewReport, setNotifyOnNewReport] = useState(false);
  const [savingPref, setSavingPref] = useState(false);

  useEffect(() => {
    if (!currentUser?.uid) return;
    axios.get(`${import.meta.env.VITE_API_URL}/users/admin/${currentUser.uid}`)
      .then(res => {
        setData(res.data);
        if (res.data.profile) {
          setNotifyOnCritical(res.data.profile.notifyOnCritical ?? true);
          setNotifyOnNewReport(res.data.profile.notifyOnNewReport ?? false);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [currentUser]);

  const savePrefs = async () => {
    setSavingPref(true);
    try {
      await axios.patch(`${import.meta.env.VITE_API_URL}/users/${currentUser.uid}/notifications`, {
        notifyOnCritical, notifyOnNewReport
      });
    } catch (e) { console.error(e); }
    setSavingPref(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader size={32} className="animate-spin text-blue-500" />
    </div>
  );

  const stats = data?.stats || {};
  const recentActions = data?.recentActions || [];

  return (
    <div className="w-full max-w-4xl mx-auto animate-in fade-in duration-500">
      {/* Hero */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden mb-6">
        <div className="h-24 bg-gradient-to-r from-gray-900 to-gray-700 relative">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
        </div>
        <div className="px-8 pb-8 relative">
          <div className="absolute -top-10 w-20 h-20 rounded-2xl ring-4 ring-gray-900 ring-offset-2 overflow-hidden shadow-lg bg-gray-900 flex items-center justify-center">
            {currentUser?.photoURL ? (
              <img src={currentUser.photoURL} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white font-black text-2xl">{(currentUser?.displayName || 'A').charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="pt-14 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-black text-gray-900">{currentUser?.displayName || 'Admin'}</h1>
                <span className="px-2.5 py-0.5 bg-gray-900 text-white text-[10px] font-extrabold uppercase tracking-wider rounded-full">Admin</span>
              </div>
              <p className="text-gray-500 font-medium text-sm">{currentUser?.email}</p>
            </div>
            <div className="flex items-center gap-2 text-sm font-bold text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              System Online
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Issues Triaged', value: stats.totalTriaged ?? 0, icon: <BarChart3 size={22} />, color: 'text-blue-600 bg-blue-50' },
          { label: 'Authorities Onboarded', value: stats.authoritiesOnboarded ?? 0, icon: <ShieldCheck size={22} />, color: 'text-purple-600 bg-purple-50' },
          { label: 'Reports Deleted', value: stats.issuesDeleted ?? 0, icon: <Trash2 size={22} />, color: 'text-red-600 bg-red-50' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-2xl border border-gray-200 p-6 flex items-center gap-4 shadow-sm">
            <div className={`p-3 rounded-xl ${stat.color}`}>{stat.icon}</div>
            <div>
              <div className="text-3xl font-black text-gray-900">{stat.value}</div>
              <div className="text-[11px] font-extrabold text-gray-400 uppercase tracking-widest">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity Log */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <Activity size={18} className="text-gray-500" />
            <h2 className="font-extrabold text-gray-900">Recent Activity</h2>
            <span className="ml-auto text-xs text-gray-400 font-medium">Last 10 actions</span>
          </div>
          {recentActions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-2">
              <AlertCircle size={36} className="opacity-30" />
              <p className="font-bold text-gray-500">No activity logged yet</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {recentActions.map((action, i) => {
                const meta = ACTION_LABELS[action.action] || { label: action.action, icon: <Activity size={14}/>, color: 'bg-gray-50 text-gray-600' };
                return (
                  <li key={i} className="flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 transition-colors">
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold flex-shrink-0 ${meta.color}`}>
                      {meta.icon} {meta.label}
                    </div>
                    <p className="text-sm text-gray-700 font-medium truncate flex-1">
                      {action.meta?.issueTitle || action.meta?.newStatus || action.targetId?.slice(-6).toUpperCase()}
                    </p>
                    <span className="text-xs text-gray-400 font-medium flex-shrink-0">{timeAgo(action.createdAt)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Quick Settings */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <Bell size={18} className="text-gray-500" />
            <h2 className="font-extrabold text-gray-900">Notifications</h2>
          </div>
          <div className="p-6 space-y-5">
            {[
              {
                key: 'notifyOnCritical',
                label: 'Critical Priority Alerts',
                desc: 'Notify when a critical issue is reported',
                value: notifyOnCritical,
                setter: setNotifyOnCritical,
                icon: <AlertCircle size={18} className="text-red-500" />,
              },
              {
                key: 'notifyOnNewReport',
                label: 'New Report Alerts',
                desc: 'Notify on every new submission',
                value: notifyOnNewReport,
                setter: setNotifyOnNewReport,
                icon: <Bell size={18} className="text-blue-500" />,
              },
            ].map(pref => (
              <div key={pref.key} className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{pref.icon}</div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">{pref.label}</p>
                    <p className="text-xs text-gray-400 font-medium">{pref.desc}</p>
                  </div>
                </div>
                <button
                  onClick={() => pref.setter(!pref.value)}
                  className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 mt-0.5 ${pref.value ? 'bg-blue-500' : 'bg-gray-200'}`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${pref.value ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
            ))}

            <button
              onClick={savePrefs}
              disabled={savingPref}
              className="w-full mt-2 bg-gray-900 hover:bg-gray-700 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            >
              {savingPref ? <Loader size={15} className="animate-spin" /> : <CheckCircle size={15} />}
              Save Preferences
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
