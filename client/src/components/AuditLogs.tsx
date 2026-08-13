import { useEffect, useState, useCallback } from 'react';
import { useFlightStore, type AuditLog } from '../store/flightStore';
import type { Ticket } from '../types';
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Search,
  X,
  Info,
  Plane,
  Clock,
  CheckCircle2,
  AlertCircle,
  Tag
} from 'lucide-react';

const ACTION_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  LOGIN:           { bg: 'rgba(34,197,94,0.12)',   color: '#4ade80', label: 'LOGIN' },
  CREATE_TICKET:   { bg: 'rgba(99,102,241,0.12)',  color: 'var(--indigo2)', label: 'CREATE' },
  UPDATE_TICKET:   { bg: 'rgba(245,158,11,0.12)',  color: '#fbbf24', label: 'UPDATE' },
  DELETE_TICKET:   { bg: 'rgba(239,68,68,0.12)',   color: '#f87171', label: 'DELETE' },
  UPDATE_PROFILE:  { bg: 'rgba(34,211,238,0.12)',  color: 'var(--cyan)', label: 'PROFILE' },
  CREATE_STAFF:    { bg: 'rgba(168,85,247,0.12)',  color: '#c084fc', label: 'STAFF+' },
  DELETE_STAFF:    { bg: 'rgba(239,68,68,0.12)',   color: '#f87171', label: 'STAFF-' },
  SEND_THANK_YOU:  { bg: 'rgba(14,165,233,0.12)',  color: '#38bdf8', label: 'THANK_YOU' },
  SEND_REMINDER:   { bg: 'rgba(234,179,8,0.12)',   color: '#facc15', label: 'REMINDER' },
};

interface AuditLogsProps {
  tz: string;
}

