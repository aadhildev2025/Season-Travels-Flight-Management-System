import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useFlightStore } from '../store/flightStore';
import { utcToLocalTime, formatCETTime } from '../utils/timezone';
import ConfirmDialog from './ConfirmDialog';
import ClockSection from './ClockSection';
import { Plane, Mail, MessageCircle, X, Search, Plus, RefreshCw, Download, Repeat } from 'lucide-react';
import type { Ticket } from '../types';
import type { TZ } from '../App';

interface DashboardProps {
  onEdit: (ticket: Ticket) => void;
  tz:     TZ;
  search: string;
  setSearch?: (s: string) => void;
  clockTime: string;
  clockDate: string;
  slClockTime?: string;
  slClockDate?: string;
  onAddNew?: () => void;
  onRefresh?: () => void;
  onPDF?: () => void;
}

export default function Dashboard({ onEdit, tz, search, setSearch, clockTime, clockDate, slClockTime, slClockDate, onAddNew, onRefresh, onPDF }: DashboardProps) {
  const { tickets, currentUser, deleteTicket, updateTicket, loading, hasFetched } = useFlightStore();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [todayStr, setTodayStr]               = useState('');
  const [reminderTicket, setReminderTicket]   = useState<Ticket | null>(null);
  const [copiedPnr, setCopiedPnr]             = useState<string | null>(null);
  const [newTicketId, setNewTicketId]         = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing]       = useState(false);
  const prevTicketIds = useRef<Set<string>>(new Set());
  const prevTicketsLength = useRef(tickets.length);
  
  // Debounce search to prevent UI lagging on rapid typing
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const tick = () => setTodayStr(formatDate(new Date().toISOString()));
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  // Detect newly added ticket
  useEffect(() => {
    const currentIds = new Set(tickets.map(t => t._id));
    const added = tickets.find(t => !prevTicketIds.current.has(t._id));
    if (added && prevTicketIds.current.size > 0) {
      setNewTicketId(added._id);
      setTimeout(() => setNewTicketId(null), 4000);
    }
    prevTicketIds.current = currentIds;
  }, [tickets]);

  // Trigger quick refresh animation when tickets length changes after a manual refresh
  useEffect(() => {
    if (onRefresh && tickets.length !== prevTicketsLength.current && hasFetched) {
      setIsRefreshing(true);
      const t = setTimeout(() => setIsRefreshing(false), 400);
      prevTicketsLength.current = tickets.length;
      return () => clearTimeout(t);
    }
    prevTicketsLength.current = tickets.length;
  }, [tickets, hasFetched, onRefresh]);

  const filtered = tickets.filter(t => {
    // Hide departure today tickets after 1 minute has elapsed from the departure time
    if (t.departureTimeUTC) {
      const isDepToday = formatDate(t.departureTimeUTC) === todayStr;
      if (isDepToday) {
        const depTime = new Date(t.departureTimeUTC);
        const now = new Date();
        if (now.getTime() > depTime.getTime() + 60 * 1000) {
          return false;
        }
      }
    }

    if (!debouncedSearch.trim()) return true;
    const q = debouncedSearch.toLowerCase();
    return t.passengerName.toLowerCase().includes(q) || t.pnr.toLowerCase().includes(q);
  });

  // Sort: today's tickets first (newest added at top), then by departure time
  const sorted = [...filtered].sort((a, b) => {
    const aToday = formatDate(a.departureTimeUTC) === todayStr;
    const bToday = formatDate(b.departureTimeUTC) === todayStr;
    if (aToday && !bToday) return -1;
    if (!aToday && bToday) return 1;
    // Within today, most recently created first
    if (aToday && bToday) {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    return new Date(a.departureTimeUTC).getTime() - new Date(b.departureTimeUTC).getTime();
  });

  function formatDate(utcStr: string) {
    if (!utcStr) return '';
    const d = new Date(utcStr);
    const m = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    return `${String(d.getUTCDate()).padStart(2,'0')}-${m[d.getUTCMonth()]}-${String(d.getUTCFullYear()).slice(2)}`;
  }

  const getCETTime = (utcStr: string) => {
    if (!utcStr) return '—';
    return formatCETTime(utcStr);
  };

  const getSLTime = (utcStr: string) => {
    if (!utcStr) return '—';
    return utcToLocalTime(utcStr, 'Asia/Colombo').time;
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

  const handleSendOneComMail = (ticket: Ticket) => {
    const { subject, body } = buildReminderMessage(ticket);
    const oneComUrl = `https://webmail.one.com/`;
    window.open(oneComUrl, '_blank');
    setReminderTicket(null);
  };

  const handleSendWhatsApp = (ticket: Ticket) => {
    const { body } = buildReminderMessage(ticket);
    const phone = ticket.phone?.replace(/[^\d+]/g, '') || '';
    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(body)}`;
    window.open(waUrl, '_blank');
    setReminderTicket(null);
  };

  // Staff can only delete tickets created today
  const canDelete = (ticket: Ticket) => {
    const isAdmin = currentUser?.role === 'Admin';
    if (isAdmin) return true;
    const createdDate = ticket.createdAt
      ? new Date(ticket.createdAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' })
      : '';
    return createdDate === todayStr;
  };

  const handleCopyPnr = (pnr: string) => {
    navigator.clipboard.writeText(pnr).then(() => {
      setCopiedPnr(pnr);
      setTimeout(() => setCopiedPnr(null), 1800);
    }).catch(() => {
      // Fallback for older browsers
      const el = document.createElement('textarea');
      el.value = pnr;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopiedPnr(pnr);
      setTimeout(() => setCopiedPnr(null), 1800);
    });
  };

  const th: React.CSSProperties = { padding:'6px 12px', fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.10em', color:'var(--text2)', whiteSpace:'nowrap', textAlign:'left' };
  const td: React.CSSProperties = { padding:'6px 12px', fontSize:13 };

  return (
    <div className="fade-up" style={{ display:'flex', flexDirection:'column', gap:14 }}>

      {/* Count row & clock */}
      <div className="page-header" style={{ marginBottom: 4 }}>
        <span style={{ fontSize:11, fontWeight:700, color:'var(--text2)', textTransform:'uppercase', letterSpacing:'0.08em', display:'inline-block', alignSelf:'center' }}>
          {sorted.length} Departure{sorted.length !== 1 ? 's' : ''}
          {search && <span style={{ marginLeft:8, color:'var(--text3)', fontWeight:500 }}>· filtered</span>}
        </span>
        <ClockSection tz={tz} clockTime={clockTime} clockDate={clockDate} slClockTime={slClockTime} slClockDate={slClockDate} />
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
          <button onClick={onRefresh} className="btn btn-ghost btn-icon" style={{ padding: '10px' }} title="Refresh" disabled={loading}>
            <RefreshCw size={13} className={loading ? "spin" : ""} />
          </button>
          <button onClick={onPDF} className="btn btn-ghost btn-sm" style={{ gap: 4, padding: '10px' }}>
            <Download size={12} /> PDF
          </button>
        </div>
      </div>

      {/* Table */}
      {!hasFetched && loading ? (
        <div className="card" style={{ padding:'60px 20px', textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
          <div className="spin" style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid var(--indigo)', borderTopColor: 'transparent' }} />
          <p style={{ fontSize:13, fontWeight:600, color:'var(--text2)' }}>Loading departures…</p>
        </div>
      ) : sorted.length === 0 ? (
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
        <div className={`card table-card${isRefreshing ? ' refresh-pulse' : ''}`} style={{ position: 'relative', overflow: 'hidden', transition: 'all 0.3s ease' }}>
          {loading && (
            <div style={{
              position: 'absolute',
              top: 0, left: 0, right: 0,
              height: 3,
              background: 'linear-gradient(90deg, transparent, var(--indigo), transparent)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.5s infinite linear',
              zIndex: 10,
            }} />
          )}
          <div className="table-scroll-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={th}>Date</th>
                  <th style={th}>Name</th>
                  <th style={th}>From</th>
                  <th style={th}>To</th>
                  <th style={{ ...th, color:'var(--indigo2)' }}>CET</th>
                  <th style={{ ...th, color:'var(--cyan)' }}>SLT</th>
                  <th style={th}>Flight No.</th>
                  <th style={th}>PNR</th>
                  <th style={{ ...th, textAlign:'center' }}>Checkin</th>
                  <th style={{ ...th, textAlign:'center' }}>Remind</th>
                  <th style={{ ...th, textAlign:'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(ticket => {
                  const isToday = formatDate(ticket.departureTimeUTC) === todayStr;
                  const isNew = newTicketId === ticket._id;
                  const hasRemark = !!(ticket.remarks && ticket.remarks.trim());

                  const depTime = ticket.departureTimeUTC ? new Date(ticket.departureTimeUTC) : null;
                  const isNotDepartedYet = depTime ? (new Date().getTime() < depTime.getTime()) : false;
                  const isLoadingToday = isToday && isNotDepartedYet;

                  return (
                    <tr
                      key={ticket._id}
                      className={`${isToday ? 'is-today' : ''} ${isNew ? 'is-new-ticket' : ''}`}
                    >
                      {/* Date column */}
                      <td style={{ ...td, whiteSpace:'nowrap' }}>
                        {hasRemark ? (
                          <span
                            className={`date-remark${isNew ? ' date-new-remark' : ''} ${isLoadingToday ? 'date-loading-green' : ''}`}
                            title={ticket.remarks}
                            style={{
                              fontFamily:"'JetBrains Mono',monospace", 
                              fontWeight:700, 
                              fontSize:13 
                            }}
                          >
                            {formatDate(ticket.departureTimeUTC)}
                          </span>
                        ) : (
                          <span
                            className={`${isNew ? 'date-new' : ''} ${isLoadingToday ? 'date-loading-green' : ''}`}
                            style={{ 
                              fontFamily:"'JetBrains Mono',monospace", 
                              fontWeight:700, 
                              color: isLoadingToday ? 'var(--green)' : 'var(--text)', 
                              fontSize:13 
                            }}
                          >
                            {formatDate(ticket.departureTimeUTC)}
                          </span>
                        )}
                      </td>

                      <td style={{ ...td, fontWeight:700, color:'var(--text)', maxWidth:280, overflow:'visible', whiteSpace:'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <span style={{ overflow:'hidden', textOverflow:'ellipsis' }}>{maskName(ticket.passengerName)}</span>
                          {ticket.returnTicket && (
                            <span 
                              title="Round Trip (Return Ticket Included)"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3,
                                fontSize: 8,
                                fontWeight: 900,
                                color: 'var(--cyan)',
                                background: 'rgba(34, 211, 238, 0.12)',
                                border: '1px solid rgba(34, 211, 238, 0.25)',
                                padding: '1px 5px',
                                borderRadius: 5,
                                letterSpacing: '0.04em',
                                textTransform: 'uppercase',
                                flexShrink: 0
                              }}
                            >
                              <Repeat size={8} /> RT
                            </span>
                          )}
                        </div>
                      </td>

                      <td style={{ ...td, fontWeight:800, color:'var(--text)', letterSpacing:'0.04em' }}>{ticket.departureAirport}</td>
                      <td style={{ ...td, fontWeight:800, color:'var(--text)', letterSpacing:'0.04em' }}>{ticket.arrivalAirport}</td>

                      {/* CET Time */}
                      <td style={td}>
                        <span style={{ fontFamily:"'JetBrains Mono',monospace", fontWeight:700, color:'var(--indigo2)', fontSize:14 }}>
                          {getCETTime(ticket.departureTimeUTC)}
                        </span>
                      </td>

                      {/* SLT Time */}
                      <td style={td}>
                        <span style={{ fontFamily:"'JetBrains Mono',monospace", fontWeight:700, color:'var(--cyan)', fontSize:14 }}>
                          {getSLTime(ticket.departureTimeUTC)}
                        </span>
                      </td>

                      {/* Flight Number */}
                      <td style={td}>
                        <span style={{ fontFamily:"'JetBrains Mono',monospace", fontWeight:700, color:'var(--text2)', fontSize:12, letterSpacing:'0.04em' }}>
                          {ticket.flightNumber || '—'}
                        </span>
                      </td>

                      <td style={td}>
                        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                          <span
                            onClick={() => handleCopyPnr(ticket.pnr)}
                            title="Click to copy PNR"
                            style={{
                              fontFamily:"'JetBrains Mono',monospace", fontWeight:700,
                              color: copiedPnr === ticket.pnr ? 'var(--green)' : 'var(--cyan)',
                              fontSize:13, letterSpacing:'0.04em',
                              cursor: 'copy',
                              padding: '2px 6px',
                              borderRadius: 5,
                              background: copiedPnr === ticket.pnr ? 'rgba(52,211,153,0.12)' : 'transparent',
                              border: copiedPnr === ticket.pnr ? '1px solid rgba(52,211,153,0.3)' : '1px solid transparent',
                              transition: 'all 0.2s ease',
                              userSelect: 'none',
                            }}
                          >
                            {copiedPnr === ticket.pnr ? '✓ COPIED' : ticket.pnr}
                          </span>
                        </div>
                      </td>

                      {/* Checkin - border style */}
                      <td style={{ ...td, textAlign:'center' }}>
                        <button
                          onClick={() => updateTicket(ticket._id, { checkin: !ticket.checkin })}
                          className={ticket.checkin ? 'badge-outline-yes' : 'badge-outline-no'}
                        >
                          ✓
                        </button>
                      </td>

                      {/* Remind - border style, shows "?" */}
                      <td style={{ ...td, textAlign:'center' }}>
                        <button
                          onClick={() => updateTicket(ticket._id, { remind: !ticket.remind })}
                          className={ticket.remind ? 'badge-outline-remind-yes' : 'badge-outline-remind-no'}
                          title={ticket.remind ? 'Reminder ON' : 'Reminder OFF'}
                        >
                          ?
                        </button>
                      </td>

                      <td style={{ ...td, textAlign:'center', whiteSpace:'nowrap' }}>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:4 }}>
                          <button onClick={() => setReminderTicket(ticket)} className="btn btn-blue btn-sm">MAIL</button>
                          <button onClick={() => onEdit(ticket)} className="btn btn-cyan btn-sm">EDIT</button>
                          {canDelete(ticket) && (
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
          onOneComMail={() => handleSendOneComMail(reminderTicket)}
          onWhatsApp={() => handleSendWhatsApp(reminderTicket)}
          onClose={() => setReminderTicket(null)}
        />
      )}
    </div>
  );
}

/* ─── Send Reminder Dialog ─── */
function SendReminderDialog({ ticket, onOneComMail, onWhatsApp, onClose }: {
  ticket: Ticket;
  onOneComMail: () => void;
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
           {/* One.com Mail */}
           <button
             onClick={onOneComMail}
             style={optionBtn}
             onMouseEnter={e => {
               e.currentTarget.style.borderColor = '#0055aa';
               e.currentTarget.style.background = 'rgba(0,85,170,0.06)';
               e.currentTarget.style.transform = 'translateY(-2px)';
               e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,85,170,0.15)';
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
               background: 'linear-gradient(135deg, #0055aa 0%, #0077cc 100%)',
               display: 'flex', alignItems: 'center', justifyContent: 'center',
               boxShadow: '0 4px 16px rgba(0,85,170,0.25)',
             }}>
               <Mail size={22} color="#fff" />
             </div>
             <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>One.com Mail</span>
             <span style={{ fontSize: 9, color: 'var(--text2)', textAlign: 'center' }}>Open One.com Mail to send email reminder</span>
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
