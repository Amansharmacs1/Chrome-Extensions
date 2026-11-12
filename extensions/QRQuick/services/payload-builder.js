/**
 * QRQuick - Payload Builder & Type Detector
 * Formats, encodes, and decodes standardized QR code payloads for:
 * URL, Plain Text, Contact (vCard), Email, Phone, SMS, Wi-Fi, Location, Calendar Events.
 */

import { validateUrl } from './validation.js';

/**
 * Escapes characters for vCard property values according to RFC 2426 / RFC 6350
 * @param {string} str
 * @returns {string}
 */
export function escapeVCard(str = '') {
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * Escapes characters for Wi-Fi strings according to the ZXing barcode standard
 * Special characters \ , ; : " must be escaped with a backslash
 * @param {string} str
 * @returns {string}
 */
export function escapeWifi(str = '') {
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/:/g, '\\:')
    .replace(/,/g, '\\,')
    .replace(/"/g, '\\"');
}

/**
 * Formats date into ISO basic format for iCalendar / VEVENT: YYYYMMDDTHHmmssZ
 * @param {string|Date} dateInput
 * @param {boolean} [allDay=false]
 * @returns {string}
 */
export function formatCalendarDate(dateInput, allDay = false) {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) {
    throw new Error('Invalid calendar date provided.');
  }

  const pad = (n) => String(n).padStart(2, '0');
  const year = d.getUTCFullYear();
  const month = pad(d.getUTCMonth() + 1);
  const day = pad(d.getUTCDate());

  if (allDay) {
    return `${year}${month}${day}`;
  }

  const hours = pad(d.getUTCHours());
  const minutes = pad(d.getUTCMinutes());
  const seconds = pad(d.getUTCSeconds());
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

/**
 * Builds payload for URL type
 * @param {{ url: string }} params
 * @returns {{ payload: string, title: string }}
 */
export function buildUrlPayload(params = {}) {
  const val = validateUrl(params.url);
  if (!val.valid) {
    throw new Error(val.error || 'Invalid URL.');
  }
  return {
    payload: val.sanitizedUrl,
    title: params.title || val.sanitizedUrl
  };
}

/**
 * Builds payload for Plain Text type
 * @param {{ text: string }} params
 * @returns {{ payload: string, title: string }}
 */
export function buildTextPayload(params = {}) {
  const text = String(params.text ?? '').trim();
  if (!text) {
    throw new Error('Text content cannot be empty.');
  }
  const preview = text.length > 40 ? text.slice(0, 37) + '...' : text;
  return {
    payload: text,
    title: params.title || preview
  };
}

/**
 * Builds standard vCard 3.0 payload
 * @param {{ firstName?: string, lastName?: string, organization?: string, title?: string, phone?: string, email?: string, website?: string, address?: string }} params
 * @returns {{ payload: string, title: string }}
 */
export function buildContactPayload(params = {}) {
  const fn = String(params.firstName || '').trim();
  const ln = String(params.lastName || '').trim();
  const org = String(params.organization || '').trim();
  const jobTitle = String(params.title || '').trim();
  const phone = String(params.phone || '').trim();
  const email = String(params.email || '').trim();
  const website = String(params.website || '').trim();
  const address = String(params.address || '').trim();

  if (!fn && !ln && !org && !phone && !email) {
    throw new Error('Contact must contain at least a name, organization, phone number, or email.');
  }

  const fullName = [fn, ln].filter(Boolean).join(' ') || org || phone || email;

  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${escapeVCard(ln)};${escapeVCard(fn)};;;`,
    `FN:${escapeVCard(fullName)}`
  ];

  if (org) lines.push(`ORG:${escapeVCard(org)}`);
  if (jobTitle) lines.push(`TITLE:${escapeVCard(jobTitle)}`);
  if (phone) lines.push(`TEL;TYPE=CELL:${phone.replace(/[^\d+]/g, '')}`);
  if (email) lines.push(`EMAIL;TYPE=INTERNET:${email}`);
  if (website) lines.push(`URL:${website}`);
  if (address) lines.push(`ADR;TYPE=WORK:;;${escapeVCard(address)};;;;`);

  lines.push('END:VCARD');

  return {
    payload: lines.join('\r\n'),
    title: `Contact: ${fullName}`
  };
}

/**
 * Builds mailto: payload
 * @param {{ email: string, subject?: string, body?: string }} params
 * @returns {{ payload: string, title: string }}
 */
export function buildEmailPayload(params = {}) {
  const email = String(params.email || '').trim();
  if (!email || !email.includes('@')) {
    throw new Error('A valid email address is required.');
  }

  const queryParts = [];
  if (params.subject) {
    queryParts.push(`subject=${encodeURIComponent(params.subject)}`);
  }
  if (params.body) {
    queryParts.push(`body=${encodeURIComponent(params.body)}`);
  }

  const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
  const payload = `mailto:${email}${queryString}`;

  return {
    payload,
    title: `Email: ${email}`
  };
}

/**
 * Builds tel: payload
 * @param {{ phone: string }} params
 * @returns {{ payload: string, title: string }}
 */
export function buildPhonePayload(params = {}) {
  const raw = String(params.phone || '').trim();
  const sanitized = raw.replace(/[^\d+]/g, '');
  if (!sanitized) {
    throw new Error('A valid phone number is required.');
  }
  return {
    payload: `tel:${sanitized}`,
    title: `Call: ${raw}`
  };
}

/**
 * Builds SMS payload (smsto: standard)
 * @param {{ phone: string, message?: string }} params
 * @returns {{ payload: string, title: string }}
 */
export function buildSmsPayload(params = {}) {
  const phone = String(params.phone || '').trim().replace(/[^\d+]/g, '');
  if (!phone) {
    throw new Error('A valid phone number is required for SMS.');
  }

  const message = String(params.message || '');
  const payload = message ? `smsto:${phone}:${message}` : `smsto:${phone}`;

  return {
    payload,
    title: `SMS: ${phone}`
  };
}

/**
 * Builds standard Wi-Fi network configuration payload
 * @param {{ ssid: string, password?: string, encryption?: 'WPA'|'WEP'|'nopass', hidden?: boolean }} params
 * @returns {{ payload: string, title: string }}
 */
export function buildWifiPayload(params = {}) {
  const ssid = String(params.ssid || '').trim();
  if (!ssid) {
    throw new Error('Wi-Fi Network Name (SSID) is required.');
  }

  const encryption = (params.encryption || 'WPA').toUpperCase();
  const pass = params.password || '';
  const isHidden = Boolean(params.hidden);

  let payload = `WIFI:S:${escapeWifi(ssid)};T:${encryption};`;
  if (encryption !== 'NOPASS' && pass) {
    payload += `P:${escapeWifi(pass)};`;
  }
  if (isHidden) {
    payload += 'H:true;';
  }
  payload += ';';

  return {
    payload,
    title: `Wi-Fi: ${ssid}`
  };
}

/**
 * Builds Location / Geo payload
 * @param {{ latitude: number|string, longitude: number|string, query?: string }} params
 * @returns {{ payload: string, title: string }}
 */
export function buildLocationPayload(params = {}) {
  const lat = parseFloat(params.latitude);
  const lng = parseFloat(params.longitude);

  if (isNaN(lat) || lat < -90 || lat > 90) {
    throw new Error('Latitude must be a valid number between -90 and 90.');
  }
  if (isNaN(lng) || lng < -180 || lng > 180) {
    throw new Error('Longitude must be a valid number between -180 and 180.');
  }

  // Universal map-compatible URL (works on Android, iOS, and desktop browsers)
  // Maps URL is preferred over geo: because standard camera apps directly open map apps
  const payload = `https://maps.google.com/local?q=${lat},${lng}`;
  const title = params.query ? `Location: ${params.query}` : `Location: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;

  return {
    payload,
    title
  };
}

/**
 * Builds iCalendar VEVENT calendar event payload
 * @param {{ title: string, start: string|Date, end?: string|Date, location?: string, description?: string, allDay?: boolean }} params
 * @returns {{ payload: string, title: string }}
 */
export function buildEventPayload(params = {}) {
  const summary = String(params.title || '').trim();
  if (!summary) {
    throw new Error('Event title is required.');
  }

  const dtStart = formatCalendarDate(params.start, params.allDay);
  const dtEnd = params.end ? formatCalendarDate(params.end, params.allDay) : dtStart;

  const lines = [
    'BEGIN:VCARD' === 'BEGIN:VCARD' ? 'BEGIN:VEVENT' : '',
    'SUMMARY:' + escapeVCard(summary),
    'DTSTART:' + dtStart,
    'DTEND:' + dtEnd
  ];

  if (params.location) {
    lines.push('LOCATION:' + escapeVCard(params.location));
  }
  if (params.description) {
    lines.push('DESCRIPTION:' + escapeVCard(params.description));
  }

  lines.push('END:VEVENT');

  return {
    payload: lines.filter(Boolean).join('\r\n'),
    title: `Event: ${summary}`
  };
}

/**
 * Detects the specific type and structured data of any raw QR payload
 * @param {string} text Raw decoded QR string
 * @returns {{ type: 'url'|'wifi'|'contact'|'email'|'phone'|'sms'|'location'|'event'|'text', title: string, formattedSummary: string, isUrl: boolean, actionUrl?: string, details: object }}
 */
export function detectPayloadType(text = '') {
  const clean = String(text ?? '').trim();
  if (!clean) {
    return {
      type: 'text',
      title: 'Empty QR',
      formattedSummary: 'No content',
      isUrl: false,
      details: {}
    };
  }

  // 1. Wi-Fi
  if (/^WIFI:/i.test(clean)) {
    const ssidMatch = clean.match(/S:([^;]+)/i);
    const typeMatch = clean.match(/T:([^;]+)/i);
    const passMatch = clean.match(/P:([^;]+)/i);
    const hiddenMatch = clean.match(/H:([^;]+)/i);

    const ssid = ssidMatch ? ssidMatch[1].replace(/\\([;,:\\])/g, '$1') : 'Unknown';
    const enc = typeMatch ? typeMatch[1] : 'WPA';
    const pass = passMatch ? passMatch[1].replace(/\\([;,:\\])/g, '$1') : '';
    const hidden = hiddenMatch ? hiddenMatch[1].toLowerCase() === 'true' : false;

    return {
      type: 'wifi',
      title: `Wi-Fi: ${ssid}`,
      formattedSummary: `Network: ${ssid} (${enc})`,
      isUrl: false,
      details: { ssid, encryption: enc, password: pass, hidden }
    };
  }

  // 2. vCard Contact
  if (/^BEGIN:VCARD/im.test(clean)) {
    const fnMatch = clean.match(/FN:(.+?)(?:\r?\n|$)/i);
    const orgMatch = clean.match(/ORG:(.+?)(?:\r?\n|$)/i);
    const telMatch = clean.match(/TEL.*?:(.+?)(?:\r?\n|$)/i);
    const emailMatch = clean.match(/EMAIL.*?:(.+?)(?:\r?\n|$)/i);
    const urlMatch = clean.match(/URL.*?:(.+?)(?:\r?\n|$)/i);

    const name = fnMatch ? fnMatch[1].replace(/\\([;,])/g, '$1').trim() : (orgMatch ? orgMatch[1].trim() : 'Contact');
    return {
      type: 'contact',
      title: `Contact: ${name}`,
      formattedSummary: [name, telMatch ? telMatch[1].trim() : '', emailMatch ? emailMatch[1].trim() : ''].filter(Boolean).join(' • '),
      isUrl: false,
      details: {
        name,
        phone: telMatch ? telMatch[1].trim() : '',
        email: emailMatch ? emailMatch[1].trim() : '',
        organization: orgMatch ? orgMatch[1].trim() : '',
        website: urlMatch ? urlMatch[1].trim() : ''
      }
    };
  }

  // 3. Calendar Event
  if (/^BEGIN:VEVENT/im.test(clean)) {
    const summaryMatch = clean.match(/SUMMARY:(.+?)(?:\r?\n|$)/i);
    const locMatch = clean.match(/LOCATION:(.+?)(?:\r?\n|$)/i);
    const title = summaryMatch ? summaryMatch[1].trim() : 'Calendar Event';
    return {
      type: 'event',
      title: `Event: ${title}`,
      formattedSummary: locMatch ? `${title} (${locMatch[1].trim()})` : title,
      isUrl: false,
      details: { title, location: locMatch ? locMatch[1].trim() : '' }
    };
  }

  // 4. Email (mailto:)
  if (/^mailto:/i.test(clean)) {
    const address = clean.replace(/^mailto:/i, '').split('?')[0];
    return {
      type: 'email',
      title: `Email: ${address}`,
      formattedSummary: `Send email to ${address}`,
      isUrl: false,
      actionUrl: clean,
      details: { email: address }
    };
  }

  // 5. Phone (tel:)
  if (/^tel:/i.test(clean)) {
    const phone = clean.replace(/^tel:/i, '');
    return {
      type: 'phone',
      title: `Phone: ${phone}`,
      formattedSummary: `Call ${phone}`,
      isUrl: false,
      actionUrl: clean,
      details: { phone }
    };
  }

  // 6. SMS (smsto: or sms:)
  if (/^(smsto|sms):/i.test(clean)) {
    const parts = clean.replace(/^(smsto|sms):/i, '').split(':');
    const phone = parts[0] || '';
    const msg = parts.slice(1).join(':') || '';
    return {
      type: 'sms',
      title: `SMS: ${phone}`,
      formattedSummary: msg ? `SMS to ${phone}: "${msg}"` : `SMS to ${phone}`,
      isUrl: false,
      actionUrl: clean,
      details: { phone, message: msg }
    };
  }

  // 7. Geo Location (geo:lat,lng or Google Maps URL)
  if (/^geo:/i.test(clean)) {
    const coords = clean.replace(/^geo:/i, '').split('?')[0];
    return {
      type: 'location',
      title: `Location: ${coords}`,
      formattedSummary: `Coordinates: ${coords}`,
      isUrl: true,
      actionUrl: `https://maps.google.com/local?q=${coords}`,
      details: { coords }
    };
  }

  // 8. Standard URL
  if (/^https?:\/\//i.test(clean) || /^ftp:\/\//i.test(clean)) {
    try {
      const parsed = new URL(clean);
      return {
        type: 'url',
        title: parsed.hostname,
        formattedSummary: clean,
        isUrl: true,
        actionUrl: clean,
        details: { url: clean, hostname: parsed.hostname }
      };
    } catch {
      // Fallback to text
    }
  }

  // 9. Plain Text
  const snippet = clean.length > 50 ? clean.slice(0, 47) + '...' : clean;
  return {
    type: 'text',
    title: snippet,
    formattedSummary: snippet,
    isUrl: false,
    details: { text: clean }
  };
}
