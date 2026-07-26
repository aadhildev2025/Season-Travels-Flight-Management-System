import mongoose from 'mongoose';

const ticketSchema = new mongoose.Schema({
  passengerName: { type: String, required: true },
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
  airline: { type: String, default: '' },
  flightNumber: { type: String, default: '' },
  pnr: { type: String, default: '' },
  departureAirport: { type: String, default: '' },
  arrivalAirport: { type: String, default: '' },
  departureTimeUTC: { type: String, default: '' },
  originalTimezone: { type: String, default: 'Asia/Colombo' },
  remarks: { type: String, default: '' },
  status: { type: String, default: 'No Need Further Actions' },
  checkin: { type: Boolean, default: false },
  remind: { type: Boolean, default: false },
  returnTicket: { type: Boolean, default: false },
  returnLeg: { type: Boolean, default: false },
  returnDepartureAirport: { type: String, default: '' },
  returnArrivalAirport: { type: String, default: '' },
  returnFlightNumber: { type: String, default: '' },
  returnPnr: { type: String, default: '' },
  returnDepartureTimeUTC: { type: String, default: '' },
  returnOriginalTimezone: { type: String, default: '' },
  thankYouSent: { type: Boolean, default: false },
  reminderSent: { type: Boolean, default: false },
  createdBy: { type: String, default: null },
}, { timestamps: true });

ticketSchema.index({ pnr: 1 });
ticketSchema.index({ passengerName: 1 });
ticketSchema.index({ departureTimeUTC: 1 });
ticketSchema.index({ createdAt: -1 });

export const Ticket = mongoose.models.Ticket || mongoose.model('Ticket', ticketSchema);

export async function findAllTickets() {
  const docs = await Ticket.find().sort({ departureTimeUTC: 1 });
  return docs.map(formatTicket);
}

export async function findTicketById(id) {
  try {
    const doc = await Ticket.findById(id);
    return doc ? formatTicket(doc) : null;
  } catch {
    return null;
  }
}

export async function createTicket(data) {
  const doc = await Ticket.create({
    passengerName: data.passengerName,
    email: data.email || '',
    phone: data.phone || '',
    airline: data.airline || '',
    flightNumber: data.flightNumber || '',
    pnr: data.pnr || '',
    departureAirport: data.departureAirport || '',
    arrivalAirport: data.arrivalAirport || '',
    departureTimeUTC: data.departureTimeUTC || '',
    originalTimezone: data.originalTimezone || 'Asia/Colombo',
    remarks: data.remarks || '',
    status: data.status || 'No Need Further Actions',
    checkin: data.checkin || false,
    remind: data.remind || false,
    returnTicket: data.returnTicket || false,
    returnLeg: data.returnLeg || false,
    returnDepartureAirport: data.returnDepartureAirport || '',
    returnArrivalAirport: data.returnArrivalAirport || '',
    returnFlightNumber: data.returnFlightNumber || '',
    returnPnr: data.returnPnr || '',
    returnDepartureTimeUTC: data.returnDepartureTimeUTC || '',
    returnOriginalTimezone: data.returnOriginalTimezone || '',
    thankYouSent: data.thankYouSent || false,
    reminderSent: data.reminderSent || false,
    createdBy: data.createdBy ? String(data.createdBy) : null,
  });
  return formatTicket(doc);
}

export async function updateTicket(id, data) {
  const updateData = {};
  const allowedFields = [
    'passengerName', 'email', 'phone', 'airline', 'flightNumber', 'pnr',
    'departureAirport', 'arrivalAirport', 'departureTimeUTC', 'originalTimezone',
    'remarks', 'status', 'checkin', 'remind',
    'returnTicket', 'returnLeg',
    'returnDepartureAirport', 'returnArrivalAirport',
    'returnFlightNumber', 'returnPnr',
    'returnDepartureTimeUTC', 'returnOriginalTimezone',
  ];

  for (const key of allowedFields) {
    if (data[key] !== undefined) {
      updateData[key] = data[key];
    }
  }

  const doc = await Ticket.findByIdAndUpdate(id, updateData, { returnDocument: 'after' });
  return doc ? formatTicket(doc) : null;
}

export async function deleteTicket(id) {
  return Ticket.findByIdAndDelete(id);
}

export async function countTickets() {
  return Ticket.countDocuments();
}

export async function countTicketsWhere(where) {
  const query = buildMongooseWhere(where);
  return Ticket.countDocuments(query);
}

