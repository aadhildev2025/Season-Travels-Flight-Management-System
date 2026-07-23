import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useFlightStore, apiFetch } from '../store/flightStore';
import { utcToLocalTime, formatCETTime } from '../utils/timezone';
import ConfirmDialog from './ConfirmDialog';
import { Plane, Search, Plus, RefreshCw, Download, RotateCcw } from 'lucide-react';
import type { Ticket } from '../types';
import type { TZ } from '../App';

interface DashboardProps {
  onEdit: (ticket: Ticket, focusRemarks?: boolean) => void;
  tz:     TZ;
  search: string;
  setSearch?: (s: string) => void;
  onAddNew?: () => void;
  onRefresh?: () => void;
  onPDF?: () => void;
}

export default function Dashboard({ onEdit, tz, search, setSearch, onAddNew, onRefresh, onPDF }: DashboardProps) {
  const { tickets, currentUser, deleteTicket, updateTicket, loading, hasFetched, expiringIds } = useFlightStore();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [mailTicket, setMailTicket]           = useState<Ticket | null>(null);
  const [composeMessage, setComposeMessage]   = useState('');
  const [todayStr, setTodayStr]               = useState('');
  const [copiedPnr, setCopiedPnr]             = useState<string | null>(null);
  const [copiedSurname, setCopiedSurname]     = useState<string | null>(null);
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
    if (t.departureTimeUTC) {
      const depTime = new Date(t.departureTimeUTC);
      const now = new Date();
      if (now.getTime() > depTime.getTime()) {
        if (!expiringIds.has(t._id)) {
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
    return name;
  };

  const getSurname = (name: string) => {
    if (!name) return '';
    const parts = name.split('/');
    if (parts.length > 1) {
      return parts[0].trim();
    }
    const firstPart = name.trim().split(/\s+/);
    return firstPart[0] || '';
  };

  const buildReminderMessage = (ticket: Ticket) => {
    const dep = utcToLocalTime(ticket.departureTimeUTC, ticket.originalTimezone);
    const tzLabel = ticket.originalTimezone.split('/').pop()?.replace('_',' ') || '';
    return {
      subject: 'Travel Reminder from SeasonTravels',
      body: `Dear ${ticket.passengerName},\n\nThis is a reminder for your upcoming flight.\n\nFlight Details:\nBooking Reference: ${ticket.pnr}\nRoute: ${ticket.departureAirport} → ${ticket.arrivalAirport}\nDeparture: ${dep.formatted} (${tzLabel})\n\nPlease ensure you check in at least 3 hours prior to departure.\n\nWe wish you a safe and pleasant journey!\n\nWarm regards,\nSEASON TRAVELS`,
    };
  };

  // Plain-text version of the reminder for WhatsApp / clipboard
  const buildReminderText = (ticket: Ticket) => {
    const { subject, body } = buildReminderMessage(ticket);
    return `${subject}\n\n${body}`;
  };

  // ── Email via SMTP ──
  const sendViaEmail = (ticket: Ticket, customMessage?: string) => {
    const to = ticket.email || '';
    if (!to) {
      useFlightStore.getState().showToast('This passenger has no email address on file.', 'error');
      return;
    }

    const bodyText = (customMessage && customMessage.trim()) ? customMessage : buildReminderMessage(ticket).body;
    const mailSubject = (customMessage && customMessage.trim()) ? `Message From SeasonTravels` : buildReminderMessage(ticket).subject;
    const endpoint = (customMessage && customMessage.trim()) ? '/api/email/send-custom' : '/api/email/send-reminder';

    apiFetch(endpoint, {
      method: 'POST',
      body: JSON.stringify({
        to,
        subject: mailSubject,
        text: bodyText,
      }),
    }).catch(err => {
      console.error('Send email background error:', err);
      useFlightStore.getState().showToast('Failed to send email. Please check configuration.', 'error');
    });

    useFlightStore.getState().showToast('Email sent successfully!');
    setMailTicket(null);
    setComposeMessage('');
  };

  // ── WhatsApp ──
  const sendViaWhatsApp = (ticket: Ticket) => {
    const text = buildReminderText(ticket);
    // Keep only digits from the phone number for wa.me
    const phone = (ticket.phone || '').replace(/[^\d]/g, '');
    const waUrl = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
    setMailTicket(null);
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

  const handleCopySurname = (name: string) => {
    const surname = getSurname(name);
    if (!surname) return;
    navigator.clipboard.writeText(surname).then(() => {
      setCopiedSurname(name);
      setTimeout(() => setCopiedSurname(null), 1800);
    }).catch(() => {
      const el = document.createElement('textarea');
      el.value = surname;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopiedSurname(name);
      setTimeout(() => setCopiedSurname(null), 1800);
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
                  <th style={{ ...th, width: 120, paddingRight: 6 }}>Date</th>
                  <th style={{ ...th, paddingLeft: 6 }}>Name</th>
                  <th style={th}>From</th>
                  <th style={th}>To</th>
                  <th style={{ ...th, textAlign:'center' }}></th>
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
                  const hasRemark = ticket.status === 'Need Further Actions';

                  const depTime = ticket.departureTimeUTC ? new Date(ticket.departureTimeUTC) : null;
                  const isNotDepartedYet = depTime ? (new Date().getTime() < depTime.getTime()) : false;
                  const isLoadingToday = isToday && isNotDepartedYet;

                  return (
                    <tr
                      key={ticket._id}
                      className={`${isToday ? 'is-today' : ''} ${isNew ? 'is-new-ticket' : ''} ${expiringIds.has(ticket._id) ? 'row-expiring' : ''}`}
                    >
                      {/* Date column */}
                      <td style={{ ...td, paddingRight: 6, whiteSpace:'nowrap' }}>
                        {hasRemark ? (
                          <span
                            className={`date-remark${isNew ? ' date-new-remark' : ''} ${isLoadingToday ? 'date-loading-green' : ''}`}
                            onClick={() => onEdit(ticket, true)}
                            style={{
                              fontFamily:"'JetBrains Mono',monospace", 
                              fontWeight:700, 
                              fontSize:13,
                              cursor: 'pointer',
                            }}
                          >
                            {formatDate(ticket.departureTimeUTC)}
                            {ticket.remarks && ticket.remarks.trim() && (
                              <span className="remark-tooltip">
                                <div className="remark-tooltip-label">Remark</div>
                                <div className="remark-tooltip-text">{ticket.remarks}</div>
                              </span>
                            )}
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

                      <td style={{ ...td, paddingLeft: 6, fontWeight:700, color:'var(--text)', maxWidth:280, overflow:'visible', whiteSpace:'nowrap' }}>
                        <span
                          onClick={() => handleCopySurname(ticket.passengerName)}
                          title="Click to copy surname"
                          style={{
                            cursor: 'pointer',
                            padding: '2px 6px',
                            borderRadius: 5,
                            background: copiedSurname === ticket.passengerName ? 'rgba(52,211,153,0.12)' : 'transparent',
                            border: copiedSurname === ticket.passengerName ? '1px solid rgba(52,211,153,0.3)' : '1px solid transparent',
                            transition: 'all 0.2s ease',
                            userSelect: 'none',
                            color: copiedSurname === ticket.passengerName ? 'var(--green)' : 'var(--text)',
                            textTransform: 'uppercase',
                          }}
                        >
                          {copiedSurname === ticket.passengerName ? '✓ COPIED' : maskName(ticket.passengerName)}
                        </span>
                      </td>

                      <td style={{ ...td, fontWeight:800, color:'var(--text)', letterSpacing:'0.04em' }}>{ticket.departureAirport}</td>
                      <td style={{ ...td, fontWeight:800, color:'var(--text)', letterSpacing:'0.04em' }}>{ticket.arrivalAirport}</td>

                      {/* Return flight symbol */}
                      <td style={{ ...td, textAlign:'center' }}>
                        {ticket.returnLeg && (
                          <span title="Return flight" style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', color:'var(--indigo2)' }}>
                            <RotateCcw size={13} />
                          </span>
                        )}
                      </td>

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
                        <span style={{ fontFamily:"'JetBrains Mono',monospace", fontWeight:700, color:'#fff', fontSize:12, letterSpacing:'0.04em' }}>
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
                              color: copiedPnr === ticket.pnr ? 'var(--green)' : '#ec4899',
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

                      {/* Checkin */}
                      <td style={{ ...td, textAlign:'center' }}>
                        <button
                          onClick={() => updateTicket(ticket._id, { checkin: !ticket.checkin })}
                          style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: 24, height: 24, borderRadius: 6, padding: 0,
                            border: ticket.checkin ? '1.5px solid var(--green)' : '1.5px solid var(--border)',
                            background: ticket.checkin ? 'rgba(52,211,153,0.15)' : 'transparent',
                            cursor: 'pointer', transition: 'all 0.15s',
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.borderColor = ticket.checkin ? 'var(--green)' : 'rgba(52,211,153,0.5)';
                            e.currentTarget.style.boxShadow = '0 0 8px rgba(52,211,153,0.2)';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.borderColor = ticket.checkin ? 'var(--green)' : 'var(--border)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          {ticket.checkin && (
                            <span style={{ color: 'var(--green)', fontSize: 14, fontWeight: 900, lineHeight: 1 }}>✓</span>
                          )}
                        </button>
                      </td>

                      {/* Remind */}
                      <td style={{ ...td, textAlign:'center' }}>
                        <button
                          onClick={() => onEdit(ticket, true)}
                          style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: 24, height: 24, borderRadius: 6, padding: 0,
                            border: ((ticket.status === 'No Need Further Actions' && ticket.remarks?.trim()) || ticket.status === 'Need Further Actions') ? '1.5px solid var(--red)' : '1.5px solid var(--border)',
                            background: ((ticket.status === 'No Need Further Actions' && ticket.remarks?.trim()) || ticket.status === 'Need Further Actions') ? 'rgba(244,63,94,0.15)' : 'transparent',
                            cursor: 'pointer', transition: 'all 0.15s',
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.borderColor = ((ticket.status === 'No Need Further Actions' && ticket.remarks?.trim()) || ticket.status === 'Need Further Actions') ? 'var(--red)' : 'rgba(244,63,94,0.5)';
                            e.currentTarget.style.boxShadow = '0 0 8px rgba(244,63,94,0.2)';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.borderColor = ((ticket.status === 'No Need Further Actions' && ticket.remarks?.trim()) || ticket.status === 'Need Further Actions') ? 'var(--red)' : 'var(--border)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          {((ticket.status === 'No Need Further Actions' && ticket.remarks?.trim()) || ticket.status === 'Need Further Actions') && (
                            <span style={{ color: 'var(--red)', fontSize: 14, fontWeight: 900, lineHeight: 1 }}>?</span>
                          )}
                        </button>
                      </td>

                      <td style={{ ...td, textAlign:'center', whiteSpace:'nowrap' }}>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:4 }}>
                          <button onClick={() => setMailTicket(ticket)} className="btn btn-blue btn-sm" title="Send reminder">MAIL</button>
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

      {/* Send-reminder channel picker */}
      {mailTicket && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', cursor: 'pointer' }}
            onClick={() => { setMailTicket(null); setComposeMessage(''); }}
          />
          <div
            className="card fade-up"
            style={{ position: 'relative', width: '100%', maxWidth: 420, padding: 24, boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Send Message</h3>
            <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 18 }}>
              To: {mailTicket.passengerName} ({mailTicket.email})
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Send Reminder */}
              <button
                onClick={() => sendViaEmail(mailTicket)}
                className="btn"
                style={{ width: '100%', justifyContent: 'flex-start', gap: 12, padding: '12px 16px', background: 'var(--indigo)', color: '#fff', fontSize: 13, fontWeight: 700 }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                Send Reminder
              </button>

              {/* Compose Mail */}
              <button
                onClick={() => document.getElementById('compose-textarea')?.focus()}
                className="btn"
                style={{ width: '100%', justifyContent: 'flex-start', gap: 12, padding: '12px 16px', background: 'var(--surface2)', color: 'var(--text)', fontSize: 13, fontWeight: 700, border: '1px solid var(--border)' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                Compose Mail
              </button>

              <textarea
                id="compose-textarea"
                placeholder="Type your message here..."
                value={composeMessage}
                onChange={e => setComposeMessage(e.target.value)}
                rows={4}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text)',
                  fontSize: 13,
                  resize: 'vertical',
                  minHeight: 80,
                  fontFamily: 'inherit',
                }}
              />

              <button
                onClick={() => sendViaEmail(mailTicket, composeMessage)}
                disabled={!composeMessage.trim()}
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '10px', opacity: composeMessage.trim() ? 1 : 0.5 }}
              >
                Send Message
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
              <button onClick={() => { setMailTicket(null); setComposeMessage(''); }} className="btn btn-ghost" style={{ fontSize: 12 }}>Cancel</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
