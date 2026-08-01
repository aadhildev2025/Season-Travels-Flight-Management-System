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
  // Sri Lanka & Subcontinent
  { code: 'CMB', name: 'Bandaranaike International Airport', city: 'Colombo', country: 'Sri Lanka', timezone: 'Asia/Colombo' },
  { code: 'HRI', name: 'Mattala Rajapaksa International Airport', city: 'Hambantota', country: 'Sri Lanka', timezone: 'Asia/Colombo' },
  { code: 'JAF', name: 'Jaffna International Airport', city: 'Jaffna', country: 'Sri Lanka', timezone: 'Asia/Colombo' },
  { code: 'DAC', name: 'Hazrat Shahjalal International Airport', city: 'Dhaka', country: 'Bangladesh', timezone: 'Asia/Dhaka' },
  { code: 'KTM', name: 'Tribhuvan International Airport', city: 'Kathmandu', country: 'Nepal', timezone: 'Asia/Kathmandu' },

  // Sweden
  { code: 'ARN', name: 'Stockholm Arlanda Airport', city: 'Stockholm', country: 'Sweden', timezone: 'Europe/Stockholm' },
  { code: 'BMA', name: 'Stockholm Bromma Airport', city: 'Stockholm', country: 'Sweden', timezone: 'Europe/Stockholm' },
  { code: 'GOT', name: 'Göteborg Landvetter Airport', city: 'Gothenburg', country: 'Sweden', timezone: 'Europe/Stockholm' },
  { code: 'MMX', name: 'Malmö Airport', city: 'Malmö', country: 'Sweden', timezone: 'Europe/Stockholm' },
  { code: 'VXO', name: 'Växjö Småland Airport', city: 'Växjö', country: 'Sweden', timezone: 'Europe/Stockholm' },
  { code: 'LPI', name: 'Linköping City Airport', city: 'Linköping', country: 'Sweden', timezone: 'Europe/Stockholm' },
  { code: 'NRK', name: 'Norrköping Airport', city: 'Norrköping', country: 'Sweden', timezone: 'Europe/Stockholm' },
  { code: 'KRN', name: 'Kiruna Airport', city: 'Kiruna', country: 'Sweden', timezone: 'Europe/Stockholm' },
  { code: 'LLA', name: 'Luleå Airport', city: 'Luleå', country: 'Sweden', timezone: 'Europe/Stockholm' },
  { code: 'UME', name: 'Umeå Airport', city: 'Umeå', country: 'Sweden', timezone: 'Europe/Stockholm' },
  { code: 'OSD', name: 'Åre Östersund Airport', city: 'Östersund', country: 'Sweden', timezone: 'Europe/Stockholm' },
  { code: 'RNB', name: 'Ronneby Airport', city: 'Ronneby', country: 'Sweden', timezone: 'Europe/Stockholm' },
  { code: 'KLR', name: 'Kalmar Öland Airport', city: 'Kalmar', country: 'Sweden', timezone: 'Europe/Stockholm' },
  { code: 'SDL', name: 'Sundsvall Timrå Airport', city: 'Sundsvall', country: 'Sweden', timezone: 'Europe/Stockholm' },

  // Denmark
  { code: 'CPH', name: 'Copenhagen Airport', city: 'Copenhagen', country: 'Denmark', timezone: 'Europe/Copenhagen' },
  { code: 'BLL', name: 'Billund Airport', city: 'Billund', country: 'Denmark', timezone: 'Europe/Copenhagen' },
  { code: 'AAL', name: 'Aalborg Airport', city: 'Aalborg', country: 'Denmark', timezone: 'Europe/Copenhagen' },
  { code: 'AAR', name: 'Aarhus Airport', city: 'Aarhus', country: 'Denmark', timezone: 'Europe/Copenhagen' },
  { code: 'RNN', name: 'Bornholm Airport', city: 'Rønne', country: 'Denmark', timezone: 'Europe/Copenhagen' },
  { code: 'EBJ', name: 'Esbjerg Airport', city: 'Esbjerg', country: 'Denmark', timezone: 'Europe/Copenhagen' },
  { code: 'SGD', name: 'Sønderborg Airport', city: 'Sønderborg', country: 'Denmark', timezone: 'Europe/Copenhagen' },
  { code: 'KRP', name: 'Midtjyllands Airport', city: 'Karup', country: 'Denmark', timezone: 'Europe/Copenhagen' },
  { code: 'ODE', name: 'Hans Christian Andersen Airport', city: 'Odense', country: 'Denmark', timezone: 'Europe/Copenhagen' },
  { code: 'CNL', name: 'Sindal Airport', city: 'Sindal', country: 'Denmark', timezone: 'Europe/Copenhagen' },

  // Norway
  { code: 'OSL', name: 'Oslo Airport, Gardermoen', city: 'Oslo', country: 'Norway', timezone: 'Europe/Oslo' },
  { code: 'BGO', name: 'Bergen Airport, Flesland', city: 'Bergen', country: 'Norway', timezone: 'Europe/Oslo' },
  { code: 'TRD', name: 'Trondheim Airport, Værnes', city: 'Trondheim', country: 'Norway', timezone: 'Europe/Oslo' },
  { code: 'SVG', name: 'Stavanger Airport, Sola', city: 'Stavanger', country: 'Norway', timezone: 'Europe/Oslo' },
  { code: 'TOS', name: 'Tromsø Airport, Langnes', city: 'Tromsø', country: 'Norway', timezone: 'Europe/Oslo' },
  { code: 'BOO', name: 'Bodø Airport', city: 'Bodø', country: 'Norway', timezone: 'Europe/Oslo' },
  { code: 'AES', name: 'Ålesund Airport, Vigra', city: 'Ålesund', country: 'Norway', timezone: 'Europe/Oslo' },
  { code: 'KRS', name: 'Kristiansand Airport, Kjevik', city: 'Kristiansand', country: 'Norway', timezone: 'Europe/Oslo' },
  { code: 'HAU', name: 'Haugesund Airport, Karmøy', city: 'Haugesund', country: 'Norway', timezone: 'Europe/Oslo' },
  { code: 'MOL', name: 'Molde Airport, Årø', city: 'Molde', country: 'Norway', timezone: 'Europe/Oslo' },
  { code: 'EVE', name: 'Harstad/Narvik Airport, Evenes', city: 'Evenes', country: 'Norway', timezone: 'Europe/Oslo' },
  { code: 'LKL', name: 'Lakselv Airport, Banak', city: 'Lakselv', country: 'Norway', timezone: 'Europe/Oslo' },
  { code: 'ALF', name: 'Alta Airport', city: 'Alta', country: 'Norway', timezone: 'Europe/Oslo' },
  { code: 'KKN', name: 'Kirkenes Airport, Høybuktmoen', city: 'Kirkenes', country: 'Norway', timezone: 'Europe/Oslo' },
  { code: 'LYR', name: 'Svalbard Airport, Longyear', city: 'Longyearbyen', country: 'Norway', timezone: 'Europe/Oslo' },

  // Finland
  { code: 'HEL', name: 'Helsinki Airport', city: 'Helsinki', country: 'Finland', timezone: 'Europe/Helsinki' },
  { code: 'TMP', name: 'Tampere-Pirkkala Airport', city: 'Tampere', country: 'Finland', timezone: 'Europe/Helsinki' },
  { code: 'TKU', name: 'Turku Airport', city: 'Turku', country: 'Finland', timezone: 'Europe/Helsinki' },
  { code: 'OUL', name: 'Oulu Airport', city: 'Oulu', country: 'Finland', timezone: 'Europe/Helsinki' },
  { code: 'RVN', name: 'Rovaniemi Airport', city: 'Rovaniemi', country: 'Finland', timezone: 'Europe/Helsinki' },
  { code: 'KTT', name: 'Kittilä Airport', city: 'Kittilä', country: 'Finland', timezone: 'Europe/Helsinki' },
  { code: 'IVL', name: 'Ivalo Airport', city: 'Ivalo', country: 'Finland', timezone: 'Europe/Helsinki' },
  { code: 'KUO', name: 'Kuopio Airport', city: 'Kuopio', country: 'Finland', timezone: 'Europe/Helsinki' },
  { code: 'JYV', name: 'Jyväskylä Airport', city: 'Jyväskylä', country: 'Finland', timezone: 'Europe/Helsinki' },
  { code: 'JOE', name: 'Joensuu Airport', city: 'Joensuu', country: 'Finland', timezone: 'Europe/Helsinki' },
  { code: 'VAA', name: 'Vaasa Airport', city: 'Vaasa', country: 'Finland', timezone: 'Europe/Helsinki' },
  { code: 'KAJ', name: 'Kajaani Airport', city: 'Kajaani', country: 'Finland', timezone: 'Europe/Helsinki' },
  { code: 'KEM', name: 'Kemi-Tornio Airport', city: 'Kemi', country: 'Finland', timezone: 'Europe/Helsinki' },
  { code: 'POR', name: 'Pori Airport', city: 'Pori', country: 'Finland', timezone: 'Europe/Helsinki' },
  { code: 'MHQ', name: 'Mariehamn Airport', city: 'Mariehamn', country: 'Finland', timezone: 'Europe/Helsinki' },

  // Italy
  { code: 'CIA', name: 'Rome Ciampino Airport', city: 'Rome', country: 'Italy', timezone: 'Europe/Rome' },
  { code: 'MXP', name: 'Milan Malpensa Airport', city: 'Milan', country: 'Italy', timezone: 'Europe/Rome' },
  { code: 'LIN', name: 'Milan Linate Airport', city: 'Milan', country: 'Italy', timezone: 'Europe/Rome' },
  { code: 'BGY', name: 'Milan Bergamo Airport', city: 'Milan', country: 'Italy', timezone: 'Europe/Rome' },
  { code: 'VCE', name: 'Venice Marco Polo Airport', city: 'Venice', country: 'Italy', timezone: 'Europe/Rome' },
  { code: 'TSF', name: 'Treviso Airport', city: 'Venice/Treviso', country: 'Italy', timezone: 'Europe/Rome' },
  { code: 'NAP', name: 'Naples International Airport', city: 'Naples', country: 'Italy', timezone: 'Europe/Rome' },
  { code: 'BLQ', name: 'Bologna Guglielmo Marconi Airport', city: 'Bologna', country: 'Italy', timezone: 'Europe/Rome' },
  { code: 'FLR', name: 'Florence Airport', city: 'Florence', country: 'Italy', timezone: 'Europe/Rome' },
  { code: 'PSA', name: 'Pisa International Airport', city: 'Pisa', country: 'Italy', timezone: 'Europe/Rome' },
  { code: 'CTA', name: 'Catania–Fontanarossa Airport', city: 'Catania', country: 'Italy', timezone: 'Europe/Rome' },
  { code: 'PMO', name: 'Palermo Falcone Borsellino Airport', city: 'Palermo', country: 'Italy', timezone: 'Europe/Rome' },
  { code: 'BRI', name: 'Bari Karol Wojtyła Airport', city: 'Bari', country: 'Italy', timezone: 'Europe/Rome' },
  { code: 'TRN', name: 'Turin Airport', city: 'Turin', country: 'Italy', timezone: 'Europe/Rome' },
  { code: 'VRN', name: 'Verona Villafranca Airport', city: 'Verona', country: 'Italy', timezone: 'Europe/Rome' },
  { code: 'CAG', name: 'Cagliari Elmas Airport', city: 'Cagliari', country: 'Italy', timezone: 'Europe/Rome' },
  { code: 'OLB', name: 'Olbia Costa Smeralda Airport', city: 'Olbia', country: 'Italy', timezone: 'Europe/Rome' },
  { code: 'AHO', name: 'Alghero-Fertilia Airport', city: 'Alghero', country: 'Italy', timezone: 'Europe/Rome' },
  { code: 'GOA', name: 'Genoa Cristoforo Colombo Airport', city: 'Genoa', country: 'Italy', timezone: 'Europe/Rome' },
  { code: 'FCO', name: 'Leonardo da Vinci–Fiumicino Airport', city: 'Rome', country: 'Italy', timezone: 'Europe/Rome' },

  // Germany
  { code: 'FRA', name: 'Frankfurt Airport', city: 'Frankfurt', country: 'Germany', timezone: 'Europe/Berlin' },
  { code: 'MUC', name: 'Munich Airport', city: 'Munich', country: 'Germany', timezone: 'Europe/Berlin' },
  { code: 'BER', name: 'Berlin Brandenburg Airport', city: 'Berlin', country: 'Germany', timezone: 'Europe/Berlin' },
  { code: 'DUS', name: 'Düsseldorf Airport', city: 'Düsseldorf', country: 'Germany', timezone: 'Europe/Berlin' },
  { code: 'HAM', name: 'Hamburg Airport', city: 'Hamburg', country: 'Germany', timezone: 'Europe/Berlin' },

  // France
  { code: 'CDG', name: 'Charles de Gaulle Airport', city: 'Paris', country: 'France', timezone: 'Europe/Paris' },
  { code: 'ORY', name: 'Paris Orly Airport', city: 'Paris', country: 'France', timezone: 'Europe/Paris' },
  { code: 'NCE', name: 'Nice Côte d\'Azur Airport', city: 'Nice', country: 'France', timezone: 'Europe/Paris' },
  { code: 'LYS', name: 'Lyon–Saint Exupéry Airport', city: 'Lyon', country: 'France', timezone: 'Europe/Paris' },
  { code: 'MRS', name: 'Marseille Provence Airport', city: 'Marseille', country: 'France', timezone: 'Europe/Paris' },

  // Switzerland
  { code: 'ZRH', name: 'Zurich Airport', city: 'Zurich', country: 'Switzerland', timezone: 'Europe/Zurich' },
  { code: 'GVA', name: 'Geneva Airport', city: 'Geneva', country: 'Switzerland', timezone: 'Europe/Zurich' },

  // Romania
  { code: 'OTP', name: 'Henri Coandă International Airport', city: 'Bucharest', country: 'Romania', timezone: 'Europe/Bucharest' },
  { code: 'CLJ', name: 'Cluj-Napoca International Airport', city: 'Cluj-Napoca', country: 'Romania', timezone: 'Europe/Bucharest' },
  { code: 'TSR', name: 'Timișoara Traian Vuia Airport', city: 'Timișoara', country: 'Romania', timezone: 'Europe/Bucharest' },
  { code: 'IAS', name: 'Iași International Airport', city: 'Iași', country: 'Romania', timezone: 'Europe/Bucharest' },

  // Spain
  { code: 'MAD', name: 'Adolfo Suárez Madrid–Barajas Airport', city: 'Madrid', country: 'Spain', timezone: 'Europe/Madrid' },
  { code: 'BCN', name: 'Josep Tarradellas Barcelona–El Prat Airport', city: 'Barcelona', country: 'Spain', timezone: 'Europe/Madrid' },
  { code: 'PMI', name: 'Palma de Mallorca Airport', city: 'Palma de Mallorca', country: 'Spain', timezone: 'Europe/Madrid' },
  { code: 'AGP', name: 'Málaga Airport', city: 'Málaga', country: 'Spain', timezone: 'Europe/Madrid' },
  { code: 'ALC', name: 'Alicante–Elche Airport', city: 'Alicante', country: 'Spain', timezone: 'Europe/Madrid' },

  // Netherlands
  { code: 'AMS', name: 'Amsterdam Airport Schiphol', city: 'Amsterdam', country: 'Netherlands', timezone: 'Europe/Amsterdam' },
  { code: 'EIN', name: 'Eindhoven Airport', city: 'Eindhoven', country: 'Netherlands', timezone: 'Europe/Amsterdam' },
  { code: 'RTM', name: 'Rotterdam The Hague Airport', city: 'Rotterdam', country: 'Netherlands', timezone: 'Europe/Amsterdam' },

  // United Kingdom
  { code: 'LHR', name: 'London Heathrow Airport', city: 'London', country: 'United Kingdom', timezone: 'Europe/London' },
  { code: 'LGW', name: 'London Gatwick Airport', city: 'London', country: 'United Kingdom', timezone: 'Europe/London' },
  { code: 'STN', name: 'London Stansted Airport', city: 'London', country: 'United Kingdom', timezone: 'Europe/London' },
  { code: 'LTN', name: 'London Luton Airport', city: 'London', country: 'United Kingdom', timezone: 'Europe/London' },
  { code: 'MAN', name: 'Manchester Airport', city: 'Manchester', country: 'United Kingdom', timezone: 'Europe/London' },
  { code: 'BHX', name: 'Birmingham Airport', city: 'Birmingham', country: 'United Kingdom', timezone: 'Europe/London' },

  // Baltics
  { code: 'VNO', name: 'Vilnius Airport', city: 'Vilnius', country: 'Lithuania', timezone: 'Europe/Vilnius' },
  { code: 'KUN', name: 'Kaunas Airport', city: 'Kaunas', country: 'Lithuania', timezone: 'Europe/Vilnius' },
  { code: 'PLQ', name: 'Palanga International Airport', city: 'Palanga', country: 'Lithuania', timezone: 'Europe/Vilnius' },
  { code: 'TLL', name: 'Tallinn Airport', city: 'Tallinn', country: 'Estonia', timezone: 'Europe/Tallinn' },

  // Greece
  { code: 'ATH', name: 'Athens International Airport', city: 'Athens', country: 'Greece', timezone: 'Europe/Athens' },
  { code: 'SKG', name: 'Thessaloniki Airport', city: 'Thessaloniki', country: 'Greece', timezone: 'Europe/Athens' },
  { code: 'HER', name: 'Heraklion International Airport', city: 'Heraklion', country: 'Greece', timezone: 'Europe/Athens' },
  { code: 'RHO', name: 'Rhodes International Airport', city: 'Rhodes', country: 'Greece', timezone: 'Europe/Athens' },

  // Greenland
  { code: 'GOH', name: 'Nuuk Airport', city: 'Nuuk', country: 'Greenland', timezone: 'America/Nuuk' },
  { code: 'SFJ', name: 'Kangerlussuaq Airport', city: 'Kangerlussuaq', country: 'Greenland', timezone: 'America/Nuuk' },
  { code: 'JAV', name: 'Ilulissat Airport', city: 'Ilulissat', country: 'Greenland', timezone: 'America/Nuuk' },

  // Poland
  { code: 'WAW', name: 'Warsaw Chopin Airport', city: 'Warsaw', country: 'Poland', timezone: 'Europe/Warsaw' },
  { code: 'KRK', name: 'Kraków John Paul II Airport', city: 'Kraków', country: 'Poland', timezone: 'Europe/Warsaw' },
  { code: 'GDN', name: 'Gdańsk Lech Wałęsa Airport', city: 'Gdańsk', country: 'Poland', timezone: 'Europe/Warsaw' },
  { code: 'KTW', name: 'Katowice Airport', city: 'Katowice', country: 'Poland', timezone: 'Europe/Warsaw' },
  { code: 'WRO', name: 'Wrocław Airport', city: 'Wrocław', country: 'Poland', timezone: 'Europe/Warsaw' },

  // Portugal
  { code: 'LIS', name: 'Humberto Delgado Airport', city: 'Lisbon', country: 'Portugal', timezone: 'Europe/Lisbon' },
  { code: 'OPO', name: 'Francisco de Sá Carneiro Airport', city: 'Porto', country: 'Portugal', timezone: 'Europe/Lisbon' },
  { code: 'FAO', name: 'Faro Airport', city: 'Faro', country: 'Portugal', timezone: 'Europe/Lisbon' },
  { code: 'FNC', name: 'Madeira Airport', city: 'Funchal', country: 'Portugal', timezone: 'Atlantic/Madeira' },
  { code: 'PDL', name: 'Ponta Delgada Airport', city: 'Ponta Delgada', country: 'Portugal', timezone: 'Atlantic/Azores' },

  // Austria
  { code: 'VIE', name: 'Vienna International Airport', city: 'Vienna', country: 'Austria', timezone: 'Europe/Vienna' },
  { code: 'INN', name: 'Innsbruck Airport', city: 'Innsbruck', country: 'Austria', timezone: 'Europe/Vienna' },
  { code: 'GRZ', name: 'Graz Airport', city: 'Graz', country: 'Austria', timezone: 'Europe/Vienna' },

  // Czech Republic
  { code: 'PRG', name: 'Václav Havel Airport Prague', city: 'Prague', country: 'Czech Republic', timezone: 'Europe/Prague' },
  { code: 'BRQ', name: 'Brno–Tuřany Airport', city: 'Brno', country: 'Czech Republic', timezone: 'Europe/Prague' },
  { code: 'OSR', name: 'Ostrava Leoš Janáček Airport', city: 'Ostrava', country: 'Czech Republic', timezone: 'Europe/Prague' },
  { code: 'KLV', name: 'Karlovy Vary Airport', city: 'Karlovy Vary', country: 'Czech Republic', timezone: 'Europe/Prague' },
  { code: 'PED', name: 'Pardubice Airport', city: 'Pardubice', country: 'Czech Republic', timezone: 'Europe/Prague' },

  // Turkey & Middle East
  { code: 'IST', name: 'Istanbul Airport', city: 'Istanbul', country: 'Turkey', timezone: 'Europe/Istanbul' },
  { code: 'SAW', name: 'Istanbul Sabiha Gökçen Airport', city: 'Istanbul', country: 'Turkey', timezone: 'Europe/Istanbul' },
  { code: 'AYT', name: 'Antalya Airport', city: 'Antalya', country: 'Turkey', timezone: 'Europe/Istanbul' },
  { code: 'MHD', name: 'Mashhad International Airport', city: 'Mashhad', country: 'Iran', timezone: 'Asia/Tehran' },
  { code: 'KBL', name: 'Kabul International Airport', city: 'Kabul', country: 'Afghanistan', timezone: 'Asia/Kabul' },
  { code: 'DXB', name: 'Dubai International Airport', city: 'Dubai', country: 'UAE', timezone: 'Asia/Dubai' },
  { code: 'DOH', name: 'Hamad International Airport', city: 'Doha', country: 'Qatar', timezone: 'Asia/Qatar' },
  { code: 'AUH', name: 'Zayed International Airport', city: 'Abu Dhabi', country: 'UAE', timezone: 'Asia/Dubai' },
  { code: 'JED', name: 'King Abdulaziz International Airport', city: 'Jeddah', country: 'Saudi Arabia', timezone: 'Asia/Riyadh' },
  { code: 'RUH', name: 'King Khalid International Airport', city: 'Riyadh', country: 'Saudi Arabia', timezone: 'Asia/Riyadh' },
  { code: 'SHJ', name: 'Sharjah International Airport', city: 'Sharjah', country: 'UAE', timezone: 'Asia/Dubai' },
  { code: 'MLE', name: 'Velana International Airport', city: 'Malé', country: 'Maldives', timezone: 'Indian/Maldives' },
  { code: 'LHE', name: 'Allama Iqbal International Airport', city: 'Lahore', country: 'Pakistan', timezone: 'Asia/Karachi' },
  { code: 'ISB', name: 'Islamabad International Airport', city: 'Islamabad', country: 'Pakistan', timezone: 'Asia/Karachi' },
  { code: 'KHI', name: 'Jinnah International Airport', city: 'Karachi', country: 'Pakistan', timezone: 'Asia/Karachi' },
  { code: 'SKT', name: 'Sialkot International Airport', city: 'Sialkot', country: 'Pakistan', timezone: 'Asia/Karachi' },

  // Africa
  { code: 'ASM', name: 'Asmara International Airport', city: 'Asmara', country: 'Eritrea', timezone: 'Africa/Asmara' },
  { code: 'ADD', name: 'Addis Ababa Bole International Airport', city: 'Addis Ababa', country: 'Ethiopia', timezone: 'Africa/Addis_Ababa' },
  { code: 'ACC', name: 'Kotoka International Airport', city: 'Accra', country: 'Ghana', timezone: 'Africa/Accra' },
  { code: 'LOS', name: 'Murtala Muhammed Airport', city: 'Lagos', country: 'Nigeria', timezone: 'Africa/Lagos' },
  { code: 'NBO', name: 'Jomo Kenyatta International Airport', city: 'Nairobi', country: 'Kenya', timezone: 'Africa/Nairobi' },
  { code: 'JNB', name: 'O. R. Tambo International Airport', city: 'Johannesburg', country: 'South Africa', timezone: 'Africa/Johannesburg' },
  { code: 'CPT', name: 'Cape Town International Airport', city: 'Cape Town', country: 'South Africa', timezone: 'Africa/Johannesburg' },
  { code: 'DUR', name: 'King Shaka International Airport', city: 'Durban', country: 'South Africa', timezone: 'Africa/Johannesburg' },

  // India
  { code: 'DEL', name: 'Indira Gandhi International Airport', city: 'New Delhi', country: 'India', timezone: 'Asia/Kolkata' },
  { code: 'BOM', name: 'Chhatrapati Shivaji Maharaj Airport', city: 'Mumbai', country: 'India', timezone: 'Asia/Kolkata' },
  { code: 'BLR', name: 'Kempegowda International Airport', city: 'Bengaluru', country: 'India', timezone: 'Asia/Kolkata' },
  { code: 'MAA', name: 'Chennai International Airport', city: 'Chennai', country: 'India', timezone: 'Asia/Kolkata' },
  { code: 'HYD', name: 'Rajiv Gandhi International Airport', city: 'Hyderabad', country: 'India', timezone: 'Asia/Kolkata' },
  { code: 'CCU', name: 'Netaji Subhash Chandra Bose Airport', city: 'Kolkata', country: 'India', timezone: 'Asia/Kolkata' },

  // Australia & New Zealand
  { code: 'SYD', name: 'Sydney Airport', city: 'Sydney', country: 'Australia', timezone: 'Australia/Sydney' },
  { code: 'MEL', name: 'Melbourne Airport', city: 'Melbourne', country: 'Australia', timezone: 'Australia/Melbourne' },
  { code: 'BNE', name: 'Brisbane Airport', city: 'Brisbane', country: 'Australia', timezone: 'Australia/Brisbane' },
  { code: 'PER', name: 'Perth Airport', city: 'Perth', country: 'Australia', timezone: 'Australia/Perth' },
  { code: 'ADL', name: 'Adelaide Airport', city: 'Adelaide', country: 'Australia', timezone: 'Australia/Adelaide' },
  { code: 'AKL', name: 'Auckland Airport', city: 'Auckland', country: 'New Zealand', timezone: 'Pacific/Auckland' },
  { code: 'CHC', name: 'Christchurch Airport', city: 'Christchurch', country: 'New Zealand', timezone: 'Pacific/Auckland' },
  { code: 'WLG', name: 'Wellington Airport', city: 'Wellington', country: 'New Zealand', timezone: 'Pacific/Auckland' },
  { code: 'ZQN', name: 'Queenstown Airport', city: 'Queenstown', country: 'New Zealand', timezone: 'Pacific/Auckland' },

  // Japan
  { code: 'HND', name: 'Tokyo Haneda Airport', city: 'Tokyo', country: 'Japan', timezone: 'Asia/Tokyo' },
  { code: 'NRT', name: 'Tokyo Narita Airport', city: 'Tokyo', country: 'Japan', timezone: 'Asia/Tokyo' },
  { code: 'KIX', name: 'Kansai International Airport', city: 'Osaka', country: 'Japan', timezone: 'Asia/Tokyo' },
  { code: 'NGO', name: 'Chūbu Centrair Airport', city: 'Nagoya', country: 'Japan', timezone: 'Asia/Tokyo' },
  { code: 'FUK', name: 'Fukuoka Airport', city: 'Fukuoka', country: 'Japan', timezone: 'Asia/Tokyo' },

  // Asia
  { code: 'SIN', name: 'Singapore Changi Airport', city: 'Singapore', country: 'Singapore', timezone: 'Asia/Singapore' },
  { code: 'HKG', name: 'Hong Kong International Airport', city: 'Hong Kong', country: 'Hong Kong', timezone: 'Asia/Hong_Kong' },
  { code: 'ICN', name: 'Incheon International Airport', city: 'Seoul', country: 'South Korea', timezone: 'Asia/Seoul' },
  { code: 'BKK', name: 'Suvarnabhumi Airport', city: 'Bangkok', country: 'Thailand', timezone: 'Asia/Bangkok' },
  { code: 'KUL', name: 'Kuala Lumpur International Airport', city: 'Kuala Lumpur', country: 'Malaysia', timezone: 'Asia/Kuala_Lumpur' },
  { code: 'PEK', name: 'Beijing Capital International Airport', city: 'Beijing', country: 'China', timezone: 'Asia/Shanghai' },
  { code: 'DPS', name: 'Ngurah Rai International Airport', city: 'Bali', country: 'Indonesia', timezone: 'Asia/Makassar' },

  // USA
  { code: 'ATL', name: 'Hartsfield–Jackson Atlanta Airport', city: 'Atlanta', country: 'United States', timezone: 'America/New_York' },
  { code: 'LAX', name: 'Los Angeles International Airport', city: 'Los Angeles', country: 'United States', timezone: 'America/Los_Angeles' },
  { code: 'JFK', name: 'John F. Kennedy International Airport', city: 'New York', country: 'United States', timezone: 'America/New_York' },
  { code: 'ORD', name: 'Chicago O\'Hare International Airport', city: 'Chicago', country: 'United States', timezone: 'America/Chicago' },
  { code: 'DFW', name: 'Dallas/Fort Worth Airport', city: 'Dallas', country: 'United States', timezone: 'America/Chicago' },
  { code: 'SFO', name: 'San Francisco International Airport', city: 'San Francisco', country: 'United States', timezone: 'America/Los_Angeles' },
  { code: 'MIA', name: 'Miami International Airport', city: 'Miami', country: 'United States', timezone: 'America/New_York' },
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
