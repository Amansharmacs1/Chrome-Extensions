/**
 * QRQuick - CSV & Bulk Parsing Unit Tests
 */

import { parseCSV, parseBulkInput } from '../bulk/csv-parser.js';

export async function runCsvParserTests() {
  const assertions = [];
  function assert(condition, message) {
    if (!condition) {
      throw new Error(`CSV Parser Test Failed: ${message}`);
    }
    assertions.push(message);
  }

  // 1. Basic CSV Parsing
  const basicCsv = 'a,b,c\r\n1,2,3';
  const rows1 = parseCSV(basicCsv);
  assert(rows1.length === 2, 'Parsed 2 rows');
  assert(rows1[0].length === 3 && rows1[1][2] === '3', 'Columns parsed correctly');

  // 2. Quoted fields with commas inside
  const quotedCsv = 'Name,Address\r\n"Acme, Inc.","123 Main St, Suite 4"';
  const rows2 = parseCSV(quotedCsv);
  assert(rows2.length === 2, 'Parsed 2 rows with quotes');
  assert(rows2[1][0] === 'Acme, Inc.', 'Commas inside quotes preserved');
  assert(rows2[1][1] === '123 Main St, Suite 4', 'Second quoted column preserved');

  // 3. Escaped double quotes ("" -> ")
  const escapedQuotes = 'Title,Desc\r\n"Book","He said ""Hello"" to me"';
  const rows3 = parseCSV(escapedQuotes);
  assert(rows3[1][1] === 'He said "Hello" to me', 'Escaped quotes resolved properly');

  // 4. parseBulkInput with CSV Headers
  const csvData = `label,content,type
Website,https://example.com,url
Store,https://shop.example.com,url
Wi-Fi,WIFI:S:MyWifi;T:WPA;P:secret;;,wifi`;

  const parsedCsv = parseBulkInput(csvData, 'csv');
  assert(parsedCsv.items.length === 3, 'Parsed 3 items from CSV');
  assert(parsedCsv.validCount === 3, 'All 3 items are valid');
  assert(parsedCsv.items[0].label === 'Website', 'Header column "label" mapped');
  assert(parsedCsv.items[0].content === 'https://example.com', 'Header column "content" mapped');
  assert(parsedCsv.items[2].type === 'wifi', 'Header column "type" mapped');

  // 5. parseBulkInput with Multiline Plain Text
  const textData = `https://first.com
https://second.com
Some text note`;

  const parsedText = parseBulkInput(textData, 'text');
  assert(parsedText.items.length === 3, 'Parsed 3 items from multiline text');
  assert(parsedText.items[0].content === 'https://first.com', 'First line mapped to content');
  assert(parsedText.items[0].type === 'url', 'Detected URL type');
  assert(parsedText.items[2].type === 'text', 'Detected text type');

  return assertions;
}
