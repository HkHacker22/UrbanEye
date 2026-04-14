import React from 'react';
import { Shield, Flame, Activity, Lock, Users, Phone, Info } from 'lucide-react';

export default function EmergencyPortal() {
  const emergencyContacts = [
    {
      title: 'Fire Department',
      number: '101',
      icon: <Flame size={24} className="text-white" />,
      badge: 'AVAILABLE 24/7',
      color: 'bg-red-600',
      lightColor: 'bg-red-100',
      buttonHover: 'hover:bg-red-700',
      textColor: 'text-red-700'
    },
    {
      title: 'Police',
      number: '100',
      icon: <Shield size={24} className="text-white" />,
      badge: 'CITY WIDE',
      color: 'bg-blue-600',
      lightColor: 'bg-blue-100',
      buttonHover: 'hover:bg-blue-700',
      textColor: 'text-blue-700'
    },
    {
      title: 'Ambulance',
      number: '102',
      icon: <Activity size={24} className="text-white" />,
      badge: 'MEDICAL AID',
      color: 'bg-emerald-600',
      lightColor: 'bg-emerald-100',
      buttonHover: 'hover:bg-emerald-700',
      textColor: 'text-emerald-700'
    },
    {
      title: 'Cybercell',
      number: '1930',
      icon: <Lock size={24} className="text-slate-800" />,
      badge: 'DIGITAL DEFENSE',
      color: 'bg-slate-900',
      lightColor: 'bg-slate-200',
      buttonHover: 'hover:bg-slate-800',
      textColor: 'text-slate-900'
    },
    {
      title: "Women's Helpline",
      number: '1091',
      icon: <Users size={24} className="text-white" />,
      badge: 'SUPPORT',
      color: 'bg-indigo-500',
      lightColor: 'bg-indigo-100',
      buttonHover: 'hover:bg-indigo-600',
      textColor: 'text-indigo-600'
    },
    {
      title: 'Child Helpline',
      number: '1098',
      icon: <Phone size={24} className="text-white" />,
      badge: 'PROTECTION',
      color: 'bg-orange-600',
      lightColor: 'bg-orange-100',
      buttonHover: 'hover:bg-orange-700',
      textColor: 'text-orange-600'
    }
  ];

  return (
    <div className="w-full animate-in fade-in duration-500 pb-10">
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-2">
          Emergency Services & Contacts
        </h1>
        <p className="text-slate-600 text-[15px] max-w-2xl font-medium leading-relaxed">
          Immediate assistance for life-threatening situations. Click to call directly from your device for rapid response deployment.
        </p>
      </div>

      {/* Grid of Contacts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        {emergencyContacts.map((contact, index) => (
          <div key={index} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col justify-between hover:shadow-md transition-shadow group">
            
            <div className="flex items-start justify-between mb-8">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${contact.color === 'bg-slate-900' ? contact.lightColor : contact.color}`}>
                 {contact.icon}
              </div>
              <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                {contact.badge}
              </span>
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-800 mb-1">{contact.title}</h3>
              <p className={`text-4xl font-black tracking-tight mb-6 ${contact.textColor}`}>{contact.number}</p>
            </div>

            <a 
              href={`tel:${contact.number}`}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-white transition-colors duration-200 shadow-sm ${contact.color} ${contact.buttonHover}`}
            >
              <Phone size={16} className="fill-white/20" />
              Call Now
            </a>

          </div>
        ))}
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Guidelines */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
          <div className="flex items-center gap-3 mb-8">
             <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
               <Info size={24} />
             </div>
             <h2 className="text-2xl font-bold text-slate-900">What to do in an Emergency</h2>
          </div>
          
          <div className="space-y-6 relative before:absolute before:inset-y-0 before:left-[15px] before:-ml-px before:w-0.5 before:bg-slate-100">
            {[
              { title: "Stay Calm", desc: "Take a deep breath. Speak clearly and slowly so the operator can assist you faster." },
              { title: "State Your Location", desc: "Give your exact address or mention prominent landmarks nearby to help responders find you." },
              { title: "Describe the Situation", desc: "Briefly explain what happened, how many people are involved, and if there are immediate injuries." },
              { title: "Follow Instructions", desc: "Keep the line open. Do not hang up until the dispatcher tells you to do so." }
            ].map((step, idx) => (
              <div key={idx} className="relative flex gap-5">
                <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 font-bold flex items-center justify-center text-sm border border-white z-10 shrink-0">
                  {idx + 1}
                </div>
                <div className="pt-1">
                  <h4 className="text-[15px] font-bold text-slate-900 mb-1">{step.title}</h4>
                  <p className="text-sm text-slate-500 font-medium leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Response Map Placeholder */}
        <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-lg border border-slate-800 relative flex flex-col min-h-[400px]">
          {/* Aesthetic map background */}
          <div className="absolute inset-0 opacity-20 pointer-events-none">
             {/* Using SVG paths roughly resembling a grid/map */}
             <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
             </svg>
          </div>
          
          <div className="absolute top-1/4 inset-x-0 mx-auto w-3/4 h-1 bg-cyan-400 opacity-80 blur-sm shadow-[0_0_20px_rgba(34,211,238,0.8)]"></div>
          <div className="absolute top-1/4 inset-x-0 mx-auto w-3/4 h-0.5 bg-white"></div>
          
          <div className="mt-auto m-6 bg-white/95 backdrop-blur rounded-xl p-5 shadow-xl relative z-10">
             <div className="flex items-center gap-2 mb-2">
               <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
               <h4 className="text-sm font-bold text-blue-900">Live Response Map</h4>
             </div>
             <p className="text-[13px] text-slate-600 font-medium">
               All dispatch centers are currently operational. Average response time in your area: <span className="text-slate-900 font-bold">4 mins 30 secs</span>.
             </p>
          </div>
        </div>

      </div>
    </div>
  );
}
