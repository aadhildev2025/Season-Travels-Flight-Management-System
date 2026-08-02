import nodemailer from 'nodemailer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'send.one.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER || 'eu@seasontravels.com',
    pass: process.env.SMTP_PASS || 'Nord@scandic',
  },
  connectionTimeout: 10000,
  socketTimeout: 15000,
  greetingTimeout: 10000,
  tls: {
    rejectUnauthorized: false,
  },
  pool: true,
  maxConnections: 5,
  maxMessages: 10,
});

const countryMap = {
  CMB: 'Sri Lanka', HRI: 'Sri Lanka', JAF: 'Sri Lanka', DAC: 'Bangladesh', KTM: 'Nepal',
  ARN: 'Sweden', BMA: 'Sweden', GOT: 'Sweden', MMX: 'Sweden', VXO: 'Sweden',
  LPI: 'Sweden', NRK: 'Sweden', KRN: 'Sweden', LLA: 'Sweden', UME: 'Sweden',
  OSD: 'Sweden', RNB: 'Sweden', KLR: 'Sweden', SDL: 'Sweden',
  CPH: 'Denmark', BLL: 'Denmark', AAL: 'Denmark', AAR: 'Denmark', RNN: 'Denmark',
  EBJ: 'Denmark', SGD: 'Denmark', KRP: 'Denmark', ODE: 'Denmark', CNL: 'Denmark',
  OSL: 'Norway', BGO: 'Norway', TRD: 'Norway', SVG: 'Norway', TOS: 'Norway',
  BOO: 'Norway', AES: 'Norway', KRS: 'Norway', HAU: 'Norway', MOL: 'Norway',
  EVE: 'Norway', LKL: 'Norway', ALF: 'Norway', KKN: 'Norway', LYR: 'Norway',
  HEL: 'Finland', TMP: 'Finland', TKU: 'Finland', OUL: 'Finland', RVN: 'Finland',
  KTT: 'Finland', IVL: 'Finland', KUO: 'Finland', JYV: 'Finland', JOE: 'Finland',
  VAA: 'Finland', KAJ: 'Finland', KEM: 'Finland', POR: 'Finland', MHQ: 'Finland',
  CIA: 'Italy', MXP: 'Italy', LIN: 'Italy', BGY: 'Italy', VCE: 'Italy',
  TSF: 'Italy', NAP: 'Italy', BLQ: 'Italy', FLR: 'Italy', PSA: 'Italy',
  CTA: 'Italy', PMO: 'Italy', BRI: 'Italy', TRN: 'Italy', VRN: 'Italy',
  CAG: 'Italy', OLB: 'Italy', AHO: 'Italy', GOA: 'Italy', FCO: 'Italy',
  FRA: 'Germany', MUC: 'Germany', BER: 'Germany', DUS: 'Germany', HAM: 'Germany',
  CDG: 'France', ORY: 'France', NCE: 'France', LYS: 'France', MRS: 'France',
  ZRH: 'Switzerland', GVA: 'Switzerland',
  OTP: 'Romania', CLJ: 'Romania', TSR: 'Romania', IAS: 'Romania',
  MAD: 'Spain', BCN: 'Spain', PMI: 'Spain', AGP: 'Spain', ALC: 'Spain',
  AMS: 'Netherlands', EIN: 'Netherlands', RTM: 'Netherlands',
  LHR: 'United Kingdom', LGW: 'United Kingdom', STN: 'United Kingdom',
  LTN: 'United Kingdom', MAN: 'United Kingdom', BHX: 'United Kingdom',
  VNO: 'Lithuania', KUN: 'Lithuania', PLQ: 'Lithuania', TLL: 'Estonia',
  ATH: 'Greece', SKG: 'Greece', HER: 'Greece', RHO: 'Greece',
  GOH: 'Greenland', SFJ: 'Greenland', JAV: 'Greenland',
  WAW: 'Poland', KRK: 'Poland', GDN: 'Poland', KTW: 'Poland', WRO: 'Poland',
  LIS: 'Portugal', OPO: 'Portugal', FAO: 'Portugal', FNC: 'Portugal', PDL: 'Portugal',
  VIE: 'Austria', INN: 'Austria', GRZ: 'Austria',
  PRG: 'Czech Republic', BRQ: 'Czech Republic', OSR: 'Czech Republic', KLV: 'Czech Republic', PED: 'Czech Republic',
  IST: 'Turkey', SAW: 'Turkey', AYT: 'Turkey', MHD: 'Iran', KBL: 'Afghanistan',
  DXB: 'UAE', DOH: 'Qatar', AUH: 'UAE', JED: 'Saudi Arabia', RUH: 'Saudi Arabia',
  SHJ: 'UAE', MLE: 'Maldives', LHE: 'Pakistan', ISB: 'Pakistan', KHI: 'Pakistan', SKT: 'Pakistan',
  ASM: 'Eritrea', ADD: 'Ethiopia', ACC: 'Ghana', LOS: 'Nigeria', NBO: 'Kenya',
  JNB: 'South Africa', CPT: 'South Africa', DUR: 'South Africa',
  DEL: 'India', BOM: 'India', BLR: 'India', MAA: 'India', HYD: 'India', CCU: 'India',
  SYD: 'Australia', MEL: 'Australia', BNE: 'Australia', PER: 'Australia', ADL: 'Australia',
  AKL: 'New Zealand', CHC: 'New Zealand', WLG: 'New Zealand', ZQN: 'New Zealand',
  HND: 'Japan', NRT: 'Japan', KIX: 'Japan', NGO: 'Japan', FUK: 'Japan',
  SIN: 'Singapore', HKG: 'Hong Kong', ICN: 'South Korea', BKK: 'Thailand', KUL: 'Malaysia',
  PEK: 'China', DPS: 'Indonesia',
  ATL: 'United States', LAX: 'United States', JFK: 'United States', ORD: 'United States',
  DFW: 'United States', SFO: 'United States', MIA: 'United States',
};

