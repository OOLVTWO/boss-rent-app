/**
 * Synchronize browser tab favicon dynamically with custom company logo URL
 */
export function updateFavicon(logoUrl) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const rawUrl = logoUrl || '/images/logoCompany.png';
  const targetUrl = rawUrl.startsWith('data:') ? rawUrl : `${rawUrl}?v=${Date.now()}`;

  // Remove existing icon links to prevent static browser overrides
  try {
    const existingLinks = document.querySelectorAll("link[rel*='icon'], link[rel='apple-touch-icon']");
    existingLinks.forEach(el => el.parentNode?.removeChild(el));
  } catch (e) {
    console.warn('Favicon cleanup notice:', e);
  }

  // 1. Primary Dynamic Favicon
  const iconLink = document.createElement('link');
  iconLink.id = 'app-dynamic-favicon';
  iconLink.rel = 'icon';
  iconLink.type = rawUrl.endsWith('.svg') ? 'image/svg+xml' : 'image/png';
  iconLink.href = targetUrl;
  document.head.appendChild(iconLink);

  // 2. Shortcut Icon
  const shortcutLink = document.createElement('link');
  shortcutLink.rel = 'shortcut icon';
  shortcutLink.href = targetUrl;
  document.head.appendChild(shortcutLink);

  // 3. Apple Touch Icon
  const appleLink = document.createElement('link');
  appleLink.rel = 'apple-touch-icon';
  appleLink.href = targetUrl;
  document.head.appendChild(appleLink);
}
