import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Edit2,
  Search,
  Filter,
  Check,
  X,
  Clock,
  Download,
  Users,
  Building2,
  Eye,
  EyeOff,
  UserPlus,
  Globe,
  Sun,
  Umbrella,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { apiFetch } from '../store/flightStore';

export interface CalendarStaffMember {
  id: string;
  _id?: string;
  name: string;
  role: string;
  department: string;
  color: string;
  active?: boolean;
}

export interface CalendarShiftEvent {
  id: string;
  _id?: string;
  title: string;
  staffId: string;
  staffName: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  finishTime: string; // HH:mm
  timezone?: 'CET' | 'SLT';
  department: string;
  color: string;
  location?: string;
  notes?: string;
}

export interface HolidayRequest {
  id: string;
  _id?: string;
  staffId: string;
  staffName: string;
  startDate: string;
  endDate: string;
  reason?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt?: string;
}

type CalendarViewMode = 'month' | 'week' | 'day' | 'timeline';

const PALETTE = [
  '#6366f1', '#a855f7', '#0284c7', '#06b6d4', '#10b981',
  '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#3b82f6',
  '#14b8a6', '#84cc16'
];

const DEPARTMENTS = [
  'Ticketing & Sales',
  'Flight Operations',
  'Customer Support',
  'Visa & Finance',
  'Executive Ops'
];

const WEEKDAYS = [
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
  { label: 'Sun', value: 0 },
];

export interface StaffCalendarProps {
  currentUser?: {
    id?: string;
    name?: string;
    email?: string;
    role?: string;
  } | null;
}

// Converts shift time between CET and SLT (+3 hours 30 mins offset)
export const convertShiftTime = (timeStr: string, fromTz: 'CET' | 'SLT' = 'CET', toTz: 'CET' | 'SLT' = 'CET'): string => {
  if (!timeStr) return '';
  if (fromTz === toTz) return timeStr;

  const [hStr, mStr] = timeStr.split(':');
  let hours = parseInt(hStr, 10) || 0;
  let mins = parseInt(mStr, 10) || 0;

  let totalMins = hours * 60 + mins;

  // CET -> SLT: add +210 mins (+3h 30m)
  // SLT -> CET: subtract 210 mins (-3h 30m)
  if (fromTz === 'CET' && toTz === 'SLT') {
    totalMins += 210;
  } else if (fromTz === 'SLT' && toTz === 'CET') {
    totalMins -= 210;
  }

  totalMins = (totalMins % 1440 + 1440) % 1440;

  const finalH = Math.floor(totalMins / 60);
  const finalM = totalMins % 60;

  return `${finalH.toString().padStart(2, '0')}:${finalM.toString().padStart(2, '0')}`;
};

