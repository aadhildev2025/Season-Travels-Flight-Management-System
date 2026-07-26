import prisma from '../config/db.js';

export async function findAllTickets() {
  return prisma.ticket.findMany({
    orderBy: { departureTimeUTC: 'asc' },
    include: { airline: true, createdBy: true },
  });
}

export async function findTicketById(id) {
  return prisma.ticket.findUnique({
    where: { id: Number(id) },
    include: { airline: true, createdBy: true },
  });
}

export async function createTicket(data) {
  let airlineId = null;

  if (data.airline) {
    let airline = await prisma.airline.findFirst({
      where: { code: data.airline },
    });
    if (!airline) {
      airline = await prisma.airline.create({
        data: {
          code: data.airline,
          name: data.airline,
        },
      });
    }
    airlineId = airline.id;
  }

  return prisma.ticket.create({
    data: {
      passengerName: data.passengerName,
      email: data.email || '',
      phone: data.phone || '',
      airlineId,
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
      createdById: data.createdBy ? Number(data.createdBy) : null,
    },
    include: { airline: true, createdBy: true },
  });
}

export async function updateTicket(id, data) {
  const updateData = {};

  const allowedFields = [
    'passengerName', 'email', 'phone', 'flightNumber', 'pnr',
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

  if (data.airline) {
    let airline = await prisma.airline.findFirst({
      where: { code: data.airline },
    });
    if (!airline) {
      airline = await prisma.airline.create({
        data: {
          code: data.airline,
          name: data.airline,
        },
      });
    }
    updateData.airlineId = airline.id;
  }

  return prisma.ticket.update({
    where: { id: Number(id) },
    data: updateData,
    include: { airline: true, createdBy: true },
  });
}

export async function deleteTicket(id) {
  return prisma.ticket.delete({
    where: { id: Number(id) },
  });
}

export async function countTickets() {
  return prisma.ticket.count();
}

export async function countTicketsWhere(where) {
  return prisma.ticket.count({ where });
}

export async function findManyTicketsWhere(where, orderBy, take) {
  return prisma.ticket.findMany({
    where,
    orderBy,
    take: take || undefined,
    include: { airline: true },
  });
}

export async function groupByStatus() {
  return prisma.ticket.groupBy({
    by: ['status'],
    _count: { status: true },
    orderBy: { _count: { status: 'desc' } },
  });
}

export async function groupByRoute(limit) {
  return prisma.$queryRaw`
    SELECT departureAirport as from, arrivalAirport as to, COUNT(*) as count
    FROM tickets
    GROUP BY departureAirport, arrivalAirport
    ORDER BY count DESC
    LIMIT ${limit || 5}
  `;
}

export async function findRecentTickets(limit) {
  return prisma.ticket.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit || 5,
    select: {
      id: true,
      passengerName: true,
      pnr: true,
      departureAirport: true,
      arrivalAirport: true,
      departureTimeUTC: true,
      createdAt: true,
      airline: true,
    },
  });
}

export async function findTicketsToThank() {
  const now = new Date();

  return prisma.ticket.findMany({
    where: {
      departureTimeUTC: { lte: now.toISOString() },
      thankYouSent: false,
      email: { not: '' },
    },
    include: { airline: true },
  });
}

export async function findUpcomingReminders() {
  const now = new Date();
  const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  return prisma.ticket.findMany({
    where: {
      departureTimeUTC: { gte: now.toISOString(), lte: in24Hours.toISOString() },
      reminderSent: false,
      email: { not: '' },
    },
    include: { airline: true },
  });
}

export async function markThankYouSent(id) {
  return prisma.ticket.update({
    where: { id: Number(id) },
    data: { thankYouSent: true },
  });
}

export async function markReminderSent(id) {
  return prisma.ticket.update({
    where: { id: Number(id) },
    data: { reminderSent: true },
  });
}

export async function deleteManyTickets(where) {
  return prisma.ticket.deleteMany({ where });
}
