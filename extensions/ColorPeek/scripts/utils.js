/**
 * ColorPeek - Utility Functions
 * Clipboard writing with fallback, HTML escaping, toast notifications, and DOM helpers.
 */

/**
 * Escapes HTML characters to prevent XSS
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Copies text to the clipboard with modern navigator.clipboard and legacy fallback
 * @param {string} text
 * @returns {Promise<boolean>}
 */
export async function copyToClipboard(text) {
  if (!text) return false;

  // 1. Try modern Clipboard API
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to fallback
    }
  }

  // 2. Fallback using temporary textarea
  if (typeof document !== 'undefined') {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      textarea.style.pointerEvents = 'none';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      return success;
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Displays a lightweight transient toast notification in the container
 * @param {string} message
 * @param {'success'|'info'|'warning'|'error'} [type='success']
 * @param {HTMLElement} [container=document.body]
 */
export function showToast(message, type = 'success', container = null) {
  if (typeof document === 'undefined') return;

  const parent = container || document.body;
  let toastContainer = parent.querySelector('.colorpeek-toast-container');

  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'colorpeek-toast-container';
    parent.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  toast.className = `colorpeek-toast toast-${type}`;
  toast.textContent = message;

  toastContainer.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    toast.classList.add('visible');
  });

  // Remove after timeout
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => {
      toast.remove();
      if (toastContainer && toastContainer.childNodes.length === 0) {
        toastContainer.remove();
      }
    }, 200);
  }, 2200);
}

/**
 * Formats a relative timestamp (e.g. "Just now", "5m ago", "2h ago")
 * @param {number} timestamp
 * @returns {string}
 */
export function formatRelativeTime(timestamp) {
  if (!timestamp) return '';
  const now = Date.now();
  const diffSec = Math.floor((now - timestamp) / 1000);

  if (diffSec < 45) return 'Just now';
  if (diffSec < 3600) return `${Math.max(1, Math.floor(diffSec / 60))}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  const days = Math.floor(diffSec / 86400);
  if (days < 30) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}
