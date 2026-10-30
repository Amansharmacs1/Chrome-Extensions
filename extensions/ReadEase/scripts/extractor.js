/**
 * ReadEase - Content Extractor Pipeline
 * Coordinates document cloning, Readability parsing, security sanitization,
 * selected text fallback, and structured article metadata assembly.
 */

import { extractArticle } from './readability.js';
import { sanitizeHtml } from './sanitizer.js';
import { generateId, countWords, calculateReadingTime, extractDomain } from './utils.js';

/**
 * Extracts, sanitizes, and packages an article from a document or selected text
 * @param {Document} doc
 * @param {Object} [options={}]
 * @param {string} [options.url='']
 * @param {string} [options.selectedText='']
 * @returns {Object} Extracted and sanitized article payload
 */
export function extractArticleFromDocument(doc, options = {}) {
  const url = options.url || (doc && doc.location ? doc.location.href : '');
  const selectedText = (options.selectedText || '').trim();

  // 1. If user selected a specific passage on the page, allow reading selected text
  if (selectedText.length > 80 && options.preferSelection) {
    const wordCount = countWords(selectedText);
    const readingTime = calculateReadingTime(wordCount);
    const domain = extractDomain(url);
    const title = doc?.title ? `Selection from ${doc.title}` : 'Selected Reading';

    const paragraphs = selectedText
      .split(/\n\s*\n/)
      .map(p => `<p>${p.trim()}</p>`)
      .join('\n');

    return {
      id: generateId('art'),
      isArticle: true,
      isSelection: true,
      url,
      title,
      byline: '',
      publishedTime: new Date().toISOString(),
      siteName: domain,
      excerpt: selectedText.slice(0, 180) + '...',
      contentHtml: sanitizeHtml(paragraphs),
      textContent: selectedText,
      wordCount,
      readingTime,
      extractedAt: Date.now()
    };
  }

  // 2. Perform primary Readability article extraction
  const rawArticle = extractArticle(doc, url);

  // If extraction determined this is not a readable article
  if (!rawArticle.isArticle) {
    // Check if user has selected text as a fallback offer
    if (selectedText.length > 50) {
      return {
        isArticle: false,
        canReadSelection: true,
        selectedText,
        reason: rawArticle.reason,
        url,
        siteName: extractDomain(url)
      };
    }

    return rawArticle;
  }

  // 3. Strict security sanitization on extracted article HTML
  const sanitizedContent = sanitizeHtml(rawArticle.contentHtml);

  // 4. Return clean, fully sanitized article entity
  return {
    id: generateId('art'),
    isArticle: true,
    isSelection: false,
    url: rawArticle.url,
    title: rawArticle.title,
    byline: rawArticle.byline,
    publishedTime: rawArticle.publishedTime,
    siteName: rawArticle.siteName,
    excerpt: rawArticle.excerpt,
    contentHtml: sanitizedContent,
    textContent: rawArticle.textContent,
    wordCount: rawArticle.wordCount,
    readingTime: rawArticle.readingTime,
    extractedAt: rawArticle.extractedAt
  };
}
