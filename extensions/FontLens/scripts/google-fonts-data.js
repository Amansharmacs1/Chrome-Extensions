/**
 * FontLens - Google Fonts Catalog & Matcher
 * Curated dataset of popular Google Fonts with categories and official specimen links.
 * Enables zero-network, private matching without external API requests.
 */

export const GOOGLE_FONTS_CATALOG = [
  // Sans-serif
  { name: 'Roboto', category: 'sans-serif', slug: 'Roboto' },
  { name: 'Open Sans', category: 'sans-serif', slug: 'Open+Sans' },
  { name: 'Lato', category: 'sans-serif', slug: 'Lato' },
  { name: 'Montserrat', category: 'sans-serif', slug: 'Montserrat' },
  { name: 'Inter', category: 'sans-serif', slug: 'Inter' },
  { name: 'Poppins', category: 'sans-serif', slug: 'Poppins' },
  { name: 'Oswald', category: 'sans-serif', slug: 'Oswald' },
  { name: 'Raleway', category: 'sans-serif', slug: 'Raleway' },
  { name: 'Nunito', category: 'sans-serif', slug: 'Nunito' },
  { name: 'Nunito Sans', category: 'sans-serif', slug: 'Nunito+Sans' },
  { name: 'Rubik', category: 'sans-serif', slug: 'Rubik' },
  { name: 'Ubuntu', category: 'sans-serif', slug: 'Ubuntu' },
  { name: 'Work Sans', category: 'sans-serif', slug: 'Work+Sans' },
  { name: 'Quicksand', category: 'sans-serif', slug: 'Quicksand' },
  { name: 'PT Sans', category: 'sans-serif', slug: 'PT+Sans' },
  { name: 'Fira Sans', category: 'sans-serif', slug: 'Fira+Sans' },
  { name: 'Barlow', category: 'sans-serif', slug: 'Barlow' },
  { name: 'Mulish', category: 'sans-serif', slug: 'Mulish' },
  { name: 'Kanit', category: 'sans-serif', slug: 'Kanit' },
  { name: 'Titillium Web', category: 'sans-serif', slug: 'Titillium+Web' },
  { name: 'Karla', category: 'sans-serif', slug: 'Karla' },
  { name: 'Josefin Sans', category: 'sans-serif', slug: 'Josefin+Sans' },
  { name: 'Manrope', category: 'sans-serif', slug: 'Manrope' },
  { name: 'Cabin', category: 'sans-serif', slug: 'Cabin' },
  { name: 'Dosis', category: 'sans-serif', slug: 'Dosis' },
  { name: 'Outfit', category: 'sans-serif', slug: 'Outfit' },
  { name: 'Plus Jakarta Sans', category: 'sans-serif', slug: 'Plus+Jakarta+Sans' },
  { name: 'DM Sans', category: 'sans-serif', slug: 'DM+Sans' },
  { name: 'Source Sans 3', category: 'sans-serif', slug: 'Source+Sans+3' },
  { name: 'Source Sans Pro', category: 'sans-serif', slug: 'Source+Sans+Pro' },
  { name: 'IBM Plex Sans', category: 'sans-serif', slug: 'IBM+Plex+Sans' },
  { name: 'Noto Sans', category: 'sans-serif', slug: 'Noto+Sans' },
  { name: 'Heebo', category: 'sans-serif', slug: 'Heebo' },
  { name: 'Assistant', category: 'sans-serif', slug: 'Assistant' },
  { name: 'Jost', category: 'sans-serif', slug: 'Jost' },
  { name: 'Lexend', category: 'sans-serif', slug: 'Lexend' },
  { name: 'Urbanist', category: 'sans-serif', slug: 'Urbanist' },
  { name: 'Space Grotesk', category: 'sans-serif', slug: 'Space+Grotesk' },
  { name: 'Sora', category: 'sans-serif', slug: 'Sora' },
  { name: 'Syne', category: 'sans-serif', slug: 'Syne' },

  // Serif
  { name: 'Merriweather', category: 'serif', slug: 'Merriweather' },
  { name: 'Playfair Display', category: 'serif', slug: 'Playfair+Display' },
  { name: 'Lora', category: 'serif', slug: 'Lora' },
  { name: 'PT Serif', category: 'serif', slug: 'PT+Serif' },
  { name: 'Noto Serif', category: 'serif', slug: 'Noto+Serif' },
  { name: 'Cinzel', category: 'serif', slug: 'Cinzel' },
  { name: 'Libre Baskerville', category: 'serif', slug: 'Libre+Baskerville' },
  { name: 'EB Garamond', category: 'serif', slug: 'EB+Garamond' },
  { name: 'Cormorant Garamond', category: 'serif', slug: 'Cormorant+Garamond' },
  { name: 'Bitter', category: 'serif', slug: 'Bitter' },
  { name: 'Crimson Text', category: 'serif', slug: 'Crimson+Text' },
  { name: 'Crimson Pro', category: 'serif', slug: 'Crimson+Pro' },
  { name: 'Arvo', category: 'serif', slug: 'Arvo' },
  { name: 'Bree Serif', category: 'serif', slug: 'Bree+Serif' },
  { name: 'DM Serif Display', category: 'serif', slug: 'DM+Serif+Display' },
  { name: 'DM Serif Text', category: 'serif', slug: 'DM+Serif+Text' },
  { name: 'Source Serif 4', category: 'serif', slug: 'Source+Serif+4' },
  { name: 'Source Serif Pro', category: 'serif', slug: 'Source+Serif+Pro' },
  { name: 'IBM Plex Serif', category: 'serif', slug: 'IBM+Plex+Serif' },
  { name: 'Fraunces', category: 'serif', slug: 'Fraunces' },
  { name: 'Newsreader', category: 'serif', slug: 'Newsreader' },
  { name: 'Bodoni Moda', category: 'serif', slug: 'Bodoni+Moda' },
  { name: 'Prata', category: 'serif', slug: 'Prata' },

  // Monospace
  { name: 'Roboto Mono', category: 'monospace', slug: 'Roboto+Mono' },
  { name: 'Fira Code', category: 'monospace', slug: 'Fira+Code' },
  { name: 'Source Code Pro', category: 'monospace', slug: 'Source+Code+Pro' },
  { name: 'Inconsolata', category: 'monospace', slug: 'Inconsolata' },
  { name: 'Space Mono', category: 'monospace', slug: 'Space+Mono' },
  { name: 'IBM Plex Mono', category: 'monospace', slug: 'IBM+Plex+Mono' },
  { name: 'JetBrains Mono', category: 'monospace', slug: 'JetBrains+Mono' },
  { name: 'Ubuntu Mono', category: 'monospace', slug: 'Ubuntu+Mono' },
  { name: 'Courier Prime', category: 'monospace', slug: 'Courier+Prime' },
  { name: 'Overpass Mono', category: 'monospace', slug: 'Overpass+Mono' },
  { name: 'PT Mono', category: 'monospace', slug: 'PT+Mono' },
  { name: 'Fira Mono', category: 'monospace', slug: 'Fira+Mono' },
  { name: 'Red Hat Mono', category: 'monospace', slug: 'Red+Hat+Mono' },

  // Display
  { name: 'Bebas Neue', category: 'display', slug: 'Bebas+Neue' },
  { name: 'Lobster', category: 'display', slug: 'Lobster' },
  { name: 'Abril Fatface', category: 'display', slug: 'Abril+Fatface' },
  { name: 'Comfortaa', category: 'display', slug: 'Comfortaa' },
  { name: 'Righteous', category: 'display', slug: 'Righteous' },
  { name: 'Fredoka', category: 'display', slug: 'Fredoka' },
  { name: 'Bungee', category: 'display', slug: 'Bungee' },
  { name: 'Alfa Slab One', category: 'display', slug: 'Alfa+Slab+One' },
  { name: 'Passion One', category: 'display', slug: 'Passion+One' },
  { name: 'Patua One', category: 'display', slug: 'Patua+One' },
  { name: 'Russo One', category: 'display', slug: 'Russo+One' },
  { name: 'Shrikhand', category: 'display', slug: 'Shrikhand' },
  { name: 'Permanent Marker', category: 'handwriting', slug: 'Permanent+Marker' },
  { name: 'Pacifico', category: 'handwriting', slug: 'Pacifico' },
  { name: 'Caveat', category: 'handwriting', slug: 'Caveat' },
  { name: 'Dancing Script', category: 'handwriting', slug: 'Dancing+Script' },
  { name: 'Satisfy', category: 'handwriting', slug: 'Satisfy' },
  { name: 'Great Vibes', category: 'handwriting', slug: 'Great+Vibes' },
  { name: 'Sacramento', category: 'handwriting', slug: 'Sacramento' },
  { name: 'Indie Flower', category: 'handwriting', slug: 'Indie+Flower' },
  { name: 'Shadows Into Light', category: 'handwriting', slug: 'Shadows+Into+Light' },
  { name: 'Amatic SC', category: 'handwriting', slug: 'Amatic+SC' },
  { name: 'Kalam', category: 'handwriting', slug: 'Kalam' },
  { name: 'Courgette', category: 'handwriting', slug: 'Courgette' },
  { name: 'Yellowtail', category: 'handwriting', slug: 'Yellowtail' },
  { name: 'Cinzel', category: 'serif', slug: 'Cinzel' },
  { name: 'Cinzel Decorative', category: 'display', slug: 'Cinzel+Decorative' },
  { name: 'Audiowide', category: 'display', slug: 'Audiowide' }
];

