import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Map as MapIcon, PlusSquare, Search, Bell, Settings, LifeBuoy, AlertTriangle, LogOut, User, Shield, ArrowRight, CornerDownRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import NotificationDropdown from './NotificationDropdown';

function NavLinks({ isMobile }) {
  const location = useLocation();
  const links = [
    { name: 'Feed', path: '/', icon: <Home size={isMobile ? 26 : 24} /> },
    { name: 'Map Mode', path: '/map', icon: <MapIcon size={isMobile ? 26 : 24} /> },
    { name: 'Report', path: '/report', icon: <PlusSquare size={isMobile ? 26 : 24} /> },
    { name: 'Safety', path: '/safety', icon: <Shield size={isMobile ? 26 : 24} /> },
    { name: 'Profile', path: '/profile', icon: <User size={isMobile ? 26 : 24} /> },
  ];

  return (
    <>
      {links.map(link => {
        const isActive = location.pathname === link.path;
        return (
          <Link
            key={link.name}
            to={link.path}
            className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${isActive ? 'font-bold bg-blue-50 text-blue-600' : 'font-medium text-gray-700 hover:bg-gray-100'
              } ${isMobile ? 'flex-col gap-1 p-2 flex-1 justify-center bg-transparent' : 'w-full'}`}
          >
            <div className={isActive && !isMobile ? 'text-blue-600' : ''}>
              {link.icon}
            </div>
            <span className={`${isMobile ? 'text-[10px]' : 'text-[15px]'} ${isMobile && isActive ? 'text-blue-600' : ''} ${isMobile && !isActive ? 'text-gray-500' : ''}`}>
              {link.name}
            </span>
          </Link>
        );
      })}
    </>
  );
}

function Sidebar() {
  const { logout } = useAuth();
  return (
    <div className="hidden lg:flex flex-col w-64 border-r border-gray-200 min-h-screen p-5 sticky top-0 bg-white z-20">
      <Link to="/" className="flex items-center gap-2 mb-8 w-fit">
        <span className="text-3xl" role="img" aria-label="shield">🛡️</span>
        <span className="text-2xl font-black tracking-tight text-blue-600">UrbanEye</span>
      </Link>

      <Link to="/emergency" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 mb-8 shadow border-b-4 border-blue-800 transition-all active:translate-y-1 active:border-b-0 text-sm cursor-pointer hover:-translate-y-0.5">
        <AlertTriangle size={18} />
        Emergency Update
      </Link>

      <nav className="flex flex-col gap-1 mb-auto w-full">
        <NavLinks isMobile={false} />
      </nav>

      <div className="pt-4 border-t border-gray-100 mt-auto flex flex-col gap-1 w-full text-gray-600">
        <Link to="#" className="flex items-center gap-3 p-3 rounded-xl transition-all duration-200 font-medium hover:bg-gray-100 w-full text-[15px]">
          <Settings size={22} /> Settings
        </Link>
        <Link to="#" className="flex items-center gap-3 p-3 rounded-xl transition-all duration-200 font-medium hover:bg-gray-100 w-full text-[15px]">
          <LifeBuoy size={22} /> Support
        </Link>
        <button onClick={logout} className="flex items-center gap-3 p-3 rounded-xl transition-all duration-200 font-medium hover:bg-red-50 text-red-600 w-full text-[15px] mt-2 border border-transparent hover:border-red-100">
          <LogOut size={22} /> Sign Out
        </button>
      </div>
    </div>
  );
}

function TopNav() {
  const { currentUser } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = async (isInitial = false) => {
    if (!currentUser?.uid) return;
    if (isInitial) setLoading(true);
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/users/notifications/${currentUser.uid}`);
      setNotifications(res.data.notifications);
      setUnreadCount(res.data.unreadCount);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications(true);
    const interval = setInterval(() => fetchNotifications(), 30000); // 30s poll
    return () => clearInterval(interval);
  }, [currentUser]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleNotifications = async () => {
    const nextState = !showNotifications;
    setShowNotifications(nextState);

    // Mark as seen when opening
    if (nextState && unreadCount > 0) {
      try {
        await axios.post(`${import.meta.env.VITE_API_URL}/users/notifications/${currentUser.uid}/seen`);
        setUnreadCount(0);
        // Refresh local data to remove 'isNew' highlights
        setNotifications(prev => prev.map(n => ({ ...n, isNew: false })));
      } catch (err) {
        console.error('Failed to mark notifications as seen', err);
      }
    }
  };

  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef(null);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/issues/search?q=${encodeURIComponent(searchQuery)}`);
        setSearchResults(res.data);
        setShowResults(true);
      } catch (err) {
        console.error('Search failed', err);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside search results to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleResultClick = (issueId) => {
    setShowResults(false);
    setSearchQuery('');
    navigate(`/?highlight=${issueId}`);
  };

  return (
    <div className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 md:px-6 py-3 flex items-center justify-between shadow-sm">
      <div className="lg:hidden flex items-center gap-2">
        <span className="text-2xl" role="img" aria-label="shield">🛡️</span>
        <span className="text-xl font-black tracking-tight text-blue-600">UrbanEye</span>
      </div>

      <div className="hidden lg:block flex-1"></div>

      <div className="flex items-center gap-4 flex-1 lg:max-w-md justify-end lg:justify-between w-full relative">
        <div className="hidden md:flex relative flex-1 max-w-sm mr-4 group" ref={searchRef}>
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className={`transition-colors ${isSearching ? 'text-blue-500 animate-pulse' : 'text-gray-400 group-focus-within:text-blue-500'}`} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchQuery.trim() && setShowResults(true)}
            placeholder="Search reports or locations..."
            className="w-full bg-gray-100 border-transparent rounded-full py-2.5 pl-10 pr-4 text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none font-medium shadow-sm hover:shadow"
          />

          {/* Search Results Dropdown */}
          {showResults && (
            <div className="absolute top-12 left-0 w-full bg-white/80 backdrop-blur-xl border border-white/20 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="max-h-80 overflow-y-auto py-2">
                {searchResults.length === 0 ? (
                  <p className="px-5 py-6 text-sm text-gray-400 font-medium italic text-center">No reports match your search</p>
                ) : (
                  searchResults.map(issue => (
                    <button
                      key={issue._id}
                      onClick={() => handleResultClick(issue._id)}
                      className="w-full px-5 py-3.5 flex items-start gap-3 hover:bg-blue-50/50 transition-colors text-left group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-white border border-gray-100 flex items-center justify-center flex-shrink-0 text-gray-400 group-hover:text-blue-600 transition-colors">
                        <CornerDownRight size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate mb-0.5">{issue.title}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400">{issue.category}</span>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${issue.status === 'Resolved' ? 'bg-emerald-50 text-emerald-600' :
                              issue.status === 'In-Progress' ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-500'
                            }`}>
                            {issue.status}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
              <div className="p-3 bg-gray-50/50 border-t border-gray-100 flex justify-center">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Search results for community reports</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0 relative" ref={dropdownRef}>
          <button
            onClick={toggleNotifications}
            className={`relative p-2.5 rounded-full transition-all duration-300 ${showNotifications ? 'bg-blue-50 text-blue-600 shadow-inner' : 'text-gray-500 hover:bg-gray-100'
              }`}
          >
            <Bell size={22} className={showNotifications ? 'scale-110' : ''} />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full animate-pulse"></span>
            )}
          </button>

          {showNotifications && (
            <NotificationDropdown
              notifications={notifications}
              loading={loading}
              onClose={() => setShowNotifications(false)}
            />
          )}

          <Link to="/profile" className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold cursor-pointer hover:opacity-90 shadow border-2 border-white ring-2 ring-gray-100 hover:scale-105 transition-transform overflow-hidden bg-gradient-to-tr from-indigo-500 to-purple-600">
            {currentUser?.photoURL ? (
              <img src={currentUser.photoURL} alt="User" className="w-full h-full object-cover" />
            ) : (
              (currentUser?.displayName || 'U').charAt(0).toUpperCase()
            )}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function CitizenLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50/50 text-gray-900 font-sans flex flex-col selection:bg-blue-100">


      <div className="flex flex-1 relative w-full mx-auto justify-center md:justify-start">
        <Sidebar />

        <div className="flex-1 flex flex-col min-w-0 w-full relative">
          <TopNav />
          <main className="p-4 sm:p-6 md:p-8 w-full max-w-7xl mx-auto pb-24 lg:pb-8 flex-1 min-h-[500px] animate-in fade-in slide-in-from-bottom-2 duration-700">
            {children}
          </main>

          <footer className="w-full bg-white border-t border-gray-200 py-6 px-4 md:px-8 mt-auto hidden md:flex items-center justify-between z-10 shrink-0">
            <p className="text-gray-500 font-medium text-sm">© 2026 CivicArchitect Platform</p>
            <div className="flex items-center gap-6 text-sm font-bold text-gray-600">
              <Link to="#" className="hover:text-blue-600 transition-colors">Privacy Policy</Link>
              <Link to="#" className="hover:text-blue-600 transition-colors">Help Center</Link>
              <Link to="#" className="hover:text-blue-600 transition-colors">Accessibility</Link>
            </div>
          </footer>
        </div>
      </div>

      <div className="lg:hidden fixed bottom-0 w-full bg-white/95 backdrop-blur-xl border-t border-gray-200 flex justify-around pb-6 pt-2 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <NavLinks isMobile={true} />
      </div>
    </div>
  );
}
