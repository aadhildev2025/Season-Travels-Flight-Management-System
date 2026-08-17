import { useState, useEffect, useRef } from 'react';
import { useFlightStore } from './store/flightStore';
import { useSpreadsheetStore } from './store/spreadsheetStore';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import TicketForm from './components/TicketForm';
import AuditLogs from './components/AuditLogs';
import Staff from './components/Staff';
import { StaffCalendar } from './components/StaffCalendar';
import { NoteSummarizer } from './components/NoteSummarizer';
import { PasswordCredential } from './components/PasswordCredential';
import { SpreadsheetConsole } from './components/SpreadsheetConsole';
import ConfirmDialog from './components/ConfirmDialog';
import SplashScreen from './components/SplashScreen';
import HeaderClock from './components/HeaderClock';
import type { Ticket } from './types';
import {
  ScrollText,
  Users,
  LogOut,
  Plus,
  RefreshCw,
  Download,
  Search,
  ChevronDown,
  Menu,
  X,
  CheckCircle,
  Sun,
  Moon,
  Sparkles,
  Lock,
  Grid,
  FileText,
  Calendar
} from 'lucide-react';
import logoSrc from './logo/2.png';
import dashboardLogoSrc from './logo/3.png';

export type View = 'dashboard' | 'ticket-form' | 'audit-logs' | 'profile' | 'staff' | 'note-summarizer' | 'password-credential' | 'spreadsheets' | 'staff-calendar';
export type TZ = 'CET' | 'SLT';

