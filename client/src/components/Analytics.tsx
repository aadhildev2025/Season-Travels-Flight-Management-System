import { useEffect, useState } from 'react';
import { useFlightStore, type AnalyticsData } from '../store/flightStore';
import { TrendingUp, Plane, CheckCircle, Bell, Calendar, Route } from 'lucide-react';
import ClockSection from './ClockSection';
import type { TZ } from '../App';

interface AnalyticsProps {
  tz: TZ;
  clockTime: string;
  clockDate: string;
  slClockTime?: string;
  slClockDate?: string;
}

export default function Analytics({ tz, clockTime, clockDate, slClockTime, slClockDate }: AnalyticsProps) {
  const { fetchAnalytics } = useFlightStore();
  const [data, setData]   = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    fetchAnalytics()
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [fetchAnalytics]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid var(--indigo)', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }} />
    </div>
  );

  if (error) return (
    <div className="card" style={{ padding: 24, color: '#f87171', fontSize: 13 }}>Error: {error}</div>
  );

  if (!data) return null;

  const checkinRate = data.total ? Math.round((data.checkinCount / data.total) * 100) : 0;

  const statCards = [
    { label: 'Total Tickets',  value: data.total,         icon: <Plane size={18} />,        color: 'var(--indigo2)' },
    { label: "Today's Flights",value: data.todayCount,    icon: <Calendar size={18} />,      color: 'var(--cyan)' },
    { label: 'Next 7 Days',    value: data.upcomingCount, icon: <TrendingUp size={18} />,    color: 'var(--amber)' },
    { label: 'Checked In',     value: data.checkinCount,  icon: <CheckCircle size={18} />,   color: 'var(--green)' },
    { label: 'Remind Set',     value: data.remindCount,   icon: <Bell size={18} />,          color: '#a855f7' },
    { label: 'Check-In Rate',  value: `${checkinRate}%`,  icon: <Route size={18} />,         color: 'var(--cyan)' },
  ];

  return (
    <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header">
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>Analytics</h2>
          <p style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>Flight statistics and departure overview</p>
        </div>
        <ClockSection tz={tz} clockTime={clockTime} clockDate={clockDate} slClockTime={slClockTime} slClockDate={slClockDate} />
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14 }}>
        {statCards.map(s => (
          <div key={s.label} className="card" style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.label}</span>
              <span style={{ color: s.color, opacity: 0.8 }}>{s.icon}</span>
            </div>
            <div style={{ fontSize: 30, fontWeight: 800, color: s.color, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="responsive-grid-2">

        {/* Status breakdown */}
        <div className="card" style={{ padding: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>Tickets by Status</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.statusGroups.map(g => {
              const pct = data.total ? Math.round((g.count / data.total) * 100) : 0;
              return (
                <div key={g._id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 500 }}>{g._id || 'Unknown'}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>{g.count} <span style={{ color: 'var(--text2)', fontWeight: 400 }}>({pct}%)</span></span>
                  </div>
                  <div style={{ height: 4, background: 'var(--surface2)', borderRadius: 4 }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: 'var(--indigo)', borderRadius: 4, transition: 'width 0.4s ease' }} />
                  </div>
                </div>
              );
            })}
            {data.statusGroups.length === 0 && <p style={{ fontSize: 12, color: 'var(--text2)', textAlign: 'center' }}>No data yet</p>}
          </div>
        </div>

        {/* Top routes */}
        <div className="card" style={{ padding: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>Top Routes</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.routeGroups.map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg2)', borderRadius: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text)', fontFamily: "'JetBrains Mono', monospace" }}>{r._id.from}</span>
                  <span style={{ fontSize: 10, color: 'var(--text2)' }}>→</span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text)', fontFamily: "'JetBrains Mono', monospace" }}>{r._id.to}</span>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--indigo2)', background: 'rgba(99,102,241,0.1)', padding: '2px 8px', borderRadius: 4 }}>{r.count} flights</span>
              </div>
            ))}
            {data.routeGroups.length === 0 && <p style={{ fontSize: 12, color: 'var(--text2)', textAlign: 'center' }}>No data yet</p>}
          </div>
        </div>
      </div>

      {/* Recent tickets */}
      <div className="card" style={{ padding: 20 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>Recently Added</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {data.recentTickets.map((t, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg2)', borderRadius: 8 }}>
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{t.passengerName}</p>
                <p style={{ fontSize: 10, color: 'var(--text2)', marginTop: 1 }}>{t.departureAirport} → {t.arrivalAirport}</p>
              </div>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, color: 'var(--cyan)' }}>{t.pnr}</span>
            </div>
          ))}
          {data.recentTickets.length === 0 && <p style={{ fontSize: 12, color: 'var(--text2)', textAlign: 'center' }}>No tickets yet</p>}
        </div>
      </div>
    </div>
  );
}
