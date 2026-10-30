/**
 * ReadEase - Readability Article Extraction Engine
 * Standalone, locally bundled article extraction algorithm.
 * Identifies primary reading content, removes boilerplate, and scores candidates.
 */

import { countWords, calculateReadingTime, extractDomain } from './utils.js';

// Regex patterns for scoring and cleaning
const REGEX_UNLIKELY_CANDIDATES = /combx|comment|community|disqus|extra|foot|header|menu|nav|remark|rss|shoutbox|sidebar|sponsor|ad-break|agegate|pagination|pager|popup|tweet|twitter|cookie|gdpr|newsletter|subscribe/i;
const REGEX_MAYBE_CANDIDATES = /and|article|body|column|main|shadow/i;
const REGEX_POSITIVE = /article|body|content|entry|hentry|main|page|pagination|post|text|blog|story/i;
const REGEX_NEGATIVE = /combx|comment|com-|contact|foot|footer|footnote|masthead|media|meta|outbrain|promo|related|scroll|shoutbox|sidebar|sponsor|shopping|tags|tool|widget|ad|author-bio|recommend/i;

/**
 * Extracts metadata from a document (title, author, date, siteName, excerpt)
 * @param {Document} doc
 * @param {string} [pageUrl='']
 * @returns {Object}
 */
