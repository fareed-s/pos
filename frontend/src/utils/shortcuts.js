// Single source of truth for every keyboard shortcut in the app.
//
// Pages that bind a shortcut should ALSO appear in this list — the
// `/shortcuts` help page renders it verbatim. Anytime you add a new key
// binding somewhere, drop a row here so users can discover it.
//
// `combo` is a display label (what we show on the help page) — the actual
// keydown match logic lives next to each binding, since some shortcuts are
// page-specific and care about focused inputs.

export const SHORTCUT_GROUPS = [
  {
    name: 'Navigation',
    description: 'Jump between sections from anywhere (except while typing).',
    items: [
      { combo: 'Alt + D', description: 'Go to Dashboard' },
      { combo: 'Alt + S', description: 'Open POS Terminal (Sale)' },
      { combo: 'Alt + P', description: 'Go to Products' },
      { combo: 'Alt + I', description: 'Go to Inventory' },
      { combo: 'Alt + E', description: 'Open Expiry Tracker' },
      { combo: 'Alt + C', description: 'Go to Customers' },
      { combo: 'Alt + U', description: 'Open Udhar Register' },
      { combo: 'Alt + R', description: 'Open Reports' },
      { combo: 'Alt + H', description: 'Sales History' },
      { combo: 'Alt + L', description: 'Price Lookup' },
    ],
  },
  {
    name: 'POS Terminal',
    description: 'Active only on the POS Terminal screen.',
    items: [
      { combo: 'F2', description: 'Focus product search' },
      { combo: 'F4', description: 'Hold current sale' },
      { combo: 'F9', description: 'Complete sale (with current payment method)' },
      { combo: 'Esc', description: 'Close open modal / dropdown' },
    ],
  },
  {
    name: 'Display & Privacy',
    description: 'Toggle interface options without reaching for the mouse.',
    items: [
      { combo: 'Ctrl + Shift + P', description: 'Toggle privacy mode (mask summary numbers)' },
      { combo: 'Ctrl + Shift + L', description: 'Toggle dark / light theme' },
    ],
  },
  {
    name: 'Help',
    description: 'Discoverability shortcuts.',
    items: [
      { combo: 'Shift + ?', description: 'Open this Keyboard Shortcuts page' },
      { combo: 'Alt + K', description: 'Open this Keyboard Shortcuts page' },
    ],
  },
];

// Helper: when binding a shortcut, skip if the user is mid-typing — except for
// Escape and a small allow-list (function keys, our explicit nav combos).
export const isTypingInForm = () => {
  const el = document.activeElement;
  if (!el) return false;
  const tag = (el.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  if (el.isContentEditable) return true;
  return false;
};
