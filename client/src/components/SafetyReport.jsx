import React, { useState, useRef, useCallback, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Shield, Upload, Film, AlertTriangle, Loader, X, Clock, Eye, FileText, MapPin, Crosshair } from 'lucide-react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';

const ALERT_STYLES = {
  WEAPON_DETECTED:  { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',    icon: '🔫', badge: 'bg-red-100 text-red-700'   },
  NO_LICENSE_PLATE: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', icon: '🚗', badge: 'bg-orange-100 text-orange-700' },
  PERSON_LOITERING: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-100', icon: '🚶', badge: 'bg-yellow-100 text-yellow-700' },
};

const formatTime = (secs) => {
  const m = Math.floor(secs / 60);
  const s = (secs % 60).toFixed(1);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
};

const MAP_CONTAINER_STYLE = { width: '100%', height: '220px', borderRadius: '12px' };
const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 };

export default function SafetyReport() {
  const { currentUser } = useAuth();

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState(DEFAULT_CENTER);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState(null);

  // Video state
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);

  // Analysis state
  const [status, setStatus] = useState('idle');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);

  const fileRef = useRef(null);
  const pollRef = useRef(null);

  // Load Maps API
  const { isLoaded: mapsLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
  });

  // Auto-detect location on mount
  useEffect(() => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setIsLocating(false);
      },
      () => setIsLocating(false),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setIsLocating(false);
      },
      err => {
        setLocationError(
          err.code === 1 ? 'Location access denied. Enable it in browser settings.' :
          err.code === 2 ? 'Location unavailable. Check system location settings.' :
          'Location request timed out. Try again.'
        );
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleMarkerDragEnd = (e) => {
    setLocation({ lat: e.latLng.lat(), lng: e.latLng.lng() });
  };

  const handleFile = (f) => {
    if (!f || !f.type.startsWith('video/')) {
      setError('Please select a valid video file (MP4, MOV, AVI, etc.)');
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setStatus('idle');
    setResult(null);
    setError(null);
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }, []);

  const handleDragOver = (e) => { e.preventDefault(); setDragActive(true); };
  const handleDragLeave = () => setDragActive(false);

  const pollResult = (id) => {
    let attempts = 0;
    const maxAttempts = 90;
    pollRef.current = setInterval(async () => {
      attempts++;
      try {
        const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/video/results/${id}`);
        setProgress(Math.min(95, attempts * 2));

        if (data.status === 'complete') {
          clearInterval(pollRef.current);
          setResult(data);
          setStatus('complete');
          setProgress(100);
        } else if (data.status === 'failed') {
          clearInterval(pollRef.current);
          setStatus('failed');
          setError(data.errorMessage || 'Analysis failed.');
        }
      } catch (err) {
        console.error('Poll error:', err);
      }
      if (attempts >= maxAttempts) {
        clearInterval(pollRef.current);
        setStatus('failed');
        setError('Analysis timed out. Try a shorter video.');
      }
    }, 4000);
  };

  const handleSubmit = async () => {
    if (!file) return;
    if (!title.trim()) {
      setError('Please enter an incident title before submitting.');
      return;
    }

    setStatus('uploading');
    setError(null);
    setProgress(5);

    const form = new FormData();
    form.append('video', file);
    form.append('title', title.trim());
    form.append('description', description.trim());
    form.append('lat', location.lat.toString());
    form.append('lng', location.lng.toString());
    if (currentUser?.uid) form.append('reporterUid', currentUser.uid);
    if (currentUser?.displayName) form.append('reporterName', currentUser.displayName);

    try {
      const { data } = await axios.post(`${import.meta.env.VITE_API_URL}/video/analyze`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => setProgress(Math.round((e.loaded / e.total) * 30)),
      });
      setStatus('analyzing');
      setProgress(35);
      pollResult(data.id);
    } catch (err) {
      setStatus('failed');
      const msg = err?.response?.data?.details || err?.response?.data?.error || err.message;
      setError(msg);
      setProgress(0);
    }
  };

  const reset = () => {
    clearInterval(pollRef.current);
    setFile(null);
    setPreview(null);
    setStatus('idle');
    setResult(null);
    setError(null);
    setProgress(0);
    setTitle('');
    setDescription('');
    setLocation(DEFAULT_CENTER);
    setLocationError(null);
  };

  const isAnalyzing = status === 'uploading' || status === 'analyzing';

  return (
    <div className="w-full max-w-3xl mx-auto animate-in fade-in duration-500">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 bg-red-50 rounded-xl">
            <Shield size={26} className="text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">Safety Analysis</h1>
            <p className="text-gray-500 font-medium text-sm">Report a safety incident and upload video for AI anomaly detection</p>
          </div>
        </div>
      </div>

      {/* ── Main Form Card ─────────────────────────────────────────────── */}
      {status === 'idle' && (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">

          {/* Incident Details Section */}
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-sm font-extrabold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <FileText size={14} />
              Incident Details
            </h2>

            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-[13px] font-bold text-gray-700 mb-1.5">
                  Incident Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Suspicious activity near Gate 4, Vehicle without plates"
                  maxLength={120}
                  className="w-full bg-gray-50 rounded-xl px-4 py-3 text-gray-900 font-medium text-sm outline-none focus:ring-2 focus:ring-red-400 transition-shadow placeholder:text-gray-400 border border-transparent focus:border-red-200"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-[13px] font-bold text-gray-700 mb-1.5">
                  Description <span className="text-gray-400 font-medium">(optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Describe what you observed, when and where it happened, and any other relevant context..."
                  maxLength={1000}
                  rows={3}
                  className="w-full bg-gray-50 rounded-xl px-4 py-3 text-gray-900 font-medium text-sm outline-none focus:ring-2 focus:ring-red-400 transition-shadow resize-none placeholder:text-gray-400 border border-transparent focus:border-red-200"
                />
                <p className="text-right text-[11px] text-gray-400 mt-1">{description.length}/1000</p>
              </div>
            </div>
          </div>

          {/* Location Section */}
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-sm font-extrabold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <MapPin size={14} />
              Incident Location
            </h2>

            {/* Detect button */}
            <button
              type="button"
              onClick={handleDetectLocation}
              disabled={isLocating}
              className="flex items-center gap-2 text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 px-4 py-2 rounded-xl mb-4 transition-colors"
            >
              {isLocating
                ? <Loader size={15} className="animate-spin" />
                : <Crosshair size={15} />}
              {isLocating ? 'Detecting location…' : 'Detect My Location'}
            </button>

            {locationError && (
              <p className="text-xs text-red-500 font-medium mb-3">{locationError}</p>
            )}

            {/* Map */}
            <div className="rounded-2xl overflow-hidden border border-gray-200">
              {mapsLoaded ? (
                <GoogleMap
                  mapContainerStyle={MAP_CONTAINER_STYLE}
                  center={location}
                  zoom={15}
                  options={{ disableDefaultUI: true, zoomControl: true, clickableIcons: false }}
                  onClick={(e) => setLocation({ lat: e.latLng.lat(), lng: e.latLng.lng() })}
                >
                  <Marker
                    position={location}
                    draggable
                    onDragEnd={handleMarkerDragEnd}
                  />
                </GoogleMap>
              ) : (
                <div className="h-[220px] bg-gray-100 flex items-center justify-center">
                  <Loader size={20} className="animate-spin text-gray-400" />
                </div>
              )}
            </div>

            {/* Coordinates display */}
            <div className="flex items-center gap-2 mt-2.5">
              <MapPin size={13} className="text-gray-400" />
              <span className="text-[12px] font-mono text-gray-500">
                {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
              </span>
              <span className="ml-auto text-[11px] text-gray-400 font-medium">Drag marker to adjust</span>
            </div>
          </div>
          <div className="p-6">
            <h2 className="text-sm font-extrabold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Film size={14} />
              Video Evidence
            </h2>

            {!file ? (
              /* Drop Zone */
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileRef.current?.click()}
                className={`w-full border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all ${
                  dragActive ? 'border-red-400 bg-red-50 scale-[1.01]' : 'border-gray-200 bg-gray-50/50 hover:border-red-300 hover:bg-red-50/30'
                }`}
              >
                <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mb-3">
                  <Upload size={24} className="text-red-500" />
                </div>
                <p className="font-extrabold text-gray-900 mb-1">Drop your video here</p>
                <p className="text-gray-400 font-medium text-sm">MP4, MOV, AVI, MKV — up to 500MB</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={e => handleFile(e.target.files?.[0])}
                />
              </div>
            ) : (
              /* Video Preview */
              <div className="rounded-2xl overflow-hidden border border-gray-200">
                <div className="relative bg-black">
                  <video src={preview} controls className="w-full max-h-56 object-contain" />
                  <button
                    onClick={() => { setFile(null); setPreview(null); }}
                    className="absolute top-3 right-3 w-8 h-8 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-black/80 transition-colors"
                  >
                    <X size={15} />
                  </button>
                </div>
                <div className="px-4 py-2.5 bg-gray-50 flex items-center gap-2">
                  <Film size={16} className="text-gray-400" />
                  <span className="text-sm font-bold text-gray-700 truncate flex-1">{file.name}</span>
                  <span className="text-xs text-gray-400 font-medium flex-shrink-0">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
                </div>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="mx-6 mb-4 bg-red-50 border border-red-200 rounded-xl p-3.5 flex items-center gap-2.5">
              <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <div className="px-6 pb-6">
            <button
              onClick={handleSubmit}
              disabled={!file || !title.trim()}
              className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all active:scale-[0.99] shadow-sm text-sm"
            >
              <Shield size={17} />
              {file && title.trim() ? 'Analyze Video for Anomalies' : !title.trim() ? 'Enter a title to continue' : 'Select a video to continue'}
            </button>
            {file && title.trim() && (
              <p className="text-center text-xs text-gray-400 font-medium mt-2">
                Analysis runs via Google Cloud AI — may take 1–5 minutes
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Progress / Analyzing ──────────────────────────────────────── */}
      {isAnalyzing && (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-8 animate-in fade-in zoom-in-95 duration-500">
          {/* Submitted info recap */}
          {title && (
            <div className="mb-6 p-4 bg-gray-50 rounded-2xl border border-gray-100 animate-in slide-in-from-top-2 duration-700">
              <p className="font-extrabold text-gray-900 text-sm truncate">{title}</p>
              {description && <p className="text-xs text-gray-500 font-medium mt-0.5 line-clamp-2">{description}</p>}
            </div>
          )}

          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center relative">
              <Loader size={22} className="text-blue-500 animate-spin" />
              <div className="absolute inset-0 bg-blue-400/20 rounded-full animate-ping" />
            </div>
            <div>
              <p className="font-extrabold text-gray-900">
                {status === 'uploading' ? 'Uploading safely…' : 'AI is decoding your video…'}
              </p>
              <p className="text-sm text-gray-400 font-medium tracking-tight">
                {status === 'analyzing' ? 'Processing frames via neural grid...' : 'Securing evidence on cloud servers...'}
              </p>
            </div>
          </div>

          <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 rounded-full transition-all duration-1000 relative"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)25%,transparent 25%,transparent 50%,rgba(255,255,255,0.2)50%,rgba(255,255,255,0.2)75%,transparent 75%,transparent)] bg-[length:20px_20px] animate-[progress-stripe_1s_linear_infinite]" />
            </div>
          </div>
          <p className="text-right text-xs font-black text-blue-600 mt-2 tracking-widest">{progress}% COMPLETE</p>

          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            {['Upload', 'AI Analysis', 'Results'].map((step, i) => (
              <div key={step} className={`p-4 rounded-2xl text-[10px] uppercase font-black tracking-widest transition-all duration-500 ${
                (i === 0 && progress >= 30) || (i === 1 && progress >= 35) || (i === 2 && progress >= 100)
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 scale-105' : 'bg-gray-50 text-gray-400 opacity-60'
              }`}>
                {step}
              </div>
            ))}
          </div>

          <style jsx="true">{`
            @keyframes progress-stripe {
              from { background-position: 0 0; }
              to { background-position: 20px 0; }
            }
          `}</style>
        </div>
      )}

      {/* ── Analysis Failed ──────────────────────────────────────────── */}
      {status === 'failed' && error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-3">
          <AlertTriangle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold text-red-700">Analysis Failed</p>
            <p className="text-sm text-red-600 font-medium mt-0.5">{error}</p>
          </div>
          <button onClick={reset} className="text-red-400 hover:text-red-600 font-bold text-sm">Retry</button>
        </div>
      )}

      {/* ── Results ─────────────────────────────────────────────────── */}
      {status === 'complete' && result && (
        <div className="space-y-4">

          {/* Incident recap */}
          {(result.title || result.description) && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-3">Incident Report</h3>
              {result.title && <p className="font-extrabold text-gray-900">{result.title}</p>}
              {result.description && <p className="text-sm text-gray-500 font-medium mt-1">{result.description}</p>}
              {result.location?.coordinates?.length === 2 && (
                <a
                  href={`https://www.google.com/maps?q=${result.location.coordinates[1]},${result.location.coordinates[0]}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-3 text-[12px] font-bold text-blue-600 hover:underline"
                >
                  <MapPin size={12} />
                  {result.location.coordinates[1].toFixed(5)}, {result.location.coordinates[0].toFixed(5)}
                  <span className="text-gray-400 font-normal">· View on Maps ↗</span>
                </a>
              )}
            </div>
          )}

          {/* Summary banner */}
          <div className={`rounded-3xl border p-6 flex items-center gap-5 ${
            result.alerts.length > 0 ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'
          }`}>
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${
              result.alerts.length > 0 ? 'bg-red-100' : 'bg-emerald-100'
            }`}>
              {result.alerts.length > 0 ? '🚨' : '✅'}
            </div>
            <div>
              <h2 className={`text-xl font-black ${result.alerts.length > 0 ? 'text-red-800' : 'text-emerald-800'}`}>
                {result.alerts.length > 0
                  ? `${result.alerts.length} Anomal${result.alerts.length > 1 ? 'ies' : 'y'} Detected`
                  : 'No Anomalies Detected'}
              </h2>
              <p className={`text-sm font-medium ${result.alerts.length > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                {result.filename} · {result.objects?.length || 0} objects tracked
              </p>
            </div>
            <button onClick={reset} className="ml-auto text-sm font-bold text-gray-500 hover:text-gray-900 underline underline-offset-2">
              Analyze Another
            </button>
          </div>

          {/* Alert list */}
          {result.alerts.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-extrabold text-gray-400 uppercase tracking-widest px-1">Anomalies Found</h3>
              {result.alerts.map((alert, i) => {
                const style = ALERT_STYLES[alert.type] || ALERT_STYLES['PERSON_LOITERING'];
                return (
                  <div 
                    key={i} 
                    className={`rounded-2xl border p-4 flex items-start gap-4 transition-all duration-500 animate-in fade-in slide-in-from-left-4 ${style.bg} ${style.border}`}
                    style={{ animationDelay: `${(i + 1) * 150}ms` }}
                  >
                    <span className="text-2xl flex-shrink-0">{style.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${style.badge}`}>
                          {alert.type.replace(/_/g, ' ')}
                        </span>
                        <span className="flex items-center gap-1 text-xs font-bold text-gray-500">
                          <Clock size={11} /> {formatTime(alert.timestamp)}
                        </span>
                        {alert.confidence && (
                          <span className="text-xs font-medium text-gray-400">
                            {(alert.confidence * 100).toFixed(0)}% confidence
                          </span>
                        )}
                      </div>
                      <p className={`text-sm font-bold ${style.text}`}>{alert.message}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Detected objects */}
          {result.objects?.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                <Eye size={16} className="text-gray-400" />
                <span className="font-extrabold text-gray-700 text-sm">All Detected Objects</span>
                <span className="ml-auto text-xs font-medium text-gray-400">{result.objects.length} objects</span>
              </div>
              <ul className="divide-y divide-gray-50 max-h-52 overflow-y-auto">
                {result.objects.slice(0, 20).map((obj, i) => (
                  <li key={i} className="flex items-center justify-between px-5 py-2.5 hover:bg-gray-50">
                    <span className="text-sm font-bold text-gray-800 capitalize">{obj.label}</span>
                    <div className="flex items-center gap-3 text-xs font-medium text-gray-400">
                      <span>{formatTime(obj.startTime)} – {formatTime(obj.endTime)}</span>
                      <span className="px-2 py-0.5 bg-gray-100 rounded-full">{(obj.confidence * 100).toFixed(0)}%</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
