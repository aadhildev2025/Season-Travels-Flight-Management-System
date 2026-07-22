import { useState, useEffect, useRef } from 'react';
import { useFlightStore } from '../store/flightStore';
import ConfirmDialog from './ConfirmDialog';
import { LogOut, Plus, RefreshCw, Download, ChevronDown, UserCircle, Search } from 'lucide-react';
import type { TZ } from '../App';

interface HeaderProps {
  tz: TZ;
  onTzChange: (tz: TZ) => void;
  search: string;
  onSearchChange: (s: string) => void;
  showSearch: boolean;
  onAddNew: () => void;
  onRefresh: () => void;
  onPDF: () => void;
  onNavigate: (view: string) => void;
}

export default function Header({ tz, onTzChange, search, onSearchChange, showSearch, onAddNew, onRefresh, onPDF, onNavigate }: HeaderProps) {
  const { currentUser, logout } = useFlightStore();

  const [clock, setClock] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Clock — switches between CET and SL
  useEffect(() => {
    const targetTz = tz === 'CET' ? 'Europe/Stockholm' : 'Asia/Colombo';
    const tzLabel = tz === 'CET' ? 'CET' : 'SLT';
    const tick = () => {
      const now = new Date();
      setClock(now.toLocaleTimeString('en-GB', { timeZone: targetTz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));
      setDateStr(
        now.toLocaleDateString('en-GB', { timeZone: targetTz, weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
        + ' · ' + tzLabel
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [tz]);

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const clockColor = tz === 'CET' ? 'var(--indigo2)' : 'var(--cyan)';

  return (
    <>
      <header className="app-header">
        <div style={{
          display: 'flex', alignItems: 'center',
          padding: '0 20px', height: 64, gap: 16,
          maxWidth: 1400, margin: '0 auto', width: '100%',
        }}>

          {/* ── Brand ─────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9,
              background: 'linear-gradient(135deg,#6366f1,#818cf8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 16px rgba(99,102,241,0.35)', flexShrink: 0,
            }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21 4 19 2c-2-2-4-2-5.5-.5L10 5 1.8 6.2c-.5.1-.9.5-.9 1.1l.8 1.1 4.1 4.1L4.2 21l1.8.8 5.5-2.4 4.1 4.1 1.1.8c.6 0 1-.4 1.1-.9l1.2-8.2" />
              </svg>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 11, fontWeight: 900, color: 'var(--text)', letterSpacing: '0.03em', lineHeight: 1.2 }}>FLIGHT DEPARTURES</span>
              <span style={{ fontSize: 8, fontWeight: 600, color: 'var(--indigo2)', letterSpacing: '0.14em', textTransform: 'uppercase', lineHeight: 1.4 }}>Season Travels Scandic</span>
            </div>
          </div>

          {/* ── Centre: TZ toggle + Clock + actions ── */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            {/* TZ toggle above clock */}
            <div style={{ display: 'flex', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 7, overflow: 'hidden' }}>
              {(['CET', 'SLT'] as TZ[]).map(t => (
                <button key={t} onClick={() => onTzChange(t)}
                  style={{
                    padding: '3px 14px', border: 'none', cursor: 'pointer',
                    fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', transition: 'all 0.15s',
                    background: tz === t ? (t === 'CET' ? 'var(--indigo)' : '#0891b2') : 'transparent',
                    color: tz === t ? '#fff' : 'var(--text2)',
                  }}>
                  {t}
                </button>
              ))}
            </div>

            {/* Big clock — colour and time change with TZ */}
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 28, fontWeight: 700, color: clockColor,
              letterSpacing: '0.06em', lineHeight: 1,
              textShadow: `0 0 24px ${clockColor === 'var(--indigo2)' ? 'rgba(165,180,252,0.3)' : 'rgba(34,211,238,0.25)'}`,
            }}>
              {clock}
            </div>
            <div style={{ fontSize: 9, color: 'var(--text2)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {dateStr}
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
              <button onClick={onAddNew} className="btn btn-green btn-sm" style={{ gap: 4 }}>
                <Plus size={11} /> Add New Ticket
              </button>
              <button onClick={onRefresh} className="btn btn-ghost btn-icon" style={{ padding: '4px 7px' }} title="Refresh">
                <RefreshCw size={11} />
              </button>
              <button onClick={onPDF} className="btn btn-ghost btn-sm" style={{ gap: 4 }}>
                <Download size={11} /> PDF
              </button>
            </div>
          </div>

          {/* ── Right: Search + User ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>

            {/* Search bar — only show on Dashboard */}
            {showSearch && (
              <div style={{ position: 'relative' }}>
                <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
                <input
                  type="text"
                  placeholder="Search passenger or PNR..."
                  value={search}
                  onChange={e => onSearchChange(e.target.value)}
                  style={{
                    background: 'var(--bg2)', border: '1px solid var(--border)',
                    borderRadius: 8, padding: '7px 12px 7px 30px',
                    fontSize: 12, color: 'var(--text)', outline: 'none',
                    width: 220, transition: 'border-color 0.15s, box-shadow 0.15s',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--indigo)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
                />
              </div>
            )}

            {/* User avatar dropdown */}
            <div ref={menuRef} style={{ position: 'relative' }}>
              <button onClick={() => setMenuOpen(!menuOpen)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '5px 9px 5px 5px', borderRadius: 9, cursor: 'pointer',
                  background: menuOpen ? 'var(--surface2)' : 'var(--surface)',
                  border: '1px solid var(--border)', transition: 'background 0.13s',
                }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 7,
                  background: 'linear-gradient(135deg,#6366f1,#818cf8)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 900, color: '#fff', flexShrink: 0,
                }}>
                  {(currentUser?.name || 'S').charAt(0).toUpperCase()}
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2, maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {currentUser?.name || 'Staff'}
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--text2)', lineHeight: 1.2 }}>{currentUser?.role}</div>
                </div>
                <ChevronDown size={12} style={{ color: 'var(--text2)', flexShrink: 0, transform: menuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>

              {menuOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 10, padding: 5, minWidth: 172,
                  boxShadow: '0 12px 40px rgba(0,0,0,0.55)', zIndex: 200,
                }}>
                  <div style={{ padding: '8px 10px 10px', borderBottom: '1px solid var(--border2)', marginBottom: 4 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>{currentUser?.name}</div>
                    <div style={{ fontSize: 9, color: 'var(--text2)', marginTop: 2 }}>{currentUser?.email}</div>
                    <span className={currentUser?.role === 'Admin' ? 'role-admin' : 'role-staff'} style={{ display: 'inline-block', marginTop: 5 }}>
                      {currentUser?.role}
                    </span>
                  </div>
                  <MenuBtn icon={<UserCircle size={13} />} label="My Profile"
                    onClick={() => { setMenuOpen(false); onNavigate('profile'); }} />
                  <MenuBtn icon={<LogOut size={13} />} label="Sign Out" danger
                    onClick={() => { setMenuOpen(false); setLogoutOpen(true); }} />
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <ConfirmDialog open={logoutOpen} title="Sign Out" message="Are you sure you want to sign out?"
        confirmLabel="Sign Out" variant="danger"
        onConfirm={() => { logout(); setLogoutOpen(false); }}
        onCancel={() => setLogoutOpen(false)} />
    </>
  );
}

function MenuBtn({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  const [hover, setHover] = useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 10px', borderRadius: 7, border: 'none', cursor: 'pointer',
        fontSize: 12, fontWeight: 600, transition: 'background 0.12s',
        background: hover ? (danger ? 'rgba(239,68,68,0.08)' : 'var(--surface2)') : 'transparent',
        color: danger ? '#f87171' : (hover ? 'var(--text)' : 'var(--text2)'),
      }}>
      {icon} {label}
    </button>
  );
}
