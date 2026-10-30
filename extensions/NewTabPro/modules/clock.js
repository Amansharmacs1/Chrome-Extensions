/**
 * NewTab Pro - Clock, Date & Greeting Engine
 * Formats time, dates, and time-aware personalized greetings.
 */

/**
 * Returns time string in 12h or 24h format
 * @param {Date} date
 * @param {Object} options
 * @param {'12h'|'24h'} options.format
 * @param {boolean} options.showSeconds
 * @returns {{ timeStr: string, periodStr: string }}
 */
export function formatTime(date = new Date(), options = {}) {
  const format = options.format === '24h' ? '24h' : '12h';
  const showSeconds = Boolean(options.showSeconds);

  let hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();

  let periodStr = '';

  if (format === '12h') {
    periodStr = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours === 0 ? 12 : hours; // 12-hour clock
  }

  const pad = (n) => String(n).padStart(2, '0');
  const hoursStr = format === '12h' ? String(hours) : pad(hours);
  const minutesStr = pad(minutes);
  const secondsStr = pad(seconds);

  const timeStr = showSeconds
    ? `${hoursStr}:${minutesStr}:${secondsStr}`
    : `${hoursStr}:${minutesStr}`;

  return {
    timeStr,
    periodStr,
    fullDisplay: periodStr ? `${timeStr} ${periodStr}` : timeStr
  };
}

/**
 * Formats date into readable string, e.g. "Thursday, October 29, 2026"
 * @param {Date} date
 * @returns {string}
 */
export function formatDate(date = new Date()) {
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weekday = weekdays[date.getDay()];
  const month = months[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();

  return `${weekday}, ${month} ${day}, ${year}`;
}

/**
 * Returns time-aware greeting
 * 05:00 - 11:59 -> Good morning
 * 12:00 - 16:59 -> Good afternoon
 * 17:00 - 21:59 -> Good evening
 * 22:00 - 04:59 -> Good night
 * @param {Date} date
 * @param {string} userName
 * @returns {string}
 */
export function getGreeting(date = new Date(), userName = '') {
  const hour = date.getHours();
  let greeting = 'Good morning';

  if (hour >= 5 && hour < 12) {
    greeting = 'Good morning';
  } else if (hour >= 12 && hour < 17) {
    greeting = 'Good afternoon';
  } else if (hour >= 17 && hour < 22) {
    greeting = 'Good evening';
  } else {
    greeting = 'Good night';
  }

  const cleanName = typeof userName === 'string' ? userName.trim() : '';
  if (cleanName.length > 0) {
    return `${greeting}, ${cleanName}`;
  }
  return greeting;
}
