import { useEffect, useState } from 'react';
import { useFlightStore, type AnalyticsData } from '../store/flightStore';
import { 
  TrendingUp, Plane, CheckCircle, Bell, Calendar, Route, 
  ArrowRight, User, Copy, Check, Clock 
} from 'lucide-react';
import ClockSection from './ClockSection';

interface AnalyticsProps {
  slClockTime?: string;
  slClockDate?: string;
}

export default function Analytics({ slClockTime, slClockDate }: AnalyticsProps) {
  const { fetchAnalytics } = useFlightStore();
  const [data, setData]   = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [copiedPnr, setCopiedPnr] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics()
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [fetchAnalytics]);

  const handleCopyPnr = (pnr: string) => {
    navigator.clipboard.writeText(pnr).then(() => {
      setCopiedPnr(pnr);
      setTimeout(() => setCopiedPnr(null), 1800);
    });
  };

  const getRelativeTime = (dateStr?: string) => {
    if (!dateStr) return '';
    const created = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'yesterday';
    return `${diffDays}d ago`;
  };

  const formatDeparture = (utcStr?: string) => {
    if (!utcStr) return '';
    const d = new Date(utcStr);
    const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
    return `${date} @ ${time}`;
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
      <div className="spin" style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid var(--indigo)', borderTopColor: 'transparent' }} />
    </div>
  );

  if (error) return (
    <div className="card" style={{ padding: 24, color: '#f87171', fontSize: 13 }}>Error: {error}</div>
  );

  if (!data) return null;

  const checkinRate = data.total ? Math.round((data.checkinCount / data.total) * 100) : 0;

  const statCards = [
    { label: 'Total Tickets',  value: data.total,         icon: <Plane size={20} />,        color: 'var(--indigo2)', glow: 'rgba(165,180,252,0.15)' },
    { label: "Today's Flights",value: data.todayCount,    icon: <Calendar size={20} />,      color: 'var(--cyan)', glow: 'rgba(34,211,238,0.15)' },
    { label: 'Next 7 Days',    value: data.upcomingCount, icon: <TrendingUp size={20} />,    color: 'var(--amber)', glow: 'rgba(251,191,36,0.15)' },
    { label: 'Checked In',     value: data.checkinCount,  icon: <CheckCircle size={20} />,   color: 'var(--green)', glow: 'rgba(52,211,153,0.15)' },
    { label: 'Remind Set',     value: data.remindCount,   icon: <Bell size={20} />,          color: '#c084fc', glow: 'rgba(192,132,252,0.15)' },
    { label: 'Check-In Rate',  value: `${checkinRate}%`,  icon: <Route size={20} />,         color: 'var(--cyan2)', glow: 'rgba(103,232,249,0.15)' },
  ];

  return (
    <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 4 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>Console Analytics</h2>
          <p style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>Flight statistics and departure overview</p>
        </div>
        <ClockSection slClockTime={slClockTime} slClockDate={slClockDate} />
      </div>

      {/* Premium Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
        {statCards.map(s => (
          <div 
            key={s.label} 
            className="card" 
            style={{ 
              padding: '22px 20px',
              background: 'linear-gradient(135deg, rgba(22, 22, 40, 0.75) 0%, rgba(13, 13, 26, 0.45) 100%)',
              border: '1px solid var(--border)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              position: 'relative',
              overflow: 'hidden',
              transition: 'transform 0.2s ease, border-color 0.2s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.borderColor = s.color;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.borderColor = 'var(--border)';
            }}
          >
            {/* Soft background glow */}
            <div style={{
              position: 'absolute',
              top: -30, right: -30,
              width: 80, height: 80,
              borderRadius: '50%',
              background: s.glow,
              filter: 'blur(30px)',
              pointerEvents: 'none',
            }} />
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>{s.label}</span>
              <div style={{ 
                color: s.color, 
                background: 'rgba(255,255,255,0.03)', 
                borderRadius: 8, 
                padding: 6,
                border: '1px solid rgba(255,255,255,0.05)',
                display: 'flex', alignItems: 'center', justifyContent: 'center' 
              }}>
                {s.icon}
              </div>
            </div>
            <div style={{ fontSize: 32, fontWeight: 900, color: s.color, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1, letterSpacing: '-0.02em' }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Boarding-pass style Recently Added flights */}
      <div className="card" style={{ padding: 24, background: 'linear-gradient(135deg, rgba(22, 22, 40, 0.5) 0%, rgba(13, 13, 26, 0.35) 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <h3 style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.01em' }}>Recently Added Tickets</h3>
            <p style={{ fontSize: 10, color: 'var(--text2)', marginTop: 2 }}>Quick overview of passenger files registered recently</p>
          </div>
          <span style={{
            fontSize: 9, fontWeight: 800, color: 'var(--indigo2)', 
            background: 'rgba(165,180,252,0.1)', padding: '3px 8px', 
            borderRadius: 6, border: '1px solid rgba(165,180,252,0.15)',
            textTransform: 'uppercase', letterSpacing: '0.04em'
          }}>
            Latest entries
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {data.recentTickets.map((t, i) => {
            const initials = t.passengerName ? t.passengerName.trim().split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'ST';
            return (
              <div 
                key={i} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  padding: '12px 18px', 
                  background: 'var(--bg2)', 
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'rgba(99,102,241,0.25)';
                  e.currentTarget.style.background = 'var(--surface)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.background = 'var(--bg2)';
                }}
              >
                {/* Left side: Avatar + Passenger Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 220 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--indigo), var(--cyan))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 900, color: '#fff',
                    boxShadow: '0 4px 10px rgba(99,102,241,0.2)',
                    flexShrink: 0,
                  }}>
                    {initials}
                  </div>
                  <div>
                    <h4 style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.01em' }}>
                      {t.passengerName}
                    </h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                      <span style={{ fontSize: 10, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={10} style={{ color: 'var(--text3)' }} />
                        {getRelativeTime(t.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Center: Flight Route Indicator */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 160 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 800, color: 'var(--text)', letterSpacing: '0.04em' }}>
                      {t.departureAirport}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', position: 'relative', width: 44 }}>
                      <div style={{ height: 1, width: '100%', background: 'var(--border)', borderStyle: 'dashed' }} />
                      <Plane size={11} style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%) rotate(90deg)', color: 'var(--indigo2)' }} />
                    </div>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 800, color: 'var(--text)', letterSpacing: '0.04em' }}>
                      {t.arrivalAirport}
                    </span>
                  </div>
                  <span style={{ fontSize: 9, color: 'var(--text2)', marginTop: 4, fontWeight: 600 }}>
                    {formatDeparture(t.departureTimeUTC)}
                  </span>
                </div>

                {/* Right side: Interactive PNR stamp */}
                <div 
                  onClick={() => t.pnr && handleCopyPnr(t.pnr)}
                  title="Click to copy PNR"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 12,
                    fontWeight: 700,
                    color: copiedPnr === t.pnr ? 'var(--green)' : 'var(--cyan)',
                    background: copiedPnr === t.pnr ? 'rgba(52,211,153,0.08)' : 'rgba(34,211,238,0.05)',
                    border: copiedPnr === t.pnr ? '1px solid rgba(52,211,153,0.3)' : '1px solid rgba(34,211,238,0.2)',
                    padding: '6px 12px',
                    borderRadius: 8,
                    cursor: 'copy',
                    transition: 'all 0.2s ease',
                    userSelect: 'none',
                  }}
                  onMouseEnter={e => {
                    if (copiedPnr !== t.pnr) {
                      e.currentTarget.style.background = 'rgba(34,211,238,0.1)';
                      e.currentTarget.style.borderColor = 'var(--cyan)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (copiedPnr !== t.pnr) {
                      e.currentTarget.style.background = 'rgba(34,211,238,0.05)';
                      e.currentTarget.style.borderColor = 'rgba(34,211,238,0.2)';
                    }
                  }}
                >
                  {copiedPnr === t.pnr ? <Check size={11} /> : <Copy size={11} />}
                  <span>{copiedPnr === t.pnr ? 'COPIED' : t.pnr}</span>
                </div>
              </div>
            );
          })}
          {data.recentTickets.length === 0 && (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text2)', fontSize: 12 }}>
              No recent tickets logged yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
