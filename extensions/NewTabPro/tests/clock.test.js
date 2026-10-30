/**
 * NewTab Pro - Clock, Date & Greeting Unit Tests
 */

import { formatTime, formatDate, getGreeting } from '../modules/clock.js';

let passed = 0;
let failed = 0;

function assert(condition, description) {
  if (condition) {
    console.log(`  ✓ ${description}`);
    passed++;
  } else {
    console.error(`  ✗ ${description}`);
    failed++;
  }
}

console.log('\n--- Running Clock, Date & Greeting Tests ---');

// 1. Time Formatting (12h)
const afternoonDate = new Date('2026-10-29T14:35:42');
const t12 = formatTime(afternoonDate, { format: '12h', showSeconds: false });
assert(t12.timeStr === '2:35', '12h formats 14:35 as 2:35');
assert(t12.periodStr === 'PM', '12h identifies PM correctly');

const t12Sec = formatTime(afternoonDate, { format: '12h', showSeconds: true });
assert(t12Sec.timeStr === '2:35:42', '12h displays seconds when requested');

const midnightDate = new Date('2026-10-29T00:05:00');
const tMidnight = formatTime(midnightDate, { format: '12h' });
assert(tMidnight.timeStr === '12:05', '12h midnight is 12:05');
assert(tMidnight.periodStr === 'AM', '12h midnight is AM');

const noonDate = new Date('2026-10-29T12:00:00');
const tNoon = formatTime(noonDate, { format: '12h' });
assert(tNoon.timeStr === '12:00', '12h noon is 12:00');
assert(tNoon.periodStr === 'PM', '12h noon is PM');

// 2. Time Formatting (24h)
const t24 = formatTime(afternoonDate, { format: '24h', showSeconds: false });
assert(t24.timeStr === '14:35', '24h formats 14:35 correctly');
assert(t24.periodStr === '', '24h has no AM/PM period');

const t24Morning = formatTime(new Date('2026-10-29T08:05:09'), { format: '24h', showSeconds: true });
assert(t24Morning.timeStr === '08:05:09', '24h pads single digits');

// 3. Date Formatting
const formattedDate = formatDate(afternoonDate);
assert(formattedDate.includes('Thursday'), 'Date includes day of week');
assert(formattedDate.includes('October'), 'Date includes month name');
assert(formattedDate.includes('29'), 'Date includes day number');
assert(formattedDate.includes('2026'), 'Date includes year');

// 4. Time-Aware Greetings
const morning = new Date('2026-10-29T09:00:00');
const afternoon = new Date('2026-10-29T14:00:00');
const evening = new Date('2026-10-29T19:00:00');
const night = new Date('2026-10-29T23:30:00');

assert(getGreeting(morning) === 'Good morning', '09:00 greeting is Good morning');
assert(getGreeting(afternoon) === 'Good afternoon', '14:00 greeting is Good afternoon');
assert(getGreeting(evening) === 'Good evening', '19:00 greeting is Good evening');
assert(getGreeting(night) === 'Good night', '23:30 greeting is Good night');

// 5. Greeting with User Name
assert(getGreeting(morning, 'Alex') === 'Good morning, Alex', 'Greeting formats personalized name');
assert(getGreeting(morning, '   ') === 'Good morning', 'Greeting omits empty whitespace name');

console.log(`Clock Tests: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
