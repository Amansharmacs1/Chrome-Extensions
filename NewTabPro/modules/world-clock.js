/**
 * NewTab Pro - World Clock Engine
 * Displays live times and day offsets across global timezones.
 */

export const MAJOR_TIMEZONES = [
  { id: 'nyc', name: 'New York', timezone: 'America/New_York', country: 'USA' },
  { id: 'sfo', name: 'San Francisco', timezone: 'America/Los_Angeles', country: 'USA' },
  { id: 'lon', name: 'London', timezone: 'Europe/London', country: 'UK' },
  { id: 'par', name: 'Paris', timezone: 'Europe/Paris', country: 'France' },
  { id: 'dxb', name: 'Dubai', timezone: 'Asia/Dubai', country: 'UAE' },
  { id: 'tyo', name: 'Tokyo', timezone: 'Asia/Tokyo', country: 'Japan' },
  { id: 'syd', name: 'Sydney', timezone: 'Australia/Sydney', country: 'Australia' },
  { id: 'sgp', name: 'Singapore', timezone: 'Asia/Singapore', country: 'Singapore' }
];

export const DEFAULT_WORLD_CITIES = ['lon', 'nyc', 'tyo'];

/**
 * Returns time string and relative day difference for a timezone
 * @param {string} timezone
 * @param {Date} [date]
 * @param {'12h'|'24h'} [format='12h']
 * @returns {{ timeStr: string, period: string, offsetLabel: string }}
 */
export function getTimeInZone(timezone, date = new Date(), format = '12h') {
  try {
    const is12h = format === '12h';
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: is12h
    });

    const parts = formatter.formatToParts(date);
    let hour = '';
    let minute = '';
    let period = '';

    for (const part of parts) {
      if (part.type === 'hour') hour = part.value;
      if (part.type === 'minute') minute = part.value;
      if (part.type === 'dayPeriod') period = part.value;
    }

    const timeStr = `${hour}:${minute}`;

    // Relative day calculation
    const localDay = date.getDate();
    const targetDayFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      day: 'numeric'
    });
    const targetDay = parseInt(targetDayFormatter.format(date), 10);

    let offsetLabel = 'Today';
    if (targetDay > localDay) offsetLabel = 'Tomorrow';
    else if (targetDay < localDay) offsetLabel = 'Yesterday';

    return {
      timeStr,
      period,
      offsetLabel
    };
  } catch (err) {
    return {
      timeStr: '--:--',
      period: '',
      offsetLabel: 'Error'
    };
  }
}
