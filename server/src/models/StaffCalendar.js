import mongoose from 'mongoose';

// Staff Member Schema for Calendar
const calendarStaffSchema = new mongoose.Schema({
  name: { type: String, required: true },
  role: { type: String, default: 'Staff' },
  department: { type: String, default: 'General' }, // e.g., Ticketing, Flight Ops, Customer Care, Visa & Finance, Executive
  color: { type: String, default: '#6366f1' }, // Swatch color
  active: { type: Boolean, default: true },
}, { timestamps: true });

// Calendar Event / Shift Schema
const calendarEventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  staffId: { type: String, required: true },
  staffName: { type: String, required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  startTime: { type: String, required: true }, // HH:mm e.g. "08:00"
  finishTime: { type: String, required: true }, // HH:mm e.g. "16:30"
  department: { type: String, default: 'General' },
  color: { type: String, default: '#6366f1' },
  location: { type: String, default: '' },
  notes: { type: String, default: '' },
}, { timestamps: true });

calendarEventSchema.index({ date: 1 });
calendarEventSchema.index({ staffId: 1 });

export const CalendarStaff = mongoose.models.CalendarStaff || mongoose.model('CalendarStaff', calendarStaffSchema);
export const CalendarEvent = mongoose.models.CalendarEvent || mongoose.model('CalendarEvent', calendarEventSchema);

export async function findAllCalendarStaff() {
  const docs = await CalendarStaff.find().sort({ department: 1, name: 1 });
  return docs.map(d => formatDoc(d));
}

export async function createCalendarStaff(data) {
  const doc = await CalendarStaff.create({
    name: data.name,
    role: data.role || 'Staff',
    department: data.department || 'General',
    color: data.color || '#6366f1',
    active: data.active !== false,
  });
  return formatDoc(doc);
}

export async function deleteCalendarStaff(id) {
  return CalendarStaff.findByIdAndDelete(id);
}

export async function deleteAllCalendarStaff() {
  return CalendarStaff.deleteMany({});
}

export async function findAllCalendarEvents() {
  const docs = await CalendarEvent.find().sort({ date: 1, startTime: 1 });
  return docs.map(d => formatDoc(d));
}

export async function createCalendarEvent(data) {
  const doc = await CalendarEvent.create({
    title: data.title,
    staffId: String(data.staffId),
    staffName: data.staffName,
    date: data.date,
    startTime: data.startTime,
    finishTime: data.finishTime,
    department: data.department || 'General',
    color: data.color || '#6366f1',
    location: data.location || '',
    notes: data.notes || '',
  });
  return formatDoc(doc);
}

export async function updateCalendarEvent(id, data) {
  const updateData = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.staffId !== undefined) updateData.staffId = String(data.staffId);
  if (data.staffName !== undefined) updateData.staffName = data.staffName;
  if (data.date !== undefined) updateData.date = data.date;
  if (data.startTime !== undefined) updateData.startTime = data.startTime;
  if (data.finishTime !== undefined) updateData.finishTime = data.finishTime;
  if (data.department !== undefined) updateData.department = data.department;
  if (data.color !== undefined) updateData.color = data.color;
  if (data.location !== undefined) updateData.location = data.location;
  if (data.notes !== undefined) updateData.notes = data.notes;

  const doc = await CalendarEvent.findByIdAndUpdate(id, updateData, { returnDocument: 'after' });
  return doc ? formatDoc(doc) : null;
}

export async function deleteCalendarEvent(id) {
  return CalendarEvent.findByIdAndDelete(id);
}

export async function deleteAllCalendarEvents() {
  return CalendarEvent.deleteMany({});
}

function formatDoc(doc) {
  const obj = doc.toObject ? doc.toObject() : doc;
  return {
    ...obj,
    id: obj._id ? obj._id.toString() : obj.id,
    _id: obj._id ? obj._id.toString() : obj.id,
  };
}
