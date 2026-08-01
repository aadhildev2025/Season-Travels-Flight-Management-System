import React, { useState, useRef } from 'react';
import { Sparkles, Copy, Check, Trash2, FileText, ArrowRight, Wand2 } from 'lucide-react';

interface FlightSegment {
  segNo: string;
  flightNo: string;
  date: string;
  route: string;
  times: string;
  rawLine: string;
}

const SAMPLE_PNR_NOTE = `1  QR 162 T 11SEP 5 CPHDOH HK1       2  0905 1605   788 E 0 M

     MANDATORY REQUIRED DOCS DOCO DOCA CTCM CTCE

     PLS ENTER SSR CTCM OR CTCE FOR IROP ALERTS

     SEE RTSVC

  2  QR 662 T 11SEP 5 DOHCMB HK1          1840 0205+1 789 E 0 M

     MANDATORY REQUIRED DOCS DOCO DOCA CTCM CTCE

     PLS ENTER SSR CTCM OR CTCE FOR IROP ALERTS

     SEE RTSVC

  3  QR 659 T 09OCT 5 CMBDOH HK1          0435 0655   788 E 0 M

     MANDATORY REQUIRED DOCS DOCO DOCA CTCM CTCE

     PLS ENTER SSR CTCM OR CTCE FOR IROP ALERTS

     SEE RTSVC

  4  QR 159 T 09OCT 5 DOHCPH HK1          0840 1405   788 E 0 M`;