export async function findManyTicketsWhere(where, orderBy, take) {
  const query = buildMongooseWhere(where);
  let q = Ticket.find(query);
  if (orderBy) {
    q = q.sort(orderBy);
  }
  if (take) {
    q = q.limit(take);
  }
  const docs = await q;
  return docs.map(formatTicket);
}

export async function groupByStatus() {
  const results = await Ticket.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
  return results.map(r => ({
    status: r._id,
    _count: { status: r.count },
  }));
}

export async function groupByRoute(limit = 5) {
  const results = await Ticket.aggregate([
    {
      $group: {
        _id: { from: '$departureAirport', to: '$arrivalAirport' },
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    { $limit: limit },
  ]);
  return results.map(r => ({
    from: r._id.from,
    to: r._id.to,
    count: r.count,
  }));
}

export async function findRecentTickets(limit = 5) {
  const docs = await Ticket.find().sort({ createdAt: -1 }).limit(limit);
  return docs.map(formatTicket);
}

export async function findTicketsToThank() {
  const now = new Date();
  const docs = await Ticket.find({
    departureTimeUTC: { $lte: now.toISOString() },
    thankYouSent: false,
    email: { $ne: '' },
  });
  return docs.map(formatTicket);
}

export async function findUpcomingReminders() {
  const now = new Date();
  const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const docs = await Ticket.find({
    departureTimeUTC: { $gte: now.toISOString(), $lte: in24Hours.toISOString() },
    reminderSent: false,
    email: { $ne: '' },
  });
  return docs.map(formatTicket);
}

export async function markThankYouSent(id) {
  const doc = await Ticket.findByIdAndUpdate(id, { thankYouSent: true }, { returnDocument: 'after' });
  return doc ? formatTicket(doc) : null;
}

export async function markReminderSent(id) {
  const doc = await Ticket.findByIdAndUpdate(id, { reminderSent: true }, { returnDocument: 'after' });
  return doc ? formatTicket(doc) : null;
}

export async function deleteManyTickets(where) {
  const query = buildMongooseWhere(where);
  return Ticket.deleteMany(query);
}

function buildMongooseWhere(where = {}) {
  const query = {};
  for (const [key, val] of Object.entries(where)) {
    if (val && typeof val === 'object') {
      if (val.contains) {
        query[key] = { $regex: val.contains, $options: 'i' };
      } else if (val.gte || val.lte || val.gt || val.lt) {
        query[key] = {};
        if (val.gte) query[key].$gte = val.gte;
        if (val.lte) query[key].$lte = val.lte;
        if (val.gt) query[key].$gt = val.gt;
        if (val.lt) query[key].$lt = val.lt;
      } else if (val.in) {
        query[key] = { $in: val.in };
      } else if (val.not !== undefined) {
        query[key] = { $ne: val.not };
      }
    } else {
      query[key] = val;
    }
  }
  return query;
}

function formatTicket(doc) {
  const obj = doc.toObject ? doc.toObject() : doc;
  const idStr = obj._id ? obj._id.toString() : (obj.id ? String(obj.id) : '');
  return {
    id: idStr,
    _id: idStr,
    passengerName: obj.passengerName,
    email: obj.email || '',
    phone: obj.phone || '',
    airline: obj.airline || '',
    flightNumber: obj.flightNumber || '',
    pnr: obj.pnr || '',
    departureAirport: obj.departureAirport || '',
    arrivalAirport: obj.arrivalAirport || '',
    departureTimeUTC: obj.departureTimeUTC || '',
    originalTimezone: obj.originalTimezone || 'Asia/Colombo',
    remarks: obj.remarks || '',
    status: obj.status || 'No Need Further Actions',
    checkin: obj.checkin || false,
    remind: obj.remind || false,
    returnTicket: obj.returnTicket || false,
    returnLeg: obj.returnLeg || false,
    returnDepartureAirport: obj.returnDepartureAirport || '',
    returnArrivalAirport: obj.returnArrivalAirport || '',
    returnFlightNumber: obj.returnFlightNumber || '',
    returnPnr: obj.returnPnr || '',
    returnDepartureTimeUTC: obj.returnDepartureTimeUTC || '',
    returnOriginalTimezone: obj.returnOriginalTimezone || '',
    thankYouSent: obj.thankYouSent || false,
    reminderSent: obj.reminderSent || false,
    createdBy: obj.createdBy || null,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
}