// Quick normalized lookup map
const LOOKUP_MAP = new Map();
for (const font of GOOGLE_FONTS_CATALOG) {
  const key = font.name.toLowerCase().replace(/['"]/g, '').trim();
  LOOKUP_MAP.set(key, font);
}

/**
 * Searches and matches a font name against Google Fonts library
 * @param {string} fontName
 * @returns {{ isGoogleFont: boolean, name: string, category: string, specimenUrl: string }|null}
 */
export function findGoogleFontMatch(fontName = '') {
  if (!fontName || typeof fontName !== 'string') return null;

  const clean = fontName.toLowerCase().replace(/['"]/g, '').trim();
  const match = LOOKUP_MAP.get(clean);

  if (match) {
    return {
      isGoogleFont: true,
      name: match.name,
      family: match.name,
      category: match.category,
      specimenUrl: `https://fonts.google.com/specimen/${match.slug}`
    };
  }

  return null;
}

/**
 * Searches the catalog by keyword query
 * @param {string} query
 * @param {number} limit
 * @returns {Array<{ name: string, category: string, specimenUrl: string }>}
 */
export function searchGoogleFonts(query = '', limit = 15) {
  const q = query.toLowerCase().trim();
  if (!q) {
    return GOOGLE_FONTS_CATALOG.slice(0, limit).map(f => ({
      name: f.name,
      category: f.category,
      specimenUrl: `https://fonts.google.com/specimen/${f.slug}`
    }));
  }

  const results = [];
  for (const f of GOOGLE_FONTS_CATALOG) {
    if (f.name.toLowerCase().includes(q) || f.category.includes(q)) {
      results.push({
        name: f.name,
        category: f.category,
        specimenUrl: `https://fonts.google.com/specimen/${f.slug}`
      });
      if (results.length >= limit) break;
    }
  }

  return results;
}

/**
 * Filters the catalog by category
 * @param {string} category
 * @returns {Array<object>}
 */
export function getGoogleFontsByCategory(category = '') {
  const cat = category.toLowerCase().trim();
  return GOOGLE_FONTS_CATALOG.filter(f => f.category.toLowerCase() === cat);
}

/**
 * Helper to check if font name is in Google Fonts catalog
 * @param {string} fontName
 * @returns {boolean}
 */
export function isKnownGoogleFont(fontName = '') {
  return findGoogleFontMatch(fontName) !== null;
}

