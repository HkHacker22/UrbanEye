import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { MapPin, Crosshair, Camera, Send, Info } from 'lucide-react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { useAuth } from '../context/AuthContext';

const mapContainerStyle = { width: '100%', height: '300px', borderRadius: '12px' };
const defaultCenter = { lat: 20.5937, lng: 78.9629 };

export default function ReportIssue() {
  const { currentUser } = useAuth();
  const [formData, setFormData] = useState({ title: '', description: '', category: 'Infrastructure', imageUrl: '' });
  const [location, setLocation] = useState(defaultCenter);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (navigator.geolocation) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        position => {
          setLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
          setIsLocating(false);
        },
        () => {
          console.warn('Location permission denied or unavailable, using default center.');
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  }, []);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
  });

  const handleDetectLocation = () => {
    if (navigator.geolocation) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        position => {
          setLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
          setIsLocating(false);
        },
        err => {
          let errorMsg = 'Could not access device location. Please check browser permissions.';
          if (err.code === 1) errorMsg = 'Location access denied. Please enable it in browser settings.';
          else if (err.code === 2) errorMsg = 'Location unavailable. Ensure MacOS Location Services is enabled.';
          else if (err.code === 3) errorMsg = 'Location request timed out. Try again.';
          
          setError(errorMsg);
          window.scrollTo({ top: 0, behavior: 'smooth' });
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setError('Geolocation is not supported by your browser.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleMarkerDragEnd = (e) => {
    setLocation({ lat: e.latLng.lat(), lng: e.latLng.lng() });
  };

  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const MAX_W = 800;
          const scale = Math.min(1, MAX_W / img.width);
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.65));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      alert('File size exceeds 20MB limit.');
      return;
    }
    try {
      const compressed = await compressImage(file);
      setFormData(prev => ({ ...prev, imageUrl: compressed }));
    } catch (err) {
      console.error('Image compression failed:', err);
      // Fallback: raw base64
      const reader = new FileReader();
      reader.onloadend = () => setFormData(prev => ({ ...prev, imageUrl: reader.result }));
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = {
        ...formData,
        reporterUid: currentUser?.uid || null,
        location: { type: 'Point', coordinates: [location.lng, location.lat] },
      };
      await axios.post(`${import.meta.env.VITE_API_URL}/issues`, payload);
      navigate('/');
    } catch (err) {
      console.error(err);
      if (err.response && err.response.data && err.response.data.error === 'INVALID_ISSUE') {
        setError(err.response.data.message);
      } else {
        setError('Error submitting issue. Please try again.');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto pb-10 animate-in fade-in duration-500">
      <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden">
        
        {/* Header */}
        <div className="px-8 pt-8 pb-6 border-b border-gray-100">
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Report a Civic Concern</h2>
          <p className="text-gray-500 font-medium mt-1">Help authorities by submitting accurate community issues.</p>
        </div>

        {error && (
          <div className="mx-8 mt-6 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
            <Info className="flex-shrink-0 w-6 h-6 mr-3 text-red-600 mb-auto" />
            <p className="font-bold text-sm tracking-wide leading-relaxed">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          
          {/* Issue Details Section */}
          <div className="space-y-5">
            <div>
              <label className="block text-[15px] font-bold text-gray-800 mb-2">Issue Title</label>
              <input required type="text" placeholder="e.g. Dangerous pothole near school zone" 
                className="w-full bg-gray-50 border-none rounded-xl p-4 text-gray-900 font-medium outline-none focus:ring-2 focus:ring-blue-500 transition-shadow transition-colors" 
                value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
              <p className="text-xs text-gray-400 mt-2 font-medium ml-1">Write a short and clear headline for public feeding.</p>
            </div>
            
            <div>
              <label className="block text-[15px] font-bold text-gray-800 mb-2">Category</label>
              <select className="w-full bg-gray-50 border-none rounded-xl p-4 text-gray-900 font-medium outline-none focus:ring-2 focus:ring-blue-500 transition-shadow transition-colors appearance-none cursor-pointer"
                value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                <option>Infrastructure</option>
                <option>Sanitation</option>
                <option>Safety</option>
                <option>Noise</option>
                <option>Other</option>
              </select>
            </div>

            <div>
              <label className="block text-[15px] font-bold text-gray-800 mb-2">Detailed Description</label>
              <textarea required placeholder="Describe specifically what the issue is and any surrounding context..." 
                className="w-full bg-gray-50 border-none rounded-xl p-4 text-gray-900 font-medium outline-none focus:ring-2 focus:ring-blue-500 h-32 resize-none transition-shadow transition-colors" 
                value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}></textarea>
            </div>
          </div>

          {/* Location Picker Section */}
          <div>
            <div className="flex items-end justify-between mb-4 border-t border-gray-100 pt-8 mt-2">
              <div>
                <h3 className="text-xl font-extrabold text-gray-900">Location Details</h3>
                <p className="text-sm text-gray-500 font-medium">Pinpoint the exact location of the issue.</p>
              </div>
              <button type="button" onClick={handleDetectLocation} disabled={isLocating} className="flex items-center gap-1.5 text-blue-600 font-bold hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors text-[13px] disabled:opacity-50">
                <Crosshair size={16} className={`stroke-[2.5] ${isLocating ? 'animate-spin' : ''}`} />
                {isLocating ? 'LOCATING...' : 'USE CURRENT LOCATION'}
              </button>
            </div>
            
            <div className="bg-gray-100 rounded-xl overflow-hidden border border-gray-200">
               {isLoaded ? (
                 <GoogleMap
                   mapContainerStyle={mapContainerStyle}
                   center={location}
                   zoom={14}
                   options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false }}
                   onClick={(e) => setLocation({ lat: e.latLng.lat(), lng: e.latLng.lng() })}
                 >
                   <Marker position={location} draggable={true} onDragEnd={handleMarkerDragEnd} />
                 </GoogleMap>
               ) : (
                 <div className="w-full h-[300px] bg-gray-100 flex items-center justify-center font-bold text-gray-400">Loading Maps API...</div>
               )}
            </div>
            
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mt-3 flex items-center gap-2">
              <MapPin size={18} className="text-gray-400" />
              <span className="text-sm font-bold text-gray-700">Selected Coordinates: <span className="font-medium text-gray-500">{location.lat.toFixed(5)}, {location.lng.toFixed(5)}</span></span>
            </div>
          </div>

          {/* Upload Area */}
          <div className="border-t border-gray-100 pt-8 mt-2">
             <h3 className="text-xl font-extrabold text-gray-900 mb-3">Photographic Evidence</h3>
             
             {formData.imageUrl ? (
               <div className="relative">
                 <img src={formData.imageUrl} className="w-full h-48 object-cover rounded-xl" alt="Evidence" />
                 <button type="button" onClick={() => setFormData({...formData, imageUrl: ''})} className="absolute top-3 right-3 bg-white/90 backdrop-blur text-gray-900 font-bold rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors">✕</button>
               </div>
             ) : (
               <label className="border-2 border-dashed border-blue-200 hover:border-blue-400 bg-blue-50/50 hover:bg-blue-50 transition-colors rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer relative group block w-full">
                 <input 
                   type="file" 
                   accept="image/jpeg, image/png, image/webp" 
                   className="hidden" 
                   onChange={handleImageUpload} 
                 />
                 <div className="w-14 h-14 bg-white shadow-sm border border-gray-100 rounded-full flex items-center justify-center mb-4 text-blue-500 group-hover:scale-110 transition-transform">
                   <Camera size={26} />
                 </div>
                 <p className="font-bold text-gray-700 mb-1">Click to browse or drag and drop</p>
                 <p className="text-sm text-gray-400 font-medium mb-4">Upload a photo describing the situation</p>
                 <span className="bg-white border border-blue-100 text-blue-600 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">JPG, PNG MAX 10MB</span>
               </label>
             )}

             <div className="mt-4 flex flex-col gap-2">
               <label className="text-[13px] font-bold text-gray-500 uppercase tracking-wider ml-1">Or paste a direct image link</label>
               <div className="relative group">
                 <input 
                   type="url" 
                   placeholder="https://example.com/image.jpg"
                   className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 pr-12 text-sm text-gray-900 font-medium outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all shadow-inner"
                   value={formData.imageUrl}
                   onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
                 />
                 {formData.imageUrl && (
                   <button 
                     type="button" 
                     onClick={() => setFormData({...formData, imageUrl: ''})}
                     className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-gray-200 hover:bg-red-500 hover:text-white rounded-lg flex items-center justify-center transition-colors"
                   >
                     ✕
                   </button>
                 )}
               </div>
             </div>
          </div>

          {/* Footer Area */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-6 border-t border-gray-100">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input type="checkbox" className="sr-only" checked={isAnonymous} onChange={() => setIsAnonymous(!isAnonymous)} />
                <div className={`block w-12 h-6 rounded-full transition-colors ${isAnonymous ? 'bg-blue-500' : 'bg-gray-200'}`}></div>
                <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${isAnonymous ? 'translate-x-6' : ''}`}></div>
              </div>
              <span className="text-sm font-bold text-gray-700 group-hover:text-gray-900 transition-colors">Report Anonymously</span>
            </label>
            
            <button 
              type="submit" 
              disabled={loading}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-bold shadow-md hover:shadow-lg transition-all active:scale-95 disabled:bg-blue-300 disabled:shadow-none"
            >
              {loading ? 'Submitting...' : 'Submit Official Report'}
              <Send size={18} className="fill-white/20" />
            </button>
          </div>
        </form>

        {/* Green Info Banner */}
        <div className="bg-emerald-500 flex flex-col sm:flex-row items-center justify-center gap-3 px-6 py-4 text-white">
          <Info size={22} className="fill-emerald-400 text-white flex-shrink-0" />
          <p className="text-sm font-bold tracking-wide text-center sm:text-left">
            Reports with photos and accurate locations are resolved 40% faster on average.
          </p>
        </div>
      </div>
    </div>
  );
}