export const NoteSummarizer: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [copied, setCopied] = useState(false);
  const [copyMode, setCopyMode] = useState<'image' | 'text'>('image');
  const tableRef = useRef<HTMLDivElement>(null);

  // Parse GDS flight lines from raw text
  const parseFlightSegments = (text: string): FlightSegment[] => {
    if (!text.trim()) return [];

    const lines = text.split(/\r?\n/);
    const segments: FlightSegment[] = [];

    // Common GDS month names
    const months = 'JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC';
    
    // Pattern matching standard GDS segment lines:
    // e.g., "1  QR 162 T 11SEP 5 CPHDOH HK1       2  0905 1605   788 E 0 M"
    // e.g., "2  UL 504 Y 15AUG 6 CMBLHR HK1 1000 1630"
    const gdsRegex = new RegExp(
      `^\\s*(\\d{1,2})\\s+` +                                     // 1. Seg No (e.g. 1)
      `([A-Z0-9]{2}\\s*\\d{1,4})` +                               // 2. Flight No (e.g. QR 162)
      `\\s+[A-Z0-9]{1,2}\\s+` +                                   // Class (e.g. T or Y1)
      `(\\d{1,2}(?:${months}))` +                                 // 3. Date (e.g. 11SEP)
      `(?:\\s+\\d)?\\s+` +                                        // Day of week (optional e.g. 5)
      `([A-Z]{6})` +                                             // 4. Route (e.g. CPHDOH)
      `.*?` +                                                    // Status code & extra spacing (HK1, etc.)
      `(\\d{4}\\s+\\d{4}(?:\\+\\d)?|\\d{2}:\\d{2}\\s+\\d{2}:\\d{2}(?:\\+\\d)?)`, // 5. Times (e.g. 0905 1605)
      'i'
    );

    // Fallback regex for less structured lines
    const fallbackRegex = new RegExp(
      `(\\d{1,2})?\\s*([A-Z0-9]{2}\\s*\\d{1,4})\\s+.*?(\\d{1,2}(?:${months}))\\s+.*?([A-Z]{6})\\s+.*?(\\d{4}\\s+\\d{4}(?:\\+\\d)?|\\d{2}:\\d{2}\\s+\\d{2}:\\d{2}(?:\\+\\d)?)`,
      'i'
    );

    let autoSegCounter = 1;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      let match = trimmed.match(gdsRegex);
      if (match) {
        // Standard GDS match
        const segNo = match[1];
        const rawFlight = match[2].toUpperCase();
        // Ensure space in flight number, e.g. QR162 -> QR 162
        const flightNo = rawFlight.replace(/^([A-Z0-9]{2})(\d+)/, '$1 $2');
        const date = match[3].toUpperCase();
        const route = match[4].toUpperCase();
        const times = match[5].toUpperCase();

        segments.push({ segNo, flightNo, date, route, times, rawLine: trimmed });
      } else {
        // Try fallback matcher
        const fallMatch = trimmed.match(fallbackRegex);
        if (fallMatch) {
          const segNo = fallMatch[1] || String(autoSegCounter++);
          const rawFlight = fallMatch[2].toUpperCase();
          const flightNo = rawFlight.replace(/^([A-Z0-9]{2})(\d+)/, '$1 $2');
          const date = fallMatch[3].toUpperCase();
          const route = fallMatch[4].toUpperCase();
          const times = fallMatch[5].toUpperCase();

          segments.push({ segNo, flightNo, date, route, times, rawLine: trimmed });
        }
      }
    }

    return segments;
  };

  const parsedSegments = parseFlightSegments(inputText);

  // Format as clean text output matching user's requested layout:
  // 1  QR 162  11SEP   CPHDOH   0905 1605
  // Each column is padded to the widest value so all lines align equally
  const generateFormattedSummary = (segs: FlightSegment[]): string => {
    if (segs.length === 0) return '';

    // Find max width per column across all rows
    const maxSeg    = Math.max(...segs.map(s => s.segNo.length));
    const maxFlight = Math.max(...segs.map(s => s.flightNo.length));
    const maxDate   = Math.max(...segs.map(s => s.date.length));
    const maxRoute  = Math.max(...segs.map(s => s.route.length));
    const maxTimes  = Math.max(...segs.map(s => s.times.length));

    return segs.map(s =>
      `${s.segNo.padEnd(maxSeg)}  ${s.flightNo.padEnd(maxFlight)}  ${s.date.padEnd(maxDate)}   ${s.route.padEnd(maxRoute)}   ${s.times.padEnd(maxTimes)}`
    ).join('\n');
  };

  const formattedOutput = generateFormattedSummary(parsedSegments);

  const handleCopyAsImage = async () => {
    if (parsedSegments.length === 0) return;

    const FONT    = "13px 'Courier New', 'Lucida Console', monospace";
    const PAD_X   = 20;
    const PAD_Y   = 16;
    const LINE_H  = 22;
    const TEXT_COLOR = '#1a1a1a';
    const BG_COLOR   = '#f5f5f5';

    // Build the plain column-aligned lines (same as text copy)
    const lines = formattedOutput.split('\n');

    // Measure canvas size
    const measure = document.createElement('canvas');
    const mctx = measure.getContext('2d')!;
    mctx.font = FONT;
    const maxLineW = Math.max(...lines.map(l => mctx.measureText(l).width));
    const totalW = Math.ceil(maxLineW) + PAD_X * 2;
    const totalH = lines.length * LINE_H + PAD_Y * 2;

    const dpr = 2; // always 2× for crisp output
    const canvas = document.createElement('canvas');
    canvas.width  = totalW * dpr;
    canvas.height = totalH * dpr;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);

    // White/light background
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, totalW, totalH);

    // Draw each line of plain text
    ctx.font      = FONT;
    ctx.fillStyle = TEXT_COLOR;
    ctx.textBaseline = 'top';
    lines.forEach((line, i) => {
      ctx.fillText(line, PAD_X, PAD_Y + i * LINE_H);
    });

    // Copy PNG to clipboard
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Fallback: copy text
        await navigator.clipboard.writeText(formattedOutput);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }, 'image/png');
  };

  const handleCopy = () => {
    if (copyMode === 'image') {
      handleCopyAsImage();
    } else {
      if (!formattedOutput) return;
      navigator.clipboard.writeText(formattedOutput);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLoadSample = () => {
    setInputText(SAMPLE_PNR_NOTE);
  };

  const handleClear = () => {
    setInputText('');
  };

  return (
    <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto', color: 'var(--text)' }} className="fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12,
            background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', boxShadow: '0 4px 16px rgba(99, 102, 241, 0.35)'
          }}>
            <Sparkles size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.01em', margin: 0, color: 'var(--text)' }}>
              AI Note Summarizer
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text2)', margin: 0, marginTop: 2 }}>
              Paste GDS flight booking notes to automatically extract clean flight details
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={handleLoadSample}
            className="btn btn-ghost btn-sm"
            style={{ gap: 6 }}
            title="Load sample GDS text to try it out"
          >
            <Wand2 size={13} /> Load Sample Note
          </button>
          {inputText && (
            <button
              onClick={handleClear}
              className="btn btn-ghost btn-sm"
              style={{ gap: 6, color: 'var(--red)' }}
            >
              <Trash2 size={13} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Dual Pane Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        {/* Left Pane: Input Text Area */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: 18, background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileText size={15} style={{ color: 'var(--indigo)' }} /> Paste Raw Booking Note / GDS Text
            </span>
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>
              {inputText.length > 0 ? `${inputText.length} characters` : 'Empty'}
            </span>
          </div>

          <textarea
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder={`Paste raw GDS flight details here...\n\nExample:\n1  QR 162 T 11SEP 5 CPHDOH HK1       2  0905 1605   788 E 0 M`}
            style={{
              width: '100%',
              height: 380,
              background: 'var(--bg2)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: 14,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12.5,
              lineHeight: 1.6,
              color: 'var(--text)',
              outline: 'none',
              resize: 'vertical',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--indigo)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
          />
        </div>

        {/* Right Pane: Summarized Result */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: 18, background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={15} style={{ color: 'var(--green)' }} /> Extracted Flight Summary
            </span>

            {parsedSegments.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {/* Mode toggle */}
                <div style={{
                  display: 'flex', background: 'var(--bg2)', borderRadius: 8,
                  border: '1px solid var(--border)', overflow: 'hidden', fontSize: 11,
                }}>
                  {(['image', 'text'] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => setCopyMode(mode)}
                      style={{
                        padding: '4px 10px', border: 'none', cursor: 'pointer',
                        fontWeight: 600, fontSize: 11, transition: 'all 0.15s',
                        background: copyMode === mode ? 'var(--indigo)' : 'transparent',
                        color: copyMode === mode ? '#fff' : 'var(--text2)',
                      }}
                    >
                      {mode === 'image' ? '🖼 PNG' : '📋 Text'}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleCopy}
                  className="btn btn-primary btn-sm"
                  style={{ gap: 6, background: copied ? 'var(--green)' : undefined }}
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? 'Copied!' : copyMode === 'image' ? 'Copy as PNG' : 'Copy Text'}
                </button>
              </div>
            )}
          </div>

          {parsedSegments.length === 0 ? (
            <div style={{
              flex: 1,
              minHeight: 380,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--bg2)',
              borderRadius: 10,
              border: '1px dashed var(--border)',
              padding: 24,
              textAlign: 'center'
            }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(99,102,241,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--indigo2)', marginBottom: 12 }}>
                <ArrowRight size={20} />
              </div>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', margin: 0 }}>
                No flight details detected yet
              </p>
              <p style={{ fontSize: 11.5, color: 'var(--text3)', margin: 0, marginTop: 4, maxWidth: 280 }}>
                Paste GDS notes on the left or click <strong>Load Sample Note</strong> above to see instant summarization.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 14 }}>
              {/* Structured Summary Table Preview */}
              <div style={{
                background: 'var(--bg2)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: 14,
                overflowX: 'auto',
                flex: 1
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, fontFamily: "'JetBrains Mono', monospace" }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text2)', fontSize: 11 }}>
                      <th style={{ padding: '6px 8px', fontWeight: 600 }}>#</th>
                      <th style={{ padding: '6px 8px', fontWeight: 600 }}>FLIGHT NO</th>
                      <th style={{ padding: '6px 8px', fontWeight: 600 }}>DATE</th>
                      <th style={{ padding: '6px 8px', fontWeight: 600 }}>ROUTE</th>
                      <th style={{ padding: '6px 8px', fontWeight: 600 }}>TIMES</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedSegments.map((seg, idx) => (
                      <tr key={idx} style={{ borderBottom: idx < parsedSegments.length - 1 ? '1px solid var(--border2)' : 'none' }}>
                        <td style={{ padding: '10px 8px', color: 'var(--text2)', fontWeight: 500 }}>{seg.segNo}</td>
                        <td style={{ padding: '10px 8px', color: 'var(--cyan)', fontWeight: 600 }}>{seg.flightNo}</td>
                        <td style={{ padding: '10px 8px', color: 'var(--text)', fontWeight: 500 }}>{seg.date}</td>
                        <td style={{ padding: '10px 8px', color: 'var(--indigo2)', fontWeight: 600 }}>{seg.route}</td>
                        <td style={{ padding: '10px 8px', color: 'var(--green)', fontWeight: 500 }}>{seg.times}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Raw Copy Output View */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>CLEAN TEXT OUTPUT (READY TO COPY)</span>
                </div>
                <pre style={{
                  background: 'var(--bg2)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  padding: 12,
                  margin: 0,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 12,
                  lineHeight: 1.8,
                  color: 'var(--text)',
                  whiteSpace: 'pre-wrap',
                  maxHeight: 160,
                  overflowY: 'auto'
                }}>
                  {formattedOutput}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