const cityMap = {
  CMB: 'Colombo', HRI: 'Colombo', JAF: 'Jaffna', DAC: 'Dhaka', KTM: 'Kathmandu',
  ARN: 'Stockholm', BMA: 'Stockholm', GOT: 'Gothenburg', MMX: 'Malmö', VXO: 'Växjö',
  LPI: 'Linköping', NRK: 'Norrköping', KRN: 'Kiruna', LLA: 'Luleå', UME: 'Umeå',
  OSD: 'Östersund', RNB: 'Ronneby', KLR: 'Kalmar', SDL: 'Sundsvall',
  CPH: 'Copenhagen', BLL: 'Billund', AAL: 'Aalborg', AAR: 'Aarhus', RNN: 'Rønne',
  EBJ: 'Esbjerg', SGD: 'Sønderborg', KRP: 'Karup', ODE: 'Odense', CNL: 'Christiansø',
  OSL: 'Oslo', BGO: 'Bergen', TRD: 'Trondheim', SVG: 'Stavanger', TOS: 'Tromsø',
  BOO: 'Bodø', AES: 'Ålesund', KRS: 'Kristiansand', KKN: 'Kirkenes', LYR: 'Longyearbyen',
  HEL: 'Helsinki', TMP: 'Tampere', TKU: 'Turku', OUL: 'Oulu', RVN: 'Rovaniemi',
  KTT: 'Kittilä', IVL: 'Ivalo', KUO: 'Kuopio', JYV: 'Jyväskylä', JOE: 'Joensuu',
  VAA: 'Vaasa', KAJ: 'Kajaani', KEM: 'Kemi', POR: 'Pori', MHQ: 'Mariehamn',
  CIA: 'Rome', MXP: 'Milan', LIN: 'Milan', BGY: 'Milan', VCE: 'Venice',
  TSF: 'Venice', NAP: 'Naples', BLQ: 'Bologna', FLR: 'Florence', PSA: 'Pisa',
  CTA: 'Catania', PMO: 'Palermo', BRI: 'Bari', TRN: 'Turin', VRN: 'Verona',
  CAG: 'Cagliari', OLB: 'Olbia', AHO: 'Alghero', GOA: 'Genoa', FCO: 'Rome',
  FRA: 'Frankfurt', MUC: 'Munich', BER: 'Berlin', DUS: 'Düsseldorf', HAM: 'Hamburg',
  CDG: 'Paris', ORY: 'Paris', NCE: 'Nice', LYS: 'Lyon', MRS: 'Marseille',
  ZRH: 'Zurich', GVA: 'Geneva',
  OTP: 'Bucharest', CLJ: 'Cluj-Napoca', TSR: 'Timișoara', IAS: 'Iași',
  MAD: 'Madrid', BCN: 'Barcelona', PMI: 'Palma de Mallorca', AGP: 'Málaga', ALC: 'Alicante',
  AMS: 'Amsterdam', EIN: 'Eindhoven', RTM: 'Rotterdam',
  LHR: 'London', LGW: 'London', STN: 'London', LTN: 'London', MAN: 'Manchester', BHX: 'Birmingham',
  VNO: 'Vilnius', KUN: 'Kaunas', PLQ: 'Palanga', TLL: 'Tallinn',
  ATH: 'Athens', SKG: 'Thessaloniki', HER: 'Heraklion', RHO: 'Rhodes',
  GOH: 'Nuuk', SFJ: 'Kangerlussuaq', JAV: 'Ilulissat',
  WAW: 'Warsaw', KRK: 'Kraków', GDN: 'Gdańsk', KTW: 'Katowice', WRO: 'Wrocław',
  LIS: 'Lisbon', OPO: 'Porto', FAO: 'Faro', FNC: 'Funchal', PDL: 'Ponta Delgada',
  VIE: 'Vienna', INN: 'Innsbruck', GRZ: 'Graz',
  PRG: 'Prague', BRQ: 'Brno', OSR: 'Ostrava', KLV: 'Karlovy Vary', PED: 'Pardubice',
  IST: 'Istanbul', SAW: 'Istanbul', AYT: 'Antalya', MHD: 'Mashhad', KBL: 'Kabul',
  DXB: 'Dubai', DOH: 'Doha', AUH: 'Abu Dhabi', JED: 'Jeddah', RUH: 'Riyadh',
  SHJ: 'Sharjah', MLE: 'Malé', LHE: 'Lahore', ISB: 'Islamabad', KHI: 'Karachi', SKT: 'Sialkot',
  ASM: 'Asmara', ADD: 'Addis Ababa', ACC: 'Accra', LOS: 'Lagos', NBO: 'Nairobi',
  JNB: 'Johannesburg', CPT: 'Cape Town', DUR: 'Durban',
  DEL: 'New Delhi', BOM: 'Mumbai', BLR: 'Bangalore', MAA: 'Chennai', HYD: 'Hyderabad', CCU: 'Kolkata',
  SYD: 'Sydney', MEL: 'Melbourne', BNE: 'Brisbane', PER: 'Perth', ADL: 'Adelaide',
  AKL: 'Auckland', CHC: 'Christchurch', WLG: 'Wellington', ZQN: 'Queenstown',
  HND: 'Tokyo', NRT: 'Tokyo', KIX: 'Osaka', NGO: 'Nagoya', FUK: 'Fukuoka',
  SIN: 'Singapore', HKG: 'Hong Kong', ICN: 'Seoul', BKK: 'Bangkok', KUL: 'Kuala Lumpur',
  PEK: 'Beijing', DPS: 'Denpasar',
  ATL: 'Atlanta', LAX: 'Los Angeles', JFK: 'New York', ORD: 'Chicago',
  DFW: 'Dallas', SFO: 'San Francisco', MIA: 'Miami',
};

