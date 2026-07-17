import { useEffect, useState, useCallback } from 'react';
import { useFlightStore, type AuditLog } from '../store/flightStore';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ClockSection from './ClockSection';
import type { TZ } from '../App';

const ACTION_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  LOGIN:           { bg: 'rgba(34,197,94,0.1)',   color: '#4ade80', label: 'LOGIN' },
  CREATE_TICKET:   { bg: 'rgba(99,102,241,0.1)',  color: 'var(--indigo2)', label: 'CREATE' },
  UPDATE_TICKET:   { bg: 'rgba(245,158,11,0.1)',  color: '#fbbf24', label: 'UPDATE' },
  DELETE_TICKET:   { bg: 'rgba(239,68,68,0.1)',   color: '#f87171', label: 'DELETE' },
  UPDATE_PROFILE:  { bg: 'rgba(34,211,238,0.1)',  color: 'var(--cyan)', label: 'PROFILE' },
  CREATE_STAFF:    { bg: 'rgba(168,85,247,0.1)',  color: '#c084fc', label: 'STAFF+' },
  DELETE_STAFF:    { bg: 'rgba(239,68,68,0.1)',   color: '#f87171', label: 'STAFF-' },
};

interface AuditLogsProps {
  tz: TZ;
  clockTime: string;
  clockDate: string;
  slClockTime?: string;
  slClockDate?: string;
}

export default function AuditLogs({ tz, clockTime, clockDate, slClockTime, slClockDate }: AuditLogsProps) {
  const { fetchAuditLogs } = useFlightStore();
  const [logs, setLogs]   = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage]   = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const load = useCallback(async (p: number) => {
    setLoading(true); setError('');
    try {
      const d = await fetchAuditLogs(p);
      setLogs(d.logs); setTotal(d.total); setPages(d.pages); setPage(p);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [fetchAuditLogs]);

  useEffect(() => { load(1); }, [load]);

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('en-GB', { timeZone: 'Europe/Stockholm', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>Audit Logs</h2>
          <p style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>{total} events recorded · Admin access only</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <ClockSection tz={tz} clockTime={clockTime} clockDate={clockDate} slClockTime={slClockTime} slClockDate={slClockDate} />
          <button onClick={() => load(page)} className="btn btn-ghost" style={{ fontSize: 11 }}>↻ Refresh</button>
        </div>
      </div>

      {error && <div className="card" style={{ padding: 14, color: '#f87171', fontSize: 12 }}>Error: {error}</div>}

      <div className="card table-card">
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', border: '3px solid var(--indigo)', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }} />
          </div>
        ) : (
          <div className="table-scroll-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ padding: '8px 14px', fontSize: 9, fontWeight: 800, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.12em', whiteSpace: 'nowrap' }}>Time (CET)</th>
                  <th style={{ padding: '8px 14px', fontSize: 9, fontWeight: 800, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Action</th>
                  <th style={{ padding: '8px 14px', fontSize: 9, fontWeight: 800, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>User</th>
                  <th style={{ padding: '8px 14px', fontSize: 9, fontWeight: 800, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Target</th>
                  <th style={{ padding: '8px 14px', fontSize: 9, fontWeight: 800, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => {
                  const badge = ACTION_COLORS[log.action] || { bg: 'rgba(255,255,255,0.06)', color: 'var(--text2)', label: log.action };
                  return (
                    <tr key={log._id}>
                      <td style={{ padding: '6px 14px', fontSize: 11, whiteSpace: 'nowrap', fontFamily: "'JetBrains Mono', monospace", color: 'var(--text2)' }}>
                        {fmtDate(log.createdAt)}
                      </td>
                      <td style={{ padding: '6px 14px' }}>
                        <span style={{ display: 'inline-block', background: badge.bg, color: badge.color, fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 4, letterSpacing: '0.06em' }}>
                          {badge.label}
                        </span>
                      </td>
                      <td style={{ padding: '6px 14px' }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>{log.userName}</p>
                        <p style={{ fontSize: 10, color: 'var(--text2)', marginTop: 1 }}>{log.userEmail}</p>
                      </td>
                      <td style={{ padding: '6px 14px', fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: 'var(--cyan)', fontWeight: 700 }}>
                        {log.target || '—'}
                      </td>
                      <td style={{ padding: '6px 14px', fontSize: 11, color: 'var(--text2)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.details || '—'}
                      </td>
                    </tr>
                  );
                })}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: 'var(--text2)', fontSize: 12 }}>No audit logs yet</td>
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
          <button onClick={() => load(page - 1)} disabled={page === 1} className="btn btn-ghost btn-icon">
            <ChevronLeft size={14} />
          </button>
          <span style={{ fontSize: 11, color: 'var(--text2)' }}>Page {page} of {pages}</span>
          <button onClick={() => load(page + 1)} disabled={page === pages} className="btn btn-ghost btn-icon">
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
