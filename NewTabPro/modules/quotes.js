/**
 * NewTab Pro - Quotes & Motivation Engine
 * Curated offline library of philosophy, productivity, science, and engineering quotes.
 */

export const CURATED_QUOTES = [
  { text: "Simplicity is prerequisite for reliability.", author: "Edsger W. Dijkstra" },
  { text: "We suffer more often in imagination than in reality.", author: "Seneca" },
  { text: "The best way to predict the future is to invent it.", author: "Alan Kay" },
  { text: "You have power over your mind - not outside events. Realize this, and you will find strength.", author: "Marcus Aurelius" },
  { text: "First, solve the problem. Then, write the code.", author: "John Johnson" },
  { text: "Make it work, make it right, make it fast.", author: "Kent Beck" },
  { text: "Action is the foundational key to all success.", author: "Pablo Picasso" },
  { text: "Quality is not an act, it is a habit.", author: "Aristotle" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Focus is a muscle. The more you practice it, the stronger it gets.", author: "Cal Newport" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "Small daily improvements over time lead to stunning results.", author: "Robin Sharma" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Do what you can, with what you have, where you are.", author: "Theodore Roosevelt" },
  { text: "Premature optimization is the root of all evil.", author: "Donald Knuth" },
  { text: "An ounce of practice is generally worth more than a ton of theory.", author: "E.F. Schumacher" },
  { text: "Continuous improvement is better than delayed perfection.", author: "Mark Twain" },
  { text: "In the middle of difficulty lies opportunity.", author: "Albert Einstein" },
  { text: "Everything should be made as simple as possible, but not simpler.", author: "Albert Einstein" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" }
];

/**
 * Returns a quote based on date or index
 * @param {Date} [date]
 * @returns {{ text: string, author: string }}
 */
export function getDailyQuote(date = new Date()) {
  const dayOfYear = Math.floor(
    (date - new Date(date.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24)
  );
  const index = Math.abs(dayOfYear) % CURATED_QUOTES.length;
  return CURATED_QUOTES[index];
}

/**
 * Returns a random quote from the library
 * @param {number} [excludeIndex]
 * @returns {{ quote: { text: string, author: string }, index: number }}
 */
export function getRandomQuote(excludeIndex = -1) {
  let index = Math.floor(Math.random() * CURATED_QUOTES.length);
  if (index === excludeIndex && CURATED_QUOTES.length > 1) {
    index = (index + 1) % CURATED_QUOTES.length;
  }
  return {
    quote: CURATED_QUOTES[index],
    index
  };
}
