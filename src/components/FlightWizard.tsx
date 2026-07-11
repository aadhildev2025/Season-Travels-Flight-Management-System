'use client';

import React, { useState, useEffect } from 'react';
import { useFlightStore, Ticket, AIRPORTS, AIRLINES, ReminderOffset, ReminderChannel } from '@/store/flightStore';
import ConfirmDialog from './ConfirmDialog';
import { localTimeToUTC, utcToLocalTime, checkIfDst, getTimezoneOffsetString, getTimezoneDiffMessage } from '@/utils/timezone';
import { 
  User, 
  Plane, 
  MapPin, 
  FileText, 
  Plus, 
  Check, 
  ArrowRight, 
  ArrowLeft,
  Calendar,
  AlertCircle,
  HelpCircle,
  Info
} from 'lucide-react';

interface FlightWizardProps {
  editingTicketId: string | null;
  setEditingTicketId: (id: string | null) => void;
  setActiveTab: (tab: string) => void;
  viewTimezone: string;
}

export default function FlightWizard({ editingTicketId, setEditingTicketId, setActiveTab, viewTimezone }: FlightWizardProps) {
  const { addTicket, updateTicket, tickets, wizardDraft, saveWizardDraft, clearWizardDraft } = useFlightStore();
  
  const [step, setStep] = useState(1);
  
  // Primary Form State
  const [passengerName, setPassengerName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [nationality, setNationality] = useState('');
  const [passportNumber, setPassportNumber] = useState('');
  
  const [airline, setAirline] = useState('');
  const [flightNumber, setFlightNumber] = useState('');
  const [pnr, setPnr] = useState('');
  const [ticketNumber, setTicketNumber] = useState('');
  
  const [departureAirport, setDepartureAirport] = useState('');
  const [arrivalAirport, setArrivalAirport] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [arrivalDate, setArrivalDate] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [originalTimezone, setOriginalTimezone] = useState('Asia/Colombo');
  
  const [returnTicket, setReturnTicket] = useState(false);
  const [transitDetails, setTransitDetails] = useState('');
  const [specialNotes, setSpecialNotes] = useState('');
  const [reminderRequired, setReminderRequired] = useState(true);
  const [reminderOffset, setReminderOffset] = useState<ReminderOffset>('24h');
  const [reminderChannels, setReminderChannels] = useState<ReminderChannel[]>(['Email']);

  // Autocomplete UI states
  const [showAirportDepList, setShowAirportDepList] = useState(false);
  const [showAirportArrList, setShowAirportArrList] = useState(false);
  const [showAirlineList, setShowAirlineList] = useState(false);

  // Confirm exit state
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Errors state
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Detect Editing or Draft Loading
  useEffect(() => {
    if (editingTicketId) {
      const ticket = tickets.find(t => t.id === editingTicketId);
      if (ticket) {
        setPassengerName(ticket.passenger_name);
        setEmail(ticket.email);
        setPhone(ticket.phone);
        setNationality(ticket.nationality);
        setPassportNumber(ticket.passport_number);
        setAirline(ticket.airline);
        setFlightNumber(ticket.flight_number);
        setPnr(ticket.pnr);
        setTicketNumber(ticket.ticket_number);
        setDepartureAirport(ticket.departure_airport);
        setArrivalAirport(ticket.arrival_airport);
        setOriginalTimezone(ticket.original_timezone);
        
        // Convert UTC back to local input values based on original timezone
        const depLocal = utcToLocalTime(ticket.departure_time_utc, ticket.original_timezone);
        setDepartureDate(depLocal.date);
        setDepartureTime(depLocal.time);
        
        const arrLocal = utcToLocalTime(ticket.arrival_time_utc, ticket.original_timezone);
        setArrivalDate(arrLocal.date);
        setArrivalTime(arrLocal.time);

        setReturnTicket(ticket.return_ticket);
        setTransitDetails(ticket.transit_details);
        setSpecialNotes(ticket.special_notes);
        setReminderRequired(ticket.reminder_required);
        setReminderOffset(ticket.reminder_offset);
        setReminderChannels(ticket.reminder_channels);
      }
    } else if (wizardDraft) {
      // Prompt is handled in render below
    }
  }, [editingTicketId, wizardDraft, tickets]);

  // Draft Save Handler
  useEffect(() => {
    if (editingTicketId) return; // Don't autosave draft if editing an existing ticket
    
    const draftPayload = {
      passenger_name: passengerName,
      email,
      phone,
      nationality,
      passport_number: passportNumber,
      airline,
      flight_number: flightNumber,
      pnr,
      ticket_number: ticketNumber,
      departure_airport: departureAirport,
      arrival_airport: arrivalAirport,
      departure_date: departureDate,
      departure_time: departureTime,
      arrival_date: arrivalDate,
      arrival_time: arrivalTime,
      original_timezone: originalTimezone,
      return_ticket: returnTicket,
      transit_details: transitDetails,
      special_notes: specialNotes,
      reminder_required: reminderRequired,
      reminder_offset: reminderOffset,
      reminder_channels: reminderChannels
    };
    
    // Save draft after a minor typing debounce
    const timeout = setTimeout(() => {
      saveWizardDraft(draftPayload as any);
    }, 1000);

    return () => clearTimeout(timeout);
  }, [
    passengerName, email, phone, nationality, passportNumber,
    airline, flightNumber, pnr, ticketNumber,
    departureAirport, arrivalAirport, departureDate, departureTime, arrivalDate, arrivalTime, originalTimezone,
    returnTicket, transitDetails, specialNotes, reminderRequired, reminderOffset, reminderChannels,
    editingTicketId, saveWizardDraft
  ]);

  const loadDraft = () => {
    if (wizardDraft) {
      setPassengerName(wizardDraft.passenger_name || '');
      setEmail(wizardDraft.email || '');
      setPhone(wizardDraft.phone || '');
      setNationality(wizardDraft.nationality || '');
      setPassportNumber(wizardDraft.passport_number || '');
      setAirline(wizardDraft.airline || '');
      setFlightNumber(wizardDraft.flight_number || '');
      setPnr(wizardDraft.pnr || '');
      setTicketNumber(wizardDraft.ticket_number || '');
      setDepartureAirport(wizardDraft.departure_airport || '');
      setArrivalAirport(wizardDraft.arrival_airport || '');
      setOriginalTimezone(wizardDraft.original_timezone || 'Asia/Colombo');
      // Draft custom fields
      const draftAny = wizardDraft as any;
      setDepartureDate(draftAny.departure_date || '');
      setDepartureTime(draftAny.departure_time || '');
      setArrivalDate(draftAny.arrival_date || '');
      setArrivalTime(draftAny.arrival_time || '');
      setReturnTicket(wizardDraft.return_ticket || false);
      setTransitDetails(wizardDraft.transit_details || '');
      setSpecialNotes(wizardDraft.special_notes || '');
      setReminderRequired(wizardDraft.reminder_required !== undefined ? wizardDraft.reminder_required : true);
      setReminderOffset(wizardDraft.reminder_offset || '24h');
      setReminderChannels(wizardDraft.reminder_channels || ['Email']);
      
      clearWizardDraft();
    }
  };

  const handleAirportSelect = (code: string, field: 'dep' | 'arr') => {
    const matched = AIRPORTS.find(ap => ap.code === code);
    if (!matched) return;

    if (field === 'dep') {
      setDepartureAirport(code);
      setShowAirportDepList(false);
      // Auto-set the original input timezone to matches the departure airport location!
      setOriginalTimezone(matched.timezone);
    } else {
      setArrivalAirport(code);
      setShowAirportArrList(false);
    }
  };

  const handleAirlineSelect = (name: string) => {
    setAirline(name);
    setShowAirlineList(false);
  };

  // Step Validations
  const validateStep = (s: number): boolean => {
    const nextErrors: Record<string, string> = {};

    if (s === 1) {
      if (!passengerName.trim()) nextErrors.passengerName = 'Passenger Name is required';
      if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) nextErrors.email = 'Valid email is required';
      if (!phone.trim()) nextErrors.phone = 'Phone number is required';
      if (!nationality.trim()) nextErrors.nationality = 'Passenger nationality is required';
      if (!passportNumber.trim()) nextErrors.passportNumber = 'Passport number is required';
    }

    if (s === 2) {
      if (!airline.trim()) nextErrors.airline = 'Airline is required';
      if (!flightNumber.trim()) nextErrors.flightNumber = 'Flight number is required';
      if (!pnr.trim() || pnr.length < 5) nextErrors.pnr = 'PNR must be at least 5 characters';
      if (!ticketNumber.trim()) nextErrors.ticketNumber = 'Ticket number is required';
    }

    if (s === 3) {
      if (!departureAirport) nextErrors.departureAirport = 'Departure Airport code is required';
      if (!arrivalAirport) nextErrors.arrivalAirport = 'Arrival Airport code is required';
      if (departureAirport === arrivalAirport) nextErrors.arrivalAirport = 'Departure and arrival cannot match';
      if (!departureDate) nextErrors.departureDate = 'Departure date is required';
      if (!departureTime) nextErrors.departureTime = 'Departure time is required';
      if (!arrivalDate) nextErrors.arrivalDate = 'Arrival date is required';
      if (!arrivalTime) nextErrors.arrivalTime = 'Arrival time is required';
    }

    if (s === 4) {
      if (reminderRequired && reminderChannels.length === 0) {
        nextErrors.reminderChannels = 'At least one notification channel must be chosen';
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleSubmit = () => {
    // Construct UTC ISO strings from input date/times based on the chosen input timezone
    const depUtc = localTimeToUTC(departureDate, departureTime, originalTimezone);
    const arrUtc = localTimeToUTC(arrivalDate, arrivalTime, originalTimezone);

    const payload = {
      passenger_name: passengerName,
      email,
      phone,
      nationality,
      passport_number: passportNumber,
      airline,
      flight_number: flightNumber,
      pnr,
      ticket_number: ticketNumber,
      departure_airport: departureAirport,
      arrival_airport: arrivalAirport,
      departure_time_utc: depUtc,
      arrival_time_utc: arrUtc,
      original_timezone: originalTimezone,
      return_ticket: returnTicket,
      transit_details: transitDetails,
      special_notes: specialNotes,
      reminder_required: reminderRequired,
      reminder_offset: reminderOffset,
      reminder_channels: reminderChannels,
      status: 'Scheduled' as const
    };

    if (editingTicketId) {
      updateTicket(editingTicketId, payload);
      alert('Ticket updated successfully!');
    } else {
      addTicket(payload);
      alert('Ticket created successfully!');
    }

    clearWizardDraft();
    setEditingTicketId(null);
    setActiveTab('dashboard');
  };

  // Time conversion variables for Step 5 Review
  const calculatedDepUtc = localTimeToUTC(departureDate, departureTime, originalTimezone);
  const calculatedColombo = utcToLocalTime(calculatedDepUtc, 'Asia/Colombo');
  const calculatedStockholm = utcToLocalTime(calculatedDepUtc, 'Europe/Stockholm');

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-5 md:gap-6 pb-24 md:pb-6 px-1 md:px-0 animate-in fade-in duration-200">
      
      {/* Wizard Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {editingTicketId ? 'Edit Ticket' : 'Flight Entry Wizard'}
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Enter flight tickets and customer details step-by-step. Timezones are managed automatically.
        </p>
      </div>



      {/* Progress Dots */}
      <div className="glass rounded-2xl p-4 flex items-center justify-between shadow-sm">
        {[1, 2, 3, 4, 5].map(i => {
          let label = 'Passenger';
          if (i === 2) label = 'Flight';
          if (i === 3) label = 'Journey';
          if (i === 4) label = 'Additional';
          if (i === 5) label = 'Review';

          return (
            <div key={i} className="flex items-center gap-2">
              <div 
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                  step === i 
                    ? 'bg-primary text-white scale-110 shadow-md shadow-primary/20' 
                    : step > i 
                    ? 'bg-success text-white' 
                    : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                }`}
              >
                {step > i ? '✓' : i}
              </div>
              <span className={`text-[10px] font-bold hidden md:inline uppercase ${step === i ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400'}`}>
                {label}
              </span>
            </div>
          );
        })}
      </div>

      {/* WIZARD CONTAINER */}
      <div className="glass rounded-3xl p-4 md:p-8 flex flex-col gap-5 md:gap-6 shadow-md border border-[var(--card-border)] min-h-[350px] md:min-h-[400px]">
        
        {/* STEP 1: PASSENGER INFORMATION */}
        {step === 1 && (
          <div className="flex flex-col gap-4 animate-in fade-in-50 duration-150">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <User className="w-5 h-5 text-primary dark:text-accent" />
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Passenger Contact Details</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Passenger Full Name</label>
                <input 
                  type="text" 
                  value={passengerName} 
                  onChange={e => setPassengerName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className={`w-full bg-slate-100/50 dark:bg-slate-900/50 border rounded-xl px-3.5 py-2.5 text-xs outline-none text-slate-800 dark:text-slate-100 focus:border-accent ${errors.passengerName ? 'border-error' : 'border-slate-200 dark:border-slate-850'}`}
                />
                {errors.passengerName && <span className="text-[10px] text-error font-medium">{errors.passengerName}</span>}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Nationality</label>
                <input 
                  type="text" 
                  value={nationality} 
                  onChange={e => setNationality(e.target.value)}
                  placeholder="e.g. Swedish / Sri Lankan"
                  className={`w-full bg-slate-100/50 dark:bg-slate-900/50 border rounded-xl px-3.5 py-2.5 text-xs outline-none text-slate-800 dark:text-slate-100 focus:border-accent ${errors.nationality ? 'border-error' : 'border-slate-200 dark:border-slate-850'}`}
                />
                {errors.nationality && <span className="text-[10px] text-error font-medium">{errors.nationality}</span>}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Email Address</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)}
                  placeholder="e.g. passenger@email.com"
                  className={`w-full bg-slate-100/50 dark:bg-slate-900/50 border rounded-xl px-3.5 py-2.5 text-xs outline-none text-slate-800 dark:text-slate-100 focus:border-accent ${errors.email ? 'border-error' : 'border-slate-200 dark:border-slate-850'}`}
                />
                {errors.email && <span className="text-[10px] text-error font-medium">{errors.email}</span>}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Phone Number</label>
                <input 
                  type="text" 
                  value={phone} 
                  onChange={e => setPhone(e.target.value)}
                  placeholder="e.g. +46 70 123 4567"
                  className={`w-full bg-slate-100/50 dark:bg-slate-900/50 border rounded-xl px-3.5 py-2.5 text-xs outline-none text-slate-800 dark:text-slate-100 focus:border-accent ${errors.phone ? 'border-error' : 'border-slate-200 dark:border-slate-850'}`}
                />
                {errors.phone && <span className="text-[10px] text-error font-medium">{errors.phone}</span>}
              </div>

              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Passport Number</label>
                <input 
                  type="text" 
                  value={passportNumber} 
                  onChange={e => setPassportNumber(e.target.value)}
                  placeholder="e.g. N1238910"
                  className={`w-full bg-slate-100/50 dark:bg-slate-900/50 border rounded-xl px-3.5 py-2.5 text-xs outline-none text-slate-800 dark:text-slate-100 focus:border-accent ${errors.passportNumber ? 'border-error' : 'border-slate-200 dark:border-slate-850'}`}
                />
                {errors.passportNumber && <span className="text-[10px] text-error font-medium">{errors.passportNumber}</span>}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: FLIGHT INFORMATION */}
        {step === 2 && (
          <div className="flex flex-col gap-4 animate-in fade-in-50 duration-150">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <Plane className="w-5 h-5 text-primary dark:text-accent" />
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Ticket & Airline Details</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* AIRLINE AUTOCOMPLETE */}
              <div className="flex flex-col gap-1.5 relative">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Airline Partner</label>
                <input 
                  type="text" 
                  value={airline} 
                  onChange={e => {
                    setAirline(e.target.value);
                    setShowAirlineList(true);
                  }}
                  onFocus={() => setShowAirlineList(true)}
                  placeholder="Type airline name..."
                  className={`w-full bg-slate-100/50 dark:bg-slate-900/50 border rounded-xl px-3.5 py-2.5 text-xs outline-none text-slate-800 dark:text-slate-100 focus:border-accent ${errors.airline ? 'border-error' : 'border-slate-200 dark:border-slate-850'}`}
                />
                {errors.airline && <span className="text-[10px] text-error font-medium">{errors.airline}</span>}

                {showAirlineList && (
                  <div className="absolute top-[68px] left-0 right-0 glass border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg p-1.5 z-40 max-h-40 overflow-y-auto">
                    {AIRLINES.filter(a => a.name.toLowerCase().includes(airline.toLowerCase())).map(a => (
                      <button
                        key={a.code}
                        type="button"
                        onClick={() => handleAirlineSelect(a.name)}
                        className="w-full text-left px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-xs"
                      >
                        {a.name} ({a.code})
                      </button>
                    ))}
                    {AIRLINES.filter(a => a.name.toLowerCase().includes(airline.toLowerCase())).length === 0 && (
                      <button
                        type="button"
                        onClick={() => setShowAirlineList(false)}
                        className="w-full text-left px-2 py-1.5 text-slate-400 rounded-lg text-xs"
                      >
                        Use entered value "{airline}"
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Flight Number</label>
                <input 
                  type="text" 
                  value={flightNumber} 
                  onChange={e => setFlightNumber(e.target.value)}
                  placeholder="e.g. UL504"
                  className={`w-full bg-slate-100/50 dark:bg-slate-900/50 border rounded-xl px-3.5 py-2.5 text-xs outline-none text-slate-800 dark:text-slate-100 focus:border-accent ${errors.flightNumber ? 'border-error' : 'border-slate-200 dark:border-slate-850'}`}
                />
                {errors.flightNumber && <span className="text-[10px] text-error font-medium">{errors.flightNumber}</span>}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">PNR Booking Code</label>
                <input 
                  type="text" 
                  value={pnr} 
                  onChange={e => setPnr(e.target.value)}
                  placeholder="e.g. PNR339"
                  className={`w-full bg-slate-100/50 dark:bg-slate-900/50 border rounded-xl px-3.5 py-2.5 text-xs outline-none text-slate-800 dark:text-slate-100 focus:border-accent ${errors.pnr ? 'border-error' : 'border-slate-200 dark:border-slate-850'}`}
                />
                {errors.pnr && <span className="text-[10px] text-error font-medium">{errors.pnr}</span>}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Ticket Number (e-Ticket)</label>
                <input 
                  type="text" 
                  value={ticketNumber} 
                  onChange={e => setTicketNumber(e.target.value)}
                  placeholder="e.g. 603-1283921822"
                  className={`w-full bg-slate-100/50 dark:bg-slate-900/50 border rounded-xl px-3.5 py-2.5 text-xs outline-none text-slate-800 dark:text-slate-100 focus:border-accent ${errors.ticketNumber ? 'border-error' : 'border-slate-200 dark:border-slate-850'}`}
                />
                {errors.ticketNumber && <span className="text-[10px] text-error font-medium">{errors.ticketNumber}</span>}
              </div>

            </div>
          </div>
        )}

        {/* STEP 3: JOURNEY INFORMATION (WITH AUTOZONE DETECTION) */}
        {step === 3 && (
          <div className="flex flex-col gap-4 animate-in fade-in-50 duration-150">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <MapPin className="w-5 h-5 text-primary dark:text-accent" />
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Journey details & Timezone Auto-Association</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* DEPARTURE AIRPORT AUTOCOMPLETE */}
              <div className="flex flex-col gap-1.5 relative">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Departure Airport (Code)</label>
                <input 
                  type="text" 
                  value={departureAirport} 
                  onChange={e => {
                    setDepartureAirport(e.target.value);
                    setShowAirportDepList(true);
                  }}
                  onFocus={() => setShowAirportDepList(true)}
                  placeholder="Search CMB, ARN, LHR..."
                  className={`w-full bg-slate-100/50 dark:bg-slate-900/50 border rounded-xl px-3.5 py-2.5 text-xs outline-none text-slate-800 dark:text-slate-100 focus:border-accent ${errors.departureAirport ? 'border-error' : 'border-slate-200 dark:border-slate-850'}`}
                />
                {errors.departureAirport && <span className="text-[10px] text-error font-medium">{errors.departureAirport}</span>}

                {showAirportDepList && (
                  <div className="absolute top-[68px] left-0 right-0 glass border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg p-1.5 z-40 max-h-40 overflow-y-auto">
                    {AIRPORTS.filter(ap => ap.code.toLowerCase().includes(departureAirport.toLowerCase()) || ap.city.toLowerCase().includes(departureAirport.toLowerCase())).map(ap => (
                      <button
                        key={ap.code}
                        type="button"
                        onClick={() => handleAirportSelect(ap.code, 'dep')}
                        className="w-full text-left px-2.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-xs flex justify-between"
                      >
                        <div>
                          <span className="font-bold">{ap.code}</span>
                          <span className="text-slate-400 ml-1.5">{ap.city}, {ap.country}</span>
                        </div>
                        <span className="text-[9px] text-accent font-bold">{ap.timezone.split('/')[1]}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* ARRIVAL AIRPORT AUTOCOMPLETE */}
              <div className="flex flex-col gap-1.5 relative">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Arrival Airport (Code)</label>
                <input 
                  type="text" 
                  value={arrivalAirport} 
                  onChange={e => {
                    setArrivalAirport(e.target.value);
                    setShowAirportArrList(true);
                  }}
                  onFocus={() => setShowAirportArrList(true)}
                  placeholder="Search CMB, ARN, LHR..."
                  className={`w-full bg-slate-100/50 dark:bg-slate-900/50 border rounded-xl px-3.5 py-2.5 text-xs outline-none text-slate-800 dark:text-slate-100 focus:border-accent ${errors.arrivalAirport ? 'border-error' : 'border-slate-200 dark:border-slate-850'}`}
                />
                {errors.arrivalAirport && <span className="text-[10px] text-error font-medium">{errors.arrivalAirport}</span>}

                {showAirportArrList && (
                  <div className="absolute top-[68px] left-0 right-0 glass border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg p-1.5 z-40 max-h-40 overflow-y-auto">
                    {AIRPORTS.filter(ap => ap.code.toLowerCase().includes(arrivalAirport.toLowerCase()) || ap.city.toLowerCase().includes(arrivalAirport.toLowerCase())).map(ap => (
                      <button
                        key={ap.code}
                        type="button"
                        onClick={() => handleAirportSelect(ap.code, 'arr')}
                        className="w-full text-left px-2.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-xs flex justify-between"
                      >
                        <div>
                          <span className="font-bold">{ap.code}</span>
                          <span className="text-slate-400 ml-1.5">{ap.city}, {ap.country}</span>
                        </div>
                        <span className="text-[9px] text-accent font-bold">{ap.timezone.split('/')[1]}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* AUTOMATIC TIMEZONE NOTIFICATION */}
              <div className="md:col-span-2 p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
                <span className="font-medium">Selected Input Timezone:</span>
                <span className="font-bold text-primary dark:text-accent flex items-center gap-1">
                  <Info className="w-3.5 h-3.5" />
                  {originalTimezone} (Auto-detected from Departure)
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 md:col-span-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Departure Date</label>
                  <input 
                    type="date" 
                    value={departureDate} 
                    onChange={e => setDepartureDate(e.target.value)}
                    className={`w-full bg-slate-100/50 dark:bg-slate-900/50 border rounded-xl px-3.5 py-2.5 text-xs outline-none text-slate-800 dark:text-slate-100 focus:border-accent ${errors.departureDate ? 'border-error' : 'border-slate-200 dark:border-slate-850'}`}
                  />
                  {errors.departureDate && <span className="text-[10px] text-error font-medium">{errors.departureDate}</span>}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Departure Time</label>
                  <input 
                    type="time" 
                    value={departureTime} 
                    onChange={e => setDepartureTime(e.target.value)}
                    className={`w-full bg-slate-100/50 dark:bg-slate-900/50 border rounded-xl px-3.5 py-2.5 text-xs outline-none text-slate-800 dark:text-slate-100 focus:border-accent ${errors.departureTime ? 'border-error' : 'border-slate-200 dark:border-slate-850'}`}
                  />
                  {errors.departureTime && <span className="text-[10px] text-error font-medium">{errors.departureTime}</span>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 md:col-span-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Arrival Date</label>
                  <input 
                    type="date" 
                    value={arrivalDate} 
                    onChange={e => setArrivalDate(e.target.value)}
                    className={`w-full bg-slate-100/50 dark:bg-slate-900/50 border rounded-xl px-3.5 py-2.5 text-xs outline-none text-slate-800 dark:text-slate-100 focus:border-accent ${errors.arrivalDate ? 'border-error' : 'border-slate-200 dark:border-slate-850'}`}
                  />
                  {errors.arrivalDate && <span className="text-[10px] text-error font-medium">{errors.arrivalDate}</span>}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Arrival Time</label>
                  <input 
                    type="time" 
                    value={arrivalTime} 
                    onChange={e => setArrivalTime(e.target.value)}
                    className={`w-full bg-slate-100/50 dark:bg-slate-900/50 border rounded-xl px-3.5 py-2.5 text-xs outline-none text-slate-800 dark:text-slate-100 focus:border-accent ${errors.arrivalTime ? 'border-error' : 'border-slate-200 dark:border-slate-850'}`}
                  />
                  {errors.arrivalTime && <span className="text-[10px] text-error font-medium">{errors.arrivalTime}</span>}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* STEP 4: ADDITIONAL INFORMATION & AUTO REMINDERS */}
        {step === 4 && (
          <div className="flex flex-col gap-4 animate-in fade-in-50 duration-150">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <FileText className="w-5 h-5 text-primary dark:text-accent" />
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Additional flight details & reminders</h3>
            </div>
            
            <div className="flex flex-col gap-4">
              
              <div className="flex items-center gap-2.5">
                <input 
                  type="checkbox" 
                  id="returnTicket"
                  checked={returnTicket} 
                  onChange={e => setReturnTicket(e.target.checked)}
                  className="w-4 h-4 text-primary dark:text-accent rounded border-slate-350"
                />
                <label htmlFor="returnTicket" className="text-xs font-bold text-slate-700 dark:text-slate-300 select-none">
                  Passenger has a return flight booking
                </label>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Transit details</label>
                <textarea 
                  value={transitDetails} 
                  onChange={e => setTransitDetails(e.target.value)}
                  placeholder="e.g. Layover in Qatar (DOH) for 2 hours..."
                  className="w-full bg-slate-100/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2 text-xs outline-none text-slate-800 dark:text-slate-100 focus:border-accent min-h-[60px]"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Special request / Notes</label>
                <textarea 
                  value={specialNotes} 
                  onChange={e => setSpecialNotes(e.target.value)}
                  placeholder="e.g. Vegetarian meal, extra legroom seat, wheelchair access..."
                  className="w-full bg-slate-100/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2 text-xs outline-none text-slate-800 dark:text-slate-100 focus:border-accent min-h-[60px]"
                />
              </div>

              {/* REMINDER SCHEDULER SYSTEM */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-3 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <input 
                      type="checkbox" 
                      id="reminderRequired"
                      checked={reminderRequired} 
                      onChange={e => setReminderRequired(e.target.checked)}
                      className="w-4 h-4 text-primary dark:text-accent rounded border-slate-350"
                    />
                    <label htmlFor="reminderRequired" className="text-xs font-bold text-slate-700 dark:text-slate-300 select-none">
                      Schedule Automatic Flight Reminders
                    </label>
                  </div>
                </div>

                {reminderRequired && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-500/5 dark:bg-slate-900/30 border border-slate-150 dark:border-slate-800 rounded-2xl p-4 animate-in slide-in-from-top-1.5 duration-100">
                    
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Alert Time Offset</label>
                      <select 
                        value={reminderOffset}
                        onChange={e => setReminderOffset(e.target.value as ReminderOffset)}
                        className="w-full bg-slate-100/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs outline-none text-slate-700 dark:text-slate-300"
                      >
                        <option value="24h">24 hours before flight</option>
                        <option value="12h">12 hours before flight</option>
                        <option value="6h">6 hours before flight</option>
                        <option value="custom">Immediate Alert (Demo mode)</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Notification Channels</label>
                      <div className="flex items-center gap-4 mt-2">
                        <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                          <input 
                            type="checkbox"
                            checked={reminderChannels.includes('Email')}
                            onChange={e => {
                              if (e.target.checked) setReminderChannels([...reminderChannels, 'Email']);
                              else setReminderChannels(reminderChannels.filter(c => c !== 'Email'));
                            }}
                          />
                          Email
                        </label>
                        <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                          <input 
                            type="checkbox"
                            checked={reminderChannels.includes('WhatsApp')}
                            onChange={e => {
                              if (e.target.checked) setReminderChannels([...reminderChannels, 'WhatsApp']);
                              else setReminderChannels(reminderChannels.filter(c => c !== 'WhatsApp'));
                            }}
                          />
                          WhatsApp
                        </label>
                      </div>
                      {errors.reminderChannels && <span className="text-[10px] text-error font-medium">{errors.reminderChannels}</span>}
                    </div>

                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* STEP 5: REVIEW & MULTI-REGION TIMEZONE PREVIEW */}
        {step === 5 && (
          <div className="flex flex-col gap-4 animate-in fade-in-50 duration-150">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <Check className="w-5 h-5 text-success animate-bounce" />
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 font-semibold">Review & Submit Flight Record</h3>
            </div>
            
            <div className="flex flex-col gap-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                Please double check all ticket details. The timezone conversions have been calculated below using standard daylight saving boundaries.
              </p>

              {/* Zoned time preview block */}
              <div className="flex flex-col gap-3 p-4 rounded-2xl bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/10">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                  <Info className="w-4 h-4 text-accent" />
                  Time Zone Conversion Verification
                </span>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  
                  {/* UTC Display */}
                  <div className="p-3 bg-white/40 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col">
                    <span className="text-[9px] text-slate-400 font-bold uppercase">Database Storage Time</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono mt-1">
                      {calculatedDepUtc ? new Date(calculatedDepUtc).toISOString().substring(11, 16) : '--:--'} UTC
                    </span>
                    <span className="text-[9px] text-slate-400 mt-0.5">Absolute UTC timestamp</span>
                  </div>

                  {/* Colombo Display */}
                  <div className="p-3 bg-white/40 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col">
                    <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold uppercase">Sri Lanka Time (CMB)</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono mt-1">
                      {calculatedColombo.formatted ? calculatedColombo.formatted.split(', ')[1] : '--:--'}
                    </span>
                    <span className="text-[9px] text-slate-400 mt-0.5">Offset: UTC+5:30</span>
                  </div>

                  {/* Stockholm Display */}
                  <div className="p-3 bg-white/40 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col">
                    <span className="text-[9px] text-blue-600 dark:text-blue-400 font-bold uppercase">Sweden Time (ARN)</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono mt-1">
                      {calculatedStockholm.formatted ? calculatedStockholm.formatted.split(', ')[1] : '--:--'}
                    </span>
                    <span className="text-[9px] text-slate-450 mt-0.5 flex justify-between font-medium">
                      <span>Offset: {calculatedStockholm.offset}</span>
                      {calculatedStockholm.isDst && <span className="text-accent text-[8px] font-bold">DST ACTIVE</span>}
                    </span>
                  </div>

                </div>

                <div className="bg-white/50 dark:bg-slate-900/50 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-[10px] font-bold text-center text-slate-500 font-mono">
                  {calculatedDepUtc ? getTimezoneDiffMessage(new Date(calculatedDepUtc), 'Europe/Stockholm', 'Asia/Colombo') : ''}
                </div>
              </div>

              {/* Informational Review Card */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-white/30 dark:bg-slate-950/30 p-4 border border-[var(--card-border)] rounded-2xl">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Passenger</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200">{passengerName}</p>
                  <p className="text-slate-450">{email} | {phone}</p>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Flight Ticket</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200">{airline} - {flightNumber}</p>
                  <p className="text-slate-450">PNR: {pnr} | Ticket: {ticketNumber}</p>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Route & Departure</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200">{departureAirport} ➔ {arrivalAirport}</p>
                  <p className="text-slate-450">{departureDate} at {departureTime} ({originalTimezone.split('/')[1]})</p>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Transit & Alerts</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200">{transitDetails ? 'Transit Layover' : 'Direct Journey'}</p>
                  <p className="text-slate-450">Reminders: {reminderRequired ? `${reminderOffset} via ${reminderChannels.join(', ')}` : 'None'}</p>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>

      {/* FOOTER ACTIONS */}
      <div className="flex flex-col-reverse md:flex-row items-stretch md:items-center justify-between gap-3">
        {step > 1 ? (
          <button 
            onClick={handleBack}
            className="flex items-center justify-center gap-2 bg-slate-150 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-350 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        ) : (
          <div className="hidden md:block w-10"></div>
        )}

        <div className="flex items-center justify-between md:justify-end gap-2">
          <button 
            onClick={() => setShowExitConfirm(true)}
            className="px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            Cancel
          </button>
          
          {step < 5 ? (
            <button 
              onClick={handleNext}
              className="flex items-center justify-center gap-2 bg-gradient-premium hover:opacity-95 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-primary/10 transition-all flex-1 md:flex-none"
            >
              Next Step
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button 
              onClick={handleSubmit}
              className="flex items-center justify-center gap-2 bg-success hover:opacity-95 text-white px-5 md:px-6 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-success/15 transition-all flex-1 md:flex-none"
            >
              <Check className="w-4 h-4" />
              {editingTicketId ? 'Update Record' : 'Confirm & Save'}
            </button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={showExitConfirm}
        title="Exit Flight Wizard"
        message="Are you sure you want to exit? Your progress is saved as a draft."
        confirmLabel="Exit"
        variant="warning"
        onConfirm={() => {
          setShowExitConfirm(false);
          setEditingTicketId(null);
          setActiveTab('dashboard');
        }}
        onCancel={() => setShowExitConfirm(false)}
      />

    </div>
  );
}
