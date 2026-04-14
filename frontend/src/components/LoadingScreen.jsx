import React, { useState, useEffect } from 'react';
import logo from '../assets/Polish_20260412_192029707.svg';

const messages = [
  "Initializing civic matrix...",
  "Syncing community reports...",
  "Analyzing geospatial data...",
  "Connecting to municipal hubs...",
  "Powering up AI analysis...",
  "Checking safety parameters..."
];

export default function LoadingScreen() {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % messages.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gray-50 overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100/50 rounded-full blur-[100px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-100/50 rounded-full blur-[100px] animate-pulse delay-700" />
      
      <div className="relative flex flex-col items-center">
        {/* Logo Container */}
        <div className="relative mb-12 animate-float">
          <div className="absolute inset-0 bg-blue-400/20 rounded-full blur-2xl animate-pulse scale-150" />
          <div className="relative bg-white p-6 rounded-[2.5rem] shadow-2xl border border-white/50 glass">
            <img 
              src={logo} 
              alt="UrbanEye Logo" 
              className="w-24 h-24 object-contain animate-in zoom-in duration-1000" 
            />
          </div>
        </div>

        {/* Text Area */}
        <div className="text-center space-y-4 max-w-xs animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">UrbanEye</h2>
          
          <div className="h-6 overflow-hidden">
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest animate-in slide-in-from-top-2 duration-500 key={messages[msgIndex]}">
              {messages[msgIndex]}
            </p>
          </div>

          {/* Progress Indicator */}
          <div className="w-48 h-1.5 bg-gray-200 rounded-full mx-auto mt-6 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-700 w-1/3 rounded-full animate-[progress_2s_ease-in-out_infinite]" />
          </div>
        </div>
      </div>

      <style jsx="true">{`
        @keyframes progress {
          0% { left: -33%; width: 33%; }
          50% { left: 33%; width: 50%; }
          100% { left: 100%; width: 33%; }
        }
      `}</style>
    </div>
  );
}
