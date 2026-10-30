/**
 * Test Suite: Permissions & macOS Diagnostics
 */

const assert = require('assert');
const PermissionsHelper = require('../permissions.js');

function run() {
  console.log('--- Running Permissions & Diagnostics Tests ---');

  // Test 1: Error troubleshooting guide
  const guide = PermissionsHelper.getTroubleshootingGuide('NotAllowedError');
  assert(guide.macSteps.length >= 4, 'Guide must provide comprehensive macOS steps');
  assert(guide.macSteps.some(s => s.includes('Privacy & Security')), 'Guide must direct user to macOS Privacy & Security');
  assert(guide.macSteps.some(s => s.includes('Google Chrome')), 'Guide must mention Google Chrome');

  // Test 2: Hardware error diagnostics
  const notFoundGuide = PermissionsHelper.getTroubleshootingGuide('NotFoundError');
  assert.strictEqual(notFoundGuide.errorName, 'NotFoundError');

  console.log('✅ All Permissions tests passed.');
}

module.exports = { run };
if (require.main === module) run();
