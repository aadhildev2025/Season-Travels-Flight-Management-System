import { useState, useEffect, useRef } from 'react';
import { useFlightStore } from '../store/flightStore';
import { localTimeToUTC, utcToLocalTime, getTimezoneDiff } from '../utils/timezone';
import { AIRPORTS } from '../types';
import type { Ticket } from '../types';
import { ArrowLeft, Plane, CalendarDays, Clock3 } from 'lucide-react';
import ClockSection from './ClockSection';

interface TicketFormProps {
  editingTicket: Ticket | null;
  onBack: () => void;
  onSuccess?: (msg: string) => void;
  clockTime: string;
  clockDate: string;
  slClockTime?: string;
  slClockDate?: string;
}

export default function TicketForm({ editingTicket, onBack, onSuccess, clockTime, clockDate, slClockTime, slClockDate }: TicketFormProps) {
  const { addTicket, updateTicket } = useFlightStore();

  const [passengerName, setPassengerName] = useState('');
  const [email, setEmail]                 = useState('');
  const [phone, setPhone]                 = useState('');
  const [pnr, setPnr]                     = useState('');
  const [flightNumber, setFlightNumber]   = useState('');
  const [departureAirport, setDepAirport] = useState('');
  const [arrivalAirport, setArrAirport]   = useState('');
  const [dipDate, setDipDate]             = useState('');
  const [dipTime, setDipTime]             = useState('');
  const [cetTime, setCetTime]             = useState('');
  const [status, setStatus]               = useState('No Need Further Actions');
  const [remarks, setRemarks]             = useState('');
  const [returnTicket, setReturnTicket]   = useState(false);
  const [returnDate, setReturnDate]       = useState('');
  const [returnTime, setReturnTime]       = useState('');
  const [returnCetTime, setReturnCetTime] = useState('');
  const [autoTime, setAutoTime]           = useState(true);
  const [submitting, setSubmitting]       = useState(false);

  const [showDepList, setShowDepList]     = useState(false);
  const [showArrList, setShowArrList]     = useState(false);
  const [errors, setErrors]               = useState<Record<string, string>>({});
  const depRef = useRef<HTMLDivElement>(null);
  const arrRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (depRef.current && !depRef.current.contains(e.target as Node)) setShowDepList(false);
      if (arrRef.current && !arrRef.current.contains(e.target as Node)) setShowArrList(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Pre-fill when editing
  useEffect(() => {
    if (!editingTicket) return;
    setPassengerName(editingTicket.passengerName);
    setEmail(editingTicket.email);
    setPhone(editingTicket.phone);
    setPnr(editingTicket.pnr);
    setFlightNumber(editingTicket.flightNumber || '');
    setDepAirport(editingTicket.departureAirport);
    setArrAirport(editingTicket.arrivalAirport);
    setReturnTicket(editingTicket.returnTicket);
    setRemarks(editingTicket.remarks);
    setStatus(editingTicket.status);

    const local = utcToLocalTime(editingTicket.departureTimeUTC, editingTicket.originalTimezone);
    setDipDate(local.date);
    setDipTime(local.time);
    const cet = utcToLocalTime(editingTicket.departureTimeUTC, 'Europe/Stockholm');
    setCetTime(cet.time);

    if (editingTicket.returnDepartureTimeUTC) {
      const retTz = editingTicket.returnOriginalTimezone || editingTicket.originalTimezone;
      const retLocal = utcToLocalTime(editingTicket.returnDepartureTimeUTC, retTz);
      setReturnDate(retLocal.date);
      setReturnTime(retLocal.time);
      const retCet = utcToLocalTime(editingTicket.returnDepartureTimeUTC, 'Europe/Stockholm');
      setReturnCetTime(retCet.time);
    }
  }, [editingTicket]);

  // CET Time → auto compute local departure time from departure airport tz
  const handleCETChange = (val: string) => {
    setCetTime(val);
    if (autoTime && dipDate && val) {
      const utc = localTimeToUTC(dipDate, val, 'Europe/Stockholm');
      if (utc) {
        const tz = AIRPORTS.find(a => a.code === departureAirport)?.timezone || 'Asia/Colombo';
        setDipTime(utcToLocalTime(utc, tz).time);
      }
    }
  };

  // Local departure time → auto compute CET
  useEffect(() => {
    if (!autoTime || !dipDate || !dipTime || !departureAirport) return;
    const tz  = AIRPORTS.find(a => a.code === departureAirport)?.timezone || 'Asia/Colombo';
    const utc = localTimeToUTC(dipDate, dipTime, tz);
    if (utc) setCetTime(utcToLocalTime(utc, 'Europe/Stockholm').time);
  }, [dipDate, dipTime, departureAirport, autoTime]);

  // Return CET → auto compute return local time
  const handleReturnCETChange = (val: string) => {
    setReturnCetTime(val);
    if (autoTime && returnDate && val) {
      const utc = localTimeToUTC(returnDate, val, 'Europe/Stockholm');
      if (utc) {
        const tz = AIRPORTS.find(a => a.code === arrivalAirport)?.timezone || 'Asia/Colombo';
        setReturnTime(utcToLocalTime(utc, tz).time);
      }
    }
  };

  // Return local time → auto compute Return CET
  useEffect(() => {
    if (!autoTime || !returnDate || !returnTime || !arrivalAirport) return;
    const tz  = AIRPORTS.find(a => a.code === arrivalAirport)?.timezone || 'Asia/Colombo';
    const utc = localTimeToUTC(returnDate, returnTime, tz);
    if (utc) setReturnCetTime(utcToLocalTime(utc, 'Europe/Stockholm').time);
  }, [returnDate, returnTime, arrivalAirport, autoTime]);

  // Time diffs
  const depAirportTz = AIRPORTS.find(a => a.code === departureAirport)?.timezone || '';
  const arrAirportTz = AIRPORTS.find(a => a.code === arrivalAirport)?.timezone || '';

  const timeDiffDepCET = (() => {
    if (!dipDate || !dipTime || !depAirportTz) return '';
    const utc = localTimeToUTC(dipDate, dipTime, depAirportTz);
    if (!utc) return '';
    return getTimezoneDiff(new Date(utc), depAirportTz, 'Europe/Stockholm');
  })();

  const timeDiffDepArr = (() => {
    if (!dipDate || !dipTime || !depAirportTz || !arrAirportTz) return '';
    const utc = localTimeToUTC(dipDate, dipTime, depAirportTz);
    if (!utc) return '';
    return getTimezoneDiff(new Date(utc), depAirportTz, arrAirportTz);
  })();

  const handleReturnToggle = () => {
    setReturnTicket(prev => !prev);
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!passengerName.trim()) e.passengerName = 'Required';
    if (!dipDate)              e.dipDate        = 'Required';
    if (!dipTime)              e.dipTime        = 'Required';
    if (!cetTime)              e.cetTime        = 'Required';
    if (!departureAirport)    e.dep             = 'Required';
    if (!arrivalAirport)      e.arr             = 'Required';
    if (!pnr.trim())          e.pnr             = 'Required';
    if (returnTicket) {
      if (!returnDate)        e.returnDate      = 'Required';
      if (!returnTime)        e.returnTime      = 'Required';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);

    const tz  = AIRPORTS.find(a => a.code === departureAirport)?.timezone || 'Asia/Colombo';
    const dtu = localTimeToUTC(dipDate, dipTime, tz);

    let returnDepartureTimeUTC = '';
    let returnOriginalTimezone = '';
    if (returnTicket && returnDate && returnTime) {
      const retTz = AIRPORTS.find(a => a.code === arrivalAirport)?.timezone || 'Asia/Colombo';
      returnDepartureTimeUTC = localTimeToUTC(returnDate, returnTime, retTz);
      returnOriginalTimezone = retTz;
    }

    const payload = {
      passengerName, email, phone,
      airline: '', flightNumber,
      pnr, departureAirport, arrivalAirport,
      departureTimeUTC: dtu, originalTimezone: tz,
      returnTicket, returnDepartureTimeUTC, returnOriginalTimezone,
      remarks, status,
    };

    try {
      if (editingTicket) {
        await updateTicket(editingTicket._id, payload);
        onSuccess?.('Ticket Updated Successfully!');
      } else {
        await addTicket(payload);
        onSuccess?.('Ticket Saved Successfully!');
      }
    } catch {
      // fallback: just go back
      onBack();
    } finally {
      setSubmitting(false);
    }
  };

  const clearAll = () => {
    setPassengerName(''); setEmail(''); setPhone(''); setPnr(''); setFlightNumber('');
    setDepAirport(''); setArrAirport(''); setDipDate(''); setDipTime('');
    setCetTime(''); setRemarks(''); setReturnTicket(false);
    setReturnDate(''); setReturnTime(''); setReturnCetTime('');
    setStatus('No Need Further Actions'); setErrors({});
  };

  // Styles
  const label: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5, display: 'block' };
  const err   = (key: string): React.CSSProperties => errors[key] ? { borderColor: 'var(--red)' } : {};

  const dropdownStyle: React.CSSProperties = {
    position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50,
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 10, padding: 4, maxHeight: 200, overflowY: 'auto',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
  };

  const airportBtn: React.CSSProperties = {
    width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 7,
    background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text)',
    transition: 'background 0.1s',
  };

  const sectionTitle = (n: string, color: string) => (
    <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 8, marginBottom: 14 }}>
      <h3 style={{ fontSize: 11, fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{n}</h3>
    </div>
  );

  const depAirportLabel = AIRPORTS.find(a => a.code === departureAirport)?.city || '';
  const arrAirportLabel = AIRPORTS.find(a => a.code === arrivalAirport)?.city || '';

  return (
    <div className="fade-up" style={{ maxWidth: 860, margin: '0 auto' }}>

      {/* Page header */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onBack} className="btn btn-ghost btn-icon">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
              {editingTicket ? 'Edit Ticket' : 'Add New Ticket'}
            </h1>
            <p style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>Fill in the passenger and departure details</p>
          </div>
        </div>
        <ClockSection clockTime={clockTime} clockDate={clockDate} slClockTime={slClockTime} slClockDate={slClockDate} />
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 26 }}>

          {/* ── 1. Customer Information ── */}
          <div>
            {sectionTitle('1. Customer Information', 'var(--indigo2)')}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.5fr', gap: 14 }}>
              <div>
                <label style={label}>Customer Name *</label>
                <input className="field" style={err('passengerName')} value={passengerName} placeholder="Full name"
                  onChange={e => setPassengerName(e.target.value)} />
                {errors.passengerName && <span style={{ fontSize: 10, color: 'var(--red)', marginTop: 3, display: 'block' }}>{errors.passengerName}</span>}
              </div>
              <div>
                <label style={label}>Email Address</label>
                <input className="field" type="email" value={email} placeholder="email@example.com"
                  onChange={e => setEmail(e.target.value)} />
              </div>
              <div>
                <label style={label}>Telephone / WhatsApp</label>
                <input className="field" value={phone} placeholder="+46 …"
                  onChange={e => setPhone(e.target.value)} />
              </div>
            </div>
          </div>

          {/* ── 2. Flight & Route ── */}
          <div>
            {sectionTitle('2. Flight & Route', 'var(--cyan)')}

            {/* Row: From + To + Flight Number + PNR */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div ref={depRef} style={{ position: 'relative' }}>
                <label style={label}>From *</label>
                <input className="field" style={err('dep')} value={departureAirport} placeholder="e.g. CMB"
                  onChange={e => { setDepAirport(e.target.value.toUpperCase()); setShowDepList(true); }}
                  onFocus={() => setShowDepList(true)} />
                {depAirportLabel && <span style={{ fontSize: 9, color: 'var(--text2)', marginTop: 2, display: 'block' }}>{depAirportLabel}</span>}
                {errors.dep && <span style={{ fontSize: 10, color: 'var(--red)', display: 'block' }}>{errors.dep}</span>}
                {showDepList && (
                  <div style={dropdownStyle}>
                    {AIRPORTS.filter(a =>
                      !departureAirport || a.code.startsWith(departureAirport.toUpperCase()) ||
                      a.city.toLowerCase().includes(departureAirport.toLowerCase()) ||
                      a.country.toLowerCase().includes(departureAirport.toLowerCase())
                    ).map(a => (
                      <button key={a.code} type="button" style={airportBtn}
                        onClick={() => { setDepAirport(a.code); setShowDepList(false); }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                        <span style={{ fontWeight: 800 }}>{a.code}</span>
                        <span style={{ color: 'var(--text2)', marginLeft: 8 }}>{a.city}</span>
                        <span style={{ color: 'var(--text3)', marginLeft: 6, fontSize: 10 }}>{a.country}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div ref={arrRef} style={{ position: 'relative' }}>
                <label style={label}>To *</label>
                <input className="field" style={err('arr')} value={arrivalAirport} placeholder="e.g. ARN"
                  onChange={e => { setArrAirport(e.target.value.toUpperCase()); setShowArrList(true); }}
                  onFocus={() => setShowArrList(true)} />
                {arrAirportLabel && <span style={{ fontSize: 9, color: 'var(--text2)', marginTop: 2, display: 'block' }}>{arrAirportLabel}</span>}
                {errors.arr && <span style={{ fontSize: 10, color: 'var(--red)', display: 'block' }}>{errors.arr}</span>}
                {showArrList && (
                  <div style={dropdownStyle}>
                    {AIRPORTS.filter(a =>
                      !arrivalAirport || a.code.startsWith(arrivalAirport.toUpperCase()) ||
                      a.city.toLowerCase().includes(arrivalAirport.toLowerCase()) ||
                      a.country.toLowerCase().includes(arrivalAirport.toLowerCase())
                    ).map(a => (
                      <button key={a.code} type="button" style={airportBtn}
                        onClick={() => { setArrAirport(a.code); setShowArrList(false); }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                        <span style={{ fontWeight: 800 }}>{a.code}</span>
                        <span style={{ color: 'var(--text2)', marginLeft: 8 }}>{a.city}</span>
                        <span style={{ color: 'var(--text3)', marginLeft: 6, fontSize: 10 }}>{a.country}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label style={label}>Flight Number</label>
                <input className="field" value={flightNumber} placeholder="e.g. UL503"
                  style={{ fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase' }}
                  onChange={e => setFlightNumber(e.target.value.toUpperCase())} />
              </div>

              <div>
                <label style={label}>PNR *</label>
                <input className="field" style={{ ...err('pnr'), fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase' }}
                  value={pnr} placeholder="e.g. X7KQP2"
                  onChange={e => setPnr(e.target.value.toUpperCase())} />
                {errors.pnr && <span style={{ fontSize: 10, color: 'var(--red)', marginTop: 3, display: 'block' }}>{errors.pnr}</span>}
              </div>
            </div>

            {/* Row: CET Time (first) + Departure Date + Departure Time (local) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label style={{ ...label, color: 'var(--indigo2)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Clock3 size={10} /> CET Time * <span style={{ fontSize: 8, opacity: 0.7 }}>(auto-sync)</span>
                  </span>
                </label>
                <input className="field" style={{ ...err('cetTime'), borderColor: cetTime ? 'rgba(165,180,252,0.4)' : undefined }} type="time" value={cetTime}
                  onChange={e => handleCETChange(e.target.value)} />
                {errors.cetTime && <span style={{ fontSize: 10, color: 'var(--red)', marginTop: 3, display: 'block' }}>{errors.cetTime}</span>}
              </div>
              <div>
                <label style={label}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <CalendarDays size={10} /> Departure Date *
                  </span>
                </label>
                <input className="field" style={err('dipDate')} type="date" value={dipDate}
                  onChange={e => setDipDate(e.target.value)} />
                {errors.dipDate && <span style={{ fontSize: 10, color: 'var(--red)', marginTop: 3, display: 'block' }}>{errors.dipDate}</span>}
              </div>
              <div>
                <label style={label}>
                  Local Time *
                  {depAirportLabel && <span style={{ marginLeft: 6, fontWeight: 500, fontSize: 9, opacity: 0.7 }}>({depAirportLabel})</span>}
                </label>
                <input className="field" style={err('dipTime')} type="time" value={dipTime}
                  onChange={e => setDipTime(e.target.value)} />
                {errors.dipTime && <span style={{ fontSize: 10, color: 'var(--red)', marginTop: 3, display: 'block' }}>{errors.dipTime}</span>}
              </div>
            </div>

            {/* Time difference badges */}
            {(timeDiffDepCET || timeDiffDepArr) && (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
                {timeDiffDepCET && depAirportLabel && (
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700,
                    color: 'var(--indigo2)', background: 'rgba(165,180,252,0.08)',
                    border: '1px solid rgba(165,180,252,0.2)', borderRadius: 6, padding: '3px 9px',
                  }}>
                    {depAirportLabel} ↔ CET: {timeDiffDepCET}
                  </span>
                )}
                {timeDiffDepArr && depAirportLabel && arrAirportLabel && depAirportTz !== arrAirportTz && (
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700,
                    color: 'var(--cyan)', background: 'rgba(34,211,238,0.07)',
                    border: '1px solid rgba(34,211,238,0.2)', borderRadius: 6, padding: '3px 9px',
                  }}>
                    {depAirportLabel} ↔ {arrAirportLabel}: {timeDiffDepArr}
                  </span>
                )}
              </div>
            )}

            {/* Status + Remarks */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14 }}>
              <div>
                <label style={label}>Status</label>
                <select className="field" value={status} onChange={e => setStatus(e.target.value)}>
                  <option>No Need Further Actions</option>
                  <option>Need Further Actions</option>
                  <option>Check-In</option>
                  <option>Remind</option>
                  <option>Departed</option>
                </select>
              </div>
              <div>
                <label style={label}>Remarks</label>
                <textarea className="field" rows={2} value={remarks} placeholder="Any additional notes…"
                  onChange={e => setRemarks(e.target.value)}
                  style={{ resize: 'vertical', minHeight: 60 }} />
              </div>
            </div>
          </div>

          {/* ── 3. Options ── */}
          <div style={{ paddingTop: 14, borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 20 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 600, color: returnTicket ? 'var(--indigo2)' : 'var(--text)', cursor: 'pointer' }}>
                <input type="checkbox" checked={returnTicket} onChange={handleReturnToggle}
                  style={{ width: 14, height: 14, accentColor: 'var(--indigo)' }} />
                <Plane size={12} style={{ transform: 'scaleX(-1)' }} />
                Return Ticket
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 600, color: 'var(--text)', cursor: 'pointer' }}>
                <input type="checkbox" checked={autoTime} onChange={e => setAutoTime(e.target.checked)}
                  style={{ width: 14, height: 14, accentColor: 'var(--indigo)' }} />
                Auto Time (CET ↔ Local)
              </label>
            </div>

            {/* Return Ticket fields — shown only when checked */}
            {returnTicket && (
              <div style={{
                marginTop: 16, padding: 18,
                background: 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(34,211,238,0.04))',
                border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12,
                animation: 'fadeIn 0.2s ease-out',
              }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--indigo2)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>
                  Return Flight Details
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ ...label, color: 'var(--indigo2)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Clock3 size={10} /> Return CET *
                      </span>
                    </label>
                    <input className="field" type="time" value={returnCetTime}
                      style={{ borderColor: returnCetTime ? 'rgba(165,180,252,0.4)' : undefined }}
                      onChange={e => handleReturnCETChange(e.target.value)} />
                  </div>
                  <div>
                    <label style={label}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <CalendarDays size={10} /> Return Date *
                      </span>
                    </label>
                    <input className="field" style={err('returnDate')} type="date" value={returnDate}
                      onChange={e => setReturnDate(e.target.value)} />
                    {errors.returnDate && <span style={{ fontSize: 10, color: 'var(--red)', marginTop: 3, display: 'block' }}>{errors.returnDate}</span>}
                  </div>
                  <div>
                    <label style={label}>
                      Return Local Time *
                      {arrAirportLabel && <span style={{ marginLeft: 6, fontWeight: 500, fontSize: 9, opacity: 0.7 }}>({arrAirportLabel})</span>}
                    </label>
                    <input className="field" style={err('returnTime')} type="time" value={returnTime}
                      onChange={e => setReturnTime(e.target.value)} />
                    {errors.returnTime && <span style={{ fontSize: 10, color: 'var(--red)', marginTop: 3, display: 'block' }}>{errors.returnTime}</span>}
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Footer actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
          <button type="button" onClick={onBack} className="btn btn-ghost" style={{ gap: 6 }}>
            <ArrowLeft size={14} /> Back to List
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={clearAll}
              className="btn btn-ghost"
              style={{ color: '#f87171', borderColor: 'rgba(239,68,68,0.2)' }}>
              Clear All
            </button>
            <button type="submit" className="btn btn-primary"
              style={{ padding: '8px 28px', fontSize: 13, opacity: submitting ? 0.7 : 1 }}
              disabled={submitting}>
              {submitting ? 'Saving…' : (editingTicket ? 'Update Ticket' : 'Save Ticket')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
