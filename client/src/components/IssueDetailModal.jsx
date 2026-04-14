import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  X, MapPin, Calendar, User, MessageCircle, Send, CheckCircle, 
  Clock, AlertTriangle, Shield, RefreshCw, ChevronRight, CornerDownRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function IssueDetailModal({ issueId, onClose, onUpdate }) {
  const { currentUser } = useAuth();
  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const chatEndRef = useRef(null);
  const modalRef = useRef(null);

  useEffect(() => {
    fetchIssueDetail();
  }, [issueId]);

  useEffect(() => {
    // Scroll to bottom of chat when new messages arrive
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [issue?.comments]);

  const fetchIssueDetail = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/issues/${issueId}`);
      setIssue(res.data);
    } catch (err) {
      console.error('Failed to fetch issue detail:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!comment.trim() || submitting || !currentUser) return;

    setSubmitting(true);
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/issues/${issueId}/comments`, {
        authorName: currentUser.displayName || 'User',
        authorUid: currentUser.uid,
        photoURL: currentUser.photoURL || '',
        text: comment.trim()
      });
      
      // Optimistic update for sub-optimal real-time
      setIssue(prev => ({
        ...prev,
        comments: [...(prev.comments || []), res.data]
      }));
      setComment('');
    } catch (err) {
      console.error('Failed to add comment:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (statusUpdating) return;
    
    // Simple toggle for MVP: Pending -> In-Progress -> Resolved -> Pending
    const statusCycle = ['Pending', 'In-Progress', 'Resolved'];
    const currentIndex = statusCycle.indexOf(issue.status);
    const nextStatus = statusCycle[(currentIndex + 1) % statusCycle.length];

    setStatusUpdating(true);
    try {
      const res = await axios.patch(`${import.meta.env.VITE_API_URL}/issues/${issueId}/status`, {
        status: nextStatus
      });
      setIssue(res.data);
      if (onUpdate) onUpdate(res.data);
    } catch (err) {
      console.error('Status update failed:', err);
    } finally {
      setStatusUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
        <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4">
          <RefreshCw size={32} className="text-blue-600 animate-spin" />
          <p className="font-bold text-gray-500 uppercase tracking-widest text-xs">Loading Details...</p>
        </div>
      </div>
    );
  }

  if (!issue) return null;

  const priorityColor = {
    'critical': 'bg-red-500 text-white',
    'high':     'bg-orange-500 text-white',
    'medium':   'bg-yellow-500 text-white',
    'low':      'bg-emerald-500 text-white',
  };

  const isReporter = currentUser?.uid === issue.reporterUid;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 sm:p-6 animate-in fade-in duration-300 overflow-hidden" 
         onClick={(e) => e.target === e.currentTarget && onClose()}>
      
      <div className="bg-white w-full max-w-5xl h-[90vh] sm:h-[85vh] rounded-[2.5rem] shadow-[0_32px_128px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col md:flex-row animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 ease-out border border-white/20">
        
        {/* Left Side: Detail & Hero */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-50/50 md:border-r border-gray-100 flex flex-col">
          {/* Hero Image / Header */}
          <div className="relative h-64 sm:h-80 flex-shrink-0 bg-gray-200 group">
            {issue.imageUrl ? (
              <img src={issue.imageUrl} alt={issue.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-700 flex items-center justify-center">
                 <Shield size={80} className="text-white/20" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            
            <button 
              onClick={onClose}
              className="absolute top-6 left-6 w-10 h-10 bg-white/10 hover:bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all shadow-lg border border-white/20 active:scale-95"
            >
              <X size={20} />
            </button>

            <div className="absolute bottom-8 left-8 right-8">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-3 shadow-lg ${priorityColor[issue.priority.toLowerCase()]}`}>
                <AlertTriangle size={12} /> {issue.priority} Priority
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight drop-shadow-md leading-tight">
                {issue.title}
              </h2>
            </div>
          </div>

          {/* Content Body */}
          <div className="p-8 sm:p-10 space-y-8 flex-1">
            {/* Meta Strip */}
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-3 bg-white p-2 pr-4 rounded-2xl shadow-sm border border-gray-100">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center overflow-hidden border border-blue-100">
                  {issue.reporterPhoto ? (
                    <img src={issue.reporterPhoto} alt="Reporter" className="w-full h-full object-cover" />
                  ) : (
                    <User size={20} className="text-blue-500" />
                  )}
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Uploaded By</p>
                  <p className="text-sm font-bold text-gray-900 leading-none">{issue.reporterName || 'Community Member'}</p>
                </div>
              </div>

              <div className="flex flex-col">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Category</p>
                <span className="text-sm font-bold text-blue-600 flex items-center gap-1.5">
                  <CornerDownRight size={14} /> {issue.category}
                </span>
              </div>

              <div className="flex flex-col">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Timestamp</p>
                <p className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                  <Calendar size={14} className="text-gray-400" /> {new Date(issue.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-3">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Report Description</p>
              <p className="text-gray-700 text-lg font-medium leading-relaxed italic border-l-4 border-blue-500 pl-6 py-1">
                "{issue.description}"
              </p>
            </div>

            {/* Action Section */}
            <div className="pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  issue.status === 'Resolved' ? 'bg-emerald-50 text-emerald-600' : 
                  issue.status === 'In-Progress' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'
                }`}>
                  {issue.status === 'Resolved' ? <CheckCircle size={24} /> : 
                   issue.status === 'In-Progress' ? <Clock size={24} className="animate-pulse" /> : <Clock size={24} />}
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Current Status</p>
                  <p className="text-xl font-black text-gray-900 tracking-tight">{issue.status}</p>
                </div>
              </div>

              {/* Only reporter or admin should see update button realistically, 
                  but allowing for demo/MVP purposes or authorized users */}
              <button 
                onClick={handleStatusUpdate}
                disabled={statusUpdating}
                className="w-full sm:w-auto px-8 py-4 bg-gray-900 hover:bg-black text-white font-black text-sm uppercase tracking-widest rounded-2xl transition-all shadow-xl hover:shadow-2xl active:scale-95 flex items-center justify-center gap-2 group disabled:opacity-50"
              >
                {statusUpdating ? <RefreshCw size={18} className="animate-spin" /> : <RefreshCw size={18} className="group-hover:rotate-180 transition-transform duration-500" />}
                Update Status
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Chat & Discussion */}
        <div className="w-full md:w-[400px] flex flex-col bg-white h-full max-h-full">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-black text-gray-900 tracking-tight flex items-center gap-2">
              <MessageCircle size={20} className="text-blue-500" />
              Discussion
            </h3>
            <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px] font-bold uppercase tracking-wider">
              {issue.comments?.length || 0} messages
            </span>
          </div>

          {/* Chat Feed */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-gray-50/30">
            {(!issue.comments || issue.comments.length === 0) ? (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                <div className="p-4 bg-gray-100 rounded-full mb-3">
                  <MessageCircle size={32} />
                </div>
                <p className="text-sm font-bold">No messages yet.</p>
                <p className="text-xs">Start the community discussion!</p>
              </div>
            ) : (
              issue.comments.map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.authorUid === currentUser?.uid ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                  <div className="flex items-center gap-2 mb-1 px-1">
                    {msg.authorUid !== currentUser?.uid && <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{msg.authorName}</span>}
                    <span className="text-[9px] font-bold text-gray-300">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm font-medium shadow-sm leading-relaxed ${
                    msg.authorUid === currentUser?.uid 
                      ? 'bg-blue-600 text-white rounded-tr-none' 
                      : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input */}
          <div className="p-6 bg-white border-t border-gray-100 shadow-[0_-10px_30px_rgba(0,0,0,0.02)]">
            {currentUser ? (
              <form onSubmit={handleAddComment} className="relative group">
                <input 
                  type="text" 
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share an update or question..." 
                  className="w-full bg-gray-50 border-transparent rounded-2xl py-4 pl-5 pr-14 text-[13px] font-bold text-gray-700 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all outline-none"
                />
                <button 
                  type="submit"
                  disabled={!comment.trim() || submitting}
                  className="absolute right-2 top-2 bottom-2 w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center transition-all shadow-lg active:scale-90 disabled:opacity-40 disabled:grayscale"
                >
                  {submitting ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </form>
            ) : (
              <div className="text-center p-3 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Sign in to participate</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