export default function App() {
  const { isAuthenticated, fetchSession, currentUser, tickets, fetchTickets, logout, loading, toast, showToast, theme, toggleTheme } = useFlightStore();
  const [view, setView] = useState<View>(() => {
    const saved = localStorage.getItem('currentView');
    return (saved as View) || 'dashboard';
  });
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [mounted, setMounted] = useState(false);
  const [showSplash, setShowSplash] = useState(() => !sessionStorage.getItem('splashShown'));
  const [appReady, setAppReady] = useState(false);
  const [tz] = useState<TZ>('CET');
  const [search, setSearch] = useState('');
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Sidebar always starts collapsed; user opens it manually
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [focusRemarks, setFocusRemarks] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    localStorage.setItem('currentView', view);
  }, [view]);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSession().finally(() => setMounted(true));
  }, [fetchSession]);

  // Check backend readiness on mount, then mark app as ready
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await useFlightStore.getState().checkBackendReady();
      if (!cancelled) setAppReady(true);
    })();
    return () => { cancelled = true; };
  }, []);

  // Auto-expire tickets whose departure time has passed
  useEffect(() => {
    if (!isAuthenticated) return;
    const check = () => useFlightStore.getState().expireOldTickets();
    check();
    const interval = setInterval(check, 1000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Lock body scroll on ticket form
  useEffect(() => {
    if (view === 'ticket-form') {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [view]);

  // Feature permission check helper
  const isViewPermitted = (targetView: View): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 'Admin') return true;
    if (targetView === 'profile') return true;

    const adminOnlyViews: View[] = ['audit-logs', 'staff'];
    if (adminOnlyViews.includes(targetView)) return false;

    const checkKey = targetView === 'ticket-form' ? 'dashboard' : targetView;

    const userPerms = currentUser.permissions && currentUser.permissions.length > 0
      ? currentUser.permissions
      : ['dashboard', 'note-summarizer', 'password-credential', 'spreadsheets', 'staff-calendar'];

    return userPerms.includes(checkKey);
  };

  // Reset view and sidebar on login, checking permissions
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      const saved = localStorage.getItem('currentView') as View;
      if (saved && isViewPermitted(saved)) {
        setView(saved);
      } else {
        const firstPermitted = sidebarNavItems.find(item => isViewPermitted(item.id as View))?.id as View || 'dashboard';
        setView(firstPermitted);
      }
      setSidebarOpen(false);
      setSidebarCollapsed(true);
    }
  }, [isAuthenticated, currentUser]);

  // Sync theme to DOM
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Always sync both CET and SL clocks
  // (Clock now lives in the self-contained <HeaderClock/> so ticking does not
  //  re-render App or the ticket table.)

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

  // Branded splash on first load of the session or while backend is starting
  if (showSplash || !appReady) {
    return (
      <SplashScreen
        onDone={() => {
          sessionStorage.setItem('splashShown', '1');
          setShowSplash(false);
        }}
      />
    );
  }

  if (!mounted) return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }} className="fade-in">
        <div className="spin" style={{ width: 34, height: 34, borderRadius: '50%', border: '3px solid var(--indigo)', borderTopColor: 'transparent' }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Loading Flight Console…</span>
      </div>
    </div>
  );

  if (!isAuthenticated) return <Login />;

  const isAdmin = currentUser?.role === 'Admin';

  const handleAddNew = () => { setEditingTicket(null); setFocusRemarks(false); setView('ticket-form'); };
  const handleEdit = (t: Ticket, focusRemarks?: boolean) => { setEditingTicket(t); setFocusRemarks(!!focusRemarks); setView('ticket-form'); };
  const handleBack = () => { setEditingTicket(null); setFocusRemarks(false); setView('dashboard'); };
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      window.dispatchEvent(new CustomEvent('app:refresh'));
      const activeSheetId = useSpreadsheetStore.getState().activeSpreadsheet?.id || useSpreadsheetStore.getState().activeSpreadsheet?._id;
      await Promise.all([
        fetchTickets(),
        useSpreadsheetStore.getState().fetchSpreadsheets(),
        activeSheetId ? useSpreadsheetStore.getState().fetchSpreadsheetById(activeSheetId) : Promise.resolve(),
      ]);
    } catch (err) {
      console.error('Refresh error:', err);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };
  const handleTicketSuccess = (msg: string, keepFormOpen?: boolean) => {
    showToast(msg);
    if (!keepFormOpen) {
      setEditingTicket(null);
      setView('dashboard');
    }
  };

  const handlePDF = async () => {
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const { applySeasonTravelsWatermark } = await import('./utils/pdfWatermark');

      const doc = new jsPDF({ orientation: 'landscape' });

      const rows = tickets.map(t => {
        const cetTime = t.departureTimeUTC ? new Date(t.departureTimeUTC).toLocaleTimeString('en-GB', { timeZone: 'Europe/Stockholm', hour: '2-digit', minute: '2-digit', hour12: false }) : '';
        const sltTime = t.departureTimeUTC ? new Date(t.departureTimeUTC).toLocaleTimeString('en-GB', { timeZone: 'Asia/Colombo', hour: '2-digit', minute: '2-digit', hour12: false }) : '';
        const date = t.departureTimeUTC ? new Date(t.departureTimeUTC).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '';
        return [date, t.passengerName, t.departureAirport, t.arrivalAirport, cetTime, sltTime, t.flightNumber || '—', t.pnr, t.checkin ? 'YES' : 'NO', t.remind ? 'YES' : 'NO'];
      });

      autoTable(doc, {
        startY: 24,
        margin: { top: 24, bottom: 15, left: 14, right: 14 },
        head: [['Date', 'Name', 'From', 'To', 'CET', 'SLT Time', 'Flight No.', 'PNR', 'Checkin', 'Remind']],
        body: rows,
        styles: { fontSize: 8.5, cellPadding: 3, textColor: [30, 41, 59] },
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
      });

      applySeasonTravelsWatermark(doc, 'Flight Departures Record');

      const now = new Date();
      const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
      const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }).replace(/:/g, '-');
      doc.save(`season-travels-departures_${dateStr}_${timeStr}.pdf`);
    } catch (err) { console.error('PDF failed:', err); }
  };

  // Nav Items definition
  const sidebarNavItems = [
    { id: 'dashboard', label: 'Flight Departure', logoSrc: dashboardLogoSrc },
    { id: 'note-summarizer', label: 'AI Summarization', icon: <Sparkles size={15} /> },
    { id: 'password-credential', label: 'Notepad', icon: <FileText size={15} /> },
    { id: 'spreadsheets', label: 'Spreadsheets', icon: <Grid size={15} /> },
    { id: 'audit-logs', label: 'Audit Logs', icon: <ScrollText size={15} />, adminOnly: true },
    { id: 'staff', label: 'Staff Management', icon: <Users size={15} />, adminOnly: true },
    { id: 'staff-calendar', label: 'Staff Calendar', icon: <Calendar size={15} /> },
  ];

  const activeTab = view === 'ticket-form' ? 'dashboard' : view;
  const pageTitle = view === 'ticket-form'
    ? (editingTicket ? 'Edit Departure Ticket' : 'Add Departure Ticket')
    : view === 'password-credential'
    ? 'Notepad'
    : view === 'dashboard'
      ? (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <img src={dashboardLogoSrc} alt="" style={{ width: 24, height: 24, objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
          <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.01em' }}>Flight Departure</span>
        </span>
      )
      : view.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <HeaderClock />

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
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0 }}>
            <img src={logoSrc} alt="Season Travels" style={{ width: 260, height: 120, objectFit: 'contain', flexShrink: 0 }} />
          </div>
          {/* Desktop collapse button */}
          <button
            className="sidebar-collapse-btn desktop-only"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            style={{
              background: 'none', border: '1px solid rgba(255, 255, 255, 0.06)', color: '#6b6b94',
              cursor: 'pointer', padding: 4, borderRadius: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s', flexShrink: 0
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#16162a'; e.currentTarget.style.color = '#eaeaf5'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#6b6b94'; }}
          >
            <X size={14} />
          </button>
          {/* Mobile close button */}
          <button 
            className="mobile-close-btn"
            onClick={() => setSidebarOpen(false)}
            style={{ 
              background: 'none', border: 'none', color: '#6b6b94', 
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
            if (!isViewPermitted(item.id as View)) return null;
            const isActive = activeTab === item.id;
            return (
               <button
                 key={item.id}
                 onClick={() => { setView(item.id as View); setSidebarOpen(false); setSidebarCollapsed(true); }}
                 className={`sidebar-link${isActive ? ' active' : ''}`}
               >
                {item.logoSrc ? (
                  <span className="link-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18 }}>
                    <img src={item.logoSrc} alt="" style={{ width: 18, height: 18, objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
                  </span>
                ) : (
                  <span className="link-icon">{item.icon}</span>
                )}
                <span style={{ flex: 1 }}>{item.label}</span>
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
                padding: '8px 10px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)',
                background: userDropdownOpen ? '#16162a' : '#111120',
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
                <div style={{ fontSize: 12, fontWeight: 700, color: '#eaeaf5', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {currentUser?.name}
                </div>
                <div style={{ fontSize: 10, color: '#6b6b94', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {currentUser?.role}
                </div>
              </div>
              <ChevronDown size={12} style={{ color: '#6b6b94', transform: userDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
            </button>

             {userDropdownOpen && (
                <div style={{
                  position: 'absolute', bottom: 'calc(100% + 8px)', left: 0, right: 0,
                  background: '#16162a', border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 10, padding: 4, zIndex: 100,
                  boxShadow: '0 -8px 24px rgba(0,0,0,0.5)'
                 }}>
                   <button
                     onClick={() => { setUserDropdownOpen(false); setLogoutOpen(true); setSidebarOpen(false); }}
                     style={{
                       width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                       padding: '8px 10px', borderRadius: 7, border: 'none', background: 'none',
                       cursor: 'pointer', color: '#f43f5e', fontSize: 11, fontWeight: 600,
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
              background: 'none', border: '1px solid rgba(255,255,255,0.06)', color: '#6b6b94',
              cursor: 'pointer', padding: '5px 6px', borderRadius: 7, marginRight: 8,
              display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700,
              transition: 'all 0.15s'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#16162a'; e.currentTarget.style.color = '#eaeaf5'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#6b6b94'; }}
            >
              <Menu size={14} />
            </button>
          )}

          <div style={{ fontSize: 15, fontWeight: 800, color: '#eaeaf5', letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {pageTitle}
          </div>

          {/* Theme Switch & Global Refresh Button Group */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 10, flexShrink: 0 }}>
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 36, height: 36, borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)',
                background: theme === 'dark' ? 'rgba(34,211,238,0.12)' : 'rgba(15,23,42,0.08)',
                color: theme === 'dark' ? '#22d3ee' : '#4f46e5',
                cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0,
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.background = theme === 'dark' ? 'rgba(34,211,238,0.22)' : 'rgba(15,23,42,0.14)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = theme === 'dark' ? 'rgba(34,211,238,0.12)' : 'rgba(15,23,42,0.08)'; }}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <button
              onClick={handleRefresh}
              title="Refresh Data"
              disabled={loading || isRefreshing}
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 36, height: 36, borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)',
                background: theme === 'dark' ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.08)',
                color: theme === 'dark' ? '#818cf8' : '#4f46e5',
                cursor: (loading || isRefreshing) ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s', flexShrink: 0,
                opacity: (loading || isRefreshing) ? 0.7 : 1,
              }}
              onMouseEnter={e => {
                if (!loading && !isRefreshing) {
                  e.currentTarget.style.transform = 'scale(1.08)';
                  e.currentTarget.style.background = theme === 'dark' ? 'rgba(99,102,241,0.22)' : 'rgba(99,102,241,0.14)';
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.background = theme === 'dark' ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.08)';
              }}
            >
              <RefreshCw size={16} className={(loading || isRefreshing) ? "spin" : ""} />
            </button>
          </div>

          {/* Spacer to push search and actions to the right */}
          <div style={{ flex: 1 }} />

          {/* Search bar inside topbar (Only on dashboard) */}
          {view === 'dashboard' && (
            <div className="topbar-search" style={{ position: 'relative', width: 220 }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#3d3d5c', pointerEvents: 'none' }} />
              <input
                type="text"
                placeholder="Search passengers or PNR..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  background: '#0a0a14', border: '1px solid rgba(255,255,255,0.06)',
                   borderRadius: 8, padding: search ? '7px 28px 7px 30px' : '7px 12px 7px 30px',
                  fontSize: 13, color: '#eaeaf5', outline: 'none',
                  width: '100%', transition: 'border-color 0.15s, box-shadow 0.15s'
                }}
                onFocus={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.boxShadow = 'none'; }}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  title="Clear search"
                  style={{
                    position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#3d3d5c', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: 2, borderRadius: 4, transition: 'color 0.15s',
                    lineHeight: 1,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#eaeaf5'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#3d3d5c'; }}
                >
                  <X size={13} />
                </button>
              )}
            </div>
          )}

          {/* Quick action controls */}
          <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {view === 'dashboard' && (
              <>
                <button onClick={handleAddNew} className="btn btn-primary btn-sm" style={{ gap: 4 }}>
                  <Plus size={12} /> Add Ticket
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
        <main className="main-content-area" style={{ flex: 1, position: 'relative', padding: view === 'staff-calendar' ? 0 : undefined, overflow: (view === 'ticket-form' || view === 'spreadsheets' || view === 'staff-calendar') ? 'hidden' : 'visible' }}>
          <div key={view} className="view-transition" style={{ height: '100%' }}>
          {view === 'dashboard' && isViewPermitted('dashboard') && (
            <Dashboard 
              onEdit={handleEdit} 
              tz={tz} 
              search={search} 
              setSearch={setSearch}
              onAddNew={handleAddNew}
              onRefresh={handleRefresh}
              onPDF={handlePDF}
            />
          )}
          {view === 'ticket-form' && isViewPermitted('ticket-form') && (
            <TicketForm 
              editingTicket={editingTicket} 
              onBack={handleBack}
              onSuccess={handleTicketSuccess}
              focusRemarks={focusRemarks}
            />
          )}
          {view === 'staff-calendar' && isViewPermitted('staff-calendar') && (
            <StaffCalendar currentUser={currentUser} />
          )}
          {view === 'audit-logs' && isAdmin && (
            <AuditLogs tz={tz} />
          )}
          {view === 'staff' && isAdmin && (
            <Staff tz={tz} />
          )}
          {view === 'note-summarizer' && isViewPermitted('note-summarizer') && (
            <NoteSummarizer />
          )}
          {view === 'password-credential' && isViewPermitted('password-credential') && (
            <PasswordCredential />
          )}
          {view === 'spreadsheets' && isViewPermitted('spreadsheets') && (
            <SpreadsheetConsole />
          )}
          </div>
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
        <div className="toast-pop" style={{
          position: 'fixed', top: 70, right: 28, zIndex: 9999,
          display: 'flex', alignItems: 'center', gap: 10,
          background: toast.type === 'success' 
            ? 'linear-gradient(135deg, #059669, #10b981)' 
            : (toast.type === 'error' ? 'linear-gradient(135deg, #dc2626, #ef4444)' : 'linear-gradient(135deg, #4f46e5, #6366f1)'),
          color: '#ffffff',
          border: toast.type === 'success' ? '1px solid #34d399' : (toast.type === 'error' ? '1px solid #f87171' : '1px solid #a5b4fc'),
          borderRadius: 12, padding: '12px 20px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.4), 0 0 15px rgba(16,185,129,0.25)',
          fontSize: 13, fontWeight: 700, maxWidth: 320,
        }}>
          {toast.type === 'success' ? (
            <CheckCircle size={18} style={{ flexShrink: 0, color: '#ffffff' }} />
          ) : (
            <CheckCircle size={18} style={{ flexShrink: 0, color: '#ffffff' }} />
          )}
          <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', color: '#ffffff' }}>
            {toast.message}
          </span>
        </div>
      )}
    </div>
  );
}
