import './status';

const tabs = [...document.querySelectorAll<HTMLButtonElement>('[role="tab"]')];

function activate(tab: HTMLButtonElement, focus = false) {
  for (const item of tabs) {
    const selected = item === tab;
    item.setAttribute('aria-selected', String(selected));
    item.tabIndex = selected ? 0 : -1;
    const panelId = item.getAttribute('aria-controls');
    const panel = panelId ? document.getElementById(panelId) : null;
    if (panel) panel.hidden = !selected;
  }
  if (focus) tab.focus();
  history.replaceState(null, '', '#' + tab.id.replace('tab-', ''));
}

tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => activate(tab));
  tab.addEventListener('keydown', event => {
    let next: number | undefined;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = tabs.length - 1;
    if (next !== undefined) {
      event.preventDefault();
      activate(tabs[next], true);
    }
  });
});

function tabFromHash() {
  return tabs.find(tab => tab.id === 'tab-' + location.hash.slice(1));
}

const initial = tabFromHash();
if (initial) activate(initial);
window.addEventListener('hashchange', () => {
  const selected = tabFromHash();
  if (selected) activate(selected);
});
