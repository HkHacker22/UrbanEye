import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Map, Settings, LifeBuoy, Bell, Search, ShieldCheck, LogOut, FileText, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/Polish_20260412_192029707.svg';
import axios from 'axios';

function NavLinks({ isMobile }) {
  const location = useLocation();
  const navigate = useNavigate();
  const links = [
    { name: 'Dashboard', path: '/admin', icon: <LayoutDashboard size={isMobile ? 26 : 24} /> },
    { name: 'Issue Log', path: '/admin?log=open', icon: <FileText size={isMobile ? 26 : 24} />, action: () => navigate('/admin?log=open') },
    { name: 'Safety', path: '/admin/safety', icon: <Shield size={isMobile ? 26 : 24} /> },
  ];

  return (
    <>
      {links.map(link => {
        const isActive = location.pathname === '/admin' && link.name === 'Dashboard' ||
          (link.name === 'Issue Log' && location.search.includes('log=open'));
        return link.action ? (
          <button
            key={link.name}
            onClick={link.action}
            className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${isActive ? 'font-bold bg-blue-50 text-blue-600' : 'font-medium text-gray-700 hover:bg-gray-100'
              } ${isMobile ? 'flex-col gap-1 p-2 flex-1 justify-center bg-transparent w-full' : 'w-full'}`}
          >
            <div className={isActive && !isMobile ? 'text-blue-600' : ''}>
              {link.icon}
            </div>
            <span className={`${isMobile ? 'text-[10px]' : 'text-[15px]'} ${isMobile && isActive ? 'text-blue-600' : ''} ${isMobile && !isActive ? 'text-gray-500' : ''}`}>
              {link.name}
            </span>
          </button>
        ) : (
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
      <Link to="/admin" className="flex items-center gap-3 mb-8 w-fit group">
        <img src={logo} alt="AdminCenter Logo" className="w-10 h-10 object-contain group-hover:scale-110 transition-transform" />
        <span className="text-2xl font-black tracking-tight text-gray-900">AdminCenter</span>
      </Link>

      <div className="px-2 mb-4">
        <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-widest">Overview</span>
      </div>

      <nav className="flex flex-col gap-1 mb-auto w-full">
        <NavLinks isMobile={false} />
      </nav>

      <div className="pt-4 border-t border-gray-100 mt-auto flex flex-col gap-1 w-full text-gray-600">
        <Link to="#" className="flex items-center gap-3 p-3 rounded-xl transition-all duration-200 font-medium hover:bg-gray-100 w-full text-[15px]">
          <Settings size={22} /> System Rules
        </Link>
        <Link to="#" className="flex items-center gap-3 p-3 rounded-xl transition-all duration-200 font-medium hover:bg-gray-100 w-full text-[15px]">
          <LifeBuoy size={22} /> IT Support
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
  const [unreadCount, setUnreadCount] = React.useState(0);

  React.useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/issues/unread-count`);
        setUnreadCount(res.data.unreadCount || 0);
      } catch (err) {
        console.error('Failed to fetch unread count:', err);
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 md:px-6 py-3 flex items-center justify-between shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
      <div className="lg:hidden flex items-center gap-2">
        <img src={logo} alt="Admin Logo" className="w-8 h-8 object-contain" />
        <span className="text-xl font-black tracking-tight text-gray-900">Admin</span>
      </div>

      <div className="hidden lg:block flex-1"></div>

      <div className="flex items-center gap-4 flex-1 lg:max-w-md justify-end lg:justify-between w-full relative">
        <div className="hidden md:flex relative flex-1 mr-4 group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400 group-focus-within:text-blue-500 transition-colors" />
          </div>
          <input
            type="text"
            placeholder="Search report IDs or locations..."
            className="w-full bg-gray-50 border border-gray-200 rounded-full py-2 pl-10 pr-4 text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none font-medium shadow-sm hover:shadow"
          />
        </div>

        <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
          <button className="relative p-2.5 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
            <Bell size={22} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] bg-red-600 border-2 border-white rounded-full flex items-center justify-center text-[10px] font-black text-white px-1 shadow-sm">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
          <Link to="/admin/profile" className="w-10 h-10 bg-gray-900 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold cursor-pointer hover:bg-black shadow border border-gray-100 hover:scale-105 transition-transform overflow-hidden">
            {currentUser?.photoURL ? (
              <img src={currentUser.photoURL} alt="User" className="w-full h-full object-cover" />
            ) : (
              (currentUser?.displayName || 'AD').substring(0, 2).toUpperCase()
            )}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50/70 text-gray-900 font-sans flex flex-col selection:bg-blue-100">
      <div className="flex flex-1 relative w-full mx-auto justify-center md:justify-start">
        <Sidebar />

        <div className="flex-1 flex flex-col min-w-0 w-full relative">
          <TopNav />
          <main className="p-4 sm:p-6 md:p-8 w-full max-w-7xl mx-auto pb-24 lg:pb-8 flex-1 min-h-[700px] animate-in fade-in slide-in-from-bottom-2 duration-700">
            {children}
          </main>

          <footer className="w-full bg-white border-t border-gray-200 py-6 px-4 md:px-8 mt-auto hidden lg:flex items-center justify-between z-10 shrink-0">
            <p className="text-gray-500 font-medium text-sm">© 2026 CivicArchitect Admin Grid</p>
            <div className="flex items-center gap-6 text-sm font-bold text-gray-600">
              <Link to="#" className="hover:text-blue-600 transition-colors">Audit Logs</Link>
              <Link to="#" className="hover:text-blue-600 transition-colors">Database Access</Link>
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
