/**
 * FontLens - Presets System Unit Tests
 */

import {
  DEFAULT_PRESETS,
  validatePreset,
  createPreset
} from '../scripts/presets.js';

export async function runPresetsTests() {
  const results = [];

  function assert(condition, message) {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
    results.push({ name: message, passed: true });
  }

  // 1. Built-in presets inventory
  assert(Array.isArray(DEFAULT_PRESETS) && DEFAULT_PRESETS.length >= 5, 'At least 5 built-in presets provided');

  DEFAULT_PRESETS.forEach(preset => {
    assert(typeof preset.id === 'string' && preset.id.length > 0, `Preset ${preset.name} has valid id`);
    assert(typeof preset.name === 'string' && preset.name.length > 0, `Preset ${preset.id} has valid name`);
    assert(preset.isBuiltIn === true, `Preset ${preset.name} marked as isBuiltIn`);
    assert(preset.properties && typeof preset.properties === 'object', `Preset ${preset.name} has properties object`);
    assert(typeof preset.properties.fontFamily === 'string', `Preset ${preset.name} specifies fontFamily`);
    assert(typeof preset.properties.fontSize === 'string', `Preset ${preset.name} specifies fontSize`);
  });

  // Check specific expected built-in presets
  const ids = DEFAULT_PRESETS.map(p => p.id);
  assert(ids.includes('preset_editorial_serif'), 'Editorial Serif preset included');
  assert(ids.includes('preset_modern_tech_sans'), 'Modern Tech Sans preset included');
  assert(ids.includes('preset_dense_data_mono'), 'Dense Data Mono preset included');
  assert(ids.includes('preset_bold_display_headline'), 'Bold Display Headline preset included');
  assert(ids.includes('preset_compact_button'), 'UI Interactive Button preset included');

  // 2. validatePreset validator
  assert(validatePreset(null).valid === false, 'Rejects null preset');
  assert(validatePreset({}).valid === false, 'Rejects empty preset');
  assert(validatePreset({ name: 'Valid Name' }).valid === false, 'Rejects preset without properties');
  assert(validatePreset({ name: 'Valid', properties: {} }).valid === false, 'Rejects preset without fontFamily');

  const validCustom = {
    name: 'Custom Sans',
    properties: {
      fontFamily: '"Poppins", sans-serif',
      fontSize: '18px'
    }
  };
  assert(validatePreset(validCustom).valid === true, 'Accepts valid preset structure');

  // 3. createPreset factory
  const created = createPreset('Minimal Geometric', {
    fontFamily: '"Space Grotesk", sans-serif',
    fontSize: '20px',
    fontWeight: '500'
  }, 'modern', 'Crisp modern look');

  assert(created.id.startsWith('preset_'), 'Generated ID has preset_ prefix');
  assert(created.name === 'Minimal Geometric', 'Name matches input');
  assert(created.category === 'modern', 'Category matches input');
  assert(created.isBuiltIn === false, 'Custom preset is not marked built-in');
  assert(created.createdAt > 0, 'Timestamp is attached');
  assert(validatePreset(created).valid === true, 'Created preset passes validation');

  return results;
}
