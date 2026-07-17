interface ClockSectionProps {
  tz?: string;
  clockTime: string;
  clockDate: string;
  slClockTime?: string;
  slClockDate?: string;
}

export default function ClockSection({ clockTime, clockDate, slClockTime, slClockDate }: ClockSectionProps) {
  return (
    <div className="clock-container" style={{ flexDirection: 'row', gap: 18, alignItems: 'flex-end', textAlign: 'right', flexShrink: 0 }}>
      {/* CET Clock */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
        <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--indigo2)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
          CET
        </span>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 24,
          fontWeight: 800,
          color: 'var(--indigo2)',
          lineHeight: 1,
          textShadow: 'rgba(165,180,252,0.25) 0 0 20px'
        }}>
          {clockTime}
        </span>
        <span style={{ fontSize: 9, color: 'var(--text2)', fontWeight: 600, marginTop: 3 }}>
          {clockDate}
        </span>
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 40, background: 'var(--border)', flexShrink: 0, alignSelf: 'center' }} />

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
