import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { GoogleMap, useLoadScript, HeatmapLayer, Marker, InfoWindow } from '@react-google-maps/api';
import { Layers, MapPin, Filter, Activity, CheckCircle, Clock } from 'lucide-react';

const mapContainerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '1rem',
};

const defaultCenter = {
  lat: 20.5937,
  lng: 78.9629
};

const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  styles: [
    {
      featureType: "poi",
      elementType: "labels",
      stylers: [{ visibility: "off" }],
    },
  ],
};

const libraries = ['visualization'];

export default function MapView() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(defaultCenter);

  // Toggles
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showMarkers, setShowMarkers] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Selected Marker Info Window
  const [selectedIssue, setSelectedIssue] = useState(null);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "", // Provide a real key here
    libraries,
  });

  useEffect(() => {
    // Attempt real user location if permitted
    if (navigator.geolocation) {
       navigator.geolocation.getCurrentPosition(
         (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
         () => {} // fallback to default
       );
    }

    const fetchIssues = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/issues`);
        setIssues(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchIssues();
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(issues.map(i => i.category || 'unclassified'));
    return ['All', ...Array.from(cats)];
  }, [issues]);

  const filteredIssues = useMemo(() => {
    return issues.filter(issue => {
      const matchStatus = statusFilter === 'All' || issue.status === statusFilter;
      const matchCat = categoryFilter === 'All' || (issue.category || 'unclassified') === categoryFilter;
      const hasCoords = issue.location && issue.location.coordinates && issue.location.coordinates.length === 2;
      return matchStatus && matchCat && hasCoords;
    });
  }, [issues, statusFilter, categoryFilter]);

  const heatmapData = useMemo(() => {
    if (!window.google) return [];
    
    const getWeight = (priority) => {
      switch ((priority || '').toLowerCase()) {
        case 'critical': return 15;
        case 'high': return 10;
        case 'medium': return 5;
        case 'low': return 2;
        default: return 5;
      }
    };

    return filteredIssues.map(issue => ({
      location: new window.google.maps.LatLng(
        issue.location.coordinates[1], // lat
        issue.location.coordinates[0]  // lng
      ),
      weight: getWeight(issue.priority)
    }));
  }, [filteredIssues, isLoaded]);

  if (loadError) return <div className="p-8 text-center text-red-500 font-bold">Error loading Google Maps.</div>;
  if (!isLoaded || loading) return (
    <div className="w-full h-full min-h-[600px] flex items-center justify-center bg-gray-50 rounded-2xl animate-pulse">
      <div className="flex flex-col items-center gap-3">
         <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
         <p className="font-bold text-gray-500">Loading Map Intelligence...</p>
      </div>
    </div>
  );

  return (
    <div className="w-full h-[calc(100vh-140px)] min-h-[600px] flex flex-col md:flex-row gap-6 animate-in fade-in duration-500">
      
      {/* Sidebar Controls */}
      <div className="w-full md:w-80 flex flex-col gap-5 shrink-0">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-xl font-black text-gray-900 mb-5 flex items-center gap-2">
            <Layers className="text-blue-600" /> Map Intelligence
          </h2>

          {/* Toggles */}
          <div className="space-y-4 mb-6">
            <label className="flex items-center justify-between cursor-pointer group">
              <span className="font-bold tracking-tight text-gray-700 group-hover:text-gray-900 transition-colors">Risk Heatmap</span>
              <div 
                className={`w-12 h-6 rounded-full transition-colors relative flex items-center ${showHeatmap ? 'bg-blue-600' : 'bg-gray-200'}`}
                onClick={() => setShowHeatmap(!showHeatmap)}
              >
                <div className={`w-4 h-4 bg-white rounded-full shadow-md absolute transform transition-transform ${showHeatmap ? 'translate-x-7' : 'translate-x-1'}`}></div>
              </div>
            </label>

            <label className="flex items-center justify-between cursor-pointer group">
              <span className="font-bold tracking-tight text-gray-700 group-hover:text-gray-900 transition-colors">Issue Markers</span>
              <div 
                className={`w-12 h-6 rounded-full transition-colors relative flex items-center ${showMarkers ? 'bg-blue-600' : 'bg-gray-200'}`}
                onClick={() => setShowMarkers(!showMarkers)}
              >
                <div className={`w-4 h-4 bg-white rounded-full shadow-md absolute transform transition-transform ${showMarkers ? 'translate-x-7' : 'translate-x-1'}`}></div>
              </div>
            </label>
          </div>

          <hr className="border-gray-100 my-5" />

          {/* Filters */}
          <div className="space-y-5">
            <div>
              <label className="text-sm font-bold text-gray-500 mb-2 block flex items-center gap-1">
                <Filter size={14} /> Status Filter
              </label>
              <select 
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 font-medium text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <option value="All">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="In-Progress">In-Progress</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-bold text-gray-500 mb-2 block flex items-center gap-1">
                <Filter size={14} /> Category Filter
              </label>
              <select 
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 font-medium text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none hover:bg-gray-100 transition-colors cursor-pointer"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Legend */}
        {showHeatmap && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Activity size={16} /> Intensity Legend
            </h3>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded shadow-sm bg-red-500"></div>
                <span className="text-sm font-bold text-gray-700">Critical Priority</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded shadow-sm bg-orange-500"></div>
                <span className="text-sm font-bold text-gray-700">High Priority</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded shadow-sm bg-yellow-400"></div>
                <span className="text-sm font-bold text-gray-700">Medium Priority</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded shadow-sm bg-green-400"></div>
                <span className="text-sm font-bold text-gray-700">Low Priority</span>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="h-2 w-full bg-gradient-to-r from-green-400 via-yellow-400 via-orange-500 to-red-600 rounded-full"></div>
                <div className="flex justify-between mt-1 text-xs font-bold text-gray-400">
                  <span>Low Density</span>
                  <span>High Density</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Map Container */}
      <div className="flex-1 bg-white p-2 rounded-2xl shadow-sm border border-gray-100 relative group overflow-hidden">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          zoom={13}
          center={userLocation}
          options={mapOptions}
        >
          {showHeatmap && heatmapData.length > 0 && (
            <HeatmapLayer
              data={heatmapData}
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

          {showMarkers && filteredIssues.map(issue => (
            <Marker
              key={issue._id}
              position={{ lat: issue.location.coordinates[1], lng: issue.location.coordinates[0] }}
              onClick={() => setSelectedIssue(issue)}
            />
          ))}

          {selectedIssue && (
            <InfoWindow
              position={{ lat: selectedIssue.location.coordinates[1], lng: selectedIssue.location.coordinates[0] }}
              onCloseClick={() => setSelectedIssue(null)}
            >
              <div className="p-2 max-w-[200px]">
                <h4 className="font-bold text-gray-900 mb-1">{selectedIssue.title}</h4>
                <div className="flex flex-col gap-1 text-sm">
                   <div className="flex justify-between">
                     <span className="text-gray-500">Priority:</span>
                     <span className={`font-bold capitalize ${
                       selectedIssue.priority === 'critical' ? 'text-red-600' :
                       selectedIssue.priority === 'high' ? 'text-orange-500' :
                       selectedIssue.priority === 'medium' ? 'text-yellow-600' : 'text-green-600'
                     }`}>
                       {selectedIssue.priority}
                     </span>
                   </div>
                   <div className="flex justify-between">
                     <span className="text-gray-500">Status:</span>
                     <span className="font-bold text-gray-700">{selectedIssue.status}</span>
                   </div>
                </div>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </div>

    </div>
  );
}
