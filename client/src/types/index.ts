export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Staff';
  timezone: string;
}

export interface Ticket {
  _id: string;
  passengerName: string;
  email: string;
  phone: string;
  airline: string;
  flightNumber: string;
  pnr: string;
  departureAirport: string;
  arrivalAirport: string;
  departureTimeUTC: string;
  originalTimezone: string;
  remarks: string;
  status: string;
  checkin: boolean;
  remind: boolean;
  returnTicket: boolean;
  returnLeg: boolean;
  returnDepartureAirport: string;
  returnArrivalAirport: string;
  returnFlightNumber: string;
  returnPnr: string;
  returnDepartureTimeUTC: string;
  returnOriginalTimezone: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Airport {
  code: string;
  name: string;
  city: string;
  country: string;
  timezone: string;
}

export interface Airline {
  code: string;
  name: string;
}

export const AIRPORTS: Airport[] = [
  { code: 'CMB', name: 'Bandaranaike International Airport', city: 'Colombo', country: 'Sri Lanka', timezone: 'Asia/Colombo' },
  { code: 'ARN', name: 'Stockholm Arlanda Airport', city: 'Stockholm', country: 'Sweden', timezone: 'Europe/Stockholm' },
  { code: 'GOT', name: 'Goteborg Landvetter Airport', city: 'Gothenburg', country: 'Sweden', timezone: 'Europe/Stockholm' },
  { code: 'LHR', name: 'London Heathrow Airport', city: 'London', country: 'United Kingdom', timezone: 'Europe/London' },
  { code: 'CDG', name: 'Charles de Gaulle Airport', city: 'Paris', country: 'France', timezone: 'Europe/Paris' },
  { code: 'DXB', name: 'Dubai International Airport', city: 'Dubai', country: 'UAE', timezone: 'Asia/Dubai' },
  { code: 'SIN', name: 'Singapore Changi Airport', city: 'Singapore', country: 'Singapore', timezone: 'Asia/Singapore' },
  { code: 'FRA', name: 'Frankfurt Airport', city: 'Frankfurt', country: 'Germany', timezone: 'Europe/Berlin' },
  { code: 'SYD', name: 'Sydney Airport', city: 'Sydney', country: 'Australia', timezone: 'Australia/Sydney' },
  { code: 'AKL', name: 'Auckland Airport', city: 'Auckland', country: 'New Zealand', timezone: 'Pacific/Auckland' },
  { code: 'NRT', name: 'Tokyo Narita Airport', city: 'Tokyo (Narita)', country: 'Japan', timezone: 'Asia/Tokyo' },
  { code: 'PEK', name: 'Beijing Capital International Airport', city: 'Beijing', country: 'China', timezone: 'Asia/Shanghai' },
  { code: 'JFK', name: 'John F. Kennedy International Airport', city: 'New York', country: 'United States', timezone: 'America/New_York' },
  { code: 'LAX', name: 'Los Angeles International Airport', city: 'Los Angeles', country: 'United States', timezone: 'America/Los_Angeles' },
];

export const AIRLINES: Airline[] = [
  { code: 'UL', name: 'SriLankan Airlines' },
  { code: 'SK', name: 'Scandinavian Airlines (SAS)' },
  { code: 'EK', name: 'Emirates' },
  { code: 'QR', name: 'Qatar Airways' },
  { code: 'SQ', name: 'Singapore Airlines' },
  { code: 'LH', name: 'Lufthansa' },
  { code: 'BA', name: 'British Airways' },
  { code: 'DY', name: 'Norwegian Air Shuttle' },
];
