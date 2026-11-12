/**
 * QRQuick - Payload Builder & Type Detection Tests
 */

import {
  escapeVCard,
  escapeWifi,
  formatCalendarDate,
  buildUrlPayload,
  buildTextPayload,
  buildContactPayload,
  buildEmailPayload,
  buildPhonePayload,
  buildSmsPayload,
  buildWifiPayload,
  buildLocationPayload,
  buildEventPayload,
  detectPayloadType
} from '../services/payload-builder.js';

export async function runPayloadBuilderTests() {
  const assertions = [];
  function assert(condition, message) {
    if (!condition) {
      throw new Error(`Payload Builder Test Failed: ${message}`);
    }
    assertions.push(message);
  }

  // 1. URL Payload
  const urlRes = buildUrlPayload({ url: 'https://github.com/example/repo', title: 'GitHub Repo' });
  assert(urlRes.payload === 'https://github.com/example/repo', 'URL payload preserved');
  assert(urlRes.title === 'GitHub Repo', 'URL title preserved');

  // URL auto-prefix https://
  const autoPrefix = buildUrlPayload({ url: 'example.com' });
  assert(autoPrefix.payload === 'https://example.com/', 'URL auto-prefixed with https://');

  // URL invalid scheme
  let threw = false;
  try {
    buildUrlPayload({ url: 'javascript:alert(1)' });
  } catch {
    threw = true;
  }
  assert(threw, 'Rejects dangerous javascript: URL');

  // 2. Text Payload
  const textRes = buildTextPayload({ text: 'Hello World 123' });
  assert(textRes.payload === 'Hello World 123', 'Text payload matches');
  assert(textRes.title === 'Hello World 123', 'Text title matches');

  // Empty text throws
  threw = false;
  try {
    buildTextPayload({ text: '   ' });
  } catch {
    threw = true;
  }
  assert(threw, 'Empty text throws validation error');

  // 3. Contact (vCard) Payload & Escaping
  const contactRes = buildContactPayload({
    firstName: 'Jane',
    lastName: 'Doe',
    organization: 'Acme, Inc.',
    title: 'CTO',
    phone: '+1-555-0199',
    email: 'jane@acme.com',
    website: 'https://acme.com',
    address: '123 Tech Blvd; Suite 400'
  });
  assert(contactRes.payload.startsWith('BEGIN:VCARD'), 'vCard begins with BEGIN:VCARD');
  assert(contactRes.payload.includes('VERSION:3.0'), 'vCard specifies version 3.0');
  assert(contactRes.payload.includes('FN:Jane Doe'), 'vCard formatted name correct');
  assert(contactRes.payload.includes('ORG:Acme\\, Inc.'), 'vCard escapes comma in organization');
  assert(contactRes.payload.includes('ADR;TYPE=WORK:;;123 Tech Blvd\\; Suite 400;;;;'), 'vCard escapes semicolon in address');
  assert(contactRes.payload.endsWith('END:VCARD'), 'vCard ends with END:VCARD');

  // 4. Email Payload
  const emailRes = buildEmailPayload({
    email: 'hello@example.com',
    subject: 'Project Update',
    body: 'Here is the report.'
  });
  assert(emailRes.payload.startsWith('mailto:hello@example.com'), 'Email starts with mailto:');
  assert(emailRes.payload.includes('subject=Project%20Update'), 'Email subject URI encoded');
  assert(emailRes.payload.includes('body=Here%20is%20the%20report.'), 'Email body URI encoded');

  // 5. Phone Payload
  const phoneRes = buildPhonePayload({ phone: '+1 (555) 234-5678' });
  assert(phoneRes.payload === 'tel:+15552345678', 'Phone sanitized to standard tel: URI');

  // 6. SMS Payload
  const smsRes = buildSmsPayload({ phone: '+1 (555) 987-6543', message: 'See you at 5pm!' });
  assert(smsRes.payload === 'smsto:+15559876543:See you at 5pm!', 'SMS payload matches smsto: standard');

  // 7. Wi-Fi Payload & Special Character Escaping
  const wifiRes = buildWifiPayload({
    ssid: 'Home:Network;5G,Special\\Key',
    password: 'P@ss;word"123',
    encryption: 'WPA',
    hidden: true
  });
  assert(wifiRes.payload.startsWith('WIFI:S:'), 'Wi-Fi starts with WIFI:S:');
  assert(wifiRes.payload.includes('Home\\:Network\\;5G\\,Special\\\\Key'), 'Wi-Fi escapes colon, semicolon, comma, backslash');
  assert(wifiRes.payload.includes('P:P@ss\\;word\\"123'), 'Wi-Fi escapes quotes and semicolons in password');
  assert(wifiRes.payload.includes('H:true;'), 'Wi-Fi includes hidden flag');

  // 8. Location Payload
  const locRes = buildLocationPayload({ latitude: 37.7749, longitude: -122.4194, query: 'San Francisco' });
  assert(locRes.payload === 'https://maps.google.com/local?q=37.7749,-122.4194', 'Location formats as Google Maps URL');
  assert(locRes.title.includes('San Francisco'), 'Location title includes query');

  // Invalid coordinates throw
  threw = false;
  try {
    buildLocationPayload({ latitude: 95, longitude: 10 });
  } catch {
    threw = true;
  }
  assert(threw, 'Throws on latitude > 90');

  // 9. Calendar Event (iCalendar / VEVENT)
  const eventRes = buildEventPayload({
    title: 'Sprint Planning',
    start: '2026-12-01T10:00:00Z',
    end: '2026-12-01T11:30:00Z',
    location: 'Room 101',
    description: 'Bi-weekly sprint planning'
  });
  assert(eventRes.payload.includes('BEGIN:VEVENT'), 'Event contains BEGIN:VEVENT');
  assert(eventRes.payload.includes('SUMMARY:Sprint Planning'), 'Event title encoded');
  assert(eventRes.payload.includes('DTSTART:20261201T100000Z'), 'Event start formatted in basic ISO');
  assert(eventRes.payload.includes('DTEND:20261201T113000Z'), 'Event end formatted in basic ISO');
  assert(eventRes.payload.includes('LOCATION:Room 101'), 'Event location encoded');
  assert(eventRes.payload.includes('END:VEVENT'), 'Event ends with END:VEVENT');

  // 10. Payload Type Detection
  const detectWifi = detectPayloadType('WIFI:S:OfficeNet;T:WPA;P:secret123;;');
  assert(detectWifi.type === 'wifi', 'Detected Wi-Fi payload');
  assert(detectWifi.details.ssid === 'OfficeNet', 'Parsed Wi-Fi SSID');

  const detectVcard = detectPayloadType('BEGIN:VCARD\r\nVERSION:3.0\r\nFN:John Smith\r\nTEL:+15550000\r\nEND:VCARD');
  assert(detectVcard.type === 'contact', 'Detected Contact payload');
  assert(detectVcard.details.name === 'John Smith', 'Parsed vCard contact name');

  const detectEmail = detectPayloadType('mailto:user@domain.com?subject=Hi');
  assert(detectEmail.type === 'email', 'Detected Email payload');

  const detectPhone = detectPayloadType('tel:+123456789');
  assert(detectPhone.type === 'phone', 'Detected Phone payload');

  const detectUrl = detectPayloadType('https://developer.mozilla.org');
  assert(detectUrl.type === 'url', 'Detected URL payload');
  assert(detectUrl.isUrl === true, 'isUrl flag is true for HTTP URL');

  const detectText = detectPayloadType('Just some casual notes here');
  assert(detectText.type === 'text', 'Detected plain text payload');

  return assertions;
}
