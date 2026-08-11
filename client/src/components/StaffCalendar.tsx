import React, { useState, useEffect, useMemo } from 'react';
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
  UserPlus
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
  department: string;
  color: string;
  location?: string;
  notes?: string;
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



export function StaffCalendar() {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');

  const [staffList, setStaffList] = useState<CalendarStaffMember[]>([]);
  const [eventsList, setEventsList] = useState<CalendarShiftEvent[]>([]);
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

  // Shift Form
  const [formTitle, setFormTitle] = useState('');
  const [formStaffId, setFormStaffId] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formStartTime, setFormStartTime] = useState('08:00');
  const [formFinishTime, setFormFinishTime] = useState('16:30');
  const [formLocation, setFormLocation] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Load Data
  const loadData = async () => {
    setLoading(true);
    try {
      const [staffRes, eventsRes] = await Promise.all([
        apiFetch('/api/staff-calendar/staff'),
        apiFetch('/api/staff-calendar/events')
      ]);

      const staffData: CalendarStaffMember[] = staffRes.staff || [];
      const eventsData: CalendarShiftEvent[] = eventsRes.events || [];

      setStaffList(staffData);
      setVisibleStaffIds(new Set(staffData.map(s => s.id || s._id || '')));
      setEventsList(eventsData);
    } catch (err) {
      console.warn('Backend fetch failed:', err);
      setStaffList([]);
      setEventsList([]);
    } finally {
      setLoading(false);
    }
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

  useEffect(() => {
    loadData();
  }, []);

  // Format Helper: YYYY-MM-DD
  const formatDateKey = (d: Date) => d.toISOString().split('T')[0];

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

  // Open Add Shift Modal
  const handleOpenAddShift = (defaultDate?: string) => {
    setEditingShift(null);
    setFormTitle('Ticketing Shift');
    setFormStaffId(staffList[0]?.id || staffList[0]?._id || '');
    setFormDate(defaultDate || formatDateKey(currentDate));
    setFormStartTime('08:00');
    setFormFinishTime('16:30');
    setFormLocation('Ticketing Desk');
    setFormNotes('');
    setShiftModalOpen(true);
  };

  // Open Edit Shift Modal
  const handleOpenEditShift = (shift: CalendarShiftEvent) => {
    setEditingShift(shift);
    setFormTitle(shift.title);
    setFormStaffId(shift.staffId);
    setFormDate(shift.date);
    setFormStartTime(shift.startTime);
    setFormFinishTime(shift.finishTime);
    setFormLocation(shift.location || '');
    setFormNotes(shift.notes || '');
    setShiftModalOpen(true);
  };

  // Save Shift
  const handleSaveShift = async (e: React.FormEvent) => {
    e.preventDefault();
    const staff = staffList.find(s => (s.id || s._id) === formStaffId);
    if (!staff) return;

    const payload = {
      title: formTitle,
      staffId: formStaffId,
      staffName: staff.name,
      date: formDate,
      startTime: formStartTime,
      finishTime: formFinishTime,
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
      // Local fallback
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

  // Export PDF with Watermark
  const handleExportPDF = async () => {
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const { applySeasonTravelsWatermark } = await import('../utils/pdfWatermark');

      const doc = new jsPDF({ orientation: 'landscape' });

      const tableRows = filteredEvents.map(e => [
        e.date,
        `${e.startTime} - ${e.finishTime}`,
        e.staffName,
        e.department,
        e.title,
        e.location || 'Main Counter'
      ]);

      autoTable(doc, {
        startY: 24,
        head: [['Date', 'Time (Start - Finish)', 'Staff Name', 'Department', 'Shift Title', 'Location']],
        body: tableRows,
        styles: { fontSize: 8.5, cellPadding: 3, textColor: [30, 41, 59] },
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] }
      });

      applySeasonTravelsWatermark(doc, 'Staff Work Roster & Calendar');

      const dateStr = new Date().toISOString().split('T')[0];
      doc.save(`staff-calendar-roster_${dateStr}.pdf`);
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
                </div>

                {/* Shift Pills */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto', flex: 1 }}>
                  {dayEvents.map(shift => (
                    <div
                      key={shift.id || shift._id}
                      onClick={() => handleOpenEditShift(shift)}
                      style={{
                        padding: '4px 6px',
                        borderRadius: 6,
                        background: `${shift.color}22`,
                        borderLeft: `3px solid ${shift.color}`,
                        color: 'var(--text)',
                        fontSize: 11,
                        cursor: 'pointer',
                        transition: 'transform 0.1s, box-shadow 0.1s'
                      }}
                      className="shift-card-hover"
                    >
                      {/* START & FINISH TIME (VISIBILITY HIGHLIGHT) */}
                      <div style={{ fontSize: 10, fontWeight: 800, color: shift.color, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={10} /> {shift.startTime} – {shift.finishTime}
                      </div>

                      <div style={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 1 }}>
                        {shift.staffName}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {shift.title}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render Week View (7 columns)
  const renderWeekView = () => {
    const curr = new Date(currentDate);
    const first = curr.getDate() - ((curr.getDay() + 6) % 7); // Mon

    const weekDays: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(curr);
      d.setDate(first + i);
      weekDays.push(d);
    }

    const todayStr = formatDateKey(new Date());

    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%', overflow: 'hidden' }}>
        {/* Week Day Header */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
          {weekDays.map(d => {
            const dateStr = formatDateKey(d);
            const isToday = dateStr === todayStr;
            const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

            return (
              <div key={dateStr} style={{ padding: '10px 8px', textAlign: 'center', borderRight: '1px solid var(--border2)', background: isToday ? 'rgba(99,102,241,0.05)' : 'transparent' }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: isToday ? 'var(--indigo2)' : 'var(--text3)' }}>
                  {dayNames[d.getDay()]}
                </div>
                <div style={{ fontSize: 16, fontWeight: 900, color: isToday ? 'var(--indigo)' : 'var(--text)', marginTop: 2 }}>
                  {d.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Week Columns Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', flex: 1, overflowY: 'auto', background: 'var(--bg)' }}>
          {weekDays.map(d => {
            const dateStr = formatDateKey(d);
            const dayEvents = filteredEvents.filter(e => e.date === dateStr);

            return (
              <div key={dateStr} style={{ borderRight: '1px solid var(--border2)', padding: 8, display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--surface)' }}>
                <button
                  onClick={() => handleOpenAddShift(dateStr)}
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: 10, padding: '3px 6px', width: '100%', justifyContent: 'center', gap: 4 }}
                >
                  <Plus size={11} /> Add Shift
                </button>

                {dayEvents.length === 0 ? (
                  <div style={{ fontSize: 10.5, color: 'var(--text3)', textAlign: 'center', padding: '20px 0', fontStyle: 'italic' }}>
                    No shifts
                  </div>
                ) : (
                  dayEvents.map(shift => (
                    <div
                      key={shift.id || shift._id}
                      onClick={() => handleOpenEditShift(shift)}
                      style={{
                        padding: 8,
                        borderRadius: 8,
                        background: `${shift.color}15`,
                        borderLeft: `4px solid ${shift.color}`,
                        border: `1px solid ${shift.color}33`,
                        borderLeftWidth: 4,
                        cursor: 'pointer',
                      }}
                    >
                      {/* START & FINISH TIME (VISIBILITY HIGHLIGHT) */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 900, color: shift.color, marginBottom: 3 }}>
                        <Clock size={11} /> {shift.startTime} – {shift.finishTime}
                      </div>

                      <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)' }}>
                        {shift.staffName}
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)' }}>
                        {shift.title}
                      </div>
                      {shift.location && (
                        <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>
                          📍 {shift.location}
                        </div>
                      )}
                    </div>
                  ))
                )}
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

    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: 16, overflowY: 'auto', background: 'var(--bg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', margin: 0 }}>
              {currentDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text2)', margin: 0, marginTop: 2 }}>
              {dayEvents.length} scheduled staff shifts
            </p>
          </div>
          <button onClick={() => handleOpenAddShift(dateStr)} className="btn btn-primary btn-sm" style={{ gap: 6 }}>
            <Plus size={14} /> Add Shift
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {dayEvents.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', background: 'var(--surface)', borderRadius: 12, border: '1px dashed var(--border)', color: 'var(--text3)' }}>
              No shifts scheduled for this day. Click "+ Add Shift" above to schedule staff.
            </div>
          ) : (
            dayEvents.map(shift => (
              <div
                key={shift.id || shift._id}
                onClick={() => handleOpenEditShift(shift)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 18px',
                  borderRadius: 10,
                  background: 'var(--surface)',
                  borderLeft: `6px solid ${shift.color}`,
                  border: '1px solid var(--border)',
                  borderLeftWidth: 6,
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  {/* START & FINISH TIME (VISIBILITY HIGHLIGHT) */}
                  <div style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: `${shift.color}20`,
                    color: shift.color,
                    fontWeight: 900,
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}>
                    <Clock size={14} /> {shift.startTime} – {shift.finishTime}
                  </div>

                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>
                      {shift.staffName}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600 }}>
                      {shift.title} • <span style={{ color: shift.color }}>{shift.department}</span>
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'right' }}>
                  {shift.location && <div>📍 {shift.location}</div>}
                  {shift.notes && <div style={{ fontSize: 11 }}>{shift.notes}</div>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  // Render Timeline View
  const renderTimelineView = () => {
    return (
      <div style={{ flex: 1, padding: 16, overflowY: 'auto', background: 'var(--bg)' }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', marginBottom: 14 }}>
          Upcoming Staff Shift Timeline
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filteredEvents.map(shift => (
            <div
              key={shift.id || shift._id}
              onClick={() => handleOpenEditShift(shift)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderRadius: 10,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                cursor: 'pointer'
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
                {/* START & FINISH TIME (VISIBILITY HIGHLIGHT) */}
                <span style={{ fontSize: 12, fontWeight: 900, color: shift.color, background: `${shift.color}15`, padding: '4px 8px', borderRadius: 6 }}>
                  ⏰ {shift.startTime} – {shift.finishTime}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%', background: 'var(--bg)', overflow: 'hidden' }}>
      {/* ════════════════════ LEFT SIDEBAR PANEL (TEAMUP STYLE) ════════════════════ */}
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
            {staffList.length > 0 && (
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
                        cursor: 'pointer',
                        transition: 'all 0.12s'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: staff.color, flexShrink: 0 }} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 11.5, fontWeight: isVisible ? 700 : 500, color: isVisible ? 'var(--text)' : 'var(--text3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {staff.name}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {isVisible ? <Eye size={12} style={{ color: staff.color }} /> : <EyeOff size={12} style={{ color: 'var(--text3)' }} />}
                        <button
                          onClick={(e) => handleDeleteStaff(id, e)}
                          style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', padding: 2, display: 'flex', opacity: 0.7 }}
                          title="Delete Staff Member"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Add Staff Button */}
        <button
          onClick={() => setAddStaffModalOpen(true)}
          className="btn btn-ghost btn-sm"
          style={{ marginTop: 10, gap: 6, width: '100%', justifyContent: 'center', border: '1px dashed var(--border)' }}
        >
          <UserPlus size={13} /> Add Staff Member
        </button>
      </div>

      {/* ════════════════════ MAIN CALENDAR PANEL ════════════════════ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {/* Top Control Bar */}
        <div style={{
          padding: '12px 18px',
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12
        }}>
          {/* Navigation & Range */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={handleToday} className="btn btn-ghost btn-sm" style={{ fontWeight: 700 }}>
              Today
            </button>
            <div style={{ display: 'flex', gap: 2 }}>
              <button onClick={handlePrevDate} className="btn btn-ghost btn-icon" style={{ padding: 6 }}>
                <ChevronLeft size={16} />
              </button>
              <button onClick={handleNextDate} className="btn btn-ghost btn-icon" style={{ padding: 6 }}>
                <ChevronRight size={16} />
              </button>
            </div>
            <span style={{ fontSize: 16, fontWeight: 900, color: 'var(--text)', marginLeft: 6 }}>
              {getDateRangeLabel()}
            </span>
          </div>

          {/* View Switcher Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg2)', padding: 3, borderRadius: 8, border: '1px solid var(--border)' }}>
            {(['day', 'week', 'month', 'timeline'] as CalendarViewMode[]).map(v => (
              <button
                key={v}
                onClick={() => setViewMode(v)}
                style={{
                  padding: '4px 12px',
                  borderRadius: 6,
                  border: 'none',
                  background: viewMode === v ? 'var(--surface)' : 'transparent',
                  color: viewMode === v ? 'var(--indigo2)' : 'var(--text2)',
                  fontSize: 12,
                  fontWeight: viewMode === v ? 800 : 600,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  boxShadow: viewMode === v ? '0 2px 6px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s'
                }}
              >
                {v}
              </button>
            ))}
          </div>

          {/* Action Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => handleOpenAddShift()} className="btn btn-primary btn-sm" style={{ gap: 6 }}>
              <Plus size={13} /> Add Shift
            </button>
            {eventsList.length > 0 && (
              <button
                onClick={handleClearAllShifts}
                className="btn btn-ghost btn-sm"
                style={{ gap: 6, color: 'var(--red)' }}
                title="Remove all tasks/shifts from the calendar"
              >
                <Trash2 size={13} /> Clear All Tasks
              </button>
            )}
            <button onClick={handleExportPDF} className="btn btn-ghost btn-sm" style={{ gap: 6 }} title="Export Calendar Roster to PDF with Watermark">
              <Download size={13} /> PDF
            </button>
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

      {/* ════════════════════ ADD / EDIT SHIFT MODAL ════════════════════ */}
      {shiftModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
        }}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: 460, background: 'var(--surface)', borderRadius: 14, padding: 22, border: '1px solid var(--border)' }}>
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
                  <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Start Time</label>
                  <input
                    type="time"
                    value={formStartTime}
                    onChange={e => setFormStartTime(e.target.value)}
                    required
                    style={{ width: '100%', padding: '8px 10px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 12 }}
                  />
                </div>

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
              </div>

              <div>
                <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Location / Counter</label>
                <input
                  type="text"
                  value={formLocation}
                  onChange={e => setFormLocation(e.target.value)}
                  placeholder="e.g., Ticketing Counter 3, Terminal Lounge"
                  style={{ width: '100%', padding: '8px 12px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13 }}
                />
              </div>

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
        </div>
      )}

      {/* ════════════════════ ADD STAFF MODAL ════════════════════ */}
      {addStaffModalOpen && (
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
        </div>
      )}
    </div>
  );
}
