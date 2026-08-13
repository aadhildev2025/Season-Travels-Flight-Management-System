import React, { useState } from 'react';
import { Sparkles, Copy, Check, Trash2, FileText, ArrowRight } from 'lucide-react';

interface FlightSegment {
  segNo: string;
  airline: string;
  flightNum: string;
  flightNo: string;
  date: string;
  route: string;
  times: string;
  depTime: string;
  arrTime: string;
  rawLine: string;
}

export const NoteSummarizer: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [copied, setCopied] = useState(false);
  const [inputCopied, setInputCopied] = useState(false);

  // Parse GDS and Amadeus flight lines from raw text
  const parseFlightSegments = (text: string): FlightSegment[] => {
    if (!text.trim()) return [];

    const lines = text.split(/\r?\n/);
    const segments: FlightSegment[] = [];

    // Common month names
    const months = 'JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC';
    
    // Pattern matching standard GDS segment lines:
    // e.g., "1  EK    2 T 27SEP 5 LHRDXB HK1          2125 0740+1 788 E 0 M"
    // e.g., "1  QR 162 T 11SEP 5 CPHDOH HK1       2  0905 1605   788 E 0 M"
    const gdsRegex = new RegExp(
      `^\\s*(\\d{1,2})\\s+` +                                     // 1. Seg No
      `([A-Z0-9]{2})\\s*(\\d{1,4})` +                             // 2. Airline & 3. Flight Num
      `\\s+[A-Z0-9]{1,2}\\s+` +                                   // Class
      `(\\d{1,2}(?:${months}))` +                                 // 4. Date
      `(?:\\s+\\d)?\\s+` +                                        // Day of week (optional)
      `([A-Z]{6}|[A-Z]{3}[\\s\\/\\-][A-Z]{3})` +                   // 5. Route
      `.*?` +                                                    // Status code & extra spacing
      `(\\d{4}|\\d{2}:\\d{2})\\s+(\\d{4}(?:\\+\\d)?|\\d{2}:\\d{2}(?:\\+\\d)?)`, // 6. Dep Time & 7. Arr Time
      'i'
    );

    // Pattern matching Amadeus segment lines:
    // e.g., "1   QR      4  T  27SEP LHR DOH   1505  2350    SU   388    TLGBP1RE"
    // e.g., "2   QR    664  T  28SEP DOH CMB   0135  0900    MO   789    TLGBP1RE"
    const amadeusRegex = new RegExp(
      `^\\s*(\\d{1,2})\\s+` +                                     // 1. Seg No
      `([A-Z]{2})\\s+` +                                          // 2. Airline code
      `(\\d{1,4})\\s+` +                                          // 3. Flight Num
      `[A-Z]{1,2}\\s+` +                                          // Class
      `(\\d{1,2}(?:${months}))\\s+` +                             // 4. Date
      `([A-Z]{3})\\s+` +                                          // Departure airport
      `([A-Z]{3})\\s+` +                                          // Arrival airport
      `(\\d{4})\\s+` +                                            // 5. Departure time
      `(\\d{4}(?:\\+\\d)?)`,                                      // 6. Arrival time
      'i'
    );

    // Fallback regex for less structured lines
    const fallbackRegex = new RegExp(
      `(\\d{1,2})?\\s*([A-Z0-9]{2})\\s*(\\d{1,4})\\s+.*?(\\d{1,2}(?:${months}))\\s+.*?([A-Z]{6}|[A-Z]{3}[\\s\\/\\-][A-Z]{3})\\s+.*?(\\d{4}|\\d{2}:\\d{2})\\s+(\\d{4}(?:\\+\\d)?|\\d{2}:\\d{2}(?:\\+\\d)?)`,
      'i'
    );

    let autoSegCounter = 1;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      let match = trimmed.match(gdsRegex);
      if (match) {
        const segNo = match[1];
        const airline = match[2].toUpperCase();
        const flightNum = match[3].toUpperCase();
        const flightNo = `${airline} ${flightNum}`;
        const date = match[4].toUpperCase();
        const route = match[5].toUpperCase().replace(/[\s\/\-]/g, '');
        const depTime = match[6].toUpperCase();
        const arrTime = match[7].toUpperCase();
        const times = `${depTime} ${arrTime}`;

        segments.push({ segNo, airline, flightNum, flightNo, date, route, times, depTime, arrTime, rawLine: trimmed });
        continue;
      }

      let amadeusMatch = trimmed.match(amadeusRegex);
      if (amadeusMatch) {
        const segNo = amadeusMatch[1];
        const airline = amadeusMatch[2].toUpperCase();
        const flightNum = amadeusMatch[3].toUpperCase();
        const flightNo = `${airline} ${flightNum}`;
        const date = amadeusMatch[4].toUpperCase();
        const depAirport = amadeusMatch[5].toUpperCase();
        const arrAirport = amadeusMatch[6].toUpperCase();
        const route = `${depAirport}${arrAirport}`;
        const depTime = amadeusMatch[7].toUpperCase();
        const arrTime = amadeusMatch[8].toUpperCase();
        const times = `${depTime} ${arrTime}`;

        segments.push({ segNo, airline, flightNum, flightNo, date, route, times, depTime, arrTime, rawLine: trimmed });
        continue;
      }

      const fallMatch = trimmed.match(fallbackRegex);
      if (fallMatch) {
        const segNo = fallMatch[1] || String(autoSegCounter++);
        const airline = fallMatch[2].toUpperCase();
        const flightNum = fallMatch[3].toUpperCase();
        const flightNo = `${airline} ${flightNum}`;
        const date = fallMatch[4].toUpperCase();
        const route = fallMatch[5].toUpperCase().replace(/[\s\/\-]/g, '');
        const depTime = fallMatch[6].toUpperCase();
        const arrTime = fallMatch[7].toUpperCase();
        const times = `${depTime} ${arrTime}`;

        segments.push({ segNo, airline, flightNum, flightNo, date, route, times, depTime, arrTime, rawLine: trimmed });
      }
    }

    return segments;
  };

  const parsedSegments = parseFlightSegments(inputText);

  // Format matching requested text column layout:
  // 1  EK    2  27SEP   LHRDXB   2125  0740+1
  // 2  EK  650  28SEP   DXBCMB   1620  2200
  const generateFormattedSummary = (segs: FlightSegment[]): string => {
    if (segs.length === 0) return '';

    const maxSeg       = Math.max(1, ...segs.map(s => s.segNo.length));
    const maxAirline   = Math.max(2, ...segs.map(s => s.airline.length));
    const maxFlightNum = Math.max(3, ...segs.map(s => s.flightNum.length));
    const maxDate      = Math.max(5, ...segs.map(s => s.date.length));
    const maxRoute     = Math.max(6, ...segs.map(s => s.route.length));
    const maxDep       = Math.max(4, ...segs.map(s => s.depTime.length));

    return segs.map(s => {
      const segPadded       = s.segNo.padEnd(maxSeg);
      const airlinePadded   = s.airline.padEnd(maxAirline);
      const flightNumPadded = s.flightNum.padStart(maxFlightNum);
      const datePadded      = s.date.padEnd(maxDate);
      const routePadded     = s.route.padEnd(maxRoute);
      const depPadded       = s.depTime.padEnd(maxDep);

      return `${segPadded}  ${airlinePadded}  ${flightNumPadded}  ${datePadded}   ${routePadded}   ${depPadded}  ${s.arrTime}`;
    }).join('\n');
  };

  const formattedOutput = generateFormattedSummary(parsedSegments);

  // Pure text format copy ONLY (no HTML / Excel table formatting)
  const handleCopy = async () => {
    if (!formattedOutput) return;

    try {
      await navigator.clipboard.writeText(formattedOutput);
    } catch {
      // clipboard write failed silently
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyInput = async () => {
    if (!inputText) return;

    try {
      await navigator.clipboard.writeText(inputText);
    } catch {
      // clipboard write failed silently
    }

    setInputCopied(true);
    setTimeout(() => setInputCopied(false), 2000);
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
              Paste GDS / Amadeus flight booking notes to automatically extract clean flight details
            </p>
          </div>
        </div>
      </div>

      {/* Dual Pane Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        {/* Left Pane: Input Text Area */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: 18, background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileText size={15} style={{ color: 'var(--indigo)' }} /> Paste Raw Booking Note / GDS Text
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--text3)', marginRight: 2 }}>
                {inputText.length > 0 ? `${inputText.length} characters` : 'Empty'}
              </span>
              <button
                onClick={handleCopyInput}
                disabled={!inputText}
                className="btn btn-primary btn-sm"
                style={{
                  gap: 5,
                  padding: '4px 10px',
                  fontSize: 11,
                  opacity: inputText ? 1 : 0.4,
                  cursor: inputText ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  background: inputCopied ? 'var(--green)' : undefined
                }}
                title="Copy raw input text to clipboard"
              >
                {inputCopied ? <Check size={12} /> : <Copy size={12} />}
                {inputCopied ? 'Copied!' : 'Copy Input'}
              </button>
              <button
                onClick={handleClear}
                disabled={!inputText}
                className="btn btn-ghost btn-sm"
                style={{
                  gap: 5,
                  padding: '3px 8px',
                  fontSize: 11,
                  color: inputText ? 'var(--red)' : 'var(--text3)',
                  opacity: inputText ? 1 : 0.4,
                  cursor: inputText ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title="Clear input text"
              >
                <Trash2 size={12} />
                Clear
              </button>
            </div>
          </div>

          <textarea
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder={`Paste raw GDS / Amadeus flight details here...\n\nGDS Example:\n1  EK    2 T 27SEP 5 LHRDXB HK1          2125 0740+1 788 E 0 M\n2  EK  650 T 28SEP 5 DXBCMB HK1          1620 2200   789 E 0 M\n\nAmadeus Example:\n1   QR      4  T  27SEP LHR DOH   1505  2350    SU   388    TLGBP1RE\n2   QR    664  T  28SEP DOH CMB   0135  0900    MO   789    TLGBP1RE`}
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={15} style={{ color: 'var(--green)' }} /> Extracted Flight Summary
            </span>

            {parsedSegments.length > 0 && (
              <button
                onClick={handleCopy}
                className="btn btn-primary btn-sm"
                style={{
                  gap: 5,
                  padding: '5px 12px',
                  fontSize: 12,
                  display: 'flex',
                  alignItems: 'center',
                  background: copied ? 'var(--green)' : undefined
                }}
                title="Copy plain text summary to clipboard"
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? 'Copied!' : 'Copy Summary'}
              </button>
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
                Paste GDS / Amadeus notes on the left to see instant summarization.
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
                  <button
                    onClick={handleCopy}
                    className="btn btn-ghost btn-sm"
                    style={{
                      gap: 4,
                      padding: '2px 8px',
                      fontSize: 11,
                      color: copied ? 'var(--green)' : 'var(--text2)',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    title="Copy clean text output"
                  >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
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
                  whiteSpace: 'pre',
                  overflowX: 'auto',
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
