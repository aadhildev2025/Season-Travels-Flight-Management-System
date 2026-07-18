import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useFlightStore } from '../store/flightStore';
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
  const { tickets, currentUser, deleteTicket, updateTicket, loading, hasFetched } = useFlightStore();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [mailTicket, setMailTicket]           = useState<Ticket | null>(null);
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
    return name;
  };

  const getSurname = (name: string) => {
    if (!name) return '';
    const parts = name.trim().split(/[/\s]+/);
    return parts[0] || '';
  };

  const buildReminderMessage = (ticket: Ticket) => {
    const dep = utcToLocalTime(ticket.departureTimeUTC, ticket.originalTimezone);
    const tzLabel = ticket.originalTimezone.split('/').pop()?.replace('_',' ') || '';
    return {
      subject: `Reminder - Flight ${ticket.pnr} | ${ticket.departureAirport} → ${ticket.arrivalAirport}`,
      body: `Dear ${ticket.passengerName},\n\nThis is a reminder for your upcoming flight.\n\nFlight Details:\nPNR: ${ticket.pnr}\nRoute: ${ticket.departureAirport} → ${ticket.arrivalAirport}\nDeparture: ${dep.formatted} (${tzLabel})\n\nPlease ensure you check in at least 3 hours prior to departure.\n\nWe wish you a safe and pleasant journey!\n\nWarm regards,\nSEASON TRAVELS`,
    };
  };

  // Plain-text version of the reminder for WhatsApp / clipboard
  const buildReminderText = (ticket: Ticket) => {
    const { subject, body } = buildReminderMessage(ticket);
    return `${subject}\n\n${body}`;
  };

  // ── Email via one.com webmail ──
  // one.com/Roundcube cannot be pre-filled from a link, so we open the user's
  // already-logged-in one.com webmail and copy the message to the clipboard.
  // The user starts a new message and pastes.
  const ONECOM_WEBMAIL_URL = 'https://mail.one.com';

  const sendViaEmail = async (ticket: Ticket) => {
    const { subject, body } = buildReminderMessage(ticket);
    const to = ticket.email || '';
    if (!to) {
      alert('This passenger has no email address on file.');
      return;
    }

    // Open the user's own logged-in one.com webmail in a new tab first (within the
    // click gesture so the popup isn't blocked), then copy the message.
    window.open(ONECOM_WEBMAIL_URL, '_blank', 'noopener,noreferrer');

    // Copy the message body to the clipboard so it can be pasted into the compose area.
    let copied = false;
    try {
      await navigator.clipboard.writeText(body);
      copied = true;
    } catch {
      copied = false;
    }

    setMailTicket(null);

    alert(
      `one.com webmail opened.\n\n` +
      `To:  ${to}\n` +
      `Subject:  ${subject}\n\n` +
      (copied
        ? `The message has been COPIED — start a new message, paste (Ctrl+V) into the body, and add the To & Subject above.`
        : `Copy the message body from the ticket and paste it into a new message.`)
    );
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
                  <th style={th}>Date</th>
                  <th style={th}>Name</th>
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
                      className={`${isToday ? 'is-today' : ''} ${isNew ? 'is-new-ticket' : ''}`}
                    >
                      {/* Date column */}
                      <td style={{ ...td, whiteSpace:'nowrap' }}>
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

                      <td style={{ ...td, fontWeight:700, color:'var(--text)', maxWidth:280, overflow:'visible', whiteSpace:'nowrap' }}>
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
            onClick={() => setMailTicket(null)}
          />
          <div
            className="card fade-up"
            style={{ position: 'relative', width: '100%', maxWidth: 360, padding: 24, boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Send Reminder</h3>
            <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 18 }}>
              How would you like to send the reminder to {mailTicket.passengerName}?
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* WhatsApp */}
              <button
                onClick={() => sendViaWhatsApp(mailTicket)}
                className="btn"
                style={{ width: '100%', justifyContent: 'flex-start', gap: 12, padding: '12px 16px', background: '#25D366', color: '#fff', fontSize: 13, fontWeight: 700 }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                WhatsApp
              </button>

              {/* Email */}
              <button
                onClick={() => sendViaEmail(mailTicket)}
                className="btn"
                style={{ width: '100%', justifyContent: 'flex-start', gap: 12, padding: '12px 16px', background: 'var(--indigo)', color: '#fff', fontSize: 13, fontWeight: 700 }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                Email
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
              <button onClick={() => setMailTicket(null)} className="btn btn-ghost" style={{ fontSize: 12 }}>Cancel</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
