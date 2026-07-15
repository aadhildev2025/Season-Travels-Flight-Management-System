import { useState, useEffect } from 'react';
import { useFlightStore } from '../store/flightStore';
import { Eye, EyeOff } from 'lucide-react';
import BrandLogo from './BrandLogo';

export default function Login() {
  const { login } = useFlightStore();
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPwd, setShowPwd]     = useState(false);
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [clock, setClock]         = useState('');
  const [dateStr, setDateStr]     = useState('');

  const [isLocalTime, setIsLocalTime] = useState(false);
  const [tzLabel, setTzLabel]     = useState('CET');
  const [quickAccessUsers, setQuickAccessUsers] = useState<{ name: string; email: string; role: string }[]>([]);
  const [selectedEmail, setSelectedEmail] = useState('');

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const timeZone = isLocalTime ? undefined : 'Europe/Stockholm';
      setClock(now.toLocaleTimeString('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));
      setDateStr(now.toLocaleDateString('en-GB', { timeZone, weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [isLocalTime]);

  useEffect(() => {
    const now = new Date();
    if (isLocalTime) {
      const tzName = new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' })
        .formatToParts(now)
        .find(part => part.type === 'timeZoneName')?.value || 'Local';
      setTzLabel(`Local · ${tzName}`);
    } else {
      setTzLabel('CET');
    }
  }, [isLocalTime]);

  useEffect(() => {
    fetch('/api/auth/quick-access')
      .then(res => res.json())
      .then(data => {
        if (data.users) {
          setQuickAccessUsers(data.users);
        }
      })
      .catch(err => console.error('Failed to fetch quick access users', err));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const ok = await login(email, password);
    setLoading(false);
    if (!ok) setError('Incorrect email or password.');
  };

  const handleQuickAccessClick = (user: { name: string; email: string; role: string }) => {
    const username = user.email.split('@')[0];
    setEmail(username);
    setPassword('');
    setSelectedEmail(user.email);
    setError('');
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>

      {/* Ambient glow behind card */}
      <div style={{
        position: 'fixed', top: '30%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 600, height: 600, borderRadius: '50%', pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 70%)',
      }} />

      <div className="fade-up" style={{ width: '100%', maxWidth: 400, position: 'relative', zIndex: 1 }}>

        {/* Brand header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, margin: '0 auto 16px',
            background: 'linear-gradient(135deg, #6366f1, #818cf8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(99,102,241,0.35)',
          }}>
            <BrandLogo size={26} style={{ color: 'white' }} />
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: 4 }}>
            Season Travels
          </h1>
          <p style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Flight Management System
          </p>
        </div>

        {/* Live clock pill */}
        <div 
          onClick={() => setIsLocalTime(!isLocalTime)}
          style={{
            display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center',
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '10px 16px', marginBottom: 24,
            cursor: 'pointer', transition: 'all 0.2s ease',
            userSelect: 'none',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'var(--indigo2)';
            e.currentTarget.style.background = 'rgba(99,102,241,0.03)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'var(--border)';
            e.currentTarget.style.background = 'var(--surface)';
          }}
          title="Click to toggle between Stockholm and Local time"
        >
          <span style={{ fontSize: 10, color: 'var(--text2)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tzLabel}</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 700, color: 'var(--indigo2)', letterSpacing: '0.05em', textAlign: 'center', padding: '0 8px' }}>
            {clock}
          </span>
          <span style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, textAlign: 'right', whiteSpace: 'nowrap' }}>
            {dateStr}
          </span>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: 28 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 20 }}>Sign in to your account</p>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#f87171', fontWeight: 500 }}>
              {error}
            </div>
          )}

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Email */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Email or Username</label>
              <input
                type="text" required value={email} placeholder="your@email.com or username"
                onChange={e => { setEmail(e.target.value); setError(''); setSelectedEmail(''); }}
                className="field"
              />
            </div>

            {/* Password */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPwd ? 'text' : 'password'} required value={password} placeholder="••••••••"
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  className="field" style={{ paddingRight: 44 }}
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)', display: 'flex', padding: 0 }}>
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading}
              className="btn btn-primary" style={{ width: '100%', padding: '11px', fontSize: 13, marginTop: 4, opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading
                ? <><span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} /> Signing in...</>
                : 'Sign In'}
            </button>
          </form>

          {/* Quick fill */}
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border2)' }}>
            <p style={{ fontSize: 9, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 }}>Quick access</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {quickAccessUsers.length === 0 ? (
                <div style={{ gridColumn: 'span 2', fontSize: 10, color: 'var(--text3)', fontStyle: 'italic', padding: '4px 0', textAlign: 'center' }}>Loading users...</div>
              ) : (
                quickAccessUsers.map((user) => {
                  const isSelected = selectedEmail === user.email;
                  return (
                    <button
                      key={user.email}
                      type="button"
                      onClick={() => handleQuickAccessClick(user)}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 8,
                        border: isSelected 
                          ? '1px solid var(--indigo2)' 
                          : '1px solid var(--border)',
                        background: isSelected 
                          ? 'rgba(99,102,241,0.12)' 
                          : 'var(--surface2)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s ease',
                        width: '100%',
                      }}
                      onMouseEnter={e => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)';
                          e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                        }
                      }}
                      onMouseLeave={e => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = 'var(--border)';
                          e.currentTarget.style.background = 'var(--surface2)';
                        }
                      }}
                    >
                      <div>
                        <p style={{ fontSize: 10, fontWeight: 700, color: isSelected ? 'var(--indigo2)' : (user.role === 'Admin' ? 'var(--indigo2)' : 'var(--text)'), marginBottom: 1 }}>
                          {user.name}
                        </p>
                        <p style={{ fontSize: 8, color: isSelected ? 'var(--indigo2)' : 'var(--text2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {user.role} · {user.email}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
