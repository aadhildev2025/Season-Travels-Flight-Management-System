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
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--sidebar-bg)]/95 backdrop-blur-xl border-t border-[var(--card-border)] shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.4)] px-3 pt-2 pb-[env(safe-area-inset-bottom,8px)] flex items-center justify-around">
      
      {btn('dashboard', 'Dashboard', LayoutDashboard)}
      {btn('analytics', 'Analytics', BarChart3)}

      {/* Centered ADD button */}
      <button
        onClick={() => setActiveTab('wizard')}
        className="w-11 h-11 rounded-full bg-gradient-premium text-white flex items-center justify-center -translate-y-3 shadow-lg shadow-primary/25 active:scale-95 transition-all"
        title="New Ticket"
      >
        <Plus className="w-5 h-5" />
      </button>

      {/* Audit Logs (admin only, else spare slot) */}
      {isAdmin ? btn('logs', 'Logs', History) : <div className="w-11" />}

    </div>
  );
}