export default function AuditLogs({ tz }: AuditLogsProps) {
  const { fetchAuditLogs, fetchTicketByPnr, tickets } = useFlightStore();
  const [logs, setLogs]         = useState<AuditLog[]>([]);
  const [total, setTotal]       = useState(0);
  const [pages, setPages]       = useState(1);
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeQuery, setActiveQuery] = useState('');

  // Selected Log & Ticket Details Modal State
  const [selectedLog, setSelectedLog]       = useState<AuditLog | null>(null);
  const [associatedTicket, setAssociatedTicket] = useState<Ticket | null>(null);
  const [pnrHistoryLogs, setPnrHistoryLogs] = useState<AuditLog[]>([]);
  const [modalLoading, setModalLoading]     = useState(false);

  const load = useCallback(async (p: number, query: string = '') => {
    setLoading(true); setError('');
    try {
      const d = await fetchAuditLogs(p, query);
      setLogs(d.logs);
      setTotal(d.total);
      setPages(d.pages);
      setPage(p);
    } catch (e: any) {
      setError(e.message || 'Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  }, [fetchAuditLogs]);

  useEffect(() => {
    load(1, activeQuery);
  }, [load, activeQuery]);

  useEffect(() => {
    const handleAppRefresh = () => {
      load(page, activeQuery);
    };
    window.addEventListener('app:refresh', handleAppRefresh);
    return () => window.removeEventListener('app:refresh', handleAppRefresh);
  }, [load, page, activeQuery]);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setActiveQuery(searchTerm);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setActiveQuery('');
  };

  const fmtDate = (iso: string) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleString('en-GB', {
      timeZone: 'Europe/Stockholm',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const fmtUserDate = (iso: string) => {
    if (!iso) return '—';
    const d = new Date(iso);
    try {
      return d.toLocaleString('en-GB', {
        timeZone: tz || 'Europe/Stockholm',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
    } catch {
      return fmtDate(iso);
    }
  };

  // Open Log & PNR Details Modal
  const handleOpenDetails = async (log: AuditLog) => {
    setSelectedLog(log);
    setAssociatedTicket(null);
    setPnrHistoryLogs([]);
    setModalLoading(true);

    const targetPnr = log.target || extractPnrFromDetails(log.details);

    try {
      if (targetPnr && targetPnr !== '—') {
        // First check local tickets store
        const foundInStore = tickets.find(
          t => t.pnr?.toLowerCase() === targetPnr.toLowerCase() || t.returnPnr?.toLowerCase() === targetPnr.toLowerCase()
        );

        if (foundInStore) {
          setAssociatedTicket(foundInStore);
        } else {
          // Fetch from API
          const ticketFromApi = await fetchTicketByPnr(targetPnr);
          if (ticketFromApi) {
            setAssociatedTicket(ticketFromApi);
          }
        }

        // Fetch PNR audit history
        const pnrHistory = await fetchAuditLogs(1, targetPnr);
        if (pnrHistory && pnrHistory.logs) {
          setPnrHistoryLogs(pnrHistory.logs);
        }
      }
    } catch (err) {
      console.error('Failed to load PNR ticket details:', err);
    } finally {
      setModalLoading(false);
    }
  };

  const extractPnrFromDetails = (details: string): string => {
    if (!details) return '';
    const match = details.match(/PNR:\s*([A-Z0-9]+)/i);
    return match ? match[1] : '';
  };

  const handleExportPDF = async () => {
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const { applySeasonTravelsWatermark } = await import('../utils/pdfWatermark');

      const doc = new jsPDF({ orientation: 'landscape' });

      const rows = logs.map(log => [
        fmtDate(log.createdAt),
        log.action,
        `${log.userName} (${log.userEmail})`,
        log.target || '—',
        log.details || '—'
      ]);

      autoTable(doc, {
        startY: 24,
        margin: { top: 24, bottom: 15, left: 14, right: 14 },
        head: [['Time (CET)', 'Action', 'User', 'Target / PNR', 'Details']],
        body: rows,
        styles: { fontSize: 8.5, cellPadding: 3, textColor: [30, 41, 59] },
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
      });

      const watermarkTitle = activeQuery ? `Audit Logs (Search: "${activeQuery}")` : 'System Audit Logs';
      applySeasonTravelsWatermark(doc, watermarkTitle);

      const dateStr = new Date().toISOString().slice(0, 10);
      doc.save(`season-travels-audit-logs_${dateStr}.pdf`);
    } catch (err) {
      console.error('Audit log PDF failed:', err);
    }
  };

  return (
    <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Header & Export Controls */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 8 }}>
            Audit Logs
            <span style={{ fontSize: 11, fontWeight: 600, background: 'rgba(99,102,241,0.12)', color: 'var(--indigo2)', padding: '2px 8px', borderRadius: 12 }}>
              Admin Access
            </span>
          </h2>
          <p style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>
            {total} events recorded {activeQuery && `· Matching search "${activeQuery}"`}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={handleExportPDF}
            className="btn btn-ghost btn-sm"
            style={{ gap: 6, color: 'var(--red)', borderColor: 'rgba(239,68,68,0.25)' }}
          >
            <FileText size={13} /> Export PDF
          </button>
          <button
            onClick={() => load(page, activeQuery)}
            className="btn btn-ghost"
            style={{ fontSize: 11, gap: 4 }}
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* PNR & Audit Search Bar */}
      <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search
            size={15}
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text2)'
            }}
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by PNR (e.g. USDU83), passenger name, user email, or action..."
            style={{
              width: '100%',
              padding: '10px 38px 10px 36px',
              fontSize: 12,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              color: 'var(--text)',
              outline: 'none',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
            }}
            onFocus={(e) => (e.target.style.borderColor = 'var(--indigo)')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={handleClearSearch}
              style={{
                position: 'absolute',
                right: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--text2)',
                cursor: 'pointer',
                padding: 4,
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>
        <button
          type="submit"
          className="btn btn-primary"
          style={{ padding: '9px 18px', fontSize: 12, fontWeight: 700, gap: 6 }}
        >
          <Search size={13} /> Search PNR
        </button>
      </form>

      {/* Active Filter Indicator */}
      {activeQuery && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--cyan)' }}>
          <Tag size={13} />
          <span>Active filter: <strong>"{activeQuery}"</strong></span>
          <button
            onClick={handleClearSearch}
            style={{
              background: 'rgba(239,68,68,0.12)',
              color: '#f87171',
              border: 'none',
              padding: '2px 8px',
              borderRadius: 4,
              fontSize: 11,
              cursor: 'pointer',
              fontWeight: 600,
              marginLeft: 4
            }}
          >
            Clear Filter
          </button>
        </div>
      )}

      {error && <div className="card" style={{ padding: 14, color: '#f87171', fontSize: 12 }}>Error: {error}</div>}

      {/* Audit Logs Table Card */}
      <div className="card table-card">
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 220 }}>
            <div style={{ width: 26, height: 26, borderRadius: '50%', border: '3px solid var(--indigo)', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }} />
          </div>
        ) : (
          <div className="table-scroll-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ padding: '10px 14px', fontSize: 9, fontWeight: 800, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.12em', whiteSpace: 'nowrap' }}>Time (CET)</th>
                  <th style={{ padding: '10px 14px', fontSize: 9, fontWeight: 800, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Action</th>
                  <th style={{ padding: '10px 14px', fontSize: 9, fontWeight: 800, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>User</th>
                  <th style={{ padding: '10px 14px', fontSize: 9, fontWeight: 800, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Target / PNR</th>
                  <th style={{ padding: '10px 14px', fontSize: 9, fontWeight: 800, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Details</th>
                  <th style={{ padding: '10px 14px', fontSize: 9, fontWeight: 800, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.12em', textAlign: 'right' }}>View</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, index) => {
                  const badge = ACTION_COLORS[log.action] || { bg: 'rgba(255,255,255,0.06)', color: 'var(--text2)', label: log.action };
                  const itemKey = log.id || log._id || `log-${index}`;
                  return (
                    <tr
                      key={itemKey}
                      onClick={() => handleOpenDetails(log)}
                      style={{ cursor: 'pointer', transition: 'background 0.15s ease' }}
                      className="audit-row"
                    >
                      <td style={{ padding: '8px 14px', fontSize: 11, whiteSpace: 'nowrap', fontFamily: "'JetBrains Mono', monospace", color: 'var(--text2)' }}>
                        {fmtDate(log.createdAt)}
                      </td>
                      <td style={{ padding: '8px 14px' }}>
                        <span style={{ display: 'inline-block', background: badge.bg, color: badge.color, fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 4, letterSpacing: '0.06em' }}>
                          {badge.label}
                        </span>
                      </td>
                      <td style={{ padding: '8px 14px' }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>{log.userName}</p>
                        <p style={{ fontSize: 10, color: 'var(--text2)', marginTop: 1 }}>{log.userEmail}</p>
                      </td>
                      <td style={{ padding: '8px 14px', fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: 'var(--cyan)', fontWeight: 600 }}>
                        {log.target ? (
                          <span style={{ background: 'rgba(34,211,238,0.1)', padding: '2px 6px', borderRadius: 4 }}>
                            {log.target}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ padding: '8px 14px', fontSize: 11, color: 'var(--text2)', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.details || '—'}
                      </td>
                      <td style={{ padding: '8px 14px', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDetails(log);
                          }}
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '3px 8px', fontSize: 10, gap: 4, color: 'var(--cyan)' }}
                        >
                          <Info size={12} /> Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: 'var(--text2)', fontSize: 12 }}>
                      {activeQuery ? `No audit log events found matching "${activeQuery}"` : 'No audit logs yet'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <button onClick={() => load(page - 1, activeQuery)} disabled={page === 1} className="btn btn-ghost btn-icon">
            <ChevronLeft size={14} />
          </button>
          <span style={{ fontSize: 11, color: 'var(--text2)' }}>Page {page} of {pages}</span>
          <button onClick={() => load(page + 1, activeQuery)} disabled={page === pages} className="btn btn-ghost btn-icon">
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* PNR & Audit Details Modal */}
      {selectedLog && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16
          }}
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="card fade-up"
            style={{
              width: '100%',
              maxWidth: 680,
              maxHeight: '90vh',
              overflowY: 'auto',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              padding: 24,
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column',
              gap: 20
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 14 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>
                    Audit & PNR Details
                  </h3>
                  {selectedLog.target && (
                    <span style={{ background: 'rgba(34,211,238,0.15)', color: 'var(--cyan)', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>
                      PNR: {selectedLog.target}
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 11, color: 'var(--text2)', marginTop: 4 }}>
                  Recorded on {fmtDate(selectedLog.createdAt)} (CET)
                </p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Section 1: Associated Ticket Details (if found for PNR) */}
            <div>
              <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--indigo2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Plane size={14} /> Ticket Details {associatedTicket && `(PNR: ${associatedTicket.pnr})`}
              </h4>

              {modalLoading ? (
                <div style={{ padding: 16, textAlign: 'center', color: 'var(--text2)', fontSize: 12 }}>
                  Loading associated ticket information...
                </div>
              ) : associatedTicket ? (
                <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                    <div>
                      <p style={{ fontSize: 10, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Passenger</p>
                      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginTop: 2 }}>{associatedTicket.passengerName}</p>
                      {associatedTicket.email && <p style={{ fontSize: 11, color: 'var(--text2)' }}>{associatedTicket.email}</p>}
                    </div>

                    <div>
                      <p style={{ fontSize: 10, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Flight & Airline</p>
                      <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--cyan)', marginTop: 2 }}>
                        {associatedTicket.airline} {associatedTicket.flightNumber}
                      </p>
                    </div>

                    <div>
                      <p style={{ fontSize: 10, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Route</p>
                      <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginTop: 2 }}>
                        {associatedTicket.departureAirport} → {associatedTicket.arrivalAirport}
                      </p>
                    </div>

                    <div>
                      <p style={{ fontSize: 10, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Departure Time</p>
                      <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', marginTop: 2 }}>
                        {fmtDate(associatedTicket.departureTimeUTC)} (CET)
                      </p>
                    </div>
                  </div>

                  {associatedTicket.remarks && (
                    <div style={{ borderTop: '1px dashed var(--border)', paddingTop: 8 }}>
                      <p style={{ fontSize: 10, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Remarks</p>
                      <p style={{ fontSize: 11, color: 'var(--text)', marginTop: 2 }}>{associatedTicket.remarks}</p>
                    </div>
                  )}

                  {associatedTicket.returnTicket && (
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, background: 'rgba(99,102,241,0.05)', padding: 10, borderRadius: 6 }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--indigo2)', textTransform: 'uppercase' }}>
                        Return Flight Leg
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--text)', marginTop: 2 }}>
                        {associatedTicket.returnDepartureAirport} → {associatedTicket.returnArrivalAirport} ({associatedTicket.returnFlightNumber || 'N/A'})
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: 12, color: 'var(--text2)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertCircle size={14} color="var(--amber)" />
                  <span>No active ticket record currently found for this PNR (ticket may have expired or been deleted).</span>
                </div>
              )}
            </div>

            {/* Section 2: Audit Event Details */}
            <div>
              <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--indigo2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={14} /> Full Audit Event Log
              </h4>

              <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                  <div>
                    <p style={{ fontSize: 10, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Action Type</p>
                    <span style={{
                      display: 'inline-block',
                      background: (ACTION_COLORS[selectedLog.action] || { bg: 'rgba(255,255,255,0.1)', color: 'var(--text)' }).bg,
                      color: (ACTION_COLORS[selectedLog.action] || { bg: '', color: 'var(--text)' }).color,
                      fontSize: 10,
                      fontWeight: 800,
                      padding: '3px 10px',
                      borderRadius: 4,
                      marginTop: 4
                    }}>
                      {selectedLog.action}
                    </span>
                  </div>

                  <div>
                    <p style={{ fontSize: 10, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Performed By User</p>
                    <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginTop: 2 }}>{selectedLog.userName}</p>
                    <p style={{ fontSize: 10, color: 'var(--text2)' }}>{selectedLog.userEmail}</p>
                  </div>

                  <div>
                    <p style={{ fontSize: 10, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Timestamp (Local)</p>
                    <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', marginTop: 2 }}>{fmtUserDate(selectedLog.createdAt)}</p>
                  </div>

                  <div>
                    <p style={{ fontSize: 10, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>IP Address</p>
                    <p style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: 'var(--text2)', marginTop: 2 }}>{selectedLog.ip || '—'}</p>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                  <p style={{ fontSize: 10, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Full Log Details</p>
                  <div style={{
                    fontSize: 12,
                    lineHeight: 1.5,
                    color: 'var(--text)',
                    background: 'var(--bg)',
                    padding: 10,
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    marginTop: 4,
                    wordBreak: 'break-word',
                    fontFamily: "'JetBrains Mono', monospace"
                  }}>
                    {selectedLog.details || 'No additional details logged'}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: PNR Audit History */}
            {pnrHistoryLogs.length > 0 && (
              <div>
                <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--indigo2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={14} /> Audit History for PNR ({pnrHistoryLogs.length} events)
                </h4>

                <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 180, overflowY: 'auto' }}>
                  {pnrHistoryLogs.map((hLog, hIdx) => (
                    <div key={hLog.id || hIdx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, borderBottom: hIdx < pnrHistoryLogs.length - 1 ? '1px solid var(--border)' : 'none', paddingBottom: 6 }}>
                      <div>
                        <span style={{ fontWeight: 700, color: 'var(--text)', marginRight: 6 }}>{hLog.action}</span>
                        <span style={{ color: 'var(--text2)' }}>by {hLog.userName}</span>
                      </div>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--text2)', fontSize: 10 }}>
                        {fmtDate(hLog.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 10 }}>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="btn btn-secondary"
                style={{ padding: '8px 20px', fontSize: 12 }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
