import { useEffect, useState } from 'react';

interface SplashScreenProps {
  /** Called once the splash finishes its exit animation */
  onDone?: () => void;
  /** Minimum time the splash stays fully visible (ms) */
  duration?: number;
}

export default function SplashScreen({ onDone, duration = 2200 }: SplashScreenProps) {
  const [leaving, setLeaving] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Animate the progress bar smoothly to 100%
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const pct = Math.min(100, ((now - start) / duration) * 100);
      setProgress(pct);
      if (pct < 100) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const leaveTimer = setTimeout(() => setLeaving(true), duration);
    const doneTimer = setTimeout(() => onDone?.(), duration + 650);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(leaveTimer);
      clearTimeout(doneTimer);
    };
  }, [duration, onDone]);

  return (
    <div className={`splash-root${leaving ? ' splash-leaving' : ''}`}>
      {/* Ambient animated glows */}
      <div className="splash-glow splash-glow-1" />
      <div className="splash-glow splash-glow-2" />

      {/* Flying plane accents */}
      <div className="splash-plane splash-plane-a">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21 4 19 2c-2-2-4-2-5.5-.5L10 5 1.8 6.2c-.5.1-.9.5-.9 1.1l.8 1.1 4.1 4.1L4.2 21l1.8.8 5.5-2.4 4.1 4.1 1.1.8c.6 0 1-.4 1.1-.9l1.2-8.2" />
        </svg>
      </div>

      <div className="splash-content">
        {/* Logo with reveal + shimmer */}
        <div className="splash-logo-wrap">
          <img src="/logo.png" alt="Season Travels" className="splash-logo" />
          <div className="splash-shimmer" />
        </div>

        <p className="splash-tagline">Flight Management System</p>

        {/* Progress bar */}
        <div className="splash-progress">
          <div className="splash-progress-fill" style={{ width: `${progress}%` }} />
        </div>

        <span className="splash-loading-text">Preparing your console…</span>
      </div>
    </div>
  );
}
