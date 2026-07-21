interface ClockSectionProps {
  slClockTime?: string;
  slClockDate?: string;
}

export default function ClockSection({ slClockTime, slClockDate }: ClockSectionProps) {
  return (
    <div className="clock-container" style={{ flexDirection: 'row', gap: 18, alignItems: 'flex-end', textAlign: 'right', flexShrink: 0 }}>
      {/* SL Clock */}
      {slClockTime && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            SLT
          </span>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 24,
            fontWeight: 800,
            color: 'var(--cyan)',
            lineHeight: 1,
            textShadow: 'rgba(34,211,238,0.2) 0 0 20px'
          }}>
            {slClockTime}
          </span>
          <span style={{ fontSize: 9, color: 'var(--text2)', fontWeight: 600, marginTop: 3 }}>
            {slClockDate}
          </span>
        </div>
      )}
    </div>
  );
}
