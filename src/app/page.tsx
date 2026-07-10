'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import MobileNav from '@/components/MobileNav';
import Dashboard from '@/components/Dashboard';
import FlightWizard from '@/components/FlightWizard';
import Analytics from '@/components/Analytics';
import AuditLogs from '@/components/AuditLogs';
import StaffSettings from '@/components/StaffSettings';
import Login from '@/components/Login';
import { useFlightStore } from '@/store/flightStore';

export default function Home() {
  const { currentUser, isAuthenticated } = useFlightStore();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [viewTimezone, setViewTimezone] = useState('Asia/Colombo');
  const [editingTicketId, setEditingTicketId] = useState<string | null>(null);
  
  // Hydration safeguard — resolves immediately on client mount
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);

    // Register service worker (directly, no load event wrapper needed)
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => console.log('SW registered:', reg.scope))
        .catch((err) => console.warn('SW registration failed:', err));
    }
  }, []);

  // Fallback: in case useEffect is delayed, force mounted after 100ms
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[var(--background)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
          <span className="text-xs font-semibold text-slate-400">Loading Flight Console...</span>
        </div>
      </div>
    );
  }


  // Render Login page if not authenticated
  if (!isAuthenticated) {
    return <Login />;
  }

  // Render current active tab view
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            viewTimezone={viewTimezone}
            setActiveTab={setActiveTab}
            setEditingTicketId={setEditingTicketId}
          />
        );
      case 'wizard':
        return (
          <FlightWizard 
            editingTicketId={editingTicketId}
            setEditingTicketId={setEditingTicketId}
            setActiveTab={setActiveTab}
            viewTimezone={viewTimezone}
          />
        );
      case 'analytics':
        return <Analytics />;
      case 'logs':
        return <AuditLogs />;
      case 'staff':
        return <StaffSettings />;
      default:
        return (
          <Dashboard 
            viewTimezone={viewTimezone}
            setActiveTab={setActiveTab}
            setEditingTicketId={setEditingTicketId}
          />
        );
    }
  };

  return (
    <div className="flex min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      
      {/* Sidebar for Desktop */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Header with quick timezone and role simulation options */}
        <Header 
          viewTimezone={viewTimezone}
          setViewTimezone={setViewTimezone}
        />

        {/* Dynamic page sub-views container */}
        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8 max-w-7xl w-full mx-auto">
          {renderContent()}
        </main>
      </div>

      {/* Mobile Navigation bar */}
      <MobileNav 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
      />

    </div>
  );
}
