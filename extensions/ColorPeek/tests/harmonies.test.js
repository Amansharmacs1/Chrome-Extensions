/**
 * ColorPeek - Harmonies & Palette Generator Tests
 */

import {
  getComplementary,
  getAnalogous,
  getTriadic,
  getTetradic,
  getSplitComplementary,
  getMonochromatic,
  getShadesScale,
  getAllHarmonies
} from '../scripts/harmonies.js';

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

console.log('\n--- Running Harmonies Tests ---');

// Base color: Pure Red (H: 0, S: 100%, L: 50%)
const red = '#FF0000';

// 1. Complementary (0° + 180° = 180° Cyan)
const comp = getComplementary(red);
assert(comp.length === 2, 'Complementary generates exactly 2 colors');
assert(comp[0].h === 0, 'First color is base red (H: 0°)');
assert(comp[1].h === 180, 'Second color is cyan (H: 180°)');
assert(comp[1].hex === '#00FFFF', 'Complementary of red is exact cyan #00FFFF');

// 2. Analogous (0° - 30° = 330° Rose, 0° + 30° = 30° Orange)
const ana = getAnalogous(red);
assert(ana.length === 3, 'Analogous generates 3 colors');
assert(ana[0].h === 330, 'Left analogous wraps 0° - 30° to 330°');
assert(ana[1].h === 0, 'Center color is base red');
assert(ana[2].h === 30, 'Right analogous is 30°');

// 3. Triadic (0°, 120° Green, 240° Blue)
const tri = getTriadic(red);
assert(tri.length === 3, 'Triadic generates 3 colors');
assert(tri[0].h === 0, 'First is red (0°)');
assert(tri[1].h === 120, 'Second is green (120°)');
assert(tri[2].h === 240, 'Third is blue (240°)');

// 4. Tetradic (0°, 90°, 180°, 270°)
const tetra = getTetradic(red);
assert(tetra.length === 4, 'Tetradic generates 4 colors');
assert(tetra[0].h === 0, 'Tetradic color 1 is 0°');
assert(tetra[1].h === 90, 'Tetradic color 2 is 90°');
assert(tetra[2].h === 180, 'Tetradic color 3 is 180°');
assert(tetra[3].h === 270, 'Tetradic color 4 is 270°');

// 5. Split-Complementary (0°, 150°, 210°)
const split = getSplitComplementary(red);
assert(split.length === 3, 'Split-complementary generates 3 colors');
assert(split[1].h === 150, 'Split comp 1 is 150°');
assert(split[2].h === 210, 'Split comp 2 is 210°');

// 6. Monochromatic
const mono = getMonochromatic(red);
assert(mono.length === 5, 'Monochromatic generates 5 shade variations');
assert(mono[0].l > mono[4].l, 'Monochromatic colors progress from lighter to darker');

// 7. Lightness Shades Scale (10 steps)
const shades = getShadesScale('#3B82F6');
assert(shades.length === 10, 'Shades scale generates exactly 10 design-system steps');
assert(shades[0].step === 50, 'First step is 50 (lightest tint)');
assert(shades[9].step === 900, 'Last step is 900 (deepest shade)');
assert(shades[0].color.l > shades[9].color.l, 'Step 50 lightness is higher than Step 900');

// 8. getAllHarmonies dictionary
const all = getAllHarmonies('#06B6D4');
assert(Boolean(all.complementary && all.analogous && all.triadic && all.shades), 'getAllHarmonies returns complete dictionary');

console.log(`Harmonies Tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
