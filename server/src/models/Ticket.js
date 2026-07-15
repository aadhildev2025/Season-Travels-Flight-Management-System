import mongoose from 'mongoose';

const ticketSchema = new mongoose.Schema({
  passengerName: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    default: '',
    trim: true,
  },
  phone: {
    type: String,
    default: '',
  },
  airline: {
    type: String,
    default: '',
  },
  flightNumber: {
    type: String,
    default: '',
  },
  pnr: {
    type: String,
    default: '',
  },
  departureAirport: {
    type: String,
    default: '',
  },
  arrivalAirport: {
    type: String,
    default: '',
  },
  departureTimeUTC: {
    type: String,
    default: '',
  },
  originalTimezone: {
    type: String,
    default: 'Asia/Colombo',
  },
  returnTicket: {
    type: Boolean,
    default: false,
  },
  remarks: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    default: 'No Need Further Actions',
  },
  checkin: {
    type: Boolean,
    default: false,
  },
  remind: {
    type: Boolean,
    default: false,
  },
  createdBy: {
    type: String,
    default: '',
  },
}, { timestamps: true });

export default mongoose.model('Ticket', ticketSchema);
