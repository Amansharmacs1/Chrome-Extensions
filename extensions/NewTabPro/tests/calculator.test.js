/**
 * NewTab Pro - Quick Calculator Unit Tests
 */

import { Calculator } from '../modules/calculator.js';

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

console.log('\n--- Running Quick Calculator Tests ---');

const calc = new Calculator();

// 1. Initial State
assert(calc.display === '0', 'Initial display is 0');

// 2. Input Digits
calc.inputDigit(4);
calc.inputDigit(2);
assert(calc.display === '42', 'Appends digits sequentially');

// 3. Decimals
calc.inputDecimal();
calc.inputDigit(5);
assert(calc.display === '42.5', 'Handles decimal point');
calc.inputDecimal();
assert(calc.display === '42.5', 'Ignores duplicate decimal point');

// 4. Basic Arithmetic Operations
assert(Calculator.calculate(15, 27, '+') === 42, 'Addition (15 + 27 = 42)');
assert(Calculator.calculate(50, 8, '-') === 42, 'Subtraction (50 - 8 = 42)');
assert(Calculator.calculate(6, 7, '*') === 42, 'Multiplication (6 * 7 = 42)');
assert(Calculator.calculate(84, 2, '/') === 42, 'Division (84 / 2 = 42)');

// 5. Division by Zero
assert(Calculator.calculate(10, 0, '/') === 'Error', 'Division by zero returns Error');

// 6. Sign Negation & Percent
calc.display = '50';
calc.toggleSign();
assert(calc.display === '-50', 'Toggles negative sign');
calc.toggleSign();
assert(calc.display === '50', 'Toggles back to positive');

calc.inputPercent();
assert(calc.display === '0.5', 'Calculates percentage (50% = 0.5)');

// 7. Reset
calc.reset();
assert(calc.display === '0', 'Reset clears display');
assert(calc.previousValue === null, 'Reset clears previousValue');
assert(calc.operation === null, 'Reset clears operation');

console.log(`Calculator Tests: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
