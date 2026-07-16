import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useFlightStore } from '../store/flightStore';
import { utcToLocalTime, formatCETTime } from '../utils/timezone';
import ConfirmDialog from './ConfirmDialog';
import ClockSection from './ClockSection';
import { Plane, Mail, MessageCircle, X, Search, Plus, RefreshCw, Download } from 'lucide-react';
import type { Ticket } from '../types';
import type { TZ } from '../App';

interface DashboardProps {
  onEdit: (ticket: Ticket) => void;
  tz:     TZ;
  search: string;
  setSearch?: (s: string) => void;
  clockTime: string;
  clockDate: string;
  onAddNew?: () => void;
  onRefresh?: () => void;
  onPDF?: () => void;
}

export default function Dashboard({ onEdit, tz, search, setSearch, clockTime, clockDate, onAddNew, onRefresh, onPDF }: DashboardProps) {
  const { tickets, currentUser, deleteTicket, updateTicket } = useFlightStore();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [todayStr, setTodayStr]               = useState('');
  const [reminderTicket, setReminderTicket]   = useState<Ticket | null>(null);

  useEffect(() => {
    const tick = () => setTodayStr(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' }));
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  const filtered = tickets.filter(t => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return t.passengerName.toLowerCase().includes(q) || t.pnr.toLowerCase().includes(q);
  });

  const formatDate = (utcStr: string) => {
    if (!utcStr) return '';
    const d = new Date(utcStr);
    const m = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    return `${String(d.getUTCDate()).padStart(2,'0')}-${m[d.getUTCMonth()]}-${String(d.getUTCFullYear()).slice(2)}`;
  };

  const getDateStr = (utcStr: string) =>
    utcStr ? new Date(utcStr).toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' }) : '';

  const getDisplayTime = (utcStr: string) => {
    if (!utcStr) return '—';
    return tz === 'CET'
      ? formatCETTime(utcStr)
      : utcToLocalTime(utcStr, 'Asia/Colombo').time;
  };

  const maskName = (name: string) => {
    if (!name) return '';
    const parts = name.toUpperCase().split(' ');
    if (parts.length === 1) return parts[0];
    const [first, ...rest] = parts;
    return first + '/' + rest.map(p => p.slice(0,1) + p.slice(1).replace(/\w/g,'*')).join(' ');
  };

  const buildReminderMessage = (ticket: Ticket) => {
    const dep = utcToLocalTime(ticket.departureTimeUTC, ticket.originalTimezone);
    const tzLabel = ticket.originalTimezone.split('/').pop()?.replace('_',' ') || '';
    return {
      subject: `Flight Reminder - PNR: ${ticket.pnr}`,
      body: `Dear ${ticket.passengerName},\n\nThis is a reminder for your upcoming flight.\n\n✈️ Flight Details:\n━━━━━━━━━━━━━━━━━━━━━━━━\nPNR: ${ticket.pnr}\nRoute: ${ticket.departureAirport} → ${ticket.arrivalAirport}\nDeparture: ${dep.formatted} (${tzLabel})\n━━━━━━━━━━━━━━━━━━━━━━━━\n\nPlease ensure you check in at least 3 hours prior to departure.\n\nWe wish you a safe and pleasant journey! ✈️🌟\n\nWarm regards,\nSEASON TRAVELS\n"Your journey, our passion"`,
    };
  };

  const handleSendGmail = (ticket: Ticket) => {
    const { subject, body } = buildReminderMessage(ticket);
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(ticket.email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(gmailUrl, '_blank');
    setReminderTicket(null);
  };

  const handleSendWhatsApp = (ticket: Ticket) => {
    const { body } = buildReminderMessage(ticket);
    const phone = ticket.phone?.replace(/[^\d+]/g, '') || '';
    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(body)}`;
    window.open(waUrl, '_blank');
    setReminderTicket(null);
  };

  const tzColor = tz === 'CET' ? 'var(--indigo2)' : 'var(--cyan)';
  const tzLabel = tz === 'CET' ? 'CET Time' : 'SL Time';
  const th: React.CSSProperties = { padding:'6px 13px', fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.10em', color:'var(--text2)', whiteSpace:'nowrap', textAlign:'left' };
  const td: React.CSSProperties = { padding:'6px 13px', fontSize:13 };

  return (
    <div className="fade-up" style={{ display:'flex', flexDirection:'column', gap:14 }}>

      {/* Count row & clock */}
      <div className="page-header" style={{ marginBottom: 4 }}>
        <span style={{ fontSize:11, fontWeight:700, color:'var(--text2)', textTransform:'uppercase', letterSpacing:'0.08em', display:'inline-block', alignSelf:'center' }}>
          {filtered.length} Departure{filtered.length !== 1 ? 's' : ''}
          {search && <span style={{ marginLeft:8, color:'var(--text3)', fontWeight:500 }}>· filtered</span>}
        </span>
        <ClockSection tz={tz} clockTime={clockTime} clockDate={clockDate} />
      </div>

      {/* Mobile controls section */}
      <div className="mobile-only-controls" style={{ display: 'none', flexDirection: 'column', gap: 10, marginBottom: 4 }}>
        {/* Search */}
        <div style={{ position: 'relative', width: '100%' }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Search passengers or PNR..."
            value={search}
            onChange={e => setSearch?.(e.target.value)}
            style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '9px 12px 9px 30px',
              fontSize: 12, color: 'var(--text)', outline: 'none',
              width: '100%',
            }}
          />
        </div>
        
        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onAddNew} className="btn btn-primary btn-sm" style={{ flex: 1, gap: 4, padding: '10px' }}>
            <Plus size={12} /> Add Ticket
          </button>
          <button onClick={onRefresh} className="btn btn-ghost btn-icon" style={{ padding: '10px' }} title="Refresh">
            <RefreshCw size={13} />
          </button>
          <button onClick={onPDF} className="btn btn-ghost btn-sm" style={{ gap: 4, padding: '10px' }}>
            <Download size={12} /> PDF
          </button>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="card" style={{ padding:'60px 20px', textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
          <Plane size={30} style={{ color:'var(--text3)', transform:'rotate(45deg)' }} />
          <p style={{ fontSize:13, fontWeight:600, color:'var(--text2)' }}>
            {search ? `No results for "${search}"` : 'No departures found'}
          </p>
          <p style={{ fontSize:11, color:'var(--text3)' }}>
            {search ? 'Try a different name or PNR' : 'Add a ticket using "+ Add New Ticket" above'}
          </p>
        </div>
      ) : (
        <div className="card" style={{ overflow:'hidden' }}>
          <div style={{ overflowX:'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={th}>Date</th>
                  <th style={th}>Name</th>
                  <th style={{ ...th, color:tzColor }}>{tzLabel}</th>
                  <th style={th}>From</th>
                  <th style={th}>To</th>
                  <th style={th}>PNR</th>
                  <th style={{ ...th, textAlign:'center' }}>Checkin</th>
                  <th style={{ ...th, textAlign:'center' }}>Remind</th>
                  <th style={{ ...th, textAlign:'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(ticket => {
                  const isToday = getDateStr(ticket.departureTimeUTC) === todayStr;
                  return (
                    <tr key={ticket._id} className={isToday ? 'is-today' : ''}>

                      <td style={{ ...td, whiteSpace:'nowrap' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          {isToday && (
                            <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--green)', animation:'pulseGlow 1.8s ease-in-out infinite', flexShrink:0 }} />
                          )}
                          <span style={{ fontFamily:"'JetBrains Mono',monospace", fontWeight:700, color:'var(--text)', fontSize:13 }}>
                            {formatDate(ticket.departureTimeUTC)}
                          </span>
                        </div>
                      </td>

                      <td style={{ ...td, fontWeight:700, color:'var(--text)', maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {maskName(ticket.passengerName)}
                      </td>

                      <td style={td}>
                        <span style={{ fontFamily:"'JetBrains Mono',monospace", fontWeight:700, color:tzColor, fontSize:15 }}>
                          {getDisplayTime(ticket.departureTimeUTC)}
                        </span>
                      </td>

                      <td style={{ ...td, fontWeight:800, color:'var(--text)', letterSpacing:'0.04em' }}>{ticket.departureAirport}</td>
                      <td style={{ ...td, fontWeight:800, color:'var(--text)', letterSpacing:'0.04em' }}>{ticket.arrivalAirport}</td>

                      <td style={td}>
                        <span style={{ fontFamily:"'JetBrains Mono',monospace", fontWeight:700, color:'var(--cyan)', fontSize:13, letterSpacing:'0.04em' }}>
                          {ticket.pnr}
                        </span>
                      </td>

                      <td style={{ ...td, textAlign:'center' }}>
                        <button onClick={() => updateTicket(ticket._id, { checkin: !ticket.checkin })}
                          className={ticket.checkin ? 'badge-yes' : 'badge-no'}>
                          {ticket.checkin ? 'YES' : 'NO'}
                        </button>
                      </td>

                      <td style={{ ...td, textAlign:'center' }}>
                        <button onClick={() => updateTicket(ticket._id, { remind: !ticket.remind })}
                          className={ticket.remind ? 'badge-yes' : 'badge-no'}>
                          {ticket.remind ? 'YES' : 'NO'}
                        </button>
                      </td>

                      <td style={{ ...td, textAlign:'center', whiteSpace:'nowrap' }}>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:4 }}>
                          <button onClick={() => setReminderTicket(ticket)} className="btn btn-blue btn-sm">MAIL</button>
                          <button onClick={() => onEdit(ticket)}     className="btn btn-cyan btn-sm">EDIT</button>
                          {currentUser?.role === 'Admin' && (
                            <button onClick={() => setConfirmDeleteId(ticket._id)} className="btn btn-red btn-sm">DEL</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog open={!!confirmDeleteId} title="Delete Ticket" message="Are you sure? This cannot be undone." confirmLabel="Delete" variant="danger"
        onConfirm={() => { if (confirmDeleteId) deleteTicket(confirmDeleteId); setConfirmDeleteId(null); }}
        onCancel={() => setConfirmDeleteId(null)} />

      {/* Send Reminder Dialog */}
      {reminderTicket && (
        <SendReminderDialog
          ticket={reminderTicket}
          onGmail={() => handleSendGmail(reminderTicket)}
          onWhatsApp={() => handleSendWhatsApp(reminderTicket)}
          onClose={() => setReminderTicket(null)}
        />
      )}
    </div>
  );
}

/* ─── Send Reminder Dialog ─── */
function SendReminderDialog({ ticket, onGmail, onWhatsApp, onClose }: {
  ticket: Ticket;
  onGmail: () => void;
  onWhatsApp: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);

  const optionBtn: React.CSSProperties = {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
    padding: '24px 16px', borderRadius: 14, cursor: 'pointer',
    border: '1px solid var(--border)', background: 'var(--surface)',
    transition: 'all 0.2s ease', position: 'relative', overflow: 'hidden',
  };

  return createPortal(
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <div 
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', cursor: 'pointer' }} 
        onClick={onClose}
      />
      <div
        className="card fade-up"
        style={{ position: 'relative', width: '100%', maxWidth: 420, padding: 0, boxShadow: '0 24px 64px rgba(0,0,0,0.6)', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 22px', borderBottom: '1px solid var(--border)',
          background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(34,211,238,0.05) 100%)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9,
              background: 'linear-gradient(135deg, #6366f1, #818cf8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
            }}>
              <Mail size={16} color="#fff" />
            </div>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Send Reminder</h3>
              <p style={{ fontSize: 10, color: 'var(--text2)', marginTop: 1 }}>Choose how to contact the passenger</p>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
            borderRadius: 8, padding: 6, cursor: 'pointer', color: 'var(--text2)',
            transition: 'all 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'var(--text)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--text2)'; }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Ticket summary */}
        <div style={{ padding: '14px 22px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{ticket.passengerName}</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, color: 'var(--cyan)', letterSpacing: '0.04em' }}>
              {ticket.pnr}
            </span>
          </div>
          <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 4 }}>
            {ticket.departureAirport} → {ticket.arrivalAirport}
            {ticket.email && <span style={{ marginLeft: 10 }}>· {ticket.email}</span>}
            {ticket.phone && <span style={{ marginLeft: 10 }}>· {ticket.phone}</span>}
          </div>
        </div>

        {/* Options */}
        <div style={{ padding: '20px 22px', display: 'flex', gap: 14 }}>
          {/* Gmail */}
          <button
            onClick={onGmail}
            style={optionBtn}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = '#ea4335';
              e.currentTarget.style.background = 'rgba(234,67,53,0.06)';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(234,67,53,0.15)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.background = 'var(--surface)';
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: 'linear-gradient(135deg, #ea4335 0%, #fbbc04 50%, #34a853 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(234,67,53,0.25)',
            }}>
              <Mail size={22} color="#fff" />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Gmail</span>
            <span style={{ fontSize: 9, color: 'var(--text2)', textAlign: 'center' }}>Open Gmail to send email reminder</span>
          </button>

          {/* WhatsApp */}
          <button
            onClick={onWhatsApp}
            style={optionBtn}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = '#25D366';
              e.currentTarget.style.background = 'rgba(37,211,102,0.06)';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(37,211,102,0.15)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.background = 'var(--surface)';
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: 'linear-gradient(135deg, #25D366, #128C7E)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(37,211,102,0.25)',
            }}>
              <MessageCircle size={22} color="#fff" />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>WhatsApp</span>
            <span style={{ fontSize: 9, color: 'var(--text2)', textAlign: 'center' }}>Send message via WhatsApp</span>
          </button>
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 22px', borderTop: '1px solid var(--border)',
          background: 'rgba(255,255,255,0.02)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 9, color: 'var(--text3)', letterSpacing: '0.08em', fontWeight: 600, textTransform: 'uppercase' }}>
            Season Travels · "Your journey, our passion"
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
}
