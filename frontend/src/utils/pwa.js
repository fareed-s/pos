// PWA bootstrap — service worker registration + install prompt manager.
//
// Two responsibilities:
//
//   1. registerServiceWorker() — boots /sw.js, watches for new versions, and
//      tells the page when an update is ready (via the 'pwa-update' event).
//      Skipped in dev (Vite serves modules unhashed; SW would cache stale
//      modules and break HMR).
//
//   2. installPrompt — keeps a reference to the deferred `beforeinstallprompt`
//      event so React components can call `await installPrompt.prompt()` to
//      show the native install dialog on demand. Subscribe with `.subscribe`
//      to react to availability changes.

const isDev = import.meta.env.DEV;

// ─── Service worker registration ─────────────────────────────────────────────
export function registerServiceWorker() {
  if (isDev) return;
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;

  // Wait for load so we don't compete with the initial render for resources.
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });

      // New SW installed in the background → notify the app so it can show a
      // "Reload to update" prompt. The reload itself (and SKIP_WAITING) is the
      // app's responsibility; we just emit the event.
      reg.addEventListener('updatefound', () => {
        const next = reg.installing;
        if (!next) return;
        next.addEventListener('statechange', () => {
          if (next.state === 'installed' && navigator.serviceWorker.controller) {
            window.dispatchEvent(new CustomEvent('pwa-update', { detail: { worker: next } }));
          }
        });
      });

      // When a SKIP_WAITING-driven activation kicks in, reload once so the new
      // assets actually load. Guarded by a flag to prevent reload loops.
      let reloaded = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (reloaded) return;
        reloaded = true;
        window.location.reload();
      });
    } catch (err) {
      // Don't block the app on a SW registration failure.
      // eslint-disable-next-line no-console
      console.warn('[pwa] SW registration failed:', err);
    }
  });
}

// Tell the waiting SW to take over immediately. Call from the "Reload" CTA.
export function applyServiceWorkerUpdate(worker) {
  if (worker) worker.postMessage('SKIP_WAITING');
}

// ─── Install prompt ──────────────────────────────────────────────────────────
// `beforeinstallprompt` fires once on supported browsers (Chrome, Edge,
// Samsung Internet…). Safari + iOS use a manual "Add to Home Screen" path
// from the share sheet — no event there.
let deferredEvent = null;
const subscribers = new Set();
const notify = () => subscribers.forEach((fn) => { try { fn(!!deferredEvent); } catch {} });

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredEvent = e;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferredEvent = null;
    notify();
  });
}

export const installPrompt = {
  /** True when the browser has surfaced an installable manifest. */
  get available() { return !!deferredEvent; },

  /** Subscribe to availability changes. Returns an unsubscribe fn. */
  subscribe(fn) {
    subscribers.add(fn);
    fn(this.available);
    return () => subscribers.delete(fn);
  },

  /**
   * Show the native install dialog. Resolves to 'accepted' | 'dismissed' | null
   * (null when no prompt is currently available, e.g. on iOS Safari).
   */
  async prompt() {
    if (!deferredEvent) return null;
    deferredEvent.prompt();
    const choice = await deferredEvent.userChoice;
    deferredEvent = null;
    notify();
    return choice?.outcome ?? null;
  },

  /** True when the page is already running in standalone (installed) mode. */
  get isStandalone() {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia?.('(display-mode: standalone)').matches ||
      window.navigator.standalone === true /* iOS Safari */
    );
  },
};
