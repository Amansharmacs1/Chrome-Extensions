/**
 * NewTab Pro - Quick Calculator Engine
 * Clean arithmetic state machine for immediate calculations in the new tab.
 */

export class Calculator {
  constructor() {
    this.reset();
  }

  reset() {
    this.display = '0';
    this.previousValue = null;
    this.operation = null;
    this.waitingForOperand = false;
  }

  inputDigit(digit) {
    if (this.waitingForOperand) {
      this.display = String(digit);
      this.waitingForOperand = false;
    } else {
      this.display = this.display === '0' ? String(digit) : this.display + digit;
    }
    return this.display;
  }

  inputDecimal() {
    if (this.waitingForOperand) {
      this.display = '0.';
      this.waitingForOperand = false;
      return this.display;
    }
    if (!this.display.includes('.')) {
      this.display += '.';
    }
    return this.display;
  }

  toggleSign() {
    const val = parseFloat(this.display);
    if (val === 0 || isNaN(val)) return this.display;
    this.display = String(val * -1);
    return this.display;
  }

  inputPercent() {
    const val = parseFloat(this.display);
    if (isNaN(val)) return this.display;
    this.display = String(val / 100);
    return this.display;
  }

  performOperation(nextOperation) {
    const inputValue = parseFloat(this.display);

    if (this.previousValue === null) {
      this.previousValue = inputValue;
    } else if (this.operation) {
      const currentValue = this.previousValue || 0;
      const result = Calculator.calculate(currentValue, inputValue, this.operation);
      this.display = String(result);
      this.previousValue = result;
    }

    this.waitingForOperand = true;
    this.operation = nextOperation;
    return this.display;
  }

  calculateResult() {
    if (this.operation === null || this.previousValue === null) {
      return this.display;
    }

    const inputValue = parseFloat(this.display);
    const result = Calculator.calculate(this.previousValue, inputValue, this.operation);

    this.display = String(result);
    this.previousValue = null;
    this.operation = null;
    this.waitingForOperand = true;
    return this.display;
  }

  static calculate(first, second, operation) {
    let result = 0;
    switch (operation) {
      case '+':
        result = first + second;
        break;
      case '-':
        result = first - second;
        break;
      case '*':
      case '×':
        result = first * second;
        break;
      case '/':
      case '÷':
        if (second === 0) return 'Error';
        result = first / second;
        break;
      default:
        return second;
    }

    // Round to avoid IEEE-754 precision issues (e.g., 0.1 + 0.2 = 0.30000000000000004)
    if (typeof result === 'number') {
      return Math.round(result * 100000000) / 100000000;
    }
    return result;
  }
}
