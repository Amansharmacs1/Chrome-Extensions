/**
 * FocusFlow - Storage & Migration Unit Tests
 */

import assert from 'node:assert';
import {
  STORAGE_KEYS,
  SCHEMA_VERSION,
  DEFAULT_SETTINGS,
  DEFAULT_TIMER_STATE,
  migrateStorage
} from '../modules/storage.js';

export function run() {
  console.log('🧪 Testing Storage & Migration Module...');

  // 1. Defaults sanity
  assert.strictEqual(DEFAULT_SETTINGS.focusDurationMinutes, 25);
  assert.strictEqual(DEFAULT_SETTINGS.shortBreakMinutes, 5);
  assert.strictEqual(DEFAULT_SETTINGS.longBreakMinutes, 15);
  assert.strictEqual(DEFAULT_SETTINGS.sessionsBeforeLongBreak, 4);
  assert.strictEqual(DEFAULT_SETTINGS.schemaVersion, SCHEMA_VERSION);
  assert.strictEqual(DEFAULT_TIMER_STATE.status, 'idle');

  // 2. Migration with empty object
  const migratedEmpty = migrateStorage({});
  assert.deepStrictEqual(migratedEmpty[STORAGE_KEYS.SETTINGS], DEFAULT_SETTINGS);
  assert.deepStrictEqual(migratedEmpty[STORAGE_KEYS.TIMER], DEFAULT_TIMER_STATE);
  assert.deepStrictEqual(migratedEmpty[STORAGE_KEYS.TASKS], []);
  assert.deepStrictEqual(migratedEmpty[STORAGE_KEYS.HISTORY], []);

  // 3. Out-of-bounds and corrupted values sanitization
  const corrupted = {
    [STORAGE_KEYS.SETTINGS]: {
      focusDurationMinutes: -50, // Negative duration
      shortBreakMinutes: 'invalid', // Non-numeric
      longBreakMinutes: 9999, // Too large
      dailyGoalMinutes: 0,
      blockedDomains: 'not an array'
    },
    [STORAGE_KEYS.TASKS]: 'not an array',
    [STORAGE_KEYS.HISTORY]: null
  };

  const sanitized = migrateStorage(corrupted);
  const s = sanitized[STORAGE_KEYS.SETTINGS];

  assert.strictEqual(s.focusDurationMinutes, 1, 'Must clamp negative duration to min 1');
  assert.strictEqual(s.shortBreakMinutes, 5, 'Must fallback invalid number to default 5');
  assert.strictEqual(s.longBreakMinutes, 90, 'Must clamp excessive duration to max 90');
  assert.strictEqual(s.dailyGoalMinutes, 10, 'Must clamp 0 daily goal to min 10');
  assert.strictEqual(s.schemaVersion, SCHEMA_VERSION);

  assert.deepStrictEqual(sanitized[STORAGE_KEYS.TASKS], []);
  assert.deepStrictEqual(sanitized[STORAGE_KEYS.HISTORY], []);

  console.log('✅ All Storage & Migration tests passed!');
}
