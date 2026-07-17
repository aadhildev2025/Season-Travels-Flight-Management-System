import { useState, useEffect, useRef } from 'react';
import { useFlightStore } from '../store/flightStore';
import { localTimeToUTC, utcToLocalTime, getTimezoneDiff } from '../utils/timezone';
import { AIRPORTS } from '../types';
import type { Ticket } from '../types';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import ClockSection from './ClockSection';

interface TicketFormProps {
  editingTicket: Ticket | null;
  onBack: () => void;
  clockTime: string;
  clockDate: string;
  slClockTime?: string;
  slClockDate?: string;
}

export default function TicketForm({ editingTicket, onBack, clockTime, clockDate, slClockTime, slClockDate }: TicketFormProps) {
  const { addTicket, updateTicket } = useFlightStore();

  const [passengerName, setPassengerName] = useState('');
  const [email, setEmail]                 = useState('');
  const [phone, setPhone]                 = useState('');
  const [pnr, setPnr]                     = useState('');
  const [departureAirport, setDepAirport] = useState('');
  const [arrivalAirport, setArrAirport]   = useState('');
  const [dipDate, setDipDate]             = useState('');
  const [dipTime, setDipTime]             = useState('');
  const [cetTime, setCetTime]             = useState('');
  const [status, setStatus]               = useState('No Need Further Actions');
  const [remarks, setRemarks]             = useState('');
  const [returnTicket, setReturnTicket]   = useState(false);
  const [autoTime, setAutoTime]           = useState(true);
  const [successMsg, setSuccessMsg]       = useState(false);
  const [successType, setSuccessType]     = useState<'add' | 'update'>('add');

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
  }, [editingTicket]);

  // Auto CET from Dip
  useEffect(() => {
    if (!autoTime || !dipDate || !dipTime) return;
    const tz  = AIRPORTS.find(a => a.code === departureAirport)?.timezone || 'Asia/Colombo';
    const utc = localTimeToUTC(dipDate, dipTime, tz);
    if (utc) setCetTime(utcToLocalTime(utc, 'Europe/Stockholm').time);
  }, [dipDate, dipTime, departureAirport, autoTime]);

  // CET → Dip
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

  const handleReturnToggle = () => {
    if (!returnTicket) {
      const tmp = departureAirport;
      setDepAirport(arrivalAirport);
      setArrAirport(tmp);
    }
    setReturnTicket(!returnTicket);
  };

  const timeDiff = (() => {
    if (!dipDate || !dipTime) return '';
    const tz  = AIRPORTS.find(a => a.code === departureAirport)?.timezone || 'Asia/Colombo';
    const utc = localTimeToUTC(dipDate, dipTime, tz);
    if (!utc) return '';
    return getTimezoneDiff(new Date(utc), tz, 'Europe/Stockholm');
  })();

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!passengerName.trim()) e.passengerName = 'Required';
    if (!dipDate)              e.dipDate        = 'Required';
    if (!dipTime)              e.dipTime        = 'Required';
    if (!cetTime)              e.cetTime        = 'Required';
    if (!departureAirport)    e.dep             = 'Required';
    if (!arrivalAirport)      e.arr             = 'Required';
    if (!pnr.trim())          e.pnr             = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const tz   = AIRPORTS.find(a => a.code === departureAirport)?.timezone || 'Asia/Colombo';
    const dtu  = localTimeToUTC(dipDate, dipTime, tz);
    const payload = { passengerName, email, phone, airline: '', flightNumber: '', pnr, departureAirport, arrivalAirport, departureTimeUTC: dtu, originalTimezone: tz, returnTicket, remarks, status };
    if (editingTicket) {
      await updateTicket(editingTicket._id, payload);
      setSuccessType('update');
      setSuccessMsg(true);
      setTimeout(() => {
        setSuccessMsg(false);
        onBack();
      }, 1500);
      return;
    } else {
      await addTicket(payload);
      setSuccessType('add');
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 2000);
      // Clear form after add
      clearAll();
      return;
    }
  };

  const clearAll = () => {
    setPassengerName(''); setEmail(''); setPhone(''); setPnr('');
    setDepAirport(''); setArrAirport(''); setDipDate(''); setDipTime('');
    setCetTime(''); setRemarks(''); setReturnTicket(false);
    setStatus('No Need Further Actions'); setErrors({});
  };

  // Styles
  const label = { fontSize: 10, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 5, display: 'block' };
  const row   = (cols = 2) => ({ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 14 } as React.CSSProperties);
  const col   = (span = 1) => ({ gridColumn: `span ${span}` } as React.CSSProperties);
  const err   = (key: string) => errors[key] ? { borderColor: 'var(--red)' } as React.CSSProperties : {};

  const dropdownStyle: React.CSSProperties = {
    position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50,
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 10, padding: 4, maxHeight: 160, overflowY: 'auto',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
  };

  const airportBtn: React.CSSProperties = {
    width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 7,
    background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text)',
    transition: 'background 0.1s',
  };

  return (
    <div className="fade-up" style={{ maxWidth: 700, margin: '0 auto' }}>

      {/* Success Toast */}
      {successMsg && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
          animation: 'fadeIn 0.2s ease-out',
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #059669, #10b981)',
            color: '#fff', borderRadius: 16, padding: '20px 32px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
            boxShadow: '0 20px 50px rgba(16,185,129,0.3)',
            animation: 'scaleIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
            fontSize: 15, fontWeight: 700,
            textAlign: 'center',
            maxWidth: 320,
          }}>
            <div style={{
              width: 50, height: 50, borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 4,
            }}>
              <CheckCircle size={30} />
            </div>
            {successType === 'add' ? 'Ticket Entered Successfully!' : 'Ticket Updated Successfully!'}
          </div>
        </div>
      )}

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
        <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Section: Customer Information */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
              <h3 style={{ fontSize: 11, fontWeight: 800, color: 'var(--indigo2)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                1. Customer Information
              </h3>
            </div>
            <div className="form-grid-3">
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

          {/* Section: Flight & Departure Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
              <h3 style={{ fontSize: 11, fontWeight: 800, color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                2. Flight & Departure Details
              </h3>
            </div>

            {/* Row 1: From + To + PNR */}
            <div className="form-grid-equal-3">
              <div ref={depRef} style={{ position: 'relative' }}>
                <label style={label}>From *</label>
                <input className="field" style={err('dep')} value={departureAirport} placeholder="e.g. CMB"
                  onChange={e => { setDepAirport(e.target.value.toUpperCase()); setShowDepList(true); }}
                  onFocus={() => setShowDepList(true)} />
                {errors.dep && <span style={{ fontSize: 10, color: 'var(--red)', marginTop: 3, display: 'block' }}>{errors.dep}</span>}
                {showDepList && (
                  <div style={dropdownStyle}>
                    {AIRPORTS.filter(a =>
                      a.code.includes(departureAirport.toUpperCase()) || a.city.toLowerCase().includes(departureAirport.toLowerCase())
                    ).map(a => (
                      <button key={a.code} type="button" style={airportBtn}
                        onClick={() => { setDepAirport(a.code); setShowDepList(false); }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                        <span style={{ fontWeight: 800 }}>{a.code}</span>
                        <span style={{ color: 'var(--text2)', marginLeft: 8 }}>{a.city}</span>
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
                {errors.arr && <span style={{ fontSize: 10, color: 'var(--red)', marginTop: 3, display: 'block' }}>{errors.arr}</span>}
                {showArrList && (
                  <div style={dropdownStyle}>
                    {AIRPORTS.filter(a =>
                      a.code.includes(arrivalAirport.toUpperCase()) || a.city.toLowerCase().includes(arrivalAirport.toLowerCase())
                    ).map(a => (
                      <button key={a.code} type="button" style={airportBtn}
                        onClick={() => { setArrAirport(a.code); setShowArrList(false); }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                        <span style={{ fontWeight: 800 }}>{a.code}</span>
                        <span style={{ color: 'var(--text2)', marginLeft: 8 }}>{a.city}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label style={label}>PNR *</label>
                <input className="field" style={{ ...err('pnr'), fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase' }}
                  value={pnr} placeholder="e.g. X7KQP2"
                  onChange={e => setPnr(e.target.value.toUpperCase())} />
                {errors.pnr && <span style={{ fontSize: 10, color: 'var(--red)', marginTop: 3, display: 'block' }}>{errors.pnr}</span>}
              </div>
            </div>

            {/* Row 2: Departure Date + Departure Time + CET Time */}
            <div className="form-grid-date-time">
              <div>
                <label style={label}>Departure Date *</label>
                <input className="field" style={err('dipDate')} type="date" value={dipDate}
                  onChange={e => setDipDate(e.target.value)} />
                {errors.dipDate && <span style={{ fontSize: 10, color: 'var(--red)', marginTop: 3, display: 'block' }}>{errors.dipDate}</span>}
              </div>
              <div>
                <label style={label}>Departure Time *</label>
                <input className="field" style={err('dipTime')} type="time" value={dipTime}
                  onChange={e => setDipTime(e.target.value)} />
                {errors.dipTime && <span style={{ fontSize: 10, color: 'var(--red)', marginTop: 3, display: 'block' }}>{errors.dipTime}</span>}
              </div>
              <div>
                <label style={label}>CET Time *</label>
                <input className="field" style={err('cetTime')} type="time" value={cetTime}
                  onChange={e => handleCETChange(e.target.value)} />
                {errors.cetTime && <span style={{ fontSize: 10, color: 'var(--red)', marginTop: 3, display: 'block' }}>{errors.cetTime}</span>}
              </div>
            </div>

            {/* Row 3: Status + Remarks */}
            <div className="form-grid-status-remarks">
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
                <textarea className="field" rows={3} value={remarks} placeholder="Any additional notes…"
                  onChange={e => setRemarks(e.target.value)}
                  style={{ resize: 'vertical', minHeight: 72 }} />
              </div>
            </div>
          </div>

          {/* Row 6: Checkboxes + time diff */}
          <div style={{
            display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 20,
            paddingTop: 14, borderTop: '1px solid var(--border)',
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 600, color: 'var(--text)', cursor: 'pointer' }}>
              <input type="checkbox" checked={returnTicket} onChange={handleReturnToggle}
                style={{ width: 14, height: 14, accentColor: 'var(--indigo)' }} />
              Return Ticket
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 600, color: 'var(--text)', cursor: 'pointer' }}>
              <input type="checkbox" checked={autoTime} onChange={e => setAutoTime(e.target.checked)}
                style={{ width: 14, height: 14, accentColor: 'var(--indigo)' }} />
              Auto Time (CET ↔ Local)
            </label>
            {timeDiff && (
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--cyan)', fontWeight: 700 }}>
                Colombo ↔ Europe: {timeDiff}
              </span>
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
            <button type="submit" className="btn btn-primary" style={{ padding: '8px 24px', fontSize: 13 }}>
              {editingTicket ? 'Update Ticket' : 'Save Ticket'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
