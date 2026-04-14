import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import { BarChart3, ClipboardList, CheckCircle, Search, Filter, FileText, ArrowRight, X, MapPin, Plus, LayoutGrid, List as ListIcon, Layers, Phone, ArrowUp, Trash2, AlertTriangle, Navigation, RefreshCw, Shield } from 'lucide-react';
import { GoogleMap, useLoadScript, Marker, InfoWindow, HeatmapLayer } from '@react-google-maps/api';
import SkeletonGrid, { SkeletonTable } from './SkeletonGrid';

const mapContainerStyle = { width: '100%', height: '100%', borderRadius: '16px' };
const FALLBACK_CENTER = { lat: 20.5937, lng: 78.9629 }; // India geographic center as fallback

export default function AdminDashboard() {
  const [stats, setStats] = useState({ totalIssues: 0, pendingCount: 0, inProgressCount: 0, resolvedCount: 0 });
  const [recentIssues, setRecentIssues] = useState([]);
  const [serviceCenters, setServiceCenters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [showIssueLog, setShowIssueLog] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // Map center — starts from geolocation, falls back to India geographic center
  const [mapCenter, setMapCenter] = useState(FALLBACK_CENTER);
  const mapRef = useRef(null);
  const mapRefExpanded = useRef(null);

  const onMapLoad = useCallback((map) => { mapRef.current = map; }, []);
  const onMapLoadExpanded = useCallback((map) => { mapRefExpanded.current = map; }, []);

  // Request the admin's real-world location once on mount
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMapCenter(loc);
        mapRef.current?.panTo(loc);
        mapRefExpanded.current?.panTo(loc);
      },
      (err) => console.warn('Geolocation denied:', err.message),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  // Open Issue Log modal if ?log=open is in the URL (e.g. from sidebar link)
  useEffect(() => {
    if (searchParams.get('log') === 'open') {
      setShowIssueLog(true);
    }
  }, [searchParams]);

  const closeIssueLog = () => {
    setShowIssueLog(false);
    setSearchParams({});
  };

  // UI States
  const [viewMode, setViewMode] = useState('list');
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [selectedMapItem, setSelectedMapItem] = useState(null);
  const [isMapExpanded, setIsMapExpanded] = useState(false);

  // Creation States — isCreationMode = coordinate-picking mode, showAuthorityModal = form open
  const [isCreationMode, setIsCreationMode] = useState(false);
  const [showAuthorityModal, setShowAuthorityModal] = useState(false);
  const [newCenterLat, setNewCenterLat] = useState('');
  const [newCenterLng, setNewCenterLng] = useState('');
  const [newCenterName, setNewCenterName] = useState('');
  const [newCenterType, setNewCenterType] = useState('Police');
  const [newCenterContact, setNewCenterContact] = useState('');

  const refreshData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [statsRes, issuesRes, centersRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL}/issues/stats`),
        axios.get(`${import.meta.env.VITE_API_URL}/issues`),
        axios.get(`${import.meta.env.VITE_API_URL}/service-centers`)
      ]);
      setStats(statsRes.data);
      setRecentIssues(issuesRes.data);
      setServiceCenters(centersRes.data);
      
      // Update selectedIssue if it's currently open
      if (selectedIssue) {
        const updated = issuesRes.data.find(i => i._id === selectedIssue._id);
        if (updated) setSelectedIssue(updated);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedIssue]);

  useEffect(() => {
    refreshData();
  }, []);

  const mapLibraries = useMemo(() => ["visualization"], []);
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries: mapLibraries
  });

  const handleStatusChange = async (id, newStatus, e) => {
    e.stopPropagation();
    try {
      await axios.patch(`${import.meta.env.VITE_API_URL}/issues/${id}/status`, { status: newStatus });
      setRecentIssues(prev => prev.map(issue => issue._id === id ? { ...issue, status: newStatus } : issue));

      // Refresh stats from backend to be fully accurate across changes
      const statsRes = await axios.get(`${import.meta.env.VITE_API_URL}/issues/stats`);
      setStats(statsRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteIssue = async (id, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Permanently delete this report? This cannot be undone.')) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/issues/${id}`);
      setRecentIssues(prev => prev.filter(i => i._id !== id));
      if (selectedIssue && selectedIssue._id === id) setSelectedIssue(null);
      const statsRes = await axios.get(`${import.meta.env.VITE_API_URL}/issues/stats`);
      setStats(statsRes.data);
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Failed to delete issue: ' + (err?.response?.data?.error || err.message));
    }
  };

  const handleReassign = async (issueId, centerName, centerType) => {
    try {
      const res = await axios.patch(`${import.meta.env.VITE_API_URL}/issues/${issueId}/reassign`, {
        assignedCenterName: centerName,
        assignedCenterType: centerType
      });
      
      // Update local state
      setRecentIssues(prev => prev.map(issue => issue._id === issueId ? res.data : issue));
      if (selectedIssue && selectedIssue._id === issueId) {
        setSelectedIssue(res.data);
      }
    } catch (err) {
      console.error('Reassignment failed:', err);
      alert('Failed to reassign authority.');
    }
  };

  const handleMapClick = (e) => {
    if (!isCreationMode) return;
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setNewCenterLat(lat.toFixed(6));
    setNewCenterLng(lng.toFixed(6));
    setIsCreationMode(false);
    setShowAuthorityModal(true);
  };

  const handleCreateCenter = async () => {
    const lat = parseFloat(newCenterLat);
    const lng = parseFloat(newCenterLng);
    if (!newCenterName || isNaN(lat) || isNaN(lng)) return;
    try {
      const payload = {
        name: newCenterName,
        type: newCenterType,
        contactInfo: newCenterContact,
        location: { type: 'Point', coordinates: [lng, lat] }
      };
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/service-centers`, payload);
      setServiceCenters([res.data, ...serviceCenters]);
      setNewCenterLat('');
      setNewCenterLng('');
      setNewCenterName('');
      setNewCenterContact('');
      setShowAuthorityModal(false);
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.details || err?.response?.data?.error || err.message || 'Unknown error';
      alert(`Failed to register authority: ${msg}`);
    }
  };

  const getMarkerIcon = (type) => {
    let fillColor = '#3b82f6'; // default Infrastructure (blue)
    if (type === 'Police') fillColor = '#1d4ed8'; // darker blue
    if (type === 'Medical') fillColor = '#ef4444'; // red
    if (type === 'Fire') fillColor = '#f97316'; // orange

    return window.google ? {
      path: window.google.maps.SymbolPath.CIRCLE,
      fillColor,
      fillOpacity: 1,
      strokeWeight: 2,
      strokeColor: '#ffffff',
      scale: 8
    } : null;
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'PENDING': return 'bg-red-50 text-red-600 border border-red-200';
      case 'IN PROGRESS': return 'bg-blue-50 text-blue-600 border border-blue-200';
      case 'RESOLVED': return 'bg-green-50 text-green-600 border border-green-200';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getPriorityStyle = (priority) => {
    switch ((priority || '').toLowerCase()) {
      case 'critical': return 'bg-red-800 text-white shadow-sm ring-2 ring-red-200 animate-pulse';
      case 'high': return 'bg-orange-100 text-orange-700 border border-orange-200';
      case 'medium': return 'bg-yellow-50 text-yellow-700 border border-yellow-200';
      case 'low': return 'bg-gray-100 text-gray-500 border border-gray-200';
      default: return 'bg-gray-100 text-gray-500';
    }
  };

  const getCategoryStyle = (category) => {
    const cat = (category || '').toLowerCase();
    if (cat.includes('safety') || cat.includes('police') || cat.includes('crime'))
      return 'bg-red-50 text-red-600 border border-red-200';
    if (cat.includes('sanitation') || cat.includes('waste') || cat.includes('garbage'))
      return 'bg-emerald-50 text-emerald-600 border border-emerald-200';
    if (cat.includes('noise'))
      return 'bg-purple-50 text-purple-600 border border-purple-200';
    if (cat.includes('road') || cat.includes('infrastructure') || cat.includes('pothole'))
      return 'bg-orange-50 text-orange-600 border border-orange-200';
    if (cat.includes('flood') || cat.includes('water') || cat.includes('utilities'))
      return 'bg-blue-50 text-blue-600 border border-blue-200';
    return 'bg-gray-100 text-gray-600 border border-gray-200';
  };

  const isUnassigned = (row) => {
    const name = row.assignedCenterName || '';
    return !name || name === 'Central Municipal Hub';
  };

  return (
    <div className="w-full animate-in fade-in duration-500">
      {/* Header */}
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Platform Overview</h1>
          <p className="text-gray-500 font-medium mt-1">Real-time monitoring of civic infrastructure reports and resolution metrics.</p>
        </div>
        <button
          onClick={() => setShowIssueLog(true)}
          className="flex items-center gap-2 bg-gray-900 hover:bg-gray-700 text-white px-5 py-2.5 rounded-xl text-[14px] font-bold shadow-sm transition-all active:scale-95"
        >
          <FileText size={16} /> Issue Log
        </button>
      </div>

      {/* Top Row: KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-6">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <BarChart3 size={26} />
            </div>

          </div>
          <div>
            <h2 className="text-[11px] font-extrabold text-gray-400 uppercase tracking-widest mb-1.5">TOTAL ISSUES REPORTED</h2>
            <p className="text-4xl font-black text-gray-900 tracking-tight">
              {isLoading ? <span className="opacity-0 animate-pulse bg-gray-200 rounded text-transparent">0000</span> : stats.totalIssues}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-6">
            <div className="p-3 bg-red-50 text-red-600 rounded-xl">
              <ClipboardList size={26} />
            </div>
            <span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full border border-red-200">Urgent</span>
          </div>
          <div>
            <h2 className="text-[11px] font-extrabold text-gray-400 uppercase tracking-widest mb-1.5">PENDING REVIEW</h2>
            <p className="text-4xl font-black text-gray-900 tracking-tight">
              {isLoading ? <span className="opacity-0 animate-pulse bg-gray-200 rounded text-transparent">000</span> : stats.pendingCount}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-6">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle size={26} />
            </div>
          </div>
          <div>
            <h2 className="text-[11px] font-extrabold text-gray-400 uppercase tracking-widest mb-1.5">RESOLVED ISSUES</h2>
            <p className="text-4xl font-black text-gray-900 tracking-tight">
              {isLoading ? <span className="opacity-0 animate-pulse bg-gray-200 rounded text-transparent">000</span> : stats.resolvedCount}
            </p>
          </div>
        </div>
      </div>

      {/* Middle Section: Data Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm mb-8 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div className="relative max-w-sm w-full group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-400 group-focus-within:text-blue-500" />
            </div>
            <input type="text" placeholder="Search Report ID or Title..." className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all bg-gray-50 focus:bg-white" />
          </div>
          <div className="flex gap-2">
            <button className="flex items-center justify-center gap-2 border border-gray-200 bg-white text-gray-700 px-5 py-2 rounded-xl text-[14px] font-bold hover:bg-gray-50 transition-colors shadow-sm active:scale-95">
              <Filter size={16} /> Filters
            </button>
            <div className="border border-gray-200 bg-white rounded-xl flex items-center p-1 shadow-sm">
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-colors flex items-center justify-center ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
              >
                <ListIcon size={18} />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors flex items-center justify-center ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
              >
                <LayoutGrid size={18} />
              </button>
            </div>
          </div>
        </div>

        {viewMode === 'list' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-4 text-[12px] font-extrabold text-gray-500 uppercase tracking-wider">Report ID</th>
                  <th className="px-6 py-4 text-[12px] font-extrabold text-gray-500 uppercase tracking-wider">Issue Title & Category</th>
                  <th className="px-6 py-4 text-[12px] font-extrabold text-gray-500 uppercase tracking-wider">Submitted Date</th>
                  <th className="px-6 py-4 text-[12px] font-extrabold text-gray-500 uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-4 text-[12px] font-extrabold text-gray-500 uppercase tracking-wider">Assigned To</th>
                  <th className="px-6 py-4 text-[12px] font-extrabold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-[12px] font-extrabold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr>
                    <td colSpan="7" className="p-0">
                      <SkeletonTable rows={6} />
                    </td>
                  </tr>
                ) : recentIssues.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-gray-500 font-medium tracking-wide">No recent reports found in the network.</td>
                  </tr>
                ) : (
                  recentIssues.map((row) => (
                    <tr key={row._id} onClick={async () => {
                      try {
                        const res = await axios.get(`${import.meta.env.VITE_API_URL}/issues/${row._id}`);
                        setSelectedIssue(res.data);
                      } catch { setSelectedIssue(row); }
                      if (!row.isReadByAdmin) {
                        axios.patch(`${import.meta.env.VITE_API_URL}/issues/${row._id}/read`).catch(console.error);
                        setRecentIssues(prev => prev.map(i => i._id === row._id ? { ...i, isReadByAdmin: true } : i));
                      }
                    }} className="hover:bg-blue-50/30 transition-colors cursor-pointer group animate-in fade-in slide-in-from-left-2 duration-300">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-600 group-hover:underline">#{row._id.substring(row._id.length - 6).toUpperCase()}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {!row.isReadByAdmin && (
                            <span className="w-2.5 h-2.5 bg-blue-600 rounded-full shadow-[0_0_8px_rgba(37,99,235,0.6)] animate-pulse flex-shrink-0" title="New Report"></span>
                          )}
                          <div className="text-[15px] font-extrabold text-gray-900 leading-snug">{row.title}</div>
                        </div>
                        {row.category && (
                          <span className={`mt-1.5 inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded tracking-wider uppercase ml-4.5 ${!row.isReadByAdmin ? 'ml-[18px]' : ''} ${getCategoryStyle(row.category)}`}>
                            {row.category}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">{new Date(row.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 text-[10px] font-bold rounded flex w-fit items-center tracking-wider uppercase ${getPriorityStyle(row.priority)}`}>
                          {row.priority || 'medium'}
                        </span>
                      </td>
                      <td className="px-6 py-4 min-w-[160px]">
                        {isUnassigned(row) ? (
                          <div className="flex flex-col gap-1">
                            <span className="flex items-center gap-1.5 text-[11px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg w-fit">
                              ⚠️ No Authority Nearby
                            </span>
                            <span className="text-[10px] text-gray-400 font-medium">Register an authority on the map</span>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-bold text-gray-800">{row.assignedCenterName}</span>
                            {row.assignedCenterType && (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded w-fit ${getCategoryStyle(row.assignedCenterType)}`}>
                                {row.assignedCenterType}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1.5 text-[10px] font-bold rounded-full tracking-wider uppercase ${getStatusStyle(row.status.toUpperCase().replace('-', ' '))}`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <select
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => handleStatusChange(row._id, e.target.value, e)}
                          value={row.status}
                          className="bg-gray-50 border border-gray-200 text-gray-700 font-bold py-1.5 px-3 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500 cursor-pointer shadow-sm hover:bg-gray-100 transition-colors ml-auto block"
                        >
                          <option value="Pending">Pending</option>
                          <option value="In-Progress">In-Progress</option>
                          <option value="Resolved">Resolved</option>
                        </select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 bg-gray-50/50">
            {isLoading ? (
              <div className="col-span-full">
                <SkeletonGrid count={8} />
              </div>
            ) : recentIssues.length === 0 ? (
              <div className="col-span-full py-12 text-center text-gray-500 font-medium">No recent reports found in the network.</div>
            ) : (
              recentIssues.map((row, idx) => (
                <div 
                  key={row._id} 
                  style={{ animationDelay: `${(idx + 1) * 50}ms` }}
                  onClick={async () => {
                    try {
                      const res = await axios.get(`${import.meta.env.VITE_API_URL}/issues/${row._id}`);
                      setSelectedIssue(res.data);
                    } catch { setSelectedIssue(row); }
                    if (!row.isReadByAdmin) {
                      axios.patch(`${import.meta.env.VITE_API_URL}/issues/${row._id}/read`).catch(console.error);
                      setRecentIssues(prev => prev.map(i => i._id === row._id ? { ...i, isReadByAdmin: true } : i));
                    }
                  }} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-lg transition-all cursor-pointer group flex flex-col animate-in fade-in zoom-in-95 duration-500 fill-mode-both">
                  <div className="h-40 bg-gray-100 relative overflow-hidden">
                    {row.imageUrl ? (
                      <img src={row.imageUrl} alt={row.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-100 to-indigo-50 border-b border-gray-100 flex items-center justify-center">
                        <Layers size={40} className="text-blue-200" />
                      </div>
                    )}
                    <div className="absolute top-3 right-3 flex flex-col gap-1.5 items-end">
                      {!row.isReadByAdmin && (
                        <span className="px-2 py-0.5 text-[9px] font-black rounded-full shadow-md tracking-wider uppercase bg-blue-600 text-white animate-pulse">
                          New
                        </span>
                      )}
                      <span className={`px-2.5 py-1 text-[10px] font-bold rounded shadow-sm tracking-wider uppercase backdrop-blur-md bg-white/90 ${getPriorityStyle(row.priority)}`}>
                        {row.priority || 'medium'}
                      </span>
                      <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full shadow-sm tracking-wider uppercase backdrop-blur-md bg-white/90 ${getStatusStyle(row.status.toUpperCase().replace('-', ' '))}`}>
                        {row.status}
                      </span>
                    </div>
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <div className="text-xs font-bold text-blue-600 mb-1">#{row._id.substring(row._id.length - 6).toUpperCase()}</div>
                    <h3 className="text-[15px] font-extrabold text-gray-900 leading-tight mb-2 line-clamp-2">{row.title}</h3>
                    <div className="mt-auto flex items-center justify-between text-xs font-medium text-gray-500">
                      <span className="flex items-center gap-1"><MapPin size={12} />{row.assignedCenterName || 'Pending'}</span>
                      <span>{new Date(row.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Bottom Section: Map & Analytics */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Map Panel (2/3) */}
        <div
          className="xl:col-span-2 bg-gray-100 rounded-2xl overflow-hidden h-[450px] relative border border-gray-200 shadow-sm group"
          style={{ cursor: isCreationMode ? 'none' : 'default' }}
        >
          {isCreationMode && (
            <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center">
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg animate-pulse">
                📍 Click on the map to place the authority
              </div>
            </div>
          )}
          {isLoaded ? (
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={mapCenter}
              zoom={12}
              onLoad={onMapLoad}
              options={{ disableDefaultUI: true, gestureHandling: 'greedy', draggableCursor: isCreationMode ? 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'32\' height=\'32\' viewBox=\'0 0 32 32\'%3E%3Ccircle cx=\'16\' cy=\'16\' r=\'12\' fill=\'%232563eb\' fill-opacity=\'0.25\' stroke=\'%232563eb\' stroke-width=\'3\'/%3E%3Ccircle cx=\'16\' cy=\'16\' r=\'4\' fill=\'%232563eb\'/%3E%3C/svg%3E") 16 16, crosshair' : 'grab' }}
              onClick={handleMapClick}
            >
              {showHeatmap && recentIssues.length > 0 && window.google && (
                <HeatmapLayer
                  data={recentIssues.filter(i => i.location && i.location.coordinates).map(issue => new window.google.maps.LatLng(issue.location.coordinates[1], issue.location.coordinates[0]))}
                  options={{
                    radius: 60,
                    opacity: 0.75,
                    dissipating: true,
                    gradient: [
                      'rgba(0, 255, 0, 0)',
                      'rgba(0, 255, 0, 0.4)',
                      'rgba(50, 205, 50, 0.6)',
                      'rgba(173, 255, 47, 0.7)',
                      'rgba(255, 255, 0, 0.8)',
                      'rgba(255, 200, 0, 0.85)',
                      'rgba(255, 165, 0, 0.9)',
                      'rgba(255, 120, 0, 0.92)',
                      'rgba(255, 69, 0, 0.95)',
                      'rgba(255, 0, 0, 1)',
                      'rgba(200, 0, 0, 1)',
                      'rgba(139, 0, 0, 1)'
                    ]
                  }}
                />
              )}
              {serviceCenters.map(c => (
                <Marker
                  key={c._id}
                  position={{ lat: c.location.coordinates[1], lng: c.location.coordinates[0] }}
                  icon={getMarkerIcon(c.type)}
                  title={`${c.name} (${c.type})`}
                  onClick={() => setSelectedMapItem({ type: 'authority', data: c })}
                />
              ))}
              {recentIssues.filter(i => i.location && i.location.coordinates).map(issue => (
                <Marker
                  key={issue._id}
                  position={{ lat: issue.location.coordinates[1], lng: issue.location.coordinates[0] }}
                  onClick={() => setSelectedMapItem({ type: 'issue', data: issue })}
                />
              ))}
              {selectedMapItem && (
                <InfoWindow
                  position={{ lat: selectedMapItem.data.location.coordinates[1], lng: selectedMapItem.data.location.coordinates[0] }}
                  onCloseClick={() => setSelectedMapItem(null)}
                >
                  <div className="p-2 max-w-[200px]">
                    <h4 className="font-bold text-gray-900 text-sm mb-1">{selectedMapItem.data.title || selectedMapItem.data.name}</h4>
                    {selectedMapItem.type === 'issue' && (
                      <>
                        <div className={`text-[10px] uppercase font-bold tracking-wider mb-2 ${getPriorityStyle(selectedMapItem.data.priority)} inline-block px-1.5 py-0.5 rounded`}>
                          {selectedMapItem.data.priority || 'medium'}
                        </div>
                        {selectedMapItem.data.imageUrl && <img src={selectedMapItem.data.imageUrl} className="w-full h-16 object-cover rounded mb-2" />}
                        <button onClick={() => { setSelectedIssue(selectedMapItem.data); setSelectedMapItem(null); }} className="text-xs text-blue-600 font-bold hover:underline">View full details &rarr;</button>
                      </>
                    )}
                    {selectedMapItem.type === 'authority' && (
                      <>
                        <p className="text-xs text-gray-600 mb-1 font-medium"><Layers size={10} className="inline mr-1" />{selectedMapItem.data.type}</p>
                        {selectedMapItem.data.contactInfo && (
                          <p className="text-xs text-gray-600 font-medium"><Phone size={10} className="inline mr-1" />{selectedMapItem.data.contactInfo}</p>
                        )}
                        {selectedIssue && (
                          <button 
                            onClick={() => {
                              handleReassign(selectedIssue._id, selectedMapItem.data.name, selectedMapItem.data.type);
                              setSelectedMapItem(null);
                            }}
                            className="mt-3 w-full bg-blue-600 text-white text-[10px] font-bold py-2 rounded shadow hover:bg-blue-700 transition-colors uppercase tracking-wider"
                          >
                            Assign selected issue here
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          ) : (
            <div className="w-full h-full flex items-center justify-center font-bold text-gray-400 bg-gray-50 border-2 border-dashed border-gray-200">Initializing Grid Matrix...</div>
          )}

          {/* Map overlay: top-left action buttons */}
          <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
            <button
              onClick={() => setIsCreationMode(true)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] font-bold shadow-md border transition-all active:scale-95 ${isCreationMode
                ? 'bg-blue-600 text-white border-blue-700 animate-pulse'
                : 'bg-white/95 backdrop-blur-xl text-blue-600 border-blue-200 hover:bg-blue-50'
                }`}
            >
              <span className="w-3 h-3 rounded-full border-2 border-blue-600 bg-blue-200 inline-block"></span>
              {isCreationMode ? 'Click map to place…' : 'Register Authority'}
            </button>
            {isCreationMode && (
              <button
                onClick={() => setIsCreationMode(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-bold bg-white/95 backdrop-blur-xl text-gray-600 border border-gray-200 shadow-md hover:bg-gray-50 active:scale-95"
              >
                <X size={13} /> Cancel
              </button>
            )}
          </div>

          {/* Map overlay: top-right controls */}
          <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
            <button
              onClick={() => setIsMapExpanded(true)}
              className="w-9 h-9 flex items-center justify-center bg-white/95 backdrop-blur-xl rounded-xl shadow-md border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
              title="Maximize map"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" /></svg>
            </button>
            <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-3 shadow-md border border-gray-200 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-bold text-gray-700">Heat Map</span>
                <label className="relative cursor-pointer flex items-center">
                  <input type="checkbox" className="sr-only" checked={showHeatmap} onChange={() => setShowHeatmap(!showHeatmap)} />
                  <div className={`w-10 h-6 rounded-full transition-colors flex items-center ${showHeatmap ? 'bg-orange-500' : 'bg-gray-300'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full shadow-md ml-1 transition-transform ${showHeatmap ? 'translate-x-4' : ''}`}></div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className="absolute bottom-6 left-6 bg-white/95 backdrop-blur-xl rounded-2xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-200 max-w-xs transition-transform group-hover:-translate-y-1">
            <h3 className="font-extrabold text-gray-900 text-lg mb-1 leading-tight">Spatial Distribution</h3>
            <div className="flex items-center gap-2 text-sm text-gray-600 font-bold mt-2">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)] animate-pulse"></span>
              Live Activity Monitor
            </div>
          </div>
        </div>

        {/* Right Stack (1/3) */}
        <div className="xl:col-span-1 flex flex-col gap-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex-1 flex flex-col">
            <h3 className="font-extrabold text-gray-900 text-lg mb-6">Staff Performance</h3>
            <div className="space-y-6 flex-1 justify-center flex flex-col">
              <div>
                <div className="flex justify-between text-[13px] mb-2">
                  <span className="font-bold text-gray-700 tracking-wide">Repair Squad A</span>
                  <span className="font-black text-blue-600">85%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5">
                  <div className="bg-blue-500 h-2.5 rounded-full shadow-inner" style={{ width: '85%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[13px] mb-2">
                  <span className="font-bold text-gray-700 tracking-wide">Civic Tech Dept</span>
                  <span className="font-black text-blue-600">62%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5">
                  <div className="bg-blue-400 h-2.5 rounded-full shadow-inner" style={{ width: '62%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[13px] mb-2">
                  <span className="font-bold text-gray-700 tracking-wide">Sanitation Unit</span>
                  <span className="font-black text-blue-600">91%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5">
                  <div className="bg-blue-700 h-2.5 rounded-full shadow-inner" style={{ width: '91%' }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-600 hover:bg-blue-700 rounded-2xl p-6 text-white shadow-md flex flex-col justify-center items-start shrink-0 h-44 relative overflow-hidden group cursor-pointer transition-colors">
            <div className="absolute -right-6 -top-6 opacity-10 group-hover:scale-110 group-hover:-rotate-12 transition-all duration-700">
              <FileText size={140} />
            </div>
            <h3 className="font-extrabold text-xl mb-1.5 relative z-10 tracking-tight">Need a detailed report?</h3>
            <p className="text-blue-100 text-[15px] font-medium mb-5 relative z-10">Export all metrics to PDF or CSV.</p>
            <button className="flex items-center gap-2 font-bold text-[13px] bg-white text-blue-600 px-4 py-2.5 rounded-xl shadow-sm hover:shadow active:scale-95 transition-all relative z-10">
              Generate System Report <ArrowRight size={16} className="stroke-[2.5]" />
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Map Modal */}
      {isMapExpanded && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl overflow-hidden shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-black text-gray-900">Live Issue Map</h2>
                <p className="text-xs text-gray-500 font-medium mt-0.5">All reported issues and registered authorities</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsCreationMode(true)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] font-bold shadow-sm border transition-all active:scale-95 ${isCreationMode
                    ? 'bg-blue-600 text-white border-blue-700 animate-pulse'
                    : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50'
                    }`}
                >
                  <span className="w-3 h-3 rounded-full border-2 border-blue-600 bg-blue-200 inline-block"></span>
                  {isCreationMode ? 'Click map to place…' : 'Register Authority'}
                </button>
                {isCreationMode && (
                  <button
                    onClick={() => setIsCreationMode(false)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-bold bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200 active:scale-95"
                  >
                    <X size={14} /> Cancel
                  </button>
                )}
                <div className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-xl">
                  <span className="text-sm font-bold text-gray-700">Heat Map</span>
                  <label className="relative cursor-pointer flex items-center">
                    <input type="checkbox" className="sr-only" checked={showHeatmap} onChange={() => setShowHeatmap(!showHeatmap)} />
                    <div className={`w-9 h-5 rounded-full transition-colors flex items-center ${showHeatmap ? 'bg-orange-500' : 'bg-gray-300'}`}>
                      <div className={`w-3.5 h-3.5 bg-white rounded-full shadow ml-0.5 transition-transform ${showHeatmap ? 'translate-x-4' : ''}`}></div>
                    </div>
                  </label>
                </div>
                <button onClick={() => setIsMapExpanded(false)} className="w-9 h-9 flex items-center justify-center bg-gray-100 text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="flex-1 relative">
              {isCreationMode && (
                <div className="absolute inset-x-0 top-3 z-10 flex justify-center pointer-events-none">
                  <div className="bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg animate-pulse">
                    📍 Click on the map to place the authority
                  </div>
                </div>
              )}
              {isLoaded && (
                <GoogleMap
                  mapContainerStyle={{ width: '100%', height: '100%' }}
                  center={mapCenter}
                  zoom={12}
                  onLoad={onMapLoadExpanded}
                  options={{ gestureHandling: 'greedy', draggableCursor: isCreationMode ? 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'32\' height=\'32\' viewBox=\'0 0 32 32\'%3E%3Ccircle cx=\'16\' cy=\'16\' r=\'12\' fill=\'%232563eb\' fill-opacity=\'0.25\' stroke=\'%232563eb\' stroke-width=\'3\'/%3E%3Ccircle cx=\'16\' cy=\'16\' r=\'4\' fill=\'%232563eb\'/%3E%3C/svg%3E") 16 16, crosshair' : 'grab' }}
                  onClick={handleMapClick}
                >
                  {showHeatmap && recentIssues.length > 0 && window.google && (
                    <HeatmapLayer
                      data={recentIssues.filter(i => i.location && i.location.coordinates).map(issue => new window.google.maps.LatLng(issue.location.coordinates[1], issue.location.coordinates[0]))}
                      options={{
                        radius: 60,
                        opacity: 0.75,
                        dissipating: true,
                        gradient: [
                          'rgba(0, 255, 0, 0)',
                          'rgba(0, 255, 0, 0.4)',
                          'rgba(50, 205, 50, 0.6)',
                          'rgba(173, 255, 47, 0.7)',
                          'rgba(255, 255, 0, 0.8)',
                          'rgba(255, 200, 0, 0.85)',
                          'rgba(255, 165, 0, 0.9)',
                          'rgba(255, 120, 0, 0.92)',
                          'rgba(255, 69, 0, 0.95)',
                          'rgba(255, 0, 0, 1)',
                          'rgba(200, 0, 0, 1)',
                          'rgba(139, 0, 0, 1)'
                        ]
                      }}
                    />
                  )}
                  {serviceCenters.map(c => (
                    <Marker key={c._id} position={{ lat: c.location.coordinates[1], lng: c.location.coordinates[0] }} icon={getMarkerIcon(c.type)} title={`${c.name} (${c.type})`} />
                  ))}
                  {recentIssues.filter(i => i.location && i.location.coordinates).map(issue => (
                    <Marker key={issue._id} position={{ lat: issue.location.coordinates[1], lng: issue.location.coordinates[0] }} />
                  ))}
                </GoogleMap>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Authority Registration Modal */}
      {showAuthorityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-md w-full relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowAuthorityModal(false)}
              className="absolute top-4 right-4 p-2 bg-gray-100 text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
            <h2 className="text-2xl font-black text-gray-900 mb-1">Register an Authority</h2>
            <p className="text-sm text-gray-500 font-medium mb-4">📍 Pinned at {newCenterLat}, {newCenterLng}</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Center Name</label>
                <input
                  type="text"
                  value={newCenterName}
                  onChange={e => setNewCenterName(e.target.value)}
                  placeholder="e.g. Central Police Station"
                  className="w-full border border-gray-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium bg-gray-50 focus:bg-white transition-all"
                />"</div>"
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Location Coordinates</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newCenterLat}
                    onChange={e => setNewCenterLat(e.target.value)}
                    placeholder="Latitude"
                    className="w-full border border-gray-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium bg-gray-50 focus:bg-white transition-all"
                  />
                  <input
                    type="text"
                    value={newCenterLng}
                    onChange={e => setNewCenterLng(e.target.value)}
                    placeholder="Longitude"
                    className="w-full border border-gray-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium bg-gray-50 focus:bg-white transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Contact Information</label>
                <input
                  type="text"
                  value={newCenterContact}
                  onChange={e => setNewCenterContact(e.target.value)}
                  placeholder="Phone, radio freq, or email"
                  className="w-full border border-gray-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium bg-gray-50 focus:bg-white transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Department Type</label>
                <select
                  value={newCenterType}
                  onChange={e => setNewCenterType(e.target.value)}
                  className="w-full border border-gray-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium bg-gray-50 transition-all"
                >
                  <option value="Police">Police</option>
                  <option value="Medical">Medical</option>
                  <option value="Fire">Fire</option>
                  <option value="Infrastructure">Infrastructure</option>
                </select>
              </div>
              <button
                onClick={handleCreateCenter}
                className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl flex justify-center items-center gap-2 transition-all active:scale-95"
              >
                <Plus size={18} /> Initialize Node
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selected Issue Modal — Feed Card Style */}
      {selectedIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedIssue(null)}>
          <div
            className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Card Image Header */}
            <div className="relative h-56 w-full overflow-hidden bg-gray-100 rounded-t-3xl flex-shrink-0">
              {selectedIssue.imageUrl ? (
                <img
                  src={selectedIssue.imageUrl}
                  alt={selectedIssue.title}
                  className="w-full h-full object-cover"
                  onError={e => { e.target.style.display = 'none'; }}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-100 to-indigo-50 flex items-center justify-center">
                  <Layers size={56} className="text-blue-200" />
                </div>
              )}
              {/* Overlay badges */}
              <div className="absolute top-4 left-4 flex gap-2">
                <span className={`px-3 py-1.5 text-[11px] font-bold tracking-wider uppercase rounded-full backdrop-blur-md bg-white/90 ${getPriorityStyle(selectedIssue.priority)}`}>
                  {selectedIssue.priority || 'medium'}
                </span>
                <span className={`px-3 py-1.5 text-[11px] font-bold tracking-wider uppercase rounded-full backdrop-blur-md bg-white/90 ${getStatusStyle(selectedIssue.status.toUpperCase().replace('-', ' '))}`}>
                  {selectedIssue.status}
                </span>
                {selectedIssue.category && (
                  <span className={`px-3 py-1.5 text-[11px] font-bold tracking-wider uppercase rounded-full backdrop-blur-md bg-white/90 ${getCategoryStyle(selectedIssue.category)}`}>
                    {selectedIssue.category}
                  </span>
                )}
              </div>
              {/* Close button */}
              <button
                onClick={() => setSelectedIssue(null)}
                className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-white/90 backdrop-blur-md text-gray-600 hover:text-gray-900 hover:bg-white rounded-full transition-colors shadow-sm"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 flex flex-col gap-5">
              {/* Title + meta */}
              <div>
                <div className="flex items-center gap-2 text-[11px] font-bold text-blue-600 uppercase tracking-wider mb-1">
                  <MapPin size={12} />
                  #{selectedIssue._id.substring(selectedIssue._id.length - 6).toUpperCase()}
                </div>
                <h2 className="text-2xl font-black text-gray-900 leading-tight">{selectedIssue.title}</h2>
                <p className="text-xs text-gray-400 font-medium mt-1">
                  Reported on {new Date(selectedIssue.createdAt).toLocaleString()}
                  <span className="mx-2 text-gray-300">·</span>
                  <span className="text-gray-500">Currently Assigned: <span className="font-bold text-gray-900">{selectedIssue.assignedCenterName || 'None'}</span></span>
                </p>
                
                {/* Manual Reassignment Dropdown */}
                <div className="mt-4 flex flex-col gap-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Manual Reassignment Override</label>
                  <select 
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-blue-200 cursor-pointer appearance-none transition-all hover:bg-white"
                    value={selectedIssue.assignedCenterName}
                    onChange={(e) => {
                      const center = serviceCenters.find(c => c.name === e.target.value);
                      if (center) handleReassign(selectedIssue._id, center.name, center.type);
                    }}
                  >
                    <option value="" disabled>Select an Authority Node...</option>
                    {serviceCenters.map(center => (
                      <option key={center._id} value={center.name}>
                        {center.name} ({center.type})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                <h3 className="text-[11px] font-extrabold text-gray-400 uppercase tracking-widest mb-2">Description</h3>
                <p className="text-gray-700 leading-relaxed font-medium text-[15px]">{selectedIssue.description}</p>
              </div>

              {/* No authority alert */}
              {isUnassigned(selectedIssue) && (
                <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
                  <AlertTriangle size={18} className="text-amber-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-amber-700">No authority assigned nearby</p>
                    <p className="text-xs text-amber-600 font-medium">Use the map to register a relevant authority for this area.</p>
                  </div>
                </div>
              )}

              {/* Location mini-map */}
              {isLoaded && selectedIssue.location && selectedIssue.location.coordinates && (
                <div>
                  <h3 className="text-[11px] font-extrabold text-gray-400 uppercase tracking-widest mb-2">Location</h3>
                  <div className="rounded-2xl overflow-hidden border border-gray-200 h-44">
                    <GoogleMap
                      mapContainerStyle={{ width: '100%', height: '100%' }}
                      center={{ lat: selectedIssue.location.coordinates[1], lng: selectedIssue.location.coordinates[0] }}
                      zoom={15}
                      options={{ disableDefaultUI: true }}
                    >
                      <Marker position={{ lat: selectedIssue.location.coordinates[1], lng: selectedIssue.location.coordinates[0] }} />
                    </GoogleMap>
                  </div>
                </div>
              )}

              {/* Footer actions — feed card style */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-sm font-bold text-gray-400">
                    <div className="p-1.5 rounded-full bg-gray-50">
                      <ArrowUp size={16} className="stroke-[2.5]" />
                    </div>
                    {selectedIssue.upvotes || 0} upvotes
                  </div>
                  <select
                    onClick={e => e.stopPropagation()}
                    onChange={e => handleStatusChange(selectedIssue._id, e.target.value, e)}
                    value={selectedIssue.status}
                    className="bg-gray-50 border border-gray-200 text-gray-700 font-bold py-1.5 px-3 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-200 cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <option value="Pending">Pending</option>
                    <option value="In-Progress">In-Progress</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => refreshData()}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-50 text-gray-600 hover:bg-blue-50 hover:text-blue-600 font-bold text-xs rounded-xl border border-gray-200 transition-all active:scale-95"
                    title="Refresh data"
                  >
                    <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                    Refresh
                  </button>

                  <button
                    onClick={() => {
                      const center = serviceCenters.find(c => c.name === selectedIssue.assignedCenterName);
                      if (center) {
                        alert(`✅ AUTHORITY VERIFIED\nName: ${center.name}\nType: ${center.type}\nContact: ${center.contactInfo || 'N/A'}`);
                      } else {
                        alert(`⚠️ AUTHORITY MISMATCH\nIssue is assigned to "${selectedIssue.assignedCenterName}", but this node was not found in the active matrix.`);
                      }
                    }}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white font-bold text-xs rounded-xl border border-blue-200 transition-all active:scale-95"
                  >
                    <Shield size={14} />
                    Check Authority
                  </button>

                  <button
                    onClick={(e) => handleDeleteIssue(selectedIssue._id, e)}
                    className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white font-bold text-xs rounded-xl border border-red-200 hover:border-red-600 transition-all active:scale-95"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Issue Log Feed Modal */}
      {showIssueLog && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col">
          <div className="bg-white w-full h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 bg-white sticky top-0 z-10">
              <div>
                <h2 className="text-2xl font-black text-gray-900">Issue Log</h2>
                <p className="text-sm text-gray-500 font-medium mt-0.5">{recentIssues.length} reports in the system</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative group">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search reports..."
                    className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 w-64 transition-all"
                  />
                </div>
                <button
                  onClick={closeIssueLog}
                  className="w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Feed Grid */}
            <div className="flex-1 overflow-y-auto p-8">
              {recentIssues.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                  <ClipboardList size={48} className="mb-3 opacity-30" />
                  <p className="font-bold text-lg">No issues reported yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {recentIssues.map(issue => (
                    <div
                      key={issue._id}
                      className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col overflow-hidden group relative"
                    >
                      {/* Delete button — top right */}
                      <button
                        onClick={(e) => handleDeleteIssue(issue._id, e)}
                        className="absolute top-3 right-3 z-10 w-7 h-7 flex items-center justify-center bg-white/90 backdrop-blur-md text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all shadow-sm opacity-0 group-hover:opacity-100"
                        title="Delete report"
                      >
                        <X size={13} strokeWidth={2.5} />
                      </button>

                      {/* Image / gradient */}
                      <div
                        className="h-36 w-full overflow-hidden bg-gray-100 relative cursor-pointer"
                        onClick={async () => {
                          setShowIssueLog(false);
                          try {
                            const res = await axios.get(`${import.meta.env.VITE_API_URL}/issues/${issue._id}`);
                            setSelectedIssue(res.data);
                          } catch { setSelectedIssue(issue); }
                        }}
                      >
                        {issue.imageUrl ? (
                          <img src={issue.imageUrl} alt={issue.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-blue-100 to-indigo-50 flex items-center justify-center">
                            <Layers size={36} className="text-blue-200" />
                          </div>
                        )}
                        {/* Status pill */}
                        <div className="absolute bottom-2 left-2">
                          <span className={`px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded-full backdrop-blur-md ${issue.status === 'Pending' ? 'bg-white/90 text-gray-700 border border-gray-200' :
                            issue.status === 'In-Progress' ? 'bg-orange-500 text-white' :
                              'bg-emerald-500 text-white'
                            }`}>
                            {issue.status}
                          </span>
                        </div>
                      </div>

                      {/* Content */}
                      <div
                        className="p-4 flex flex-col gap-2 flex-1 cursor-pointer"
                        onClick={async () => {
                          setShowIssueLog(false);
                          try {
                            const res = await axios.get(`${import.meta.env.VITE_API_URL}/issues/${issue._id}`);
                            setSelectedIssue(res.data);
                          } catch { setSelectedIssue(issue); }
                        }}
                      >
                        {/* Category + priority row */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {issue.category && (
                            <span className={`px-2 py-0.5 text-[9px] font-bold rounded tracking-wider uppercase ${getCategoryStyle(issue.category)}`}>
                              {issue.category}
                            </span>
                          )}
                          <span className={`px-2 py-0.5 text-[9px] font-bold rounded tracking-wider uppercase ${getPriorityStyle(issue.priority)}`}>
                            {issue.priority || 'medium'}
                          </span>
                        </div>

                        <h3 className="text-[14px] font-extrabold text-gray-900 leading-snug line-clamp-2">{issue.title}</h3>

                        <div className="mt-auto pt-3 border-t border-gray-100 flex items-center justify-between">
                          <div className="text-xs font-medium text-gray-400">
                            {new Date(issue.createdAt).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-1 text-xs font-bold text-gray-400">
                            <ArrowUp size={12} strokeWidth={2.5} />
                            {issue.upvotes || 0}
                          </div>
                        </div>

                        {/* Assigned authority */}
                        <div className="text-[11px] font-medium truncate">
                          {isUnassigned(issue) ? (
                            <span className="flex items-center gap-1 text-amber-500 font-bold">
                              <AlertTriangle size={10} /> No Authority Assigned
                            </span>
                          ) : (
                            <span className="text-gray-500">🏢 {issue.assignedCenterName}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