export function extractMetadata(doc, pageUrl = '') {
  const meta = {
    title: '',
    byline: '',
    publishedTime: '',
    siteName: extractDomain(pageUrl),
    excerpt: ''
  };

  if (!doc) return meta;

  // Title extraction
  const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute('content');
  const twTitle = doc.querySelector('meta[name="twitter:title"]')?.getAttribute('content');
  const h1 = doc.querySelector('h1')?.textContent?.trim();
  const docTitle = doc.title || '';

  meta.title = (ogTitle || twTitle || h1 || docTitle).trim();
  // Strip trailing site name if present (e.g. "Article Title | SiteName" or "Article Title - SiteName")
  if (meta.title) {
    const parts = meta.title.split(/\s+[|\-—–]\s+/);
    if (parts.length > 1 && parts[0].length > 15) {
      meta.title = parts[0].trim();
    }
  }

  // Author / Byline extraction
  const metaAuthor = doc.querySelector('meta[name="author"]')?.getAttribute('content') ||
                     doc.querySelector('meta[property="article:author"]')?.getAttribute('content');
  const relAuthor = doc.querySelector('[rel="author"]')?.textContent?.trim();
  const bylineElem = doc.querySelector('.byline, .author-name, [itemprop="author"]')?.textContent?.trim();

  meta.byline = (metaAuthor || relAuthor || bylineElem || '').replace(/^by\s+/i, '').trim();

  // Publication date
  const metaDate = doc.querySelector('meta[property="article:published_time"]')?.getAttribute('content') ||
                   doc.querySelector('meta[name="pubdate"]')?.getAttribute('content') ||
                   doc.querySelector('time[datetime]')?.getAttribute('datetime') ||
                   doc.querySelector('time')?.textContent?.trim();
  meta.publishedTime = (metaDate || '').trim();

  // Excerpt / Description
  const ogDesc = doc.querySelector('meta[property="og:description"]')?.getAttribute('content');
  const metaDesc = doc.querySelector('meta[name="description"]')?.getAttribute('content');
  let rawExcerpt = (ogDesc || metaDesc || '').trim();

  // If description is missing, empty, or coordinates/noise (e.g. Wikipedia geohacks), fall back to lead paragraph
  if (!rawExcerpt || /^\s*coordinates:/i.test(rawExcerpt) || /^\d+°\d+['′]/.test(rawExcerpt)) {
    try {
      const leadP = doc.querySelector('p');
      if (leadP) {
        const pText = (leadP.textContent || '').trim().replace(/\s+/g, ' ');
        if (pText.length > 40 && !/^\s*coordinates:/i.test(pText) && !/^\d+°\d+['′]/.test(pText)) {
          rawExcerpt = pText.slice(0, 180) + (pText.length > 180 ? '...' : '');
        }
      }
    } catch {
      // In custom environments where querySelector('p') might not match
    }
  }
  meta.excerpt = rawExcerpt;

  // Site name
  const ogSiteName = doc.querySelector('meta[property="og:site_name"]')?.getAttribute('content');
  if (ogSiteName) {
    meta.siteName = ogSiteName.trim();
  }

  return meta;
}

/**
 * Strips noisy, non-content elements from a clone of the DOM container
 * @param {Element} root
 */
export function removeUnwantedElements(root) {
  if (!root) return;

  const unwantedSelectors = [
    'script', 'style', 'noscript', 'iframe', 'object', 'embed', 'canvas',
    'header', 'footer', 'nav', 'aside',
    '.nav', '.navbar', '.header', '.footer', '.site-header', '.site-footer',
    '.sidebar', '#sidebar', '.ad', '.ads', '.ad-banner', '.advertisement', '.ad-container',
    '.cookie-banner', '.gdpr', '.consent-banner',
    '.social-share', '.share-buttons', '.share-bar',
    '.comments', '#comments', '.comment-section',
    '.related-posts', '.recommended-articles',
    '.newsletter-signup', '.subscribe-box',
    '.popup', '.modal', '.drawer',
    // Encyclopedia, documentation & wiki noise
    '.infobox', '.infobox_v2', '.infobox-table',
    '.navbox', '.vertical-navbox', '.metadata',
    '.mw-editsection', '.mw-jump-link', '.mw-cite-backlink',
    '.reference', 'sup.reference', '.reflist',
    '#coordinates', '.coordinates', '.geo-default', '.geo-nondefault',
    '.hatnote', '.ambox', '.tmbox', '.cmbox', '.fmbox', '.ombox',
    '.noprint', '.sistersitebox', '.catlinks',
    '#toc', '.toc', '.mw-table-of-contents-container'
  ];

  for (const selector of unwantedSelectors) {
    try {
      const elements = root.querySelectorAll(selector);
      elements.forEach(el => el.remove());
    } catch {
      // Ignore invalid selector in custom contexts
    }
  }
}

/**
 * Calculates a content score for a DOM element candidate
 * @param {Element} elem
 * @returns {number}
 */
export function scoreElement(elem) {
  if (!elem) return 0;

  let score = 0;
  const tagName = elem.tagName?.toLowerCase();

  // Tag weight
  if (tagName === 'article') score += 30;
  if (tagName === 'div') score += 5;
  if (tagName === 'section') score += 10;
  if (tagName === 'main') score += 25;

  // Class and ID weighting
  const idAndClass = `${elem.id || ''} ${elem.className || ''}`.toLowerCase();
  if (REGEX_POSITIVE.test(idAndClass)) score += 25;
  if (REGEX_NEGATIVE.test(idAndClass)) score -= 25;
  if (REGEX_UNLIKELY_CANDIDATES.test(idAndClass) && !REGEX_MAYBE_CANDIDATES.test(idAndClass)) {
    score -= 40;
  }

  // Paragraph weight
  const paragraphs = elem.querySelectorAll('p');
  for (const p of paragraphs) {
    const text = p.textContent.trim();
    if (text.length > 50) {
      score += Math.min(10, Math.floor(text.length / 50));
    }
  }

  // Heading weight
  const headings = elem.querySelectorAll('h1, h2, h3, h4');
  score += headings.length * 5;

  // Code blocks weight (great for technical tutorials & documentation)
  const codeBlocks = elem.querySelectorAll('pre, code');
  score += Math.min(30, codeBlocks.length * 6);

  // Images weight
  const images = elem.querySelectorAll('img');
  score += Math.min(20, images.length * 4);

  // Link density penalty
  const textLength = elem.textContent.trim().length;
  if (textLength > 0) {
    let linkTextLength = 0;
    const links = elem.querySelectorAll('a');
    for (const a of links) {
      linkTextLength += a.textContent.trim().length;
    }
    const linkDensity = linkTextLength / textLength;
    if (linkDensity > 0.5) {
      score -= 50; // Heavy link lists are navigation or archives, not articles
    }
  }

  return score;
}

/**
 * Finds the top candidate container for the article
 * @param {Element} container
 * @returns {Element|null}
 */
export function findBestArticleContainer(container) {
  if (!container) return null;

  // 1. Direct semantic article tag
  const articleTag = container.querySelector('article');
  if (articleTag && articleTag.textContent.trim().length > 200) {
    return articleTag;
  }

  // 2. Direct semantic main tag
  const mainTag = container.querySelector('main');
  if (mainTag && mainTag.textContent.trim().length > 250) {
    const innerArticle = mainTag.querySelector('article');
    if (innerArticle) return innerArticle;
    return mainTag;
  }

  // 3. Search and score candidate containers
  const candidates = container.querySelectorAll('div, section, article, main, td');
  let topCandidate = null;
  let maxScore = 0;

  for (const candidate of candidates) {
    const text = candidate.textContent.trim();
    if (text.length < 150) continue;

    const score = scoreElement(candidate);
    if (score > maxScore) {
      maxScore = score;
      topCandidate = candidate;
    }
  }

  return topCandidate || container;
}

/**
 * Extracts and prepares the clean HTML and text content from the best candidate
 * @param {Element} container
 * @returns {{ html: string, text: string }}
 */
export function extractCleanArticleContent(container) {
  if (!container) return { html: '', text: '' };

  const clone = container.cloneNode(true);
  removeUnwantedElements(clone);

  // Format code blocks cleanly
  const pres = clone.querySelectorAll('pre');
  pres.forEach(pre => {
    if (pre.classList && typeof pre.classList.add === 'function') {
      pre.classList.add('reader-code-block');
    } else {
      pre.className = (pre.className ? pre.className + ' ' : '') + 'reader-code-block';
    }
  });

  // Ensure figures and images are marked for clean display
  const imgs = clone.querySelectorAll('img');
  imgs.forEach(img => {
    let src = img.getAttribute('src');
    if (src && src.startsWith('//')) {
      img.setAttribute('src', 'https:' + src);
    }
    let srcset = img.getAttribute('srcset');
    if (srcset && srcset.includes('//')) {
      img.setAttribute('srcset', srcset.replace(/(^|\s)\/\//g, '$1https://'));
    }
    if (img.classList && typeof img.classList.add === 'function') {
      img.classList.add('reader-image');
    } else {
      img.className = (img.className ? img.className + ' ' : '') + 'reader-image';
    }
    if (!img.getAttribute('alt')) {
      img.setAttribute('alt', 'Article illustration');
    }
  });

  const links = clone.querySelectorAll('a');
  links.forEach(a => {
    let href = a.getAttribute('href');
    if (href && href.startsWith('//')) {
      a.setAttribute('href', 'https:' + href);
    }
  });

  const text = clone.textContent.trim().replace(/\s+/g, ' ');
  const html = (clone.innerHTML || '').trim();

  return { html, text };
}

/**
 * Parses a webpage document or HTML string and extracts full article data
 * @param {Document|string} source
 * @param {string} [url='']
 * @returns {Object} Extracted article result
 */
export function extractArticle(source, url = '') {
  let doc = null;

  if (typeof source === 'string') {
    if (typeof DOMParser !== 'undefined') {
      const parser = new DOMParser();
      doc = parser.parseFromString(source, 'text/html');
    } else {
      // Basic mock or fallback if DOMParser unavailable
      return {
        isArticle: false,
        reason: 'DOMParser is not available in this environment'
      };
    }
  } else if (source && source.documentElement) {
    doc = source;
  } else {
    return {
      isArticle: false,
      reason: 'Invalid document source provided'
    };
  }

  // Clone document body so original page is never mutated
  const bodyClone = doc.body ? doc.body.cloneNode(true) : null;
  if (!bodyClone) {
    return {
      isArticle: false,
      reason: 'Page has no body content'
    };
  }

  const metadata = extractMetadata(doc, url);
  removeUnwantedElements(bodyClone);

  const bestContainer = findBestArticleContainer(bodyClone);
  const { html, text } = extractCleanArticleContent(bestContainer || bodyClone);

  const wordCount = countWords(text);
  const readingTime = calculateReadingTime(wordCount);

  // Verification: Is this a readable article?
  // Threshold: at least 60 words, or substantial paragraphs
  const hasParagraphs = (html.match(/<p\b/gi) || []).length >= 2;
  const isSufficientWords = wordCount >= 60;

  if (!isSufficientWords && !hasParagraphs) {
    return {
      isArticle: false,
      reason: 'Page contains insufficient reading text. It may be a homepage, gallery, or navigation index.',
      title: metadata.title,
      siteName: metadata.siteName,
      url,
      wordCount,
      readingTime
    };
  }

  let finalExcerpt = metadata.excerpt || '';
  if (!finalExcerpt || /^\s*coordinates:/i.test(finalExcerpt) || /^\d+°\d+['′]/.test(finalExcerpt)) {
    if (text) {
      finalExcerpt = text.slice(0, 180).trim() + (text.length > 180 ? '...' : '');
    }
  }

  return {
    isArticle: true,
    url,
    title: metadata.title || 'Untitled Article',
    byline: metadata.byline,
    publishedTime: metadata.publishedTime,
    siteName: metadata.siteName,
    excerpt: finalExcerpt,
    contentHtml: html,
    textContent: text,
    wordCount,
    readingTime,
    extractedAt: Date.now()
  };
}
