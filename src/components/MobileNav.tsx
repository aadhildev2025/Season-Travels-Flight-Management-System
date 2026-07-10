'use client';

import React from 'react';
import { useFlightStore } from '@/store/flightStore';
import { 
  LayoutDashboard, 
  Plus, 
  BarChart3, 
  History
} from 'lucide-react';

interface MobileNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function MobileNav({ activeTab, setActiveTab }: MobileNavProps) {
  const { currentUser } = useFlightStore();
  const isAdmin = currentUser?.role === 'Admin' || (currentUser?.role as any) === 'Super Admin';

  const btn = (id: string, label: string, Icon: React.ElementType) => {
    const active = activeTab === id;
    return (
      <button
        key={id}
        onClick={() => setActiveTab(id)}
        className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-all active:scale-95 ${
          active ? 'text-primary dark:text-accent' : 'text-slate-400 dark:text-slate-500'
        }`}
      >
        <Icon className="w-5 h-5" />
        <span className={`text-[9px] font-semibold ${active ? 'text-primary dark:text-accent' : ''}`}>{label}</span>
      </button>
    );
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shadow-xl px-2 pt-2 pb-6 flex items-center justify-around">
      
      {btn('dashboard', 'Dashboard', LayoutDashboard)}
      {btn('analytics', 'Analytics', BarChart3)}

      {/* Centered ADD button */}
      <button
        onClick={() => setActiveTab('wizard')}
        className="w-12 h-12 rounded-full bg-gradient-premium text-white flex items-center justify-center -translate-y-4 shadow-lg shadow-primary/30 border-4 border-white dark:border-slate-950 active:scale-95 transition-all"
        title="New Ticket"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Audit Logs (admin only, else spare slot) */}
      {isAdmin ? btn('logs', 'Audit Logs', History) : <div className="w-12" />}

    </div>
  );
}
