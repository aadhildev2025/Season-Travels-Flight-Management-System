'use client';

import React, { useState, useEffect } from 'react';
import { useFlightStore, Ticket, FlightStatus, AIRPORTS, AIRLINES } from '@/store/flightStore';
import { utcToLocalTime, checkIfDst, getTimezoneOffsetString, getTimezoneDiffMessage } from '@/utils/timezone';
import ConfirmDialog from './ConfirmDialog';
import { 
  Search, 
  Filter, 
  Plane, 
  Calendar, 
  User, 
  Tag, 
  MoreVertical, 
  Eye, 
  Edit2, 
  Copy, 
  Trash2, 
  Archive, 
  Send, 
  Clock, 
  MapPin, 
  Check, 
  Plus,
  RefreshCw,
  Info
} from 'lucide-react';

interface DashboardProps {
  viewTimezone: string;
  setActiveTab: (tab: string) => void;
  setEditingTicketId: (id: string | null) => void;
}

export default function Dashboard({ viewTimezone, setActiveTab, setEditingTicketId }: DashboardProps) {
  const { tickets, currentUser, deleteTicket, archiveTicket, duplicateTicket, triggerReminder, reminders, updateTicket } = useFlightStore();
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterAirline, setFilterAirline] = useState('');
  const [filterStaff, setFilterStaff] = useState('');
  const [filterAirport, setFilterAirport] = useState('');
  const [departuresTab, setDeparturesTab] = useState<'all' | 'today' | 'tomorrow' | 'upcoming' | 'missed'>('all');
  
  // Modal states
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [showReminderModal, setShowReminderModal] = useState<Ticket | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deniedMessage, setDeniedMessage] = useState<string | null>(null);

  // Dynamic live system time matching viewTimezone
  const [mounted, setMounted] = useState(false);
  const [sysTimeState, setSysTimeState] = useState({ dateStr: '2026-06-28', timeStr: '18:55:28' });

  useEffect(() => {
    setMounted(true);
    const updateTime = () => {
      const now = new Date();
      try {
        const dFormatter = new Intl.DateTimeFormat('en-US', {
          timeZone: viewTimezone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
        const tFormatter = new Intl.DateTimeFormat('en-US', {
          timeZone: viewTimezone,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        });
        
        const dParts = dFormatter.formatToParts(now);
        const month = dParts.find(p => p.type === 'month')?.value || '01';
        const day = dParts.find(p => p.type === 'day')?.value || '01';
        const year = dParts.find(p => p.type === 'year')?.value || '2026';
        
        setSysTimeState({
          dateStr: `${year}-${month}-${day}`,
          timeStr: tFormatter.format(now)
        });
      } catch (err) {
        console.error(err);
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [viewTimezone]);

  const sysDateStr = sysTimeState.dateStr;
  const sysTimeStr = sysTimeState.timeStr;
  const systemCurrentTime = new Date(`${sysDateStr}T${sysTimeStr}`);

  // Helpers to check date categories
  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getUTCFullYear() === d2.getUTCFullYear() &&
           d1.getUTCMonth() === d2.getUTCMonth() &&
           d1.getUTCDate() === d2.getUTCDate();
  };

  // Categorize & Filter Tickets
  const processedTickets = tickets.filter(ticket => {
    // 1. Search Query (Name, PNR, Flight Number)
    const matchesSearch = 
      ticket.passenger_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.pnr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.flight_number.toLowerCase().includes(searchQuery.toLowerCase());
      
    // 2. Sidebar Dropdowns
    const matchesDate = filterDate ? ticket.departure_time_utc.startsWith(filterDate) : true;
    const matchesAirline = filterAirline ? ticket.airline === filterAirline : true;
    const matchesAirport = filterAirport ? (ticket.departure_airport === filterAirport || ticket.arrival_airport === filterAirport) : true;
    const matchesStaff = filterStaff ? ticket.created_by === filterStaff : true;
    
    // Ignore Archived tickets unless specifically viewing all or missed
    const isArchived = ticket.status === 'Archived';
    
    return matchesSearch && matchesDate && matchesAirline && matchesAirport && matchesStaff && !isArchived;
  });

  // Category Tab filtering
  const filteredTickets = processedTickets.filter(ticket => {
    const depDate = new Date(ticket.departure_time_utc);
    const today = new Date(sysDateStr);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (departuresTab === 'today') {
      return isSameDay(depDate, today);
    }
    if (departuresTab === 'tomorrow') {
      return isSameDay(depDate, tomorrow);
    }
    if (departuresTab === 'upcoming') {
      return depDate > tomorrow && ticket.status !== 'Missed';
    }
    if (departuresTab === 'missed') {
      return ticket.status === 'Missed' || (depDate < today && ticket.status !== 'Departed');
    }
    return true; // 'all'
  });

  // Quick Action Handlers
  const handleDuplicate = (id: string) => {
    duplicateTicket(id);
    setActiveMenuId(null);
  };

  const handleArchive = (id: string) => {
    archiveTicket(id);
    setActiveMenuId(null);
  };

  const handleDelete = (id: string) => {
    if (currentUser?.role !== 'Admin' && (currentUser?.role as any) !== 'Super Admin') {
      setDeniedMessage('Only Admin users can delete entries.');
      return;
    }
    setConfirmDeleteId(id);
  };

  const handleEdit = (id: string) => {
    setEditingTicketId(id);
    setActiveTab('wizard');
    setActiveMenuId(null);
  };

  const handleMarkMissed = (id: string) => {
    updateTicket(id, { status: 'Missed' as FlightStatus });
  };

  const triggerMockReminder = (ticket: Ticket, channel: 'Email' | 'WhatsApp') => {
    // Find a pending reminder or simulate sending
    const matchedReminder = reminders.find(r => r.ticket_id === ticket.id && r.channel === channel);
    
    if (matchedReminder) {
      triggerReminder(matchedReminder.id, 'Sent');
    } else {
      // Create and send instantly
      const store = useFlightStore.getState();
      store.addReminder({
        ticket_id: ticket.id,
        passenger_name: ticket.passenger_name,
        flight_number: ticket.flight_number,
        reminder_time: new Date().toISOString(),
        status: 'Sent',
        channel,
        offset: 'custom'
      });
      // Force trigger action to log it
      const logs = store.reminders.filter(r => r.ticket_id === ticket.id);
      if (logs.length > 0) {
        store.triggerReminder(logs[logs.length - 1].id, 'Sent');
      }
    }

    const depLocal = utcToLocalTime(ticket.departure_time_utc, ticket.original_timezone);
    const timezoneLabel = ticket.original_timezone.split('/').pop()?.replace('_', ' ') || ticket.original_timezone;

    if (channel === 'Email') {
      const subject = `Flight Departure Reminder - ${ticket.flight_number} - PNR: ${ticket.pnr}`;
      const emailBody = `Dear ${ticket.passenger_name},\r\n\r\nThis is a flight departure reminder for your upcoming journey with Season Travels.\r\n\r\nItinerary Details:\r\n- Flight: ${ticket.flight_number} (${ticket.airline})\r\n- PNR Code: ${ticket.pnr}\r\n- E-Ticket Number: ${ticket.ticket_number}\r\n- Departure: ${ticket.departure_airport} at ${depLocal.formatted} (${timezoneLabel})\r\n- Arrival: ${ticket.arrival_airport}\r\n- Transit Info: ${ticket.transit_details || 'Direct'}\r\n- Special Requirements: ${ticket.special_notes || 'None'}\r\n\r\nPlease ensure that you check in at least 3 hours prior to the scheduled departure time.\r\n\r\nSafe travels,\r\nSeason Travels Operations`;

      const mailtoUrl = `mailto:${ticket.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;
      
      const link = document.createElement('a');
      link.href = mailtoUrl;
      link.click();
    } else {
      const whatsAppText = `Flight Reminder: Dear ${ticket.passenger_name}, your flight ${ticket.flight_number} is scheduled to depart ${ticket.departure_airport} at ${depLocal.formatted} (${timezoneLabel}). PNR: ${ticket.pnr}. Safe travels! - Season Travels`;
      const cleanedPhone = ticket.phone.replace(/[^0-9]/g, '');
      const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanedPhone}&text=${encodeURIComponent(whatsAppText)}`;
      window.open(whatsappUrl, '_blank');
    }

    setShowReminderModal(null);
  };

  // Get status color styling
  const getStatusBadge = (status: FlightStatus) => {
    switch (status) {
      case 'Scheduled':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'Delayed':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'Departed':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'Missed':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-800/80 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  return (
    <div className="flex flex-col gap-6 md:gap-8 pb-24 md:pb-8 animate-in fade-in duration-200">
      
      {/* Dashboard Top Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 md:gap-5 border-b border-slate-200 dark:border-slate-800 pb-4 md:pb-5">
        <div>
          <div className="flex items-center gap-2 text-primary dark:text-accent">
            <span className="text-[10px] font-bold tracking-wider uppercase bg-primary/10 dark:bg-accent/10 px-2 py-0.5 rounded">Console</span>
          </div>
          <h1 className="text-xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white uppercase flex items-center gap-2 mt-1">
            ✈ FLIGHT DEPARTURES
          </h1>
          <h2 className="text-xs font-bold text-amber-600 dark:text-amber-500 tracking-wide uppercase mt-0.5">
            SEASON TRAVELS SCANDIC
          </h2>
          <p className="text-[10px] text-slate-400 font-mono mt-2">
            System time: <span className="font-semibold text-slate-650 dark:text-slate-350">{sysDateStr} {sysTimeStr}</span> (Current View: {viewTimezone.split('/')[1] || viewTimezone})
          </p>
        </div>
        <button
          onClick={() => {
            setEditingTicketId(null);
            setActiveTab('wizard');
          }}
          className="flex items-center justify-center gap-2 bg-gradient-premium hover:opacity-95 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all w-full md:w-auto"
        >
          <Plus className="w-4 h-4" />
          Add New Ticket
        </button>
      </div>

      {/* FILTER PANEL */}
      <div className="glass rounded-2xl p-4 md:p-6 flex flex-col gap-4 md:gap-5 shadow-sm">
        
        {/* Search and Filters Header */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          {/* SEARCH BAR */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search Passenger, PNR or Flight Number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-100/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-3 text-xs outline-none text-slate-800 dark:text-slate-100 focus:border-accent dark:focus:border-accent transition-colors"
            />
          </div>

          {/* DATE FILTER */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full bg-slate-100/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-3 text-xs outline-none text-slate-800 dark:text-slate-100 focus:border-accent dark:focus:border-accent transition-colors cursor-pointer"
            />
          </div>

          {/* AIRLINE FILTER */}
          <div className="relative">
            <Plane className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={filterAirline}
              onChange={(e) => setFilterAirline(e.target.value)}
              className="w-full bg-slate-100/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-3 text-xs outline-none text-slate-800 dark:text-slate-100 focus:border-accent dark:focus:border-accent transition-colors cursor-pointer appearance-none"
            >
              <option value="">All Airlines</option>
              {AIRLINES.map(a => <option key={a.code} value={a.name}>{a.name}</option>)}
            </select>
          </div>

        </div>

        {/* Advanced Airport filter */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          
          {/* AIRPORT SELECT */}
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase w-16">Airport:</span>
            <select 
              value={filterAirport}
              onChange={(e) => setFilterAirport(e.target.value)}
              className="flex-1 bg-slate-100/30 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800 rounded-lg px-3.5 py-2 text-xs outline-none text-slate-700 dark:text-slate-300"
            >
              <option value="">Any Route Airport</option>
              {AIRPORTS.map(ap => <option key={ap.code} value={ap.code}>{ap.code} - {ap.city}</option>)}
            </select>
          </div>

        </div>
      </div>

      {/* CATEGORY DEPARTURES TABS */}
      <div className="flex items-center gap-3 md:gap-4 border-b border-slate-200 dark:border-slate-800 overflow-x-auto scrollbar-none -mx-4 px-4 md:mx-0 md:px-0">
        {(['all', 'today', 'tomorrow', 'upcoming', 'missed'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setDeparturesTab(tab)}
            className={`px-1 py-3 text-xs font-semibold border-b-2 capitalize transition-all whitespace-nowrap flex-shrink-0 ${
              departuresTab === tab 
                ? 'border-primary text-primary dark:border-accent dark:text-accent' 
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            {tab === 'all' ? 'All Departures' : `${tab} Flights`}
          </button>
        ))}
      </div>

      {/* TICKET DEPARTURES BOARD DISPLAY */}
      {filteredTickets.length === 0 ? (
        <div className="glass rounded-2xl py-12 text-center flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
            <Plane className="w-6 h-6 rotate-45" />
          </div>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No departures found</p>
          <p className="text-xs text-slate-400">Try adjusting your filters or search keywords.</p>
        </div>
      ) : (
        <>
          {/* DESKTOP DATA GRID */}
          <div className="hidden md:block glass rounded-2xl overflow-hidden shadow-sm border border-[var(--card-border)]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-900/30 border-b border-[var(--card-border)] text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="px-5 py-4">Date</th>
                    <th className="px-5 py-4">Name</th>
                    <th className="px-5 py-4">CET-Time</th>
                    <th className="px-5 py-4">Time (SL)</th>
                    <th className="px-4 py-4">From</th>
                    <th className="px-4 py-4">To</th>
                    <th className="px-5 py-4">Flight No</th>
                    <th className="px-5 py-4">PNR</th>
                    <th className="px-4 py-4">Checkin</th>
                    <th className="px-4 py-4">Remind</th>
                    <th className="px-5 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs text-slate-700 dark:text-slate-300 font-mono">
                  {filteredTickets.map(ticket => {
                    const cetTime = utcToLocalTime(ticket.departure_time_utc, 'Europe/Stockholm').time;
                    const slTime = utcToLocalTime(ticket.departure_time_utc, 'Asia/Colombo').time;
                    
                    // Format Date like 28-JUN-26
                    const dateObj = new Date(ticket.departure_time_utc);
                    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
                    const formattedDate = `${String(dateObj.getDate()).padStart(2, '0')}-${months[dateObj.getMonth()]}-${String(dateObj.getFullYear()).substring(2)}`;
                    
                    // Checkin status (green badge if not Missed/Archived)
                    const showCheckin = ticket.status !== 'Missed' && ticket.status !== 'Archived';
                    
                    // Reminder status (red badge if reminder was sent)
                    const hasReminded = reminders.some(r => r.ticket_id === ticket.id && r.status === 'Sent');
                    
                    return (
                      <tr 
                        key={ticket.id} 
                        className="hover:bg-slate-50/40 dark:hover:bg-slate-900/20 transition-colors"
                      >
                        {/* DATE */}
                        <td className="px-5 py-4 text-emerald-600 dark:text-emerald-400 font-bold uppercase whitespace-nowrap">
                          ● {formattedDate}
                        </td>
                        {/* NAME */}
                        <td className="px-5 py-4 font-sans font-semibold text-slate-950 dark:text-white uppercase tracking-tight max-w-[260px]">
                          <div className="flex items-center gap-2 truncate">
                            {ticket.status === 'Departed' && (
                              <span className="departure-ready-dot flex-shrink-0" title="Ready to Depart" />
                            )}
                            <span className="truncate">{ticket.passenger_name.toUpperCase()}</span>
                          </div>
                        </td>
                        {/* CET-TIME (Sweden) */}
                        <td className="px-5 py-4 font-bold text-slate-750 dark:text-slate-200">
                          {cetTime}
                        </td>
                        {/* TIME (SL) */}
                        <td className="px-5 py-4 text-slate-500 dark:text-slate-400">
                          {slTime}
                        </td>
                        {/* FROM */}
                        <td className="px-4 py-4 font-bold text-slate-800 dark:text-slate-200">
                          {ticket.departure_airport}
                        </td>
                        {/* TO */}
                        <td className="px-4 py-4 font-bold text-slate-800 dark:text-slate-200">
                          {ticket.arrival_airport}
                        </td>
                        {/* FLIGHT NO */}
                        <td className="px-5 py-4 font-bold text-slate-850 dark:text-slate-100 whitespace-nowrap">
                          {ticket.flight_number}
                        </td>
                        {/* PNR */}
                        <td className="px-5 py-4 text-primary dark:text-accent font-semibold tracking-wide uppercase">
                          {ticket.pnr}
                        </td>
                        {/* CHECKIN */}
                        <td className="px-4 py-4">
                          {showCheckin ? (
                            <span className="px-2.5 py-0.5 rounded bg-emerald-500 text-white dark:bg-emerald-600 font-bold text-[10px]">
                              YES
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded bg-rose-500 text-white dark:bg-rose-600 font-bold text-[10px]">
                              NO
                            </span>
                          )}
                        </td>
                        {/* REMIND */}
                        <td className="px-4 py-4">
                          {hasReminded && (
                            <span className="px-2.5 py-0.5 rounded bg-rose-500 text-white dark:bg-rose-600 font-bold text-[10px] uppercase">
                              YES
                            </span>
                          )}
                        </td>
                        {/* ACTIONS */}
                        <td className="px-5 py-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setSelectedTicket(ticket)}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-350 rounded-md text-[10.5px] font-sans font-bold transition-all"
                              title="Details"
                            >
                              VIEW
                            </button>
                            <button
                              onClick={() => setShowReminderModal(ticket)}
                              className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-md text-[10.5px] font-sans font-bold transition-all"
                              title="Send reminder details"
                            >
                              MAIL
                            </button>
                            <button
                              onClick={() => handleEdit(ticket.id)}
                              className="px-2.5 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-[10.5px] font-sans font-bold transition-all"
                              title="Edit ticket details"
                            >
                              EDIT
                            </button>
                            {ticket.status !== 'Missed' && ticket.status !== 'Archived' && (
                              <button
                                onClick={() => handleMarkMissed(ticket.id)}
                                className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-md text-[10.5px] font-sans font-bold transition-all"
                                title="Mark as missed flight"
                              >
                                MISSED
                              </button>
                            )}
                            {(currentUser?.role === 'Admin' || (currentUser?.role as any) === 'Super Admin') && (
                              <button
                                onClick={() => handleDelete(ticket.id)}
                                className="px-2.5 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-md text-[10.5px] font-sans font-bold transition-all"
                                title="Delete ticket"
                              >
                                DEL
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* MOBILE CARD LIST VIEWS (WITH ACTION SHEET DRAWERS) */}
          <div className="md:hidden flex flex-col gap-3">
            {filteredTickets.map(ticket => {
              const departureLocal = utcToLocalTime(ticket.departure_time_utc, viewTimezone);
              
              return (
                <div 
                  key={ticket.id} 
                  className="glass rounded-xl p-4 flex flex-col gap-3 shadow-sm border border-[var(--card-border)] relative overflow-hidden active:scale-[0.99] transition-all"
                >
                  {/* Top card row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {ticket.status === 'Departed' && (
                          <span className="departure-ready-dot flex-shrink-0" title="Ready to Depart" />
                        )}
                        <span className="font-bold text-[13px] text-slate-900 dark:text-white leading-tight uppercase tracking-tight truncate">
                          {ticket.passenger_name.toUpperCase()}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium tracking-tight block mt-0.5">
                        PNR: <span className="font-bold font-mono text-primary dark:text-accent">{ticket.pnr}</span> | {ticket.flight_number}
                      </span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border flex-shrink-0 ${getStatusBadge(ticket.status)}`}>
                      {ticket.status}
                    </span>
                  </div>

                  {/* Route & Times */}
                  <div className="flex items-center justify-between border-t border-b border-slate-100 dark:border-slate-800/80 py-2.5">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] text-slate-400 uppercase font-bold">Route</span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                        {ticket.departure_airport} 
                        <Plane className="w-3 h-3 text-slate-400 rotate-90" /> 
                        {ticket.arrival_airport}
                      </span>
                    </div>

                    <div className="flex flex-col items-end gap-0.5">
                      <span className="text-[9px] text-slate-400 uppercase font-bold">Departure</span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {departureLocal.formatted.split(', ')[1]}
                      </span>
                      <span className="text-[9px] text-accent font-semibold">
                        {departureLocal.offset} {departureLocal.isDst ? '(DST)' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Card quick actions row */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[9px] text-slate-400 flex-shrink-0">
                      {ticket.created_by === 'usr-1' ? 'Lars (Admin)' : 'Staff'}
                    </span>
                    
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      <button 
                        onClick={() => setSelectedTicket(ticket)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" /> View
                      </button>
                      <button 
                        onClick={() => handleEdit(ticket.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" /> Edit
                      </button>
                      <button 
                        onClick={() => setShowReminderModal(ticket)}
                        className="px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary dark:bg-accent/15 dark:text-accent text-[10px] font-bold flex items-center gap-1"
                      >
                        <Send className="w-3 h-3" /> Remind
                      </button>
                      {ticket.status !== 'Missed' && ticket.status !== 'Archived' && (
                        <button 
                          onClick={() => handleMarkMissed(ticket.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 text-[10px] font-bold"
                        >
                          Missed
                        </button>
                      )}
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        </>
      )}

      {/* TIMEZONE INSPECTION MODAL */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4 z-50 animate-in fade-in duration-200">
          <div className="glass rounded-t-3xl md:rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl p-5 md:p-6 border border-white/10 flex flex-col gap-5 md:gap-6 animate-in slide-in-from-bottom-4 md:animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold text-accent uppercase tracking-wider">Flight Ticket Details</span>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  Passenger: {selectedTicket.passenger_name}
                </h2>
              </div>
              <button 
                onClick={() => setSelectedTicket(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-300 transition-colors text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Step 1 & 2 info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-500/5 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 rounded-2xl p-4">
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Passenger Details</span>
                <p className="text-xs text-slate-700 dark:text-slate-300"><span className="font-semibold text-slate-900 dark:text-slate-100">Nationality:</span> {selectedTicket.nationality}</p>
                <p className="text-xs text-slate-700 dark:text-slate-300"><span className="font-semibold text-slate-900 dark:text-slate-100">Passport Number:</span> {selectedTicket.passport_number}</p>
                <p className="text-xs text-slate-700 dark:text-slate-300"><span className="font-semibold text-slate-900 dark:text-slate-100">Email:</span> {selectedTicket.email}</p>
                <p className="text-xs text-slate-700 dark:text-slate-300"><span className="font-semibold text-slate-900 dark:text-slate-100">Phone:</span> {selectedTicket.phone}</p>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Ticket details</span>
                <p className="text-xs text-slate-700 dark:text-slate-300"><span className="font-semibold text-slate-900 dark:text-slate-100">Airline:</span> {selectedTicket.airline}</p>
                <p className="text-xs text-slate-700 dark:text-slate-300"><span className="font-semibold text-slate-900 dark:text-slate-100">Flight Code:</span> {selectedTicket.flight_number}</p>
                <p className="text-xs text-slate-700 dark:text-slate-300"><span className="font-semibold text-slate-900 dark:text-slate-100">PNR Record:</span> {selectedTicket.pnr}</p>
                <p className="text-xs text-slate-700 dark:text-slate-300"><span className="font-semibold text-slate-900 dark:text-slate-100">Ticket Number:</span> {selectedTicket.ticket_number}</p>
              </div>
            </div>

            {/* CRITICAL TIMEZONE AUTOMATIC CONVERSION INSPECTOR */}
            <div className="flex flex-col gap-3">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-accent" />
                Automatic Multi-Region Time Conversion
              </span>

              {/* Conversions Container */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                
                {/* UTC Time */}
                <div className="glass rounded-xl p-3 border border-slate-200 dark:border-slate-800 bg-slate-100/30 dark:bg-slate-900/10 flex flex-col gap-1">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">UTC Storage Time</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono">
                    {new Date(selectedTicket.departure_time_utc).toISOString().substring(11, 16)} UTC
                  </span>
                  <span className="text-[9px] text-slate-400 leading-tight">
                    Stored in database in absolute UTC format.
                  </span>
                </div>

                {/* Sri Lanka Time Conversion */}
                <div className="glass rounded-xl p-3 border border-emerald-500/20 dark:border-emerald-500/30 bg-emerald-500/5 flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Sri Lanka Time</span>
                    <span className="px-1 py-px rounded text-[8px] font-bold bg-emerald-500/25 text-emerald-800 dark:text-emerald-300">
                      UTC+5:30
                    </span>
                  </div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono">
                    {utcToLocalTime(selectedTicket.departure_time_utc, 'Asia/Colombo').formatted.split(', ')[1]}
                  </span>
                  <span className="text-[9px] text-slate-500 dark:text-slate-400 leading-tight">
                    {utcToLocalTime(selectedTicket.departure_time_utc, 'Asia/Colombo').formatted.split(', ')[0]}
                  </span>
                </div>

                {/* Sweden Time Conversion */}
                <div className="glass rounded-xl p-3 border-blue-500/20 dark:border-blue-500/30 bg-blue-500/5 flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase">Sweden Time</span>
                    <span className="px-1 py-px rounded text-[8px] font-bold bg-blue-500/25 text-blue-800 dark:text-blue-300">
                      {utcToLocalTime(selectedTicket.departure_time_utc, 'Europe/Stockholm').offset}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono">
                    {utcToLocalTime(selectedTicket.departure_time_utc, 'Europe/Stockholm').formatted.split(', ')[1]}
                  </span>
                  <span className="text-[9px] text-slate-500 dark:text-slate-400 leading-tight flex items-center justify-between">
                    <span>{utcToLocalTime(selectedTicket.departure_time_utc, 'Europe/Stockholm').formatted.split(', ')[0]}</span>
                    {checkIfDst(new Date(selectedTicket.departure_time_utc), 'Europe/Stockholm') && (
                      <span className="text-[8px] font-bold text-accent">DST ACTIVE</span>
                    )}
                  </span>
                </div>

              </div>

              {/* Dynamic DST Shift difference analysis display */}
              <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs flex items-center justify-between text-slate-700 dark:text-slate-300">
                <span className="font-semibold text-[11px] text-slate-500">Region Time Difference:</span>
                <span className="font-bold text-primary dark:text-accent font-mono text-[11px]">
                  {getTimezoneDiffMessage(new Date(selectedTicket.departure_time_utc), 'Europe/Stockholm', 'Asia/Colombo')}
                </span>
              </div>
              
              <p className="text-[9px] text-slate-400 italic">
                * Note: The Sweden timezone automatically switches between UTC+1 (Winter CET) and UTC+2 (Summer CEST / DST). Sri Lanka remains fixed at UTC+5:30.
              </p>
            </div>

            {/* Additional steps info */}
            <div className="flex flex-col gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Transit & Notes</span>
              <p className="text-xs text-slate-700 dark:text-slate-300"><span className="font-semibold text-slate-900 dark:text-slate-100">Return flight booked:</span> {selectedTicket.return_ticket ? 'Yes' : 'No'}</p>
              <p className="text-xs text-slate-700 dark:text-slate-300"><span className="font-semibold text-slate-900 dark:text-slate-100">Transit airports:</span> {selectedTicket.transit_details || 'Direct'}</p>
              <p className="text-xs text-slate-700 dark:text-slate-300"><span className="font-semibold text-slate-900 dark:text-slate-100">Staff notes:</span> {selectedTicket.special_notes || 'No special requirements listed.'}</p>
            </div>

            {/* Modal actions footer */}
            <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-4">
              <span className="text-[10px] text-slate-400 font-mono">Original Entry Zone: {selectedTicket.original_timezone}</span>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    handleEdit(selectedTicket.id);
                    setSelectedTicket(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200"
                >
                  Edit Ticket
                </button>
                <button 
                  onClick={() => setSelectedTicket(null)}
                  className="px-4 py-2 bg-gradient-premium text-white rounded-xl text-xs font-bold"
                >
                  Done
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* QUICK REMINDER TRIGGERS MODAL */}
      {showReminderModal && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="glass rounded-2xl w-full max-w-sm shadow-xl p-5 border border-[var(--card-border)] flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            <h3 className="font-bold text-sm text-slate-950 dark:text-white">Send Flight Reminders</h3>
            <p className="text-xs text-slate-400">
              Manually trigger automatic notifications for passenger <span className="font-semibold text-slate-700 dark:text-slate-300">{showReminderModal.passenger_name}</span> ({showReminderModal.flight_number}).
            </p>
            
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => triggerMockReminder(showReminderModal, 'Email')}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors"
              >
                <span>Send Email Notification</span>
                <span className="text-[10px] text-primary dark:text-accent font-bold">EMAIL API</span>
              </button>
              <button 
                onClick={() => triggerMockReminder(showReminderModal, 'WhatsApp')}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors"
              >
                <span>Send WhatsApp Message</span>
                <span className="text-[10px] text-emerald-500 font-bold">WHATSAPP API</span>
              </button>
            </div>

            <div className="flex justify-end gap-2 mt-2">
              <button 
                onClick={() => setShowReminderModal(null)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Delete Ticket"
        message="Are you sure you want to delete this ticket? This action is permanent and will be logged."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => {
          if (confirmDeleteId) deleteTicket(confirmDeleteId);
          setConfirmDeleteId(null);
          setActiveMenuId(null);
        }}
        onCancel={() => setConfirmDeleteId(null)}
      />

      <ConfirmDialog
        open={!!deniedMessage}
        title="Permission Denied"
        message={deniedMessage || ''}
        confirmLabel="OK"
        variant="warning"
        onConfirm={() => setDeniedMessage(null)}
        onCancel={() => setDeniedMessage(null)}
      />

    </div>
  );
}
