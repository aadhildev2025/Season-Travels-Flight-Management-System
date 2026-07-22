import { useState, useEffect, useRef } from 'react';
import { useFlightStore } from '../store/flightStore';
import { localTimeToUTC, utcToLocalTime, getTimezoneDiff } from '../utils/timezone';
import { AIRPORTS } from '../types';
import type { Ticket } from '../types';
import { ArrowLeft, CalendarDays, Clock3, RotateCcw } from 'lucide-react';

interface TicketFormProps {
  editingTicket: Ticket | null;
  onBack: () => void;
  onSuccess?: (msg: string, keepFormOpen?: boolean) => void;
  focusRemarks?: boolean;
}

export default function TicketForm({ editingTicket, onBack, onSuccess, focusRemarks }: TicketFormProps) {
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
  const [status, setStatus]               = useState('None');
  const [remarks, setRemarks]             = useState('');
  const [autoTime, setAutoTime]           = useState(true);
  const [submitting, setSubmitting]       = useState(false);
  // Which field was last edited manually: 'cet' | 'local' | null
  const lastEditedField = useRef<'cet' | 'local' | null>(null);
  const [returnTicket, setReturnTicket]           = useState(false);
  // Used only when editing existing tickets with return leg data:
  const [returnDepAirport, setReturnDepAirport]   = useState('');
  const [returnArrAirport, setReturnArrAirport]   = useState('');
  const [returnFlightNumber, setReturnFlightNumber] = useState('');
  const [returnPnr, setReturnPnr]                 = useState('');
  const [returnDipDate, setReturnDipDate]         = useState('');
  const [returnDipTime, setReturnDipTime]         = useState('');
  const [returnCetTime, setReturnCetTime]         = useState('');
  const [returnAutoTime, setReturnAutoTime]       = useState(true);

  // Tracks whether the form is in "return leg entry" mode after outbound was saved
  const [isReturnLegMode, setIsReturnLegMode]     = useState(false);

  const [showDepList, setShowDepList]     = useState(false);
  const [showArrList, setShowArrList]     = useState(false);
  const [showReturnDepList, setShowReturnDepList] = useState(false);
  const [showReturnArrList, setShowReturnArrList] = useState(false);
  const [errors, setErrors]               = useState<Record<string, string>>({});
  const depRef = useRef<HTMLDivElement>(null);
  const arrRef = useRef<HTMLDivElement>(null);
  const returnDepRef = useRef<HTMLDivElement>(null);
  const returnArrRef = useRef<HTMLDivElement>(null);
  const remarksRef = useRef<HTMLTextAreaElement>(null);
  const prevReturnTicket = useRef(false);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (depRef.current && !depRef.current.contains(e.target as Node)) setShowDepList(false);
      if (arrRef.current && !arrRef.current.contains(e.target as Node)) setShowArrList(false);
      if (returnDepRef.current && !returnDepRef.current.contains(e.target as Node)) setShowReturnDepList(false);
      if (returnArrRef.current && !returnArrRef.current.contains(e.target as Node)) setShowReturnArrList(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Backspace shortcut to go back
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Backspace' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        onBack();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onBack]);

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
    setRemarks(editingTicket.remarks);
    setStatus(editingTicket.status);

    const local = utcToLocalTime(editingTicket.departureTimeUTC, editingTicket.originalTimezone);
    setDipDate(local.date);
    setDipTime(local.time);
    const cet = utcToLocalTime(editingTicket.departureTimeUTC, 'Europe/Stockholm');
    setCetTime(cet.time);

    if (editingTicket.returnTicket) {
      setReturnTicket(true);
      setReturnDepAirport(editingTicket.returnDepartureAirport || '');
      setReturnArrAirport(editingTicket.returnArrivalAirport || '');
      setReturnFlightNumber(editingTicket.returnFlightNumber || '');
      setReturnPnr(editingTicket.returnPnr || '');
      if (editingTicket.returnDepartureTimeUTC) {
        const retLocal = utcToLocalTime(editingTicket.returnDepartureTimeUTC, editingTicket.returnOriginalTimezone || 'Asia/Colombo');
        setReturnDipDate(retLocal.date);
        setReturnDipTime(retLocal.time);
        const retCet = utcToLocalTime(editingTicket.returnDepartureTimeUTC, 'Europe/Stockholm');
        setReturnCetTime(retCet.time);
      }
    }
  }, [editingTicket]);

  // Auto-focus remarks when opened from remark badge click
  useEffect(() => {
    if (focusRemarks && remarksRef.current) {
      setTimeout(() => {
        remarksRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        remarksRef.current?.focus();
      }, 300);
    }
  }, [focusRemarks, editingTicket]);

  // CET Time → mark last edited as 'cet' and update state
  const handleCETChange = (val: string) => {
    lastEditedField.current = 'cet';
    setCetTime(val);
  };

  // Local Time → mark last edited as 'local' and update state
  const handleLocalTimeChange = (val: string) => {
    lastEditedField.current = 'local';
    setDipTime(val);
  };

  // Reactive two-way sync: whichever field was last edited drives the other
  useEffect(() => {
    if (!autoTime || !dipDate || !departureAirport) return;
    const tz = 'Asia/Colombo';

    if (lastEditedField.current === 'cet' && cetTime) {
      const utc = localTimeToUTC(dipDate, cetTime, 'Europe/Stockholm');
      if (utc) setDipTime(utcToLocalTime(utc, tz).time);
    } else if (lastEditedField.current === 'local' && dipTime) {
      const utc = localTimeToUTC(dipDate, dipTime, tz);
      if (utc) setCetTime(utcToLocalTime(utc, 'Europe/Stockholm').time);
    } else if (!lastEditedField.current && cetTime) {
      const utc = localTimeToUTC(dipDate, cetTime, 'Europe/Stockholm');
      if (utc) setDipTime(utcToLocalTime(utc, tz).time);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dipDate, dipTime, cetTime, departureAirport, autoTime]);

  // Return ticket: CET Time → auto compute SLT departure time
  const handleReturnCETChange = (val: string) => {
    setReturnCetTime(val);
    if (returnAutoTime && returnDipDate && val) {
      const utc = localTimeToUTC(returnDipDate, val, 'Europe/Stockholm');
      if (utc) {
        setReturnDipTime(utcToLocalTime(utc, 'Asia/Colombo').time);
      }
    }
  };

  // Return ticket: SLT departure time → auto compute CET
  useEffect(() => {
    if (!returnAutoTime || !returnDipDate || !returnDipTime) return;
    const utc = localTimeToUTC(returnDipDate, returnDipTime, 'Asia/Colombo');
    if (utc) setReturnCetTime(utcToLocalTime(utc, 'Europe/Stockholm').time);
  }, [returnDipDate, returnDipTime, returnAutoTime]);

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

  // SLT (Sri Lanka Time) equivalent of the CET departure time
  const sltTime = (() => {
    if (!dipDate || !cetTime) return '';
    const utc = localTimeToUTC(dipDate, cetTime, 'Europe/Stockholm');
    if (!utc) return '';
    return utcToLocalTime(utc, 'Asia/Colombo').time;
  })();

  // Return ticket time diffs
  const returnDepAirportTz = AIRPORTS.find(a => a.code === returnDepAirport)?.timezone || '';
  const returnArrAirportTz = AIRPORTS.find(a => a.code === returnArrAirport)?.timezone || '';
  const returnDepAirportLabel = AIRPORTS.find(a => a.code === returnDepAirport)?.city || '';
  const returnArrAirportLabel = AIRPORTS.find(a => a.code === returnArrAirport)?.city || '';

  const returnTimeDiffDepCET = (() => {
    if (!returnDipDate || !returnDipTime || !returnDepAirportTz) return '';
    const utc = localTimeToUTC(returnDipDate, returnDipTime, returnDepAirportTz);
    if (!utc) return '';
    return getTimezoneDiff(new Date(utc), returnDepAirportTz, 'Europe/Stockholm');
  })();

  // Sync prevReturnTicket ref
  useEffect(() => {
    prevReturnTicket.current = returnTicket;
  }, [returnTicket]);

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
    setSubmitting(true);

    // Base passenger info shared by both legs
    const base = { passengerName, email, phone, airline: '', remarks, status };

    const emptyReturnFields = {
      returnDepartureAirport: '', returnArrivalAirport: '',
      returnFlightNumber: '', returnPnr: '',
      returnDepartureTimeUTC: '', returnOriginalTimezone: '',
    };

    // The top fields always represent the CURRENT leg being entered.
    const saveTz = autoTime ? 'Asia/Colombo' : (AIRPORTS.find(a => a.code === departureAirport)?.timezone || 'Asia/Colombo');
    const topDtu = localTimeToUTC(dipDate, dipTime, saveTz);

    try {
      if (editingTicket) {
        const updateData: any = {
          ...base,
          flightNumber, pnr, departureAirport, arrivalAirport,
          departureTimeUTC: topDtu, originalTimezone: saveTz,
          returnLeg: editingTicket.returnLeg,
          returnTicket: returnTicket || !!editingTicket.returnTicket,
        };
        if (!editingTicket.returnLeg) {
          Object.assign(updateData, emptyReturnFields);
        }
        await updateTicket(editingTicket._id, updateData);
        onSuccess?.('Ticket Updated Successfully!');
        return;
      }

      if (returnTicket) {
        // Step 1: Save the outbound ticket first
        await addTicket({
          ...base,
          flightNumber, pnr,
          departureAirport, arrivalAirport,
          departureTimeUTC: topDtu,
          originalTimezone: saveTz,
          returnTicket: true,
          returnLeg: false,
          ...emptyReturnFields,
        });

        // Step 2: Pre-fill form for the return leg (swapped airports, same passenger info & PNR)
        const savedName   = passengerName;
        const savedEmail  = email;
        const savedPhone  = phone;
        const savedPnr    = pnr;
        const savedRemarks = remarks;
        const savedStatus  = status;
        const swappedDep  = arrivalAirport;   // ARN → becomes new From
        const swappedArr  = departureAirport; // CMB → becomes new To

        // Reset everything
        setPassengerName(savedName);
        setEmail(savedEmail);
        setPhone(savedPhone);
        setPnr(savedPnr);
        setRemarks(savedRemarks);
        setStatus(savedStatus);
        setDepAirport(swappedDep);
        setArrAirport(swappedArr);
        setFlightNumber('');
        setDipDate('');
        setDipTime('');
        setCetTime('');
        setReturnTicket(false);
        setIsReturnLegMode(true);
        setErrors({});

        onSuccess?.('Outbound ticket saved! Now fill in the return leg details.', true);
        return;
      }

      // One-way ticket (or return leg being saved after outbound)
      await addTicket({
        ...base,
        flightNumber, pnr, departureAirport, arrivalAirport,
        departureTimeUTC: topDtu, originalTimezone: saveTz,
        returnTicket: isReturnLegMode,
        returnLeg: isReturnLegMode,
        ...emptyReturnFields,
      });
      onSuccess?.(isReturnLegMode ? 'Return ticket saved successfully!' : 'Ticket Saved Successfully!');
      setIsReturnLegMode(false);
    } catch {
      onBack();
    } finally {
      setSubmitting(false);
    }
  };

  const clearAll = () => {
    setPassengerName(''); setEmail(''); setPhone(''); setPnr(''); setFlightNumber('');
    setDepAirport(''); setArrAirport(''); setDipDate(''); setDipTime('');
    setCetTime(''); setRemarks(''); setStatus('None'); setErrors({});
    setReturnTicket(false); setIsReturnLegMode(false);
    setReturnDepAirport(''); setReturnArrAirport('');
    setReturnFlightNumber(''); setReturnPnr('');
    setReturnDipDate(''); setReturnDipTime(''); setReturnCetTime('');
  };

  // Styles
  const label: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3, display: 'block' };
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
    <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 6, marginBottom: 10 }}>
      <h3 style={{ fontSize: 10, fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{n}</h3>
    </div>
  );

  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
      const form = formRef.current;
      if (!form) return;
      const target = e.target as HTMLElement;
      if (!form.contains(target)) return;
      if (target.tagName === 'TEXTAREA') return;
      if (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'checkbox') return;

      const focusable = Array.from(form.querySelectorAll('input:not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"]), select'));
      const currentIndex = focusable.indexOf(target as HTMLElement);
      if (currentIndex === -1) return;

      e.preventDefault();
      let nextIndex = currentIndex;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        nextIndex = (currentIndex + 1) % focusable.length;
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        nextIndex = (currentIndex - 1 + focusable.length) % focusable.length;
      }
      (focusable[nextIndex] as HTMLElement & { focus: () => void })?.focus();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const depAirportLabel = AIRPORTS.find(a => a.code === departureAirport)?.city || '';
  const arrAirportLabel = AIRPORTS.find(a => a.code === arrivalAirport)?.city || '';

  return (
    <div className="fade-up" style={{ maxWidth: 860, margin: '0 auto' }}>

      <form ref={formRef} onSubmit={handleSubmit}>
        <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* ── 1. Customer Information ── */}
          <div>
            {sectionTitle('1. Customer Information', 'var(--indigo2)')}
             <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.5fr', gap: 10 }}>
              <div>
                <label style={label}>Customer Name *</label>
                <input className="field" style={err('passengerName')} value={passengerName} placeholder="Surname/FirstName"
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
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
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
                   style={{ fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', color: '#fff' }}
                   onChange={e => setFlightNumber(e.target.value.toUpperCase())} />
               </div>

               <div>
                 <label style={label}>PNR *</label>
                 <input className="field" style={{ ...err('pnr'), fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', color: 'var(--cyan)' }}
                   value={pnr} placeholder="e.g. X7KQP2"
                   onChange={e => setPnr(e.target.value.toUpperCase())} />
                 {errors.pnr && <span style={{ fontSize: 10, color: 'var(--red)', marginTop: 3, display: 'block' }}>{errors.pnr}</span>}
               </div>
            </div>

             {/* Row: Departure Date + CET Time + Local Time */}
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
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
                  Local Time *
                  {autoTime 
                    ? <span style={{ marginLeft: 6, fontWeight: 500, fontSize: 9, opacity: 0.7 }}>(SLT)</span>
                    : depAirportLabel && <span style={{ marginLeft: 6, fontWeight: 500, fontSize: 9, opacity: 0.7 }}>({depAirportLabel})</span>
                  }
                </label>
                <input className="field" style={err('dipTime')} type="time" value={dipTime}
                  onChange={e => handleLocalTimeChange(e.target.value)} />
                {errors.dipTime && <span style={{ fontSize: 10, color: 'var(--red)', marginTop: 3, display: 'block' }}>{errors.dipTime}</span>}
              </div>
            </div>

            {/* Time difference badges */}
            {(timeDiffDepCET || timeDiffDepArr) && (
               <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
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
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
              <div>
                <label style={label}>Status</label>
                <select className="field" value={status} onChange={e => {
                  const val = e.target.value;
                  setStatus(val);
                  if (val === 'None') setRemarks('');
                }}>
                  <option>None</option>
                  <option>No Need Further Actions</option>
                  <option>Need Further Actions</option>
                </select>
              </div>
              <div>
                <label style={label}>Remarks</label>
                 <textarea ref={remarksRef} className="field" rows={2} value={remarks} placeholder="Any additional notes…"
                   onChange={e => setRemarks(e.target.value)}
                   style={{ resize: 'vertical', minHeight: 44, ...(focusRemarks ? { borderColor: '#eab308', boxShadow: '0 0 0 3px rgba(234,179,8,0.15)' } : {}) }} />
              </div>
            </div>
          </div>

           {/* ── 3. Options ── */}
           <div style={{ paddingTop: 10, borderTop: '1px solid var(--border)' }}>
             <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 600, color: 'var(--text)', cursor: 'pointer' }}>
                <input type="checkbox" checked={autoTime} onChange={e => setAutoTime(e.target.checked)}
                  style={{ width: 14, height: 14, accentColor: 'var(--indigo)' }} />
                Auto Time (CET ↔ Local)
              </label>

              {/* Return Ticket checkbox — hidden when editing a return leg or currently in return-leg entry mode */}
              {!editingTicket?.returnLeg && !isReturnLegMode && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 600, color: 'var(--text)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={returnTicket} onChange={e => setReturnTicket(e.target.checked)}
                    style={{ width: 14, height: 14, accentColor: 'var(--indigo)' }} />
                  <RotateCcw size={12} style={{ color: 'var(--indigo2)' }} />
                  Return Ticket
                </label>
              )}
            </div>

             {/* Banner shown while user is filling in the return leg after outbound was saved */}
             {isReturnLegMode && (
               <div style={{
                 marginTop: 8, display: 'flex', alignItems: 'center', gap: 8,
                 fontSize: 10, color: 'var(--indigo2)', fontWeight: 600,
                 background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)',
                 borderRadius: 8, padding: '6px 10px',
               }}>
                <RotateCcw size={13} />
                Outbound saved ✓ — Now fill in the <b style={{ fontWeight: 800 }}>Return leg</b> details ({departureAirport || '—'} → {arrivalAirport || '—'}). Enter the date, CET time &amp; flight number manually.
              </div>
            )}

            {/* When editing a return ticket, just show a static mark */}
            {editingTicket?.returnLeg && (
              <div style={{
                marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6,
                fontSize: 10, color: 'var(--indigo2)', fontWeight: 700,
                background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
                borderRadius: 8, padding: '5px 10px',
              }}>
                <RotateCcw size={13} /> This is a Return Ticket
              </div>
            )}
          </div>

        </div>

        {/* Footer actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
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
              {submitting ? 'Saving…' : editingTicket ? 'Update Ticket' : isReturnLegMode ? 'Save Return Ticket' : returnTicket ? 'Save Outbound & Continue' : 'Save Ticket'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
