/**
 * ReadEase - In-Page Content Extractor
 * Injected into the active tab via chrome.scripting.executeScript.
 * Runs non-destructively on cloned DOM, sanitizes content, and returns article data.
 */

(function () {
  // Regex heuristics
  const REGEX_UNLIKELY = /combx|comment|community|disqus|extra|foot|header|menu|nav|remark|rss|shoutbox|sidebar|sponsor|ad-break|agegate|pagination|pager|popup|tweet|twitter|cookie|gdpr|newsletter|subscribe/i;
  const REGEX_MAYBE = /and|article|body|column|main|shadow/i;
  const REGEX_POSITIVE = /article|body|content|entry|hentry|main|page|pagination|post|text|blog|story/i;
  const REGEX_NEGATIVE = /combx|comment|com-|contact|foot|footer|footnote|masthead|media|meta|outbrain|promo|related|scroll|shoutbox|sidebar|sponsor|shopping|tags|tool|widget|ad|author-bio|recommend/i;

  function countWords(str) {
    if (!str) return 0;
    const matches = str.trim().match(/[\p{L}\p{N}]+('[a-zA-Z]+)?/gu);
    return matches ? matches.length : 0;
  }

  function calculateReadingTime(words, wpm = 225) {
    if (words <= 0) return 0;
    return Math.max(1, Math.ceil(words / wpm));
  }

  function extractDomain(url) {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return '';
    }
  }

  function extractMetadata(doc, pageUrl) {
    const meta = {
      title: '',
      byline: '',
      publishedTime: '',
      siteName: extractDomain(pageUrl),
      excerpt: ''
    };

    const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute('content');
    const twTitle = doc.querySelector('meta[name="twitter:title"]')?.getAttribute('content');
    const h1 = doc.querySelector('h1')?.textContent?.trim();
    const docTitle = doc.title || '';

    meta.title = (ogTitle || twTitle || h1 || docTitle).trim();
    if (meta.title) {
      const parts = meta.title.split(/\s+[|\-—–]\s+/);
      if (parts.length > 1 && parts[0].length > 15) {
        meta.title = parts[0].trim();
      }
    }

    const metaAuthor = doc.querySelector('meta[name="author"]')?.getAttribute('content') ||
                       doc.querySelector('meta[property="article:author"]')?.getAttribute('content');
    const relAuthor = doc.querySelector('[rel="author"]')?.textContent?.trim();
    const bylineElem = doc.querySelector('.byline, .author-name, [itemprop="author"]')?.textContent?.trim();
    meta.byline = (metaAuthor || relAuthor || bylineElem || '').replace(/^by\s+/i, '').trim();

    const metaDate = doc.querySelector('meta[property="article:published_time"]')?.getAttribute('content') ||
                     doc.querySelector('meta[name="pubdate"]')?.getAttribute('content') ||
                     doc.querySelector('time[datetime]')?.getAttribute('datetime') ||
                     doc.querySelector('time')?.textContent?.trim();
    meta.publishedTime = (metaDate || '').trim();

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
      } catch {}
    }
    meta.excerpt = rawExcerpt;

    const ogSiteName = doc.querySelector('meta[property="og:site_name"]')?.getAttribute('content');
    if (ogSiteName) meta.siteName = ogSiteName.trim();

    return meta;
  }

  function removeUnwanted(root) {
    const selectors = [
      'script', 'style', 'noscript', 'iframe', 'object', 'embed', 'canvas',
      'header', 'footer', 'nav', 'aside',
      '.nav', '.navbar', '.header', '.footer', '.site-header', '.site-footer',
      '.sidebar', '#sidebar', '.ad', '.ads', '.advertisement', '.ad-container',
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
    selectors.forEach(sel => {
      try {
        root.querySelectorAll(sel).forEach(el => el.remove());
      } catch {}
    });
  }

  function scoreElement(elem) {
    if (!elem) return 0;
    let score = 0;
    const tag = elem.tagName?.toLowerCase();

    if (tag === 'article') score += 30;
    if (tag === 'div') score += 5;
    if (tag === 'section') score += 10;
    if (tag === 'main') score += 25;

    const idAndClass = `${elem.id || ''} ${elem.className || ''}`.toLowerCase();
    if (REGEX_POSITIVE.test(idAndClass)) score += 25;
    if (REGEX_NEGATIVE.test(idAndClass)) score -= 25;
    if (REGEX_UNLIKELY.test(idAndClass) && !REGEX_MAYBE.test(idAndClass)) score -= 40;

    const paragraphs = elem.querySelectorAll('p');
    for (const p of paragraphs) {
      const len = p.textContent.trim().length;
      if (len > 50) score += Math.min(10, Math.floor(len / 50));
    }

    const headings = elem.querySelectorAll('h1, h2, h3, h4');
    score += headings.length * 5;

    const codeBlocks = elem.querySelectorAll('pre, code');
    score += Math.min(30, codeBlocks.length * 6);

    const images = elem.querySelectorAll('img');
    score += Math.min(20, images.length * 4);

    const textLen = elem.textContent.trim().length;
    if (textLen > 0) {
      let linkLen = 0;
      elem.querySelectorAll('a').forEach(a => {
        linkLen += a.textContent.trim().length;
      });
      if (linkLen / textLen > 0.5) score -= 50;
    }

    return score;
  }

  function findBestContainer(body) {
    const articleTag = body.querySelector('article');
    if (articleTag && articleTag.textContent.trim().length > 200) return articleTag;

    const mainTag = body.querySelector('main');
    if (mainTag && mainTag.textContent.trim().length > 250) {
      const innerArt = mainTag.querySelector('article');
      if (innerArt) return innerArt;
      return mainTag;
    }

    const candidates = body.querySelectorAll('div, section, article, main, td');
    let topCandidate = null;
    let maxScore = 0;

    for (const c of candidates) {
      if (c.textContent.trim().length < 150) continue;
      const score = scoreElement(c);
      if (score > maxScore) {
        maxScore = score;
        topCandidate = c;
      }
    }

    return topCandidate || body;
  }

  function sanitize(dirtyHtml) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(dirtyHtml, 'text/html');

    const allowedTags = new Set([
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'b', 'strong', 'i', 'em', 'u', 's', 'del', 'ins', 'mark', 'sub', 'sup',
      'code', 'pre', 'kbd', 'samp', 'var',
      'blockquote', 'q', 'cite',
      'ul', 'ol', 'li', 'dl', 'dt', 'dd',
      'figure', 'figcaption',
      'img', 'picture', 'source',
      'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption',
      'hr', 'br',
      'span', 'div', 'section', 'article',
      'a'
    ]);

    const dangerous = new Set([
      'script', 'style', 'iframe', 'object', 'embed', 'applet',
      'frame', 'frameset', 'form', 'input', 'button', 'select', 'textarea',
      'svg', 'audio', 'video', 'canvas', 'noscript', 'meta', 'link'
    ]);

    function clean(node) {
      const children = Array.from(node.childNodes);
      for (const child of children) {
        if (child.nodeType === 3) continue;
        if (child.nodeType === 8) {
          node.removeChild(child);
          continue;
        }
        if (child.nodeType === 1) {
          const tag = child.tagName.toLowerCase();
          if (!allowedTags.has(tag)) {
            if (dangerous.has(tag)) {
              node.removeChild(child);
            } else {
              clean(child);
              while (child.firstChild) {
                node.insertBefore(child.firstChild, child);
              }
              node.removeChild(child);
            }
            continue;
          }

          const attrs = Array.from(child.attributes);
          for (const attr of attrs) {
            const name = attr.name.toLowerCase();
            const val = attr.value;

            if (name.startsWith('on')) {
              child.removeAttribute(attr.name);
              continue;
            }

            if (name === 'href') {
              let cleanVal = val.trim();
              if (cleanVal.startsWith('//')) {
                cleanVal = 'https:' + cleanVal;
              } else if (cleanVal.startsWith('/') && !cleanVal.startsWith('//')) {
                try {
                  cleanVal = new URL(url).origin + cleanVal;
                } catch {}
              }
              const safe = /^(https?:|mailto:|#)/i.test(cleanVal);
              if (safe) {
                child.setAttribute('href', cleanVal);
              } else {
                child.removeAttribute(attr.name);
              }
            } else if (name === 'src') {
              let cleanVal = val.trim();
              if (cleanVal.startsWith('//')) {
                cleanVal = 'https:' + cleanVal;
              } else if (cleanVal.startsWith('/') && !cleanVal.startsWith('//')) {
                try {
                  cleanVal = new URL(url).origin + cleanVal;
                } catch {}
              }
              const safe = /^(https?:|data:image\/(png|jpeg|jpg|webp|gif|svg\+xml);base64,)/i.test(cleanVal);
              if (safe) {
                child.setAttribute('src', cleanVal);
              } else {
                child.removeAttribute(attr.name);
              }
            } else if (name === 'srcset') {
              const cleanSrcset = val.replace(/(^|\s)\/\//g, '$1https://');
              child.setAttribute('srcset', cleanSrcset);
            } else if (!['class', 'id', 'title', 'alt', 'width', 'height', 'loading', 'colspan', 'rowspan'].includes(name) && !name.startsWith('data-')) {
              child.removeAttribute(attr.name);
            }
          }

          if (tag === 'a') {
            child.setAttribute('target', '_blank');
            child.setAttribute('rel', 'noopener noreferrer');
          }
          if (tag === 'img') {
            child.setAttribute('loading', 'lazy');
          }

          clean(child);
        } else {
          node.removeChild(child);
        }
      }
    }

    clean(doc.body);
    return doc.body.innerHTML;
  }

  // Check selected text first
  const selection = window.getSelection ? window.getSelection().toString().trim() : '';

  // Extract from cloned document body
  const bodyClone = document.body ? document.body.cloneNode(true) : null;
  if (!bodyClone) {
    return { isArticle: false, reason: 'Empty document body' };
  }

  const url = window.location.href;
  const metadata = extractMetadata(document, url);

  removeUnwanted(bodyClone);
  const bestElem = findBestContainer(bodyClone);

  const rawHtml = bestElem.innerHTML;
  const rawText = bestElem.textContent.trim().replace(/\s+/g, ' ');
  const wordCount = countWords(rawText);
  const readingTime = calculateReadingTime(wordCount);

  const hasParagraphs = (rawHtml.match(/<p\b/gi) || []).length >= 2;
  const isSufficientWords = wordCount >= 60;

  if (!isSufficientWords && !hasParagraphs) {
    return {
      isArticle: false,
      reason: 'Page contains insufficient reading text. It may be a homepage, dashboard, or search directory.',
      url,
      title: metadata.title,
      siteName: metadata.siteName,
      selectedText: selection.length > 50 ? selection : ''
    };
  }

  const cleanHtml = sanitize(rawHtml);

  let finalExcerpt = metadata.excerpt || '';
  if (!finalExcerpt || /^\s*coordinates:/i.test(finalExcerpt) || /^\d+°\d+['′]/.test(finalExcerpt)) {
    if (rawText) {
      finalExcerpt = rawText.slice(0, 180).trim() + (rawText.length > 180 ? '...' : '');
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
    contentHtml: cleanHtml,
    textContent: rawText,
    wordCount,
    readingTime,
    selectedText: selection.length > 50 ? selection : '',
    extractedAt: Date.now()
  };
})();
