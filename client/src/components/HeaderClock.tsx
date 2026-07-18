import { useEffect, useState } from 'react';

/**
 * Self-contained header clock. It owns its own 1-second interval so that
 * ticking does NOT re-render the parent App or the ticket table — this keeps
 * the whole system smooth.
 */
export default function HeaderClock() {
  const [cetTime, setCetTime] = useState('');
  const [cetDate, setCetDate] = useState('');
  const [slTime, setSlTime] = useState('');
  const [slDate, setSlDate] = useState('');

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setCetTime(now.toLocaleTimeString('en-GB', { timeZone: 'Europe/Stockholm', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));
      setCetDate(now.toLocaleDateString('en-GB', { timeZone: 'Europe/Stockholm', weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }));
      setSlTime(now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Colombo', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));
      setSlDate(now.toLocaleDateString('en-GB', { timeZone: 'Asia/Colombo', weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{
      position: 'absolute',
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      alignItems: 'center',
      gap: 18,
      pointerEvents: 'none',
      zIndex: 10,
    }}>
      {/* CET */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--indigo2)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>CET</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 26, fontWeight: 800, color: 'var(--indigo2)', letterSpacing: '0.04em', lineHeight: 1 }}>{cetTime}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', lineHeight: 1, marginTop: 3 }}>{cetDate}</span>
      </div>
      <div style={{ width: 1, height: 38, background: 'var(--border)', alignSelf: 'center' }} />
      {/* SLT */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--cyan)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>SLT</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 26, fontWeight: 800, color: 'var(--cyan)', letterSpacing: '0.04em', lineHeight: 1 }}>{slTime}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', lineHeight: 1, marginTop: 3 }}>{slDate}</span>
      </div>
    </div>
  );
}
