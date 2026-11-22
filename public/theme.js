(() => {
  const storageKey = 'portfolio-theme';
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
  const root = document.documentElement;
  const themeColor = document.querySelector('meta[name="theme-color"]');
  let button;
  let preference = readPreference();

  function readPreference() {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored === 'light' || stored === 'dark' ? stored : null;
    } catch {
      return null;
    }
  }

  function applyTheme() {
    const theme = preference ?? (systemTheme.matches ? 'dark' : 'light');
    const changed = theme !== root.dataset.theme;
    root.dataset.theme = theme;
    button?.setAttribute('aria-pressed', String(theme === 'dark'));
    if (themeColor) themeColor.content = theme === 'dark' ? '#181816' : '#f7f5ef';
    if (changed) window.dispatchEvent(new Event('portfolio-themechange'));
  }

  // Set the theme in the head, before the first paint.
  applyTheme();
  systemTheme.addEventListener('change', applyTheme);
  window.addEventListener('storage', event => {
    if (event.key === storageKey || event.key === null) {
      preference = readPreference();
      applyTheme();
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    button = document.querySelector('.theme-toggle');
    if (!button) return;
    applyTheme();
    button.hidden = false;
    button.addEventListener('click', () => {
      preference = root.dataset.theme === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(storageKey, preference);
      } catch {
        // The switch also works for the current page when storage is unavailable.
      }
      applyTheme();
    });
  });
})();
