import type { TZ } from '../App';

interface ClockSectionProps {
  tz: TZ;
  clockTime: string;
  clockDate: string;
}

export default function ClockSection({ tz, clockTime, clockDate }: ClockSectionProps) {
  const tzColor = tz === 'CET' ? 'var(--indigo2)' : 'var(--cyan)';
  const tzLabel = tz === 'CET' ? 'CET Time' : 'SL Time';

  return (
    <div className="clock-container">
      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Showing: {tzLabel}
      </span>
      <span style={{ 
        fontFamily: "'JetBrains Mono', monospace", 
        fontSize: 28, 
        fontWeight: 800, 
        color: tzColor,
        marginTop: 3,
        lineHeight: 1,
        textShadow: `0 0 20px ${tz === 'CET' ? 'rgba(165,180,252,0.2)' : 'rgba(34,211,238,0.15)'}`
      }}>
        {clockTime}
      </span>
      <span style={{ fontSize: 9, color: 'var(--text2)', fontWeight: 600, marginTop: 4 }}>
        {clockDate}
      </span>
    </div>
  );
}