function getCountryName(code) {
  if (!code) return '';
  const clean = code.trim().toUpperCase();
  return countryMap[clean] || clean;
}

function getCityName(code) {
  if (!code) return '';
  const clean = code.trim().toUpperCase();
  return cityMap[clean] || '';
}

function formatRouteWithCountry(depCode, arrCode) {
  const depCountry = getCountryName(depCode);
  const arrCountry = getCountryName(arrCode);
  const depCity = getCityName(depCode);
  const arrCity = getCityName(arrCode);
  const depStr = depCountry && depCountry !== depCode ? `${depCode}, ${depCity}, ${depCountry}` : depCode;
  const arrStr = arrCountry && arrCountry !== arrCode ? `${arrCode}, ${arrCity}, ${arrCountry}` : arrCode;
  return `${depStr} → ${arrStr}`;
}

export function buildReminderMessage(ticket) {
  const dep = new Date(ticket.departureTimeUTC);
  const formatted = dep.toLocaleString('en-GB', { timeZone: ticket.originalTimezone, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
  const routeStr = formatRouteWithCountry(ticket.departureAirport, ticket.arrivalAirport);
  return {
    subject: 'Travel Reminder from SeasonTravels',
    body: `Dear Passenger,\n\nThis is a reminder for your upcoming flight.\n\nFlight Details:\nBooking Reference: ${ticket.pnr}\nRoute: ${routeStr}\nDeparture: ${formatted}\n\nPlease ensure you check in at least 4 hours prior to departure.\n\nWe wish you a safe and pleasant journey!\n\nWarm regards,\nSEASON TRAVELS`,
  };
}

export function buildReminderText(ticket) {
  const { subject, body } = buildReminderMessage(ticket);
  return `${subject}\n\n${body}`;
}

export function buildThankYouMessage(ticket) {
  return {
    subject: 'Thank You for Choosing Season Travels',
    body: `Dear Passenger,\n\nThank you for contacting Season Travels.\n\nWe look forward to plan your next adventure and help you to create unforgetable travel experiences.\n\nWarm regards,\nSEASON TRAVELS`,
  };
}

export function buildThankYouText(ticket) {
  const { subject, body } = buildThankYouMessage(ticket);
  return `${subject}\n\n${body}`;
}

export async function sendEmail({ to, subject, text, html }) {
  const timeoutMs = 20000;
  const withTimeout = (promise) => Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Email send timed out')), timeoutMs))
  ]);

  try {
    const plainBody = text || (html ? html.replace(/<br\s*\/>/g, '\n').replace(/<[^>]+>/g, '') : '');

    const logoDir = path.resolve(__dirname, '../../../client/src/logo');
    
    // Header Left Logo
    const logoHeaderPath = path.join(logoDir, 'logo.png');
    
    // Header Right Logo (IATA)
    let logoIataPath = path.join(logoDir, 'IATA.png');
    if (!fs.existsSync(logoIataPath)) {
      logoIataPath = path.join(logoDir, 'IATA.jpg');
    }
    
    // Footer Logo
    let logoFooterPath = path.join(logoDir, 'Mail Footer.png');
    if (!fs.existsSync(logoFooterPath)) {
      logoFooterPath = path.join(logoDir, 'Mail footer.png');
    }

    const hasLogoHeader = fs.existsSync(logoHeaderPath);
    const hasLogoIata = fs.existsSync(logoIataPath);
    const hasLogoFooter = fs.existsSync(logoFooterPath);

    const attachments = [];

    if (hasLogoHeader) {
      attachments.push({
        content: fs.readFileSync(logoHeaderPath),
        cid: 'logo_header',
        contentType: 'image/png',
        contentDisposition: 'inline'
      });
    }
    if (hasLogoIata) {
      const isPng = logoIataPath.toLowerCase().endsWith('.png');
      attachments.push({
        content: fs.readFileSync(logoIataPath),
        cid: 'logo_iata',
        contentType: isPng ? 'image/png' : 'image/jpeg',
        contentDisposition: 'inline'
      });
    }
    if (hasLogoFooter) {
      attachments.push({
        content: fs.readFileSync(logoFooterPath),
        cid: 'logo_footer',
        contentType: 'image/png',
        contentDisposition: 'inline'
      });
    }

    const mailHtml = html || (plainBody ? (() => {
      const normalizedBody = plainBody.replace(/\r\n/g, '\n');
      const blocks = normalizedBody.split(/\n\s*\n/);
      const htmlBlocks = [];

      for (const block of blocks) {
        const trimmedBlock = block.trim();
        if (!trimmedBlock) continue;

        if (trimmedBlock.startsWith('Flight Details:') || trimmedBlock.startsWith('Flight Summary:')) {
          const lines = trimmedBlock.split('\n');
          const header = lines[0].trim();
          const detailsHtml = lines.slice(1).map(line => {
            const trimmedLine = line.trim();
            if (!trimmedLine) return '';
            return `<div style="color: #2563eb; margin-bottom: 4px; font-weight: bold;">${trimmedLine}</div>`;
          }).filter(Boolean).join('');

          htmlBlocks.push(`
            <div style="margin-bottom: 20px;">
              <div style="font-weight: bold; color: #1f2937; margin-bottom: 8px;">${header}</div>
              ${detailsHtml}
            </div>
          `);
        } else if (trimmedBlock.startsWith('Warm regards,')) {
          const lines = trimmedBlock.split('\n');
          const formattedLines = lines.map(line => line.trim()).join('<br />');
          htmlBlocks.push(`
            <div style="margin-top: 25px; color: #374151; line-height: 1.5;">
              ${formattedLines}
            </div>
          `);
        } else {
          const lines = trimmedBlock.split('\n');
          const formattedLines = lines.map(line => line.trim()).join('<br />');
          htmlBlocks.push(`
            <div style="margin-bottom: 15px; color: #374151;">
              ${formattedLines}
            </div>
          `);
        }
      }
      const formattedBody = htmlBlocks.join('');

      return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Season Travels</title>
<style>
  /* ── Reset ── */
  body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  img { border: 0; display: block; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }

  /* ── Mobile overrides ── */
  @media only screen and (max-width: 620px) {
    .email-wrapper { padding: 12px !important; }
    .email-card   { padding: 18px !important; border-radius: 6px !important; }
    .logo-header  { height: 22px !important; }
    .logo-iata    { height: 18px !important; }
    .logo-footer  { max-width: 100% !important; height: auto !important; }
    .body-text    { font-size: 13px !important; }
    .detail-line  { font-size: 13px !important; }
    .footer-link  { font-size: 11px !important; }
  }
</style>
</head>
<body style="margin:0; padding:0; background:#f4f4f7;">

<!-- Outer wrapper -->
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="background:#f4f4f7;">
  <tr>
    <td align="center" class="email-wrapper" style="padding: 28px 16px;">

      <!-- Card -->
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px; background:#ffffff; border-radius:10px; border:1px solid #e8e8ee; box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <tr>
          <td class="email-card" style="padding: 20px 30px 28px 30px; font-family: Arial, sans-serif; font-size: 14px; line-height: 1.65; color: #333; box-sizing: border-box;">

            <!-- Header row: brand logo left, IATA right -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:22px; padding-bottom:20px;">
              <tr>
                <td align="left" valign="middle" style="padding-bottom:0;">
                  ${hasLogoHeader ? `<img src="cid:logo_header" alt="Season Travels" class="logo-header" style="height:40px; width:auto;" />` : '<span style="font-size:16px;font-weight:bold;color:#111;">Season Travels</span>'}
                </td>
                <td align="right" valign="middle" style="padding-bottom:0;">
                  ${hasLogoIata ? `<img src="cid:logo_iata" alt="IATA" class="logo-iata" style="height:48px; width:auto;" />` : ''}
                </td>
              </tr>
            </table>

            <!-- Body content -->
            <div style="margin-top:8px;" class="body-text">
              ${formattedBody}
            </div>

            <!-- Footer: footer banner + website link -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top:32px; border-top:1px solid #eee; padding-top:20px;">
              <tr>
                <td align="center" valign="middle">
                  ${hasLogoFooter ? `<img src="cid:logo_footer" alt="Season Travels" class="logo-footer" style="max-width:100%; height:auto; display:block; margin:0 auto;" />` : ''}
                  <div class="footer-link" style="margin-top:10px; font-size:12px; color:#555; text-align:center;">
                    <a href="https://www.seasontravels.com" target="_blank" style="text-decoration:none; color:#555;">www.seasontravels.com</a>
                  </div>
                </td>
              </tr>
            </table>

          </td>
        </tr>
      </table><!-- /card -->

    </td>
  </tr>
</table><!-- /outer wrapper -->

</body>
</html>`;
    })() : undefined);

    if (mailHtml) {
      try {
        const lastSentPath = path.join(__dirname, '../scripts/last_sent.html');
        fs.writeFileSync(lastSentPath, mailHtml);
      } catch (e) {
        // ignore errors writing last_sent.html
      }
    }

    const info = await withTimeout(transporter.sendMail({
      from: process.env.SMTP_USER || 'eu@seasontravels.com',
      to,
      subject,
      text: plainBody,
      html: mailHtml,
      attachments: attachments.length > 0 ? attachments : undefined,
    }));
    
    // Attach generated HTML to info for test scripts verification
    if (info) {
      info.html = mailHtml;
    }
    
    return info;
  } catch (error) {
    console.error('Nodemailer error details:', error);
    throw error;
  }
}
