'use client';

import React from 'react';
import { useFlightStore } from '@/store/flightStore';
import { 
  PlaneTakeoff, 
  LayoutDashboard, 
  PlusCircle, 
  BarChart3, 
  History, 
  Users, 
  ChevronLeft, 
  ChevronRight
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export default function Sidebar({ activeTab, setActiveTab, collapsed, setCollapsed }: SidebarProps) {
  const { currentUser } = useFlightStore();
  const isAdmin = currentUser?.role === 'Admin' || (currentUser?.role as any) === 'Super Admin';

  const mainItems = [
    { id: 'dashboard', label: 'Dashboard',   icon: LayoutDashboard },
    { id: 'wizard',    label: 'New Ticket',  icon: PlusCircle },
    { id: 'analytics', label: 'Analytics',   icon: BarChart3 },
  ];

  const adminItems = [
    { id: 'logs',  label: 'Audit Logs',     icon: History },
    { id: 'staff', label: 'Staff Accounts', icon: Users },
  ];

  const NavItem = ({ id, label, icon: Icon }: { id: string; label: string; icon: React.ElementType }) => {
    const isActive = activeTab === id;
    return (
      <button
        onClick={() => setActiveTab(id)}
        title={collapsed ? label : undefined}
        className={`relative flex items-center gap-3 w-full rounded-lg text-[13px] font-medium transition-all duration-150
          ${collapsed ? 'px-0 py-2.5 justify-center' : 'px-3 py-2.5'}
          ${isActive
            ? 'bg-white/10 text-white'
            : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
      >
        {/* Active indicator bar */}
        {isActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-accent rounded-r" />
        )}
        <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
        {!collapsed && <span className="truncate">{label}</span>}

        {/* Collapsed tooltip */}
        {collapsed && (
          <div className="absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2 bg-slate-800 text-white text-xs px-2.5 py-1.5 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50 whitespace-nowrap shadow-xl pointer-events-none border border-slate-700">
            {label}
          </div>
        )}
      </button>
    );
  };

  return (
    <aside
      className={`hidden md:flex flex-col h-screen sticky top-0 flex-shrink-0 transition-layout border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] ${
        collapsed ? 'w-[60px]' : 'w-60'
      }`}
    >
      {/* Brand */}
      <div className={`flex items-center h-[60px] border-b border-[var(--sidebar-border)] flex-shrink-0 ${
        collapsed ? 'justify-center px-0' : 'justify-between px-4'
      }`}>
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-7 h-7 rounded-lg bg-gradient-premium flex items-center justify-center text-white flex-shrink-0">
            <PlaneTakeoff className="w-3.5 h-3.5" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden leading-tight">
              <span className="font-semibold text-[13px] text-white block truncate tracking-tight">Season Travels</span>
              <span className="text-[10px] text-slate-500 block">Flight Console</span>
            </div>
          )}
        </div>
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="p-1 rounded-md text-slate-600 hover:text-slate-300 hover:bg-white/5 transition-colors flex-shrink-0"
            title="Collapse"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className={`flex-1 flex flex-col overflow-y-auto overflow-x-hidden py-3 gap-0.5 group ${
        collapsed ? 'px-1.5' : 'px-2.5'
      }`}>
        {/* Section label */}
        {!collapsed && (
          <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest px-2 pt-1 pb-1.5">Menu</p>
        )}
        {mainItems.map(item => <NavItem key={item.id} {...item} />)}

        {/* Admin section */}
        {isAdmin && (
          <>
            {!collapsed && (
              <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest px-2 pt-4 pb-1.5">Admin</p>
            )}
            {collapsed && <div className="my-2 border-t border-[var(--sidebar-border)]" />}
            {adminItems.map(item => <NavItem key={item.id} {...item} />)}
          </>
        )}

        <div className="flex-1" />


      </nav>

      {/* User info strip */}
      {!collapsed && (
        <div className="px-3 py-3 border-t border-[var(--sidebar-border)] flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-gradient-premium text-white flex items-center justify-center font-semibold text-xs flex-shrink-0">
            {currentUser?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="overflow-hidden flex-1 min-w-0">
            <p className="text-[12px] font-medium text-slate-200 truncate">{currentUser?.name}</p>
            <p className="text-[10px] text-slate-500 truncate">{currentUser?.role}</p>
          </div>
        </div>
      )}

      {/* Collapsed expand */}
      {collapsed && (
        <div className="p-2 border-t border-[var(--sidebar-border)] flex justify-center">
          <button
            onClick={() => setCollapsed(false)}
            className="p-1.5 rounded-md text-slate-600 hover:text-slate-300 hover:bg-white/5 transition-colors"
            title="Expand"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </aside>
  );
}
