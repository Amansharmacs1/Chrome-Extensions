/**
 * FocusFlow - Distraction Blocker Unit Tests
 */

import assert from 'node:assert';
import {
  normalizeDomain,
  isValidDomain,
  buildDynamicRules,
  RULE_ID_BASE
} from '../modules/blocker.js';

export function run() {
  console.log('🧪 Testing Distraction Blocker Module...');

  // 1. Domain Normalization
  assert.strictEqual(normalizeDomain('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), 'youtube.com');
  assert.strictEqual(normalizeDomain('http://reddit.com/r/webdev'), 'reddit.com');
  assert.strictEqual(normalizeDomain('HTTPS://WWW.INSTAGRAM.COM:443/explore/'), 'instagram.com');
  assert.strictEqual(normalizeDomain('  twitter.com/  '), 'twitter.com');
  assert.strictEqual(normalizeDomain('news.ycombinator.com?ref=home#top'), 'news.ycombinator.com');

  // 2. Domain Validation
  // Valid domains
  assert.strictEqual(isValidDomain('youtube.com'), true);
  assert.strictEqual(isValidDomain('x.com'), true);
  assert.strictEqual(isValidDomain('sub.example.co.uk'), true);
  assert.strictEqual(isValidDomain('reddit.com'), true);
  assert.strictEqual(isValidDomain('https://facebook.com/'), true); // Normalization handles wrapper

  // Invalid / Dangerous / Protected targets
  assert.strictEqual(isValidDomain(''), false);
  assert.strictEqual(isValidDomain('notadomain'), false);
  assert.strictEqual(isValidDomain('localhost'), false);
  assert.strictEqual(isValidDomain('127.0.0.1'), false);
  assert.strictEqual(isValidDomain('chrome://settings'), false);
  assert.strictEqual(isValidDomain('chromewebstore.google.com'), false);
  assert.strictEqual(isValidDomain('chrome.google.com'), false);
  assert.strictEqual(isValidDomain('example.123'), false, 'TLD cannot be purely numeric');

  // 3. Dynamic Rule Generation for DeclarativeNetRequest
  const inputDomains = [
    'https://www.youtube.com/watch?v=abc',
    'reddit.com',
    'youtube.com', // Duplicate
    'invalid-target', // Invalid
    'https://twitter.com'
  ];

  const rules = buildDynamicRules(inputDomains, RULE_ID_BASE);
  assert.strictEqual(rules.length, 3, 'Must filter invalid and deduplicate (youtube, reddit, twitter)');

  // Verify first rule schema
  const r0 = rules[0];
  assert.strictEqual(r0.id, RULE_ID_BASE);
  assert.strictEqual(r0.priority, 1);
  assert.strictEqual(r0.action.type, 'block');
  assert.strictEqual(r0.condition.urlFilter, '||youtube.com');
  assert.deepStrictEqual(r0.condition.resourceTypes, ['main_frame', 'sub_frame']);

  // Verify sequential IDs
  assert.strictEqual(rules[1].id, RULE_ID_BASE + 1);
  assert.strictEqual(rules[2].id, RULE_ID_BASE + 2);

  console.log('✅ All Distraction Blocker tests passed!');
}
