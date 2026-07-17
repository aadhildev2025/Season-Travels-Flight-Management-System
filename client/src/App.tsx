import { useState, useEffect, useRef } from 'react';
import { useFlightStore } from './store/flightStore';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import BrandLogo from './components/BrandLogo';
import TicketForm from './components/TicketForm';
import Analytics from './components/Analytics';
import AuditLogs from './components/AuditLogs';
import Profile from './components/Profile';
import Staff from './components/Staff';
import ConfirmDialog from './components/ConfirmDialog';
import type { Ticket } from './types';
import {
  LayoutGrid,
  BarChart2,
  ScrollText,
  UserCircle,
  Users,
  LogOut,
  Plus,
  RefreshCw,
  Download,
  Search,
  Clock,
  Plane,
  ChevronDown,
  Menu,
  X,
  CheckCircle
} from 'lucide-react';

export type View = 'dashboard' | 'ticket-form' | 'analytics' | 'audit-logs' | 'profile' | 'staff';
export type TZ = 'CET' | 'SLT';

export default function App() {
  const { isAuthenticated, fetchSession, currentUser, tickets, fetchTickets, logout, loading } = useFlightStore();
  const [view, setView] = useState<View>(() => {
    const saved = localStorage.getItem('currentView');
    return (saved as View) || 'dashboard';
  });
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [mounted, setMounted] = useState(false);
  const [tz] = useState<TZ>('CET');
  const [search, setSearch] = useState('');
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Sidebar always starts collapsed; user opens it manually
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    localStorage.setItem('currentView', view);
  }, [view]);

  useEffect(() => {
    const handleScroll = (e: Event) => {
      let scrollTop = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
      if (e.target && e.target !== document && e.target !== window && e.target instanceof HTMLElement) {
        scrollTop = e.target.scrollTop;
      }
      setScrolled(scrollTop > 15);
    };
    window.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    return () => window.removeEventListener('scroll', handleScroll, { capture: true });
  }, []);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Live ticking clock state - always compute both CET and SL
  const [cetClockTime, setCetClockTime] = useState('');
  const [cetClockDate, setCetClockDate] = useState('');
  const [slClockTime, setSlClockTime] = useState('');
  const [slClockDate, setSlClockDate] = useState('');
  // Keep clockTime/clockDate for backward compat
  const clockTime = cetClockTime;
  const clockDate = cetClockDate;

  useEffect(() => {
    fetchSession().finally(() => setMounted(true));
  }, [fetchSession]);

  // Reset view and sidebar on login
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      const isAdmin = currentUser.role === 'Admin';
      const saved = localStorage.getItem('currentView') as View;
      const adminOnlyViews: View[] = ['analytics', 'audit-logs', 'staff'];
      
      if (saved) {
        if (adminOnlyViews.includes(saved) && !isAdmin) {
          setView('dashboard');
        } else {
          setView(saved);
        }
      } else {
        setView('dashboard');
      }
      setSidebarOpen(false);
      setSidebarCollapsed(true);
    }
  }, [isAuthenticated, currentUser]);

  // Always sync both CET and SL clocks
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setCetClockTime(
        now.toLocaleTimeString('en-GB', { timeZone: 'Europe/Stockholm', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
      );
      setCetClockDate(
        now.toLocaleDateString('en-GB', { timeZone: 'Europe/Stockholm', weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
      );
      setSlClockTime(
        now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Colombo', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
      );
      setSlClockDate(
        now.toLocaleDateString('en-GB', { timeZone: 'Asia/Colombo', weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
      );
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  // Handle outside click for user dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Clear search on switching views
  useEffect(() => {
    setSearch('');
  }, [view]);

  if (!mounted) return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div className="spin" style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid var(--indigo)', borderTopColor: 'transparent' }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>Loading Flight Console…</span>
      </div>
    </div>
  );

  if (!isAuthenticated) return <Login />;

  const isAdmin = currentUser?.role === 'Admin';

  const handleAddNew = () => { setEditingTicket(null); setView('ticket-form'); };
  const handleEdit = (t: Ticket) => { setEditingTicket(t); setView('ticket-form'); };
  const handleBack = () => { setEditingTicket(null); setView('dashboard'); };
  const handleRefresh = () => fetchTickets();
  const handleTicketSuccess = (msg: string) => {
    showToast(msg);
    setEditingTicket(null);
    setView('dashboard');
    fetchTickets();
  };

  const handlePDF = async () => {
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const doc = new jsPDF({ orientation: 'landscape' });
      doc.setFontSize(16);
      doc.text('Season Travels Scandic - Flight Departures', 14, 15);
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);
      const rows = tickets.map(t => {
        const cetTime = t.departureTimeUTC ? new Date(t.departureTimeUTC).toLocaleTimeString('en-GB', { timeZone: 'Europe/Stockholm', hour: '2-digit', minute: '2-digit', hour12: false }) : '';
        const sltTime = t.departureTimeUTC ? new Date(t.departureTimeUTC).toLocaleTimeString('en-GB', { timeZone: 'Asia/Colombo', hour: '2-digit', minute: '2-digit', hour12: false }) : '';
        const date = t.departureTimeUTC ? new Date(t.departureTimeUTC).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '';
        return [date, t.passengerName, t.departureAirport, t.arrivalAirport, cetTime, sltTime, t.flightNumber || '—', t.pnr, t.checkin ? 'YES' : 'NO', t.remind ? 'YES' : 'NO'];
      });
      autoTable(doc, {
        startY: 28,
        head: [['Date', 'Name', 'From', 'To', 'CET', 'SLT Time', 'Flight No.', 'PNR', 'Checkin', 'Remind']],
        body: rows,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [13, 13, 31] },
      });
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
      const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }).replace(/:/g, '-');
      doc.save(`season-travels-departures_${dateStr}_${timeStr}.pdf`);
    } catch (err) { console.error('PDF failed:', err); }
  };

  // Nav Items definition
  const sidebarNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutGrid size={15} /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart2 size={15} />, adminOnly: true },
    { id: 'audit-logs', label: 'Audit Logs', icon: <ScrollText size={15} />, adminOnly: true },
    { id: 'staff', label: 'Staff Management', icon: <Users size={15} />, adminOnly: true },
    { id: 'profile', label: 'My Settings', icon: <UserCircle size={15} /> },
  ];

  const activeTab = view === 'ticket-form' ? 'dashboard' : view;
  const pageTitle = view === 'ticket-form'
    ? (editingTicket ? 'Edit Departure Ticket' : 'Add Departure Ticket')
    : view.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Ambient background glow effects */}
      <div className="ambient-glow" />

      {/* Sidebar Toggle Backdrop overlay */}
      {sidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ════════════════════ SIDEBAR ════════════════════ */}
      <aside className={`sidebar${sidebarOpen ? ' mobile-open' : ''}${sidebarCollapsed ? ' collapsed' : ''}`}>
        {/* Brand/Logo Section */}
        <div className="sidebar-brand" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg, #6366f1, #818cf8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 16px rgba(99,102,241,0.3)', flexShrink: 0
            }}>
              <BrandLogo size={16} style={{ color: 'white' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span style={{ fontSize: 12, fontWeight: 900, letterSpacing: '0.04em', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>SEASON TRAVELS</span>
              <span style={{ fontSize: 8, fontWeight: 700, color: 'var(--indigo2)', letterSpacing: '0.08em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>FLIGHT CONSOLE</span>
            </div>
          </div>
          {/* Desktop collapse button */}
          <button
            className="sidebar-collapse-btn desktop-only"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            style={{
              background: 'none', border: '1px solid var(--border)', color: 'var(--text2)',
              cursor: 'pointer', padding: 4, borderRadius: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s', flexShrink: 0
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface2)'; e.currentTarget.style.color = 'var(--text)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text2)'; }}
          >
            <X size={14} />
          </button>
          {/* Mobile close button */}
          <button 
            className="mobile-close-btn"
            onClick={() => setSidebarOpen(false)}
            style={{ 
              background: 'none', border: 'none', color: 'var(--text2)', 
              cursor: 'pointer', display: 'none', padding: 4, borderRadius: 6,
              alignItems: 'center', justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Sidebar Nav links */}
        <nav className="sidebar-nav">
          <div className="sidebar-section">Main Workspace</div>
          {sidebarNavItems.map(item => {
            if (item.adminOnly && !isAdmin) return null;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { setView(item.id as View); setSidebarOpen(false); }}
                className={`sidebar-link${isActive ? ' active' : ''}`}
              >
                <span className="link-icon">{item.icon}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.adminOnly && (
                  <span style={{
                    fontSize: 7, fontWeight: 800, padding: '1px 4px',
                    borderRadius: 4, background: 'rgba(99,102,241,0.15)', color: 'var(--indigo2)'
                  }}>
                    ADM
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer User profile */}
        <div className="sidebar-footer">
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                padding: '8px 10px', borderRadius: 10, border: '1px solid var(--border)',
                background: userDropdownOpen ? 'var(--surface2)' : 'var(--surface)',
                cursor: 'pointer', transition: 'all 0.15s ease', textAlign: 'left'
              }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: 6,
                background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 800, color: '#fff', flexShrink: 0
              }}>
                {(currentUser?.name || 'S').charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {currentUser?.name}
                </div>
                <div style={{ fontSize: 9, color: 'var(--text2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {currentUser?.role}
                </div>
              </div>
              <ChevronDown size={12} style={{ color: 'var(--text2)', transform: userDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
            </button>

            {userDropdownOpen && (
              <div style={{
                position: 'absolute', bottom: 'calc(100% + 8px)', left: 0, right: 0,
                background: 'var(--surface2)', border: '1px solid var(--border)',
                borderRadius: 10, padding: 4, zIndex: 100,
                boxShadow: '0 -8px 24px rgba(0,0,0,0.5)'
              }}>
                <button
                  onClick={() => { setUserDropdownOpen(false); setView('profile'); setSidebarOpen(false); }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 10px', borderRadius: 7, border: 'none', background: 'none',
                    cursor: 'pointer', color: 'var(--text2)', fontSize: 11, fontWeight: 600,
                    textAlign: 'left'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface3)'; e.currentTarget.style.color = 'var(--text)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text2)'; }}
                >
                  <UserCircle size={14} /> My Profile
                </button>
                <button
                  onClick={() => { setUserDropdownOpen(false); setLogoutOpen(true); setSidebarOpen(false); }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 10px', borderRadius: 7, border: 'none', background: 'none',
                    cursor: 'pointer', color: 'var(--red)', fontSize: 11, fontWeight: 600,
                    textAlign: 'left'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(244,63,94,0.08)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                >
                  <LogOut size={14} /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ════════════════════ MAIN CONTENT WRAPPER ════════════════════ */}
      <div className={`main-content${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>

        {/* ════════════════════ TOPBAR ════════════════════ */}
        <header className="topbar">
          {/* Mobile menu open */}
          <button 
            className="mobile-menu-btn" 
            onClick={() => setSidebarOpen(true)}
            style={{ marginRight: 4 }}
          >
            <Menu size={18} />
          </button>
          {/* Desktop: show expand button when sidebar is collapsed */}
          {sidebarCollapsed && (
            <button
              className="desktop-only"
              onClick={() => setSidebarCollapsed(false)}
              title="Expand sidebar"
              style={{
                background: 'none', border: '1px solid var(--border)', color: 'var(--text2)',
                cursor: 'pointer', padding: '5px 6px', borderRadius: 7, marginRight: 8,
                display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700,
                transition: 'all 0.15s'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface2)'; e.currentTarget.style.color = 'var(--text)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text2)'; }}
            >
              <Menu size={14} />
            </button>
          )}

          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {pageTitle}
          </div>

          {/* Spacer to push search and actions to the right */}
          <div style={{ flex: 1 }} />

          {/* Sticky clock shown in topbar when scrolled */}
          {scrolled && view === 'dashboard' && (
            <div style={{
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: 18,
              animation: 'fadeIn 0.25s ease-out',
              pointerEvents: 'none',
              zIndex: 10,
            }}>
              {/* CET */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--indigo2)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>CET</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 17, fontWeight: 800, color: 'var(--indigo2)', letterSpacing: '0.04em' }}>{cetClockTime}</span>
              </div>
              <div style={{ width: 1, height: 22, background: 'var(--border)' }} />
              {/* SLT */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--cyan)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>SLT</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 17, fontWeight: 800, color: 'var(--cyan)', letterSpacing: '0.04em' }}>{slClockTime}</span>
              </div>
            </div>
          )}

          {/* Search bar inside topbar (Only on dashboard) */}
          {view === 'dashboard' && (
            <div className="topbar-search" style={{ position: 'relative', width: 220 }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
              <input
                type="text"
                placeholder="Search passengers or PNR..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  background: 'var(--bg2)', border: '1px solid var(--border)',
                  borderRadius: 8, padding: '7px 12px 7px 30px',
                  fontSize: 12, color: 'var(--text)', outline: 'none',
                  width: '100%', transition: 'border-color 0.15s, box-shadow 0.15s'
                }}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--indigo)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
              />
            </div>
          )}

          {/* Quick action controls */}
          <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {view === 'dashboard' && (
              <>
                <button onClick={handleAddNew} className="btn btn-primary btn-sm" style={{ gap: 4 }}>
                  <Plus size={12} /> Add Ticket
                </button>
                <button onClick={handleRefresh} className="btn btn-ghost btn-icon" style={{ padding: '6px' }} title="Refresh" disabled={loading}>
                  <RefreshCw size={13} className={loading ? "spin" : ""} />
                </button>
                <button onClick={handlePDF} className="btn btn-ghost btn-sm" style={{ gap: 4 }}>
                  <Download size={12} /> PDF
                </button>
              </>
            )}
            {view === 'ticket-form' && (
              <button onClick={handleBack} className="btn btn-ghost btn-sm">
                Cancel
              </button>
            )}
          </div>
        </header>

        {/* ════════════════════ MAIN CONTENT AREA ════════════════════ */}
        <main className="main-content-area" style={{ flex: 1, position: 'relative' }}>
          {view === 'dashboard' && (
            <Dashboard 
              onEdit={handleEdit} 
              tz={tz} 
              search={search} 
              setSearch={setSearch}
              clockTime={cetClockTime}
              clockDate={cetClockDate}
              slClockTime={slClockTime}
              slClockDate={slClockDate}
              onAddNew={handleAddNew}
              onRefresh={handleRefresh}
              onPDF={handlePDF}
            />
          )}
          {view === 'ticket-form' && (
            <TicketForm 
              editingTicket={editingTicket} 
              onBack={handleBack}
              onSuccess={handleTicketSuccess}
              clockTime={clockTime} 
              clockDate={clockDate} 
              slClockTime={slClockTime} 
              slClockDate={slClockDate} 
            />
          )}
          {view === 'analytics' && isAdmin && (
            <Analytics 
              tz={tz} 
              clockTime={clockTime} 
              clockDate={clockDate} 
              slClockTime={slClockTime} 
              slClockDate={slClockDate} 
            />
          )}
          {view === 'audit-logs' && isAdmin && (
            <AuditLogs 
              tz={tz} 
              clockTime={clockTime} 
              clockDate={clockDate} 
              slClockTime={slClockTime} 
              slClockDate={slClockDate} 
            />
          )}
          {view === 'staff' && isAdmin && (
            <Staff 
              tz={tz} 
              clockTime={clockTime} 
              clockDate={clockDate} 
              slClockTime={slClockTime} 
              slClockDate={slClockDate} 
            />
          )}
          {view === 'profile' && (
            <Profile 
              tz={tz} 
              clockTime={clockTime} 
              clockDate={clockDate} 
              slClockTime={slClockTime} 
              slClockDate={slClockDate} 
            />
          )}
        </main>
      </div>

      {/* Sign Out Confirmation dialog */}
      <ConfirmDialog
        open={logoutOpen}
        title="Sign Out"
        message="Are you sure you want to sign out of your Season Travels session?"
        confirmLabel="Sign Out"
        variant="danger"
        onConfirm={() => {
          localStorage.removeItem('currentView');
          localStorage.removeItem('sidebarCollapsed');
          setSidebarOpen(false);
          setSidebarCollapsed(true);
          logout();
          setLogoutOpen(false);
        }}
        onCancel={() => setLogoutOpen(false)}
      />

      {/* ════ Global Toast Notification ════ */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 28, right: 28, zIndex: 9999,
          display: 'flex', alignItems: 'center', gap: 10,
          background: toast.type === 'success'
            ? 'linear-gradient(135deg, #059669, #10b981)'
            : 'linear-gradient(135deg, #dc2626, #ef4444)',
          color: '#fff', borderRadius: 12, padding: '12px 20px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
          animation: 'slideIn 0.3s cubic-bezier(0.34,1.56,0.64,1)',
          fontSize: 13, fontWeight: 700, minWidth: 240, maxWidth: 340,
        }}>
          <CheckCircle size={18} style={{ flexShrink: 0 }} />
          {toast.message}
        </div>
      )}
    </div>
  );
}