export function StaffCalendar({ currentUser }: StaffCalendarProps) {
  const isAdmin = currentUser?.role === 'Admin';

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');

  // Timezone View (Locked: CET for Admin, SLT for Staff)
  const activeTz: 'CET' | 'SLT' = isAdmin ? 'CET' : 'SLT';

  const [staffList, setStaffList] = useState<CalendarStaffMember[]>([]);
  const [eventsList, setEventsList] = useState<CalendarShiftEvent[]>([]);
  const [holidaysList, setHolidaysList] = useState<HolidayRequest[]>([]);
  const [visibleStaffIds, setVisibleStaffIds] = useState<Set<string>>(new Set());

  const [loading, setLoading] = useState<boolean>(true);
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [staffSearchQuery, setStaffSearchQuery] = useState<string>('');

  // Modals
  const [shiftModalOpen, setShiftModalOpen] = useState<boolean>(false);
  const [editingShift, setEditingShift] = useState<CalendarShiftEvent | null>(null);

  const [addStaffModalOpen, setAddStaffModalOpen] = useState<boolean>(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('Staff');
  const [newStaffDept, setNewStaffDept] = useState('Ticketing & Sales');
  const [newStaffColor, setNewStaffColor] = useState('#6366f1');

  // Holiday Request Modals
  const [holidayModalOpen, setHolidayModalOpen] = useState<boolean>(false);
  const [adminHolidaysOpen, setAdminHolidaysOpen] = useState<boolean>(false);
  const [holidayStaffId, setHolidayStaffId] = useState<string>('');
  const [holidayStartDate, setHolidayStartDate] = useState<string>('');
  const [holidayEndDate, setHolidayEndDate] = useState<string>('');
  const [holidayReason, setHolidayReason] = useState<string>('');

  // Shift Form
  const [formTitle, setFormTitle] = useState('');
  const [formStaffId, setFormStaffId] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formStartTime, setFormStartTime] = useState('08:00');
  const [formFinishTime, setFormFinishTime] = useState('16:30');
  const [formTimezone, setFormTimezone] = useState<'CET' | 'SLT'>('CET');
  const [formSelectedWeekdays, setFormSelectedWeekdays] = useState<number[]>([]);
  const [formLocation, setFormLocation] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Load Data
  const loadData = async () => {
    setLoading(true);
    try {
      const [staffResult, eventsResult, holidaysResult] = await Promise.allSettled([
        apiFetch('/api/staff-calendar/staff'),
        apiFetch('/api/staff-calendar/events'),
        apiFetch('/api/staff-calendar/holidays')
      ]);

      const staffRes = staffResult.status === 'fulfilled' ? staffResult.value : {};
      const eventsRes = eventsResult.status === 'fulfilled' ? eventsResult.value : {};
      const holidaysRes = holidaysResult.status === 'fulfilled' ? holidaysResult.value : {};

      let staffData: CalendarStaffMember[] = staffRes.staff || [];
      const eventsData: CalendarShiftEvent[] = eventsRes.events || [];
      const holidaysData: HolidayRequest[] = holidaysRes.holidays || [];

      // If no calendar staff exist yet, auto-populate from system staff users (/api/staff)
      if (staffData.length === 0) {
        try {
          const mainStaffRes = await apiFetch('/api/staff');
          const mainUsers = mainStaffRes.users || [];
          if (mainUsers.length > 0) {
            const created = await Promise.all(
              mainUsers.map((u: any, idx: number) => 
                apiFetch('/api/staff-calendar/staff', {
                  method: 'POST',
                  body: JSON.stringify({
                    name: u.name || u.email,
                    role: u.role || 'Staff',
                    department: u.department || DEPARTMENTS[idx % DEPARTMENTS.length],
                    color: PALETTE[idx % PALETTE.length]
                  })
                })
              )
            );
            staffData = created.map(r => r.staff).filter(Boolean);
          }
        } catch (e) {
          console.warn('Auto-sync staff users failed:', e);
        }
      }

      setStaffList(staffData);
      const validStaffIds = staffData.map(s => String(s.id || s._id || '')).filter(Boolean);
      setVisibleStaffIds(new Set(validStaffIds));
      setEventsList(eventsData);
      setHolidaysList(holidaysData);
    } catch (err) {
      console.warn('Backend fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const handleAppRefresh = () => {
      loadData();
    };
    window.addEventListener('app:refresh', handleAppRefresh);
    return () => window.removeEventListener('app:refresh', handleAppRefresh);
  }, []);

  // Format Helper: YYYY-MM-DD
  const formatDateKey = (d: Date) => d.toISOString().split('T')[0];

  // Pending Holidays Count
  const pendingHolidaysCount = useMemo(() => {
    return holidaysList.filter(h => h.status === 'Pending').length;
  }, [holidaysList]);

  // Date Navigation Actions
  const handlePrevDate = () => {
    const next = new Date(currentDate);
    if (viewMode === 'month') next.setMonth(next.getMonth() - 1);
    else if (viewMode === 'week') next.setDate(next.getDate() - 7);
    else next.setDate(next.getDate() - 1);
    setCurrentDate(next);
  };

  const handleNextDate = () => {
    const next = new Date(currentDate);
    if (viewMode === 'month') next.setMonth(next.getMonth() + 1);
    else if (viewMode === 'week') next.setDate(next.getDate() + 7);
    else next.setDate(next.getDate() + 1);
    setCurrentDate(next);
  };

  const handleToday = () => setCurrentDate(new Date());

  // Filter Staff Toggles
  const toggleStaffVisibility = (id: string) => {
    setVisibleStaffIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllStaff = (enable: boolean) => {
    if (enable) setVisibleStaffIds(new Set(staffList.map(s => s.id || s._id || '')));
    else setVisibleStaffIds(new Set());
  };

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return eventsList.filter(e => {
      if (!visibleStaffIds.has(e.staffId)) return false;
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase();
        return (
          e.title.toLowerCase().includes(q) ||
          e.staffName.toLowerCase().includes(q) ||
          (e.location || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [eventsList, visibleStaffIds, searchFilter]);

  // Holidays helper for date cells (Pending & Approved show; Rejected disappears)
  const getHolidaysForDate = (dateStr: string) => {
    return holidaysList.filter(h => {
      if (h.status === 'Rejected') return false; // Rejected holidays disappear completely
      return dateStr >= h.startDate && dateStr <= h.endDate;
    });
  };

  // Delete individual staff member
  const handleDeleteStaff = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiFetch(`/api/staff-calendar/staff/${id}`, { method: 'DELETE' });
    } catch {
      // fallback
    }
    setStaffList(prev => prev.filter(s => (s.id !== id && s._id !== id)));
    setVisibleStaffIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  // Clear all staff members
  const handleClearAllStaff = async () => {
    if (!window.confirm('Are you sure you want to remove ALL staff members from the list?')) return;
    try {
      await apiFetch('/api/staff-calendar/staff', { method: 'DELETE' });
    } catch {
      // fallback
    }
    setStaffList([]);
    setVisibleStaffIds(new Set());
  };

  // Clear All Tasks / Shifts
  const handleClearAllShifts = async () => {
    if (!window.confirm('Are you sure you want to remove ALL tasks/shifts from the Staff Calendar?')) return;
    try {
      await apiFetch('/api/staff-calendar/events', { method: 'DELETE' });
    } catch (err) {
      console.error('Failed to delete all events:', err);
    }
    setEventsList([]);
  };

  // Open Add Shift Modal
  const handleOpenAddShift = (defaultDate?: string) => {
    if (!isAdmin) return; // Admin only
    setEditingShift(null);
    setFormTitle('Ticketing Shift');
    setFormStaffId(staffList[0]?.id || staffList[0]?._id || '');
    setFormDate(defaultDate || formatDateKey(currentDate));
    setFormStartTime('08:00');
    setFormFinishTime('16:30');
    setFormTimezone(activeTz);
    setFormSelectedWeekdays([]);
    setFormLocation('Ticketing Desk');
    setFormNotes('');
    setShiftModalOpen(true);
  };

  // Open Edit Shift Modal
  const handleOpenEditShift = (shift: CalendarShiftEvent) => {
    if (!isAdmin) return; // Admin only
    setEditingShift(shift);
    setFormTitle(shift.title);
    setFormStaffId(shift.staffId);
    setFormDate(shift.date);
    setFormStartTime(shift.startTime);
    setFormFinishTime(shift.finishTime);
    setFormTimezone(shift.timezone || 'CET');
    setFormSelectedWeekdays([]);
    setFormLocation(shift.location || '');
    setFormNotes(shift.notes || '');
    setShiftModalOpen(true);
  };

  // Toggle Weekday Selection
  const toggleWeekdaySelection = (val: number) => {
    setFormSelectedWeekdays(prev =>
      prev.includes(val) ? prev.filter(w => w !== val) : [...prev, val]
    );
  };

  // Save Shift (Supports Single or Multi-Weekday Appointment across month)
  const handleSaveShift = async (e: React.FormEvent) => {
    e.preventDefault();
    const staff = staffList.find(s => (s.id || s._id) === formStaffId);
    if (!staff) return;

    // Multi-weekday bulk creation mode
    if (formSelectedWeekdays.length > 0 && !editingShift) {
      const baseDateObj = formDate ? new Date(formDate) : currentDate;
      const year = baseDateObj.getFullYear();
      const month = baseDateObj.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const dates: string[] = [];

      for (let d = 1; d <= daysInMonth; d++) {
        const dObj = new Date(year, month, d);
        if (formSelectedWeekdays.includes(dObj.getDay())) {
          dates.push(formatDateKey(dObj));
        }
      }

      if (dates.length > 0) {
        const payload = {
          title: formTitle,
          staffId: formStaffId,
          staffName: staff.name,
          dates,
          startTime: formStartTime,
          finishTime: formFinishTime,
          timezone: formTimezone,
          department: staff.department,
          color: staff.color,
          location: formLocation,
          notes: formNotes
        };
        try {
          const res = await apiFetch('/api/staff-calendar/events', {
            method: 'POST',
            body: JSON.stringify(payload)
          });
          if (res.events && res.events.length > 0) {
            setEventsList(prev => [...prev, ...res.events]);
          } else {
            const fallbackEvents = dates.map(d => ({
              ...payload,
              date: d,
              id: `ev-${Date.now()}-${Math.random()}`
            }));
            setEventsList(prev => [...prev, ...fallbackEvents]);
          }
        } catch {
          const fallbackEvents = dates.map(d => ({
            ...payload,
            date: d,
            id: `ev-${Date.now()}-${Math.random()}`
          }));
          setEventsList(prev => [...prev, ...fallbackEvents]);
        }
        setShiftModalOpen(false);
        return;
      }
    }

    // Single shift mode
    const payload = {
      title: formTitle,
      staffId: formStaffId,
      staffName: staff.name,
      date: formDate,
      startTime: formStartTime,
      finishTime: formFinishTime,
      timezone: formTimezone,
      department: staff.department,
      color: staff.color,
      location: formLocation,
      notes: formNotes
    };

    try {
      if (editingShift) {
        const id = editingShift.id || editingShift._id;
        const res = await apiFetch(`/api/staff-calendar/events/${id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        const updated = res.event || { ...editingShift, ...payload };
        setEventsList(prev => prev.map(ev => (ev.id === id || ev._id === id) ? updated : ev));
      } else {
        const res = await apiFetch('/api/staff-calendar/events', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        const created = res.event || { ...payload, id: `ev-${Date.now()}` };
        setEventsList(prev => [...prev, created]);
      }
    } catch {
      if (editingShift) {
        setEventsList(prev => prev.map(ev => ev.id === editingShift.id ? { ...editingShift, ...payload } : ev));
      } else {
        setEventsList(prev => [...prev, { ...payload, id: `ev-${Date.now()}` }]);
      }
    }
    setShiftModalOpen(false);
  };

  // Delete Shift
  const handleDeleteShift = async (id: string) => {
    try {
      await apiFetch(`/api/staff-calendar/events/${id}`, { method: 'DELETE' });
    } catch {
      // Fallback
    }
    setEventsList(prev => prev.filter(ev => ev.id !== id && ev._id !== id));
    setShiftModalOpen(false);
  };

  // Save New Staff
  const handleSaveNewStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim()) return;

    const payload = {
      name: newStaffName.trim(),
      role: newStaffRole.trim() || 'Staff',
      department: newStaffDept,
      color: newStaffColor
    };

    try {
      const res = await apiFetch('/api/staff-calendar/staff', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const created = res.staff || { ...payload, id: `st-${Date.now()}` };
      const newId = created.id || created._id;
      setStaffList(prev => [...prev, created]);
      setVisibleStaffIds(prev => new Set(prev).add(newId));
    } catch {
      const created = { ...payload, id: `st-${Date.now()}` };
      setStaffList(prev => [...prev, created]);
      setVisibleStaffIds(prev => new Set(prev).add(created.id));
    }
    setNewStaffName('');
    setNewStaffRole('Staff');
    setAddStaffModalOpen(false);
  };

  // Open Staff Holiday Request Modal
  const handleOpenRequestHoliday = () => {
    const defaultStaff = staffList.find(s => s.name.toLowerCase() === currentUser?.name?.toLowerCase()) || staffList[0];
    setHolidayStaffId(defaultStaff?.id || defaultStaff?._id || '');
    setHolidayStartDate(formatDateKey(currentDate));
    setHolidayEndDate(formatDateKey(currentDate));
    setHolidayReason('');
    setHolidayModalOpen(true);
  };

  // Save Holiday Request (Staff)
  const handleSaveHolidayRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayStartDate || !holidayEndDate || !holidayStaffId) return;

    const staff = staffList.find(s => (s.id || s._id) === holidayStaffId);
    const staffName = staff ? staff.name : (currentUser?.name || 'Staff Member');

    const payload = {
      staffId: holidayStaffId,
      staffName,
      startDate: holidayStartDate,
      endDate: holidayEndDate,
      reason: holidayReason
    };

    try {
      const res = await apiFetch('/api/staff-calendar/holidays', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const created = res.holiday || { ...payload, status: 'Pending', id: `hol-${Date.now()}` };
      setHolidaysList(prev => [created, ...prev]);
    } catch {
      setHolidaysList(prev => [{ ...payload, status: 'Pending', id: `hol-${Date.now()}` }, ...prev]);
    }
    setHolidayModalOpen(false);
  };

  // Update Holiday Status (Admin Approve / Reject)
  const handleUpdateHolidayStatus = async (id: string, status: 'Approved' | 'Rejected') => {
    try {
      const res = await apiFetch(`/api/staff-calendar/holidays/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });
      if (res.holiday) {
        setHolidaysList(prev => prev.map(h => (h.id === id || h._id === id) ? res.holiday : h));
      } else {
        setHolidaysList(prev => prev.map(h => (h.id === id || h._id === id) ? { ...h, status } : h));
      }
    } catch {
      setHolidaysList(prev => prev.map(h => (h.id === id || h._id === id) ? { ...h, status } : h));
    }
  };

  // Delete Holiday Request
  const handleDeleteHoliday = async (id: string) => {
    try {
      await apiFetch(`/api/staff-calendar/holidays/${id}`, { method: 'DELETE' });
    } catch {
      // Fallback
    }
    setHolidaysList(prev => prev.filter(h => h.id !== id && h._id !== id));
  };

  // Clear All Holiday Requests
  const handleClearAllHolidays = async () => {
    if (!window.confirm('Are you sure you want to remove ALL holiday requests?')) return;
    try {
      await apiFetch('/api/staff-calendar/holidays', { method: 'DELETE' });
    } catch (err) {
      console.error('Failed to delete all holidays:', err);
    }
    setHolidaysList([]);
  };

  // Export PDF with Watermark
  const handleExportPDF = async () => {
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const { applySeasonTravelsWatermark } = await import('../utils/pdfWatermark');

      const doc = new jsPDF({ orientation: 'landscape' });

      const tableRows = filteredEvents.map(e => [
        e.date,
        `${convertShiftTime(e.startTime, e.timezone || 'CET', activeTz)} - ${convertShiftTime(e.finishTime, e.timezone || 'CET', activeTz)} (${activeTz})`,
        e.staffName,
        e.department,
        e.title,
        e.location || 'Main Counter'
      ]);

      autoTable(doc, {
        startY: 24,
        margin: { top: 24, bottom: 15, left: 14, right: 14 },
        head: [['Date', `Time (${activeTz})`, 'Staff Name', 'Department', 'Shift Title', 'Location']],
        body: tableRows,
        styles: { fontSize: 8.5, cellPadding: 3, textColor: [30, 41, 59] },
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] }
      });

      applySeasonTravelsWatermark(doc, `Staff Work Roster (${activeTz} Timezone)`);

      const dateStr = new Date().toISOString().split('T')[0];
      doc.save(`staff-calendar-roster_${activeTz}_${dateStr}.pdf`);
    } catch (err) {
      console.error('Failed to export calendar PDF:', err);
    }
  };

  // Group Staff by Department
  const staffByDept = useMemo(() => {
    const map: Record<string, CalendarStaffMember[]> = {};
    staffList.forEach(s => {
      if (staffSearchQuery.trim()) {
        const q = staffSearchQuery.toLowerCase();
        if (!s.name.toLowerCase().includes(q) && !s.role.toLowerCase().includes(q)) return;
      }
      const dept = s.department || 'General';
      if (!map[dept]) map[dept] = [];
      map[dept].push(s);
    });
    return map;
  }, [staffList, staffSearchQuery]);

  // Render Mini Month Picker Calendar in Sidebar
  const renderMiniCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startingDayOfWeek = (firstDay.getDay() + 6) % 7; // Mon = 0
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const days: (number | null)[] = [];
    for (let i = 0; i < startingDayOfWeek; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);

    const todayStr = formatDateKey(new Date());

    return (
      <div style={{
        background: 'var(--surface2)',
        borderRadius: 12,
        padding: 12,
        border: '1px solid var(--border)',
        marginBottom: 16
      }}>
        {/* Month Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>
            {monthNames[month]} {year}
          </span>
          <div style={{ display: 'flex', gap: 2 }}>
            <button
              onClick={() => { const n = new Date(currentDate); n.setMonth(n.getMonth() - 1); setCurrentDate(n); }}
              className="btn btn-ghost btn-icon" style={{ padding: 4 }} title="Previous Month"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => { const n = new Date(currentDate); n.setMonth(n.getMonth() + 1); setCurrentDate(n); }}
              className="btn btn-ghost btn-icon" style={{ padding: 4 }} title="Next Month"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Weekday headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'var(--text3)', marginBottom: 4 }}>
          <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>
        </div>

        {/* Days grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
          {days.map((day, idx) => {
            if (day === null) return <div key={`empty-${idx}`} />;
            const thisDate = new Date(year, month, day);
            const dateStr = formatDateKey(thisDate);
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === formatDateKey(currentDate);

            return (
              <button
                key={day}
                onClick={() => setCurrentDate(thisDate)}
                style={{
                  height: 26,
                  borderRadius: 6,
                  border: 'none',
                  background: isSelected ? 'var(--indigo)' : isToday ? 'rgba(99,102,241,0.15)' : 'transparent',
                  color: isSelected ? '#ffffff' : isToday ? 'var(--indigo2)' : 'var(--text)',
                  fontSize: 11,
                  fontWeight: isSelected || isToday ? 800 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // Date Range Display String
  const getDateRangeLabel = () => {
    const year = currentDate.getFullYear();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    if (viewMode === 'month') {
      return `${monthNames[currentDate.getMonth()]} ${year}`;
    }

    if (viewMode === 'week') {
      const curr = new Date(currentDate);
      const first = curr.getDate() - ((curr.getDay() + 6) % 7); // Mon
      const mon = new Date(curr.setDate(first));
      const sun = new Date(curr.setDate(first + 6));
      return `${mon.getDate()} ${monthNames[mon.getMonth()]} – ${sun.getDate()} ${monthNames[sun.getMonth()]}, ${year}`;
    }

    return currentDate.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Render Main Month View
  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startingDayOfWeek = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: (Date | null)[] = [];
    for (let i = 0; i < startingDayOfWeek; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

    const todayStr = formatDateKey(new Date());

    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%', overflow: 'hidden' }}>
        {/* Day Header Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border)', background: 'var(--surface)', textAlign: 'center', fontWeight: 700, fontSize: 11, color: 'var(--text2)', padding: '8px 0' }}>
          <div>MON</div><div>TUE</div><div>WED</div><div>THU</div><div>FRI</div><div>SAT</div><div>SUN</div>
        </div>

        {/* Month Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: 'minmax(120px, 1fr)', flex: 1, overflowY: 'auto', background: 'var(--bg)' }}>
          {cells.map((cellDate, idx) => {
            if (!cellDate) {
              return <div key={`empty-${idx}`} style={{ background: 'var(--bg2)', borderRight: '1px solid var(--border2)', borderBottom: '1px solid var(--border2)', opacity: 0.4 }} />;
            }

            const dateStr = formatDateKey(cellDate);
            const isToday = dateStr === todayStr;
            const dayEvents = filteredEvents.filter(e => e.date === dateStr);
            const dayHolidays = getHolidaysForDate(dateStr);

            return (
              <div
                key={dateStr}
                style={{
                  borderRight: '1px solid var(--border2)',
                  borderBottom: '1px solid var(--border2)',
                  padding: 6,
                  display: 'flex',
                  flexDirection: 'column',
                  background: isToday ? 'rgba(99,102,241,0.03)' : 'var(--surface)',
                  position: 'relative'
                }}
              >
                {/* Cell Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{
                    fontSize: 12,
                    fontWeight: isToday ? 900 : 700,
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: isToday ? 'var(--indigo)' : 'transparent',
                    color: isToday ? '#ffffff' : 'var(--text)'
                  }}>
                    {cellDate.getDate()}
                  </span>

                  {isAdmin && (
                    <button
                      onClick={() => handleOpenAddShift(dateStr)}
                      style={{
                        background: 'none', border: 'none', color: 'var(--text3)',
                        cursor: 'pointer', padding: 2, borderRadius: 4, display: 'flex'
                      }}
                      title="Add Shift on this date"
                    >
                      <Plus size={13} />
                    </button>
                  )}
                </div>

                {/* Holiday & Shift Badges */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto', flex: 1 }}>
                  {/* Holiday Badges */}
                  {dayHolidays.map(h => {
                    const isPending = h.status === 'Pending';
                    return (
                      <div
                        key={h.id || h._id}
                        style={{
                          padding: '4px 6px',
                          borderRadius: 6,
                          background: isPending ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                          borderLeft: isPending ? '3px solid #f59e0b' : '3px solid #10b981',
                          color: isPending ? '#f59e0b' : '#10b981',
                          fontSize: 10.5,
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                        title={`${isPending ? 'Pending Holiday' : 'Holiday'} for ${h.staffName}: ${h.reason || (isPending ? 'Pending approval' : 'Approved leave')}`}
                      >
                        {isPending ? (
                          <>
                            <Clock size={10} /> Pending: {h.staffName}
                          </>
                        ) : (
                          <>
                            <Umbrella size={10} /> Holiday: {h.staffName}
                          </>
                        )}
                      </div>
                    );
                  })}

                  {/* Shift Cards */}
                  {dayEvents.map(shift => {
                    const dispStart = convertShiftTime(shift.startTime, shift.timezone || 'CET', activeTz);
                    const dispFinish = convertShiftTime(shift.finishTime, shift.timezone || 'CET', activeTz);

                    return (
                      <div
                        key={shift.id || shift._id}
                        onClick={() => isAdmin && handleOpenEditShift(shift)}
                        style={{
                          padding: '4px 6px',
                          borderRadius: 6,
                          background: `${shift.color}22`,
                          borderLeft: `3px solid ${shift.color}`,
                          color: 'var(--text)',
                          fontSize: 11,
                          cursor: isAdmin ? 'pointer' : 'default',
                          transition: 'transform 0.1s, box-shadow 0.1s'
                        }}
                        className={isAdmin ? "shift-card-hover" : ""}
                      >
                        {/* START & FINISH TIME (VISIBILITY HIGHLIGHT CONVERTED TO ACTIVE TZ) */}
                        <div style={{ fontSize: 10, fontWeight: 800, color: shift.color, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={10} /> {dispStart} – {dispFinish} <span style={{ opacity: 0.7, fontSize: 9 }}>({activeTz})</span>
                        </div>

                        <div style={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 1 }}>
                          {shift.staffName}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {shift.title}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render Week View
  const renderWeekView = () => {
    const curr = new Date(currentDate);
    const first = curr.getDate() - ((curr.getDay() + 6) % 7); // Mon
    const weekDates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(currentDate);
      d.setDate(first + i);
      weekDates.push(d);
    }
    const todayStr = formatDateKey(new Date());

    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%', overflow: 'hidden' }}>
        {/* Header Days */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
          {weekDates.map(d => {
            const dateStr = formatDateKey(d);
            const isToday = dateStr === todayStr;

            return (
              <div key={dateStr} style={{ padding: '10px 8px', textAlign: 'center', borderRight: '1px solid var(--border2)', background: isToday ? 'rgba(99,102,241,0.05)' : 'transparent' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)' }}>
                  {d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}
                </div>
                <div style={{ fontSize: 16, fontWeight: isToday ? 900 : 700, color: isToday ? 'var(--indigo)' : 'var(--text)' }}>
                  {d.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Days Columns */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', flex: 1, overflowY: 'auto', background: 'var(--bg)' }}>
          {weekDates.map(d => {
            const dateStr = formatDateKey(d);
            const dayEvents = filteredEvents.filter(e => e.date === dateStr);
            const dayHolidays = getHolidaysForDate(dateStr);

            return (
              <div key={dateStr} style={{ borderRight: '1px solid var(--border2)', padding: 8, display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--surface)' }}>
                {/* Holiday Badges */}
                {dayHolidays.map(h => {
                  const isPending = h.status === 'Pending';
                  return (
                    <div
                      key={h.id || h._id}
                      style={{
                        padding: '6px 8px',
                        borderRadius: 6,
                        background: isPending ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                        borderLeft: isPending ? '3px solid #f59e0b' : '3px solid #10b981',
                        color: isPending ? '#f59e0b' : '#10b981',
                        fontSize: 11,
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                      title={`${isPending ? 'Pending Holiday' : 'Holiday'} for ${h.staffName}`}
                    >
                      {isPending ? (
                        <>
                          <Clock size={11} /> Pending: {h.staffName}
                        </>
                      ) : (
                        <>
                          <Umbrella size={11} /> Holiday: {h.staffName}
                        </>
                      )}
                    </div>
                  );
                })}

                {/* Shift Cards */}
                {dayEvents.map(shift => {
                  const dispStart = convertShiftTime(shift.startTime, shift.timezone || 'CET', activeTz);
                  const dispFinish = convertShiftTime(shift.finishTime, shift.timezone || 'CET', activeTz);

                  return (
                    <div
                      key={shift.id || shift._id}
                      onClick={() => isAdmin && handleOpenEditShift(shift)}
                      style={{
                        padding: 8,
                        borderRadius: 8,
                        background: `${shift.color}18`,
                        borderLeft: `4px solid ${shift.color}`,
                        cursor: isAdmin ? 'pointer' : 'default'
                      }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 800, color: shift.color, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={11} /> {dispStart} – {dispFinish} <span style={{ opacity: 0.7, fontSize: 9 }}>({activeTz})</span>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)', marginTop: 2 }}>
                        {shift.staffName}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text2)' }}>
                        {shift.title}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render Day View
  const renderDayView = () => {
    const dateStr = formatDateKey(currentDate);
    const dayEvents = filteredEvents.filter(e => e.date === dateStr);
    const dayHolidays = getHolidaysForDate(dateStr);

    return (
      <div style={{ flex: 1, padding: 20, overflowY: 'auto', background: 'var(--bg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', margin: 0 }}>
            Shifts & Leave for {currentDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </h3>
          {isAdmin && (
            <button onClick={() => handleOpenAddShift(dateStr)} className="btn btn-primary btn-sm" style={{ gap: 6 }}>
              <Plus size={13} /> Add Shift
            </button>
          )}
        </div>

        {/* Holiday Badges */}
        {dayHolidays.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {dayHolidays.map(h => {
              const isPending = h.status === 'Pending';
              return (
                <div
                  key={h.id || h._id}
                  style={{
                    padding: 12,
                    borderRadius: 10,
                    background: isPending ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                    border: isPending ? '1px solid #f59e0b' : '1px solid #10b981',
                    color: isPending ? '#f59e0b' : '#10b981',
                    fontWeight: 800,
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}
                >
                  {isPending ? <Clock size={18} /> : <Umbrella size={18} />}
                  {isPending ? `Pending: ${h.staffName}` : `Holiday: ${h.staffName}`} ({h.reason || (isPending ? 'Awaiting Admin Approval' : 'Approved Leave')})
                </div>
              );
            })}
          </div>
        )}

        {dayEvents.length === 0 ? (
          <div style={{ padding: 30, textAlign: 'center', color: 'var(--text3)', background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)' }}>
            No shifts scheduled for this date.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {dayEvents.map(shift => {
              const dispStart = convertShiftTime(shift.startTime, shift.timezone || 'CET', activeTz);
              const dispFinish = convertShiftTime(shift.finishTime, shift.timezone || 'CET', activeTz);

              return (
                <div
                  key={shift.id || shift._id}
                  onClick={() => isAdmin && handleOpenEditShift(shift)}
                  style={{
                    padding: 14,
                    borderRadius: 10,
                    background: 'var(--surface)',
                    borderLeft: `5px solid ${shift.color}`,
                    borderTop: '1px solid var(--border)',
                    borderRight: '1px solid var(--border)',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: isAdmin ? 'pointer' : 'default'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: `${shift.color}22`, color: shift.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                      {shift.staffName.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>
                        {shift.staffName} <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>· {shift.department}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                        {shift.title} {shift.location ? `(${shift.location})` : ''}
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: 13, fontWeight: 900, color: shift.color, background: `${shift.color}15`, padding: '6px 12px', borderRadius: 8 }}>
                    ⏰ {dispStart} – {dispFinish} ({activeTz})
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // Render Timeline View
  const renderTimelineView = () => {
    return (
      <div style={{ flex: 1, padding: 16, overflowY: 'auto', background: 'var(--bg)' }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', marginBottom: 12 }}>
          Roster Timeline View ({activeTz} Timezone)
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filteredEvents.map(shift => {
            const dispStart = convertShiftTime(shift.startTime, shift.timezone || 'CET', activeTz);
            const dispFinish = convertShiftTime(shift.finishTime, shift.timezone || 'CET', activeTz);

            return (
              <div
                key={shift.id || shift._id}
                onClick={() => isAdmin && handleOpenEditShift(shift)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: 'var(--surface)',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  cursor: isAdmin ? 'pointer' : 'default'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: shift.color }} />
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', marginRight: 10 }}>
                      {shift.staffName}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text2)' }}>
                      {shift.title} ({shift.department})
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>
                    📅 {shift.date}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 900, color: shift.color, background: `${shift.color}15`, padding: '4px 8px', borderRadius: 6 }}>
                    ⏰ {dispStart} – {dispFinish} ({activeTz})
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%', background: 'var(--bg)', overflow: 'hidden' }}>
      {/* ════════════════════ LEFT SIDEBAR PANEL ════════════════════ */}
      <div style={{
        width: 280,
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        padding: 14,
        flexShrink: 0,
        overflowY: 'auto'
      }}>
        {/* Brand/Title Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #6366f1, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <CalendarIcon size={18} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>Staff Calendar</div>
              <div style={{ fontSize: 10, color: 'var(--text3)' }}>TeamUp Roster System</div>
            </div>
          </div>
        </div>

        {/* Mini Calendar Widget */}
        {renderMiniCalendar()}

        {/* Staff Filter Search */}
        <div style={{ marginBottom: 10, position: 'relative' }}>
          <Search size={12} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
          <input
            type="text"
            placeholder="Search staff or role..."
            value={staffSearchQuery}
            onChange={e => setStaffSearchQuery(e.target.value)}
            style={{
              width: '100%',
              background: 'var(--bg2)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              padding: '5px 8px 5px 26px',
              fontSize: 11.5,
              color: 'var(--text)',
              outline: 'none'
            }}
          />
        </div>

        {/* Staff List Header & Master Toggles */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, padding: '0 2px' }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Staff ({staffList.length})
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => toggleAllStaff(true)} className="btn btn-ghost btn-sm" style={{ fontSize: 10, padding: '2px 5px' }}>All</button>
            <button onClick={() => toggleAllStaff(false)} className="btn btn-ghost btn-sm" style={{ fontSize: 10, padding: '2px 5px' }}>None</button>
            {isAdmin && staffList.length > 0 && (
              <button onClick={handleClearAllStaff} className="btn btn-ghost btn-sm" style={{ fontSize: 10, padding: '2px 5px', color: 'var(--red)' }} title="Clear all staff members">Clear</button>
            )}
          </div>
        </div>

        {/* Department Accordions & Staff List */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {Object.entries(staffByDept).map(([deptName, members]) => (
            <div key={deptName}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--indigo2)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Building2 size={11} /> {deptName} ({members.length})
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingLeft: 4 }}>
                {members.map(staff => {
                  const id = staff.id || staff._id || '';
                  const isVisible = visibleStaffIds.has(id);

                  return (
                    <div
                      key={id}
                      onClick={() => toggleStaffVisibility(id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '4px 8px',
                        borderRadius: 6,
                        background: isVisible ? `${staff.color}15` : 'transparent',
                        border: `1px solid ${isVisible ? `${staff.color}44` : 'transparent'}`,
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: staff.color }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: isVisible ? 'var(--text)' : 'var(--text3)' }}>
                          {staff.name}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {isVisible ? <Eye size={12} style={{ color: staff.color }} /> : <EyeOff size={12} style={{ color: 'var(--text3)' }} />}
                        {isAdmin && (
                          <button onClick={(e) => handleDeleteStaff(id, e)} style={{ background: 'none', border: 'none', padding: 2, color: 'var(--red)', cursor: 'pointer' }}>
                            <Trash2 size={10} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Add Staff Button (Admin Only) */}
        {isAdmin && (
          <button
            onClick={() => setAddStaffModalOpen(true)}
            className="btn btn-ghost btn-sm"
            style={{ marginTop: 10, gap: 6, width: '100%', justifyContent: 'center', border: '1px dashed var(--border)' }}
          >
            <UserPlus size={13} /> Add Staff Member
          </button>
        )}
      </div>

      {/* ════════════════════ MAIN CALENDAR PANEL ════════════════════ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {/* Top Control Bar (Single Line Layout - Restored Order) */}
        <div style={{
          padding: '10px 16px',
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'nowrap',
          gap: 12,
          overflowX: 'auto'
        }}>
          {/* Navigation & Range */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <button onClick={handleToday} className="btn btn-ghost btn-sm" style={{ fontWeight: 700, padding: '4px 10px' }}>
              Today
            </button>
            <div style={{ display: 'flex', gap: 2 }}>
              <button onClick={handlePrevDate} className="btn btn-ghost btn-icon" style={{ padding: 4 }}>
                <ChevronLeft size={15} />
              </button>
              <button onClick={handleNextDate} className="btn btn-ghost btn-icon" style={{ padding: 4 }}>
                <ChevronRight size={15} />
              </button>
            </div>
            <span style={{ fontSize: 15, fontWeight: 900, color: 'var(--text)', marginLeft: 4, whiteSpace: 'nowrap' }}>
              {getDateRangeLabel()}
            </span>
          </div>

          {/* Right Side Controls Group (Timezone, View Switcher & Action Buttons) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            {/* Timezone Indicator Badge (CET for Admin, SLT for Staff) */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              background: 'rgba(99, 102, 241, 0.12)',
              padding: '4px 10px',
              borderRadius: 8,
              border: '1px solid rgba(99, 102, 241, 0.25)',
              fontSize: 11,
              fontWeight: 800,
              color: 'var(--indigo2)',
              whiteSpace: 'nowrap'
            }}>
              <Globe size={12} style={{ marginRight: 4 }} /> {activeTz === 'CET' ? 'CET (UTC+2)' : 'SLT (UTC+5:30)'}
            </div>

            {/* View Switcher Tabs */}
            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg2)', padding: 2, borderRadius: 8, border: '1px solid var(--border)' }}>
              {(['day', 'week', 'month', 'timeline'] as CalendarViewMode[]).map(v => (
                <button
                  key={v}
                  onClick={() => setViewMode(v)}
                  style={{
                    padding: '3px 10px',
                    borderRadius: 6,
                    border: 'none',
                    background: viewMode === v ? 'var(--surface)' : 'transparent',
                    color: viewMode === v ? 'var(--indigo2)' : 'var(--text2)',
                    fontSize: 11.5,
                    fontWeight: viewMode === v ? 800 : 600,
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                    whiteSpace: 'nowrap',
                    boxShadow: viewMode === v ? '0 2px 6px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.15s'
                  }}
                >
                  {v}
                </button>
              ))}
            </div>

            {/* Action Controls (Role-Gated) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {isAdmin ? (
                <>
                  <button onClick={() => handleOpenAddShift()} className="btn btn-primary btn-sm" style={{ gap: 5, padding: '4px 10px', fontSize: 12 }}>
                    <Plus size={13} /> Add Shift
                  </button>
                  {eventsList.length > 0 && (
                    <button
                      onClick={handleClearAllShifts}
                      className="btn btn-ghost btn-sm"
                      style={{ gap: 5, color: 'var(--red)', padding: '4px 10px', fontSize: 12 }}
                      title="Remove all tasks/shifts"
                    >
                      <Trash2 size={13} /> Clear All Tasks
                    </button>
                  )}
                  <button
                    onClick={() => setAdminHolidaysOpen(true)}
                    className="btn btn-ghost btn-sm"
                    style={{ gap: 5, position: 'relative', padding: '4px 10px', fontSize: 12 }}
                    title="Manage Staff Holiday Requests"
                  >
                    <Umbrella size={13} /> Holiday Requests
                    {pendingHolidaysCount > 0 && (
                      <span style={{
                        background: 'var(--red)', color: '#fff', borderRadius: '50%',
                        padding: '1px 5px', fontSize: 10, fontWeight: 900
                      }}>
                        {pendingHolidaysCount}
                      </span>
                    )}
                  </button>
                </>
              ) : (
                /* Staff Role Controls */
                <button
                  onClick={handleOpenRequestHoliday}
                  className="btn btn-primary btn-sm"
                  style={{ gap: 5, background: 'linear-gradient(135deg, #059669, #10b981)', padding: '4px 10px', fontSize: 12 }}
                >
                  <Umbrella size={13} /> Request Holiday
                </button>
              )}

              <button onClick={handleExportPDF} className="btn btn-ghost btn-sm" style={{ gap: 5, padding: '4px 10px', fontSize: 12 }} title="Export Calendar Roster to PDF">
                <Download size={13} /> PDF
              </button>
            </div>
          </div>
        </div>

        {/* Calendar Main Grid View */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {viewMode === 'month' && renderMonthView()}
          {viewMode === 'week' && renderWeekView()}
          {viewMode === 'day' && renderDayView()}
          {viewMode === 'timeline' && renderTimelineView()}
        </div>
      </div>

      {/* ════════════════════ ADD / EDIT SHIFT MODAL (ADMIN ONLY) ════════════════════ */}
      {shiftModalOpen && createPortal(
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
        }}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: 480, background: 'var(--surface)', borderRadius: 14, padding: 22, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', margin: 0 }}>
                {editingShift ? 'Edit Staff Shift' : 'Schedule Staff Shift'}
              </h3>
              <button onClick={() => setShiftModalOpen(false)} className="btn btn-ghost btn-icon" style={{ padding: 4 }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveShift} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Shift Title</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder="e.g., Morning Ticketing, Flight Ops Supervision"
                  required
                  style={{ width: '100%', padding: '8px 12px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Staff Member</label>
                <select
                  value={formStaffId}
                  onChange={e => setFormStaffId(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13 }}
                >
                  {staffList.map(s => (
                    <option key={s.id || s._id} value={s.id || s._id}>
                      {s.name} ({s.department})
                    </option>
                  ))}
                </select>
              </div>

              {/* Timezone & Time Fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Date</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={e => setFormDate(e.target.value)}
                    required
                    style={{ width: '100%', padding: '8px 10px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 12 }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Timezone</label>
                  <select
                    value={formTimezone}
                    onChange={e => setFormTimezone(e.target.value as 'CET' | 'SLT')}
                    style={{ width: '100%', padding: '8px 10px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 12 }}
                  >
                    <option value="CET">CET (Admin)</option>
                    <option value="SLT">SLT (Staff)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Start Time</label>
                  <input
                    type="time"
                    value={formStartTime}
                    onChange={e => setFormStartTime(e.target.value)}
                    required
                    style={{ width: '100%', padding: '8px 10px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 12 }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Finish Time</label>
                  <input
                    type="time"
                    value={formFinishTime}
                    onChange={e => setFormFinishTime(e.target.value)}
                    required
                    style={{ width: '100%', padding: '8px 10px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 12 }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Location / Counter</label>
                  <input
                    type="text"
                    value={formLocation}
                    onChange={e => setFormLocation(e.target.value)}
                    placeholder="e.g., Counter 3"
                    style={{ width: '100%', padding: '8px 10px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 12 }}
                  />
                </div>
              </div>

              {/* Multi-Weekday Selection Picker (Admin feature for bulk shift assignment) */}
              {!editingShift && (
                <div style={{ background: 'var(--bg2)', padding: 12, borderRadius: 10, border: '1px solid var(--border)' }}>
                  <label style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--indigo2)', display: 'block', marginBottom: 6 }}>
                    📅 Appoint Shift across Weekdays (Optional)
                  </label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {WEEKDAYS.map(w => {
                      const isSelected = formSelectedWeekdays.includes(w.value);
                      return (
                        <button
                          key={w.value}
                          type="button"
                          onClick={() => toggleWeekdaySelection(w.value)}
                          style={{
                            padding: '4px 9px',
                            borderRadius: 6,
                            border: `1px solid ${isSelected ? 'var(--indigo)' : 'var(--border)'}`,
                            background: isSelected ? 'var(--indigo)' : 'var(--surface)',
                            color: isSelected ? '#ffffff' : 'var(--text)',
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.15s'
                          }}
                        >
                          {w.label}
                        </button>
                      );
                    })}
                  </div>
                  {formSelectedWeekdays.length > 0 && (
                    <div style={{ fontSize: 10.5, color: 'var(--text2)', marginTop: 6 }}>
                      ⚡ Shift will be automatically created for all selected weekdays in the month!
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                {editingShift ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteShift(editingShift.id || editingShift._id || '')}
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--red)', gap: 4 }}
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                ) : <div />}

                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" onClick={() => setShiftModalOpen(false)} className="btn btn-ghost btn-sm">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary btn-sm" style={{ gap: 6 }}>
                    <Check size={13} /> Save Shift
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ════════════════════ STAFF HOLIDAY REQUEST MODAL ════════════════════ */}
      {holidayModalOpen && createPortal(
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
        }}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: 420, background: 'var(--surface)', borderRadius: 14, padding: 22, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Umbrella size={18} style={{ color: '#10b981' }} /> Request Holiday Leave
              </h3>
              <button onClick={() => setHolidayModalOpen(false)} className="btn btn-ghost btn-icon" style={{ padding: 4 }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveHolidayRequest} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Staff Member</label>
                <select
                  value={holidayStaffId}
                  onChange={e => setHolidayStaffId(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13 }}
                >
                  {staffList.map(s => (
                    <option key={s.id || s._id} value={s.id || s._id}>
                      {s.name} ({s.department})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Start Date</label>
                  <input
                    type="date"
                    value={holidayStartDate}
                    onChange={e => {
                      const newStart = e.target.value;
                      setHolidayStartDate(newStart);
                      if (holidayEndDate < newStart) {
                        setHolidayEndDate(newStart);
                      }
                    }}
                    required
                    style={{ width: '100%', padding: '8px 10px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 12 }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>End Date</label>
                  <input
                    type="date"
                    value={holidayEndDate}
                    min={holidayStartDate}
                    onChange={e => setHolidayEndDate(e.target.value)}
                    required
                    style={{ width: '100%', padding: '8px 10px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 12 }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Reason / Notes</label>
                <textarea
                  value={holidayReason}
                  onChange={e => setHolidayReason(e.target.value)}
                  placeholder="e.g. Annual leave, Personal holiday"
                  rows={3}
                  style={{ width: '100%', padding: '8px 12px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 12, resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
                <button type="button" onClick={() => setHolidayModalOpen(false)} className="btn btn-ghost btn-sm">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" style={{ gap: 6, background: 'linear-gradient(135deg, #059669, #10b981)' }}>
                  <Check size={13} /> Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ════════════════════ ADMIN HOLIDAY REQUESTS MANAGEMENT MODAL ════════════════════ */}
      {adminHolidaysOpen && createPortal(
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
        }}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: 640, background: 'var(--surface)', borderRadius: 14, padding: 22, border: '1px solid var(--border)', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Umbrella size={18} style={{ color: 'var(--indigo2)' }} /> Staff Holiday Requests Management
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {holidaysList.length > 0 && (
                  <button
                    onClick={handleClearAllHolidays}
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--red)', fontSize: 11, gap: 4 }}
                    title="Remove all holiday requests"
                  >
                    <Trash2 size={12} /> Clear All
                  </button>
                )}
                <button onClick={() => setAdminHolidaysOpen(false)} className="btn btn-ghost btn-icon" style={{ padding: 4 }}>
                  <X size={16} />
                </button>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {holidaysList.length === 0 ? (
                <div style={{ padding: 30, textAlign: 'center', color: 'var(--text3)' }}>
                  No holiday requests found.
                </div>
              ) : (
                holidaysList.map(req => {
                  const id = req.id || req._id || '';
                  const isPending = req.status === 'Pending';
                  const isApproved = req.status === 'Approved';

                  return (
                    <div
                      key={id}
                      style={{
                        padding: 14,
                        borderRadius: 10,
                        background: 'var(--bg2)',
                        border: '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                          {req.staffName}
                          <span style={{
                            fontSize: 10,
                            padding: '2px 8px',
                            borderRadius: 12,
                            fontWeight: 800,
                            background: isPending ? 'rgba(245, 158, 11, 0.15)' : isApproved ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: isPending ? '#f59e0b' : isApproved ? '#10b981' : '#ef4444'
                          }}>
                            {req.status}
                          </span>
                        </div>
                        <div style={{ fontSize: 11.5, color: 'var(--text2)', marginTop: 4 }}>
                          📅 <b>{req.startDate}</b> to <b>{req.endDate}</b>
                        </div>
                        {req.reason && (
                          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2, fontStyle: 'italic' }}>
                            "{req.reason}"
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {isPending && (
                          <>
                            <button
                              onClick={() => handleUpdateHolidayStatus(id, 'Approved')}
                              className="btn btn-primary btn-sm"
                              style={{ background: '#10b981', gap: 4, padding: '4px 10px', fontSize: 11 }}
                            >
                              <CheckCircle size={12} /> Approve
                            </button>
                            <button
                              onClick={() => handleUpdateHolidayStatus(id, 'Rejected')}
                              className="btn btn-ghost btn-sm"
                              style={{ color: '#ef4444', gap: 4, padding: '4px 10px', fontSize: 11 }}
                            >
                              <XCircle size={12} /> Reject
                            </button>
                          </>
                        )}
                        {!isPending && (
                          <button
                            onClick={() => handleUpdateHolidayStatus(id, isApproved ? 'Rejected' : 'Approved')}
                            className="btn btn-ghost btn-sm"
                            style={{ fontSize: 11 }}
                          >
                            Set to {isApproved ? 'Rejected' : 'Approved'}
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteHoliday(id)}
                          style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 4 }}
                          title="Delete Request"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ════════════════════ ADD STAFF MODAL (ADMIN ONLY) ════════════════════ */}
      {addStaffModalOpen && createPortal(
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
        }}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: 400, background: 'var(--surface)', borderRadius: 14, padding: 22, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', margin: 0 }}>Add New Staff Member</h3>
              <button onClick={() => setAddStaffModalOpen(false)} className="btn btn-ghost btn-icon" style={{ padding: 4 }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveNewStaff} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Staff Name</label>
                <input
                  type="text"
                  value={newStaffName}
                  onChange={e => setNewStaffName(e.target.value)}
                  placeholder="e.g. Cecilia Vance"
                  required
                  style={{ width: '100%', padding: '8px 12px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Job Role</label>
                <input
                  type="text"
                  value={newStaffRole}
                  onChange={e => setNewStaffRole(e.target.value)}
                  placeholder="e.g. Senior Ticketing Agent"
                  style={{ width: '100%', padding: '8px 12px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Department</label>
                <select
                  value={newStaffDept}
                  onChange={e => setNewStaffDept(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13 }}
                >
                  {DEPARTMENTS.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>Badge Swatch Color</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {PALETTE.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewStaffColor(c)}
                      style={{
                        width: 24, height: 24, borderRadius: '50%', background: c,
                        border: newStaffColor === c ? '2px solid var(--text)' : '1px solid rgba(0,0,0,0.2)',
                        cursor: 'pointer'
                      }}
                    />
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
                <button type="button" onClick={() => setAddStaffModalOpen(false)} className="btn btn-ghost btn-sm">Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm" style={{ gap: 6 }}><Check size={13} /> Add Staff</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
