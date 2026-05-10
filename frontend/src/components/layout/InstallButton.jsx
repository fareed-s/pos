import { useEffect, useState } from 'react';
import { HiOutlineDownload, HiOutlineX, HiOutlineShare } from 'react-icons/hi';
import { installPrompt } from '../../utils/pwa';

// Platform-aware install button. Visible on every screen size — but its click
// behavior splits by what the browser supports:
//
//   - Chrome/Edge/Android Chrome → fires the deferred `beforeinstallprompt` event.
//   - iOS Safari + Firefox       → no event API; we show a small instructions
//                                  modal explaining the manual flow.
//
// The button is hidden ONLY when the app is already running standalone
// (window.matchMedia('(display-mode: standalone)') / navigator.standalone),
// so users always have an install affordance until they've added the app.

function detectPlatform() {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent || '';
  if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}

export default function InstallButton({ compact = false }) {
  const [available, setAvailable] = useState(false);
  const [standalone, setStandalone] = useState(installPrompt.isStandalone);
  const [showHelp, setShowHelp] = useState(false);
  const platform = detectPlatform();

  useEffect(() => {
    const unsub = installPrompt.subscribe(setAvailable);
    // Re-check standalone on display-mode changes (Android adds the app, returns to browser)
    const mq = window.matchMedia?.('(display-mode: standalone)');
    const onChange = () => setStandalone(installPrompt.isStandalone);
    mq?.addEventListener?.('change', onChange);
    window.addEventListener('appinstalled', onChange);
    return () => {
      unsub();
      mq?.removeEventListener?.('change', onChange);
      window.removeEventListener('appinstalled', onChange);
    };
  }, []);

  if (standalone) return null;

  const handleClick = async () => {
    if (available) {
      const outcome = await installPrompt.prompt();
      if (outcome === 'accepted') setStandalone(true);
      return;
    }
    // No native event → show platform-specific instructions instead.
    setShowHelp(true);
  };

  return (
    <>
      <button
        onClick={handleClick}
        className={
          compact
            ? 'inline-flex items-center justify-center p-2 rounded-lg bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-300 hover:bg-brand-100 dark:hover:bg-brand-900/50 transition-colors'
            : 'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-300 text-xs font-semibold hover:bg-brand-100 dark:hover:bg-brand-900/50 transition-colors'
        }
        title="Install POS as an app"
        aria-label="Install POS app"
      >
        <HiOutlineDownload className={compact ? 'w-5 h-5' : 'w-4 h-4'} />
        {!compact && <span>Install App</span>}
      </button>

      {showHelp && (
        <InstallHelpModal platform={platform} onClose={() => setShowHelp(false)} />
      )}
    </>
  );
}

// Small modal with platform-specific Add-to-Home-Screen steps. Non-Chrome
// browsers (iOS Safari, Firefox, Samsung in some configs) can't be triggered
// programmatically — the user must use the native share / menu.
function InstallHelpModal({ platform, onClose }) {
  const stepsByPlatform = {
    ios: [
      'Niche Safari ke share button par tap karo',
      <>Scroll karke <span className="font-semibold">"Add to Home Screen"</span> select karo</>,
      'Top-right par "Add" tap karo — POS icon home screen pe aa jayega',
    ],
    android: [
      'Browser ke menu (3-dot) par tap karo',
      <>"Install app" ya <span className="font-semibold">"Add to Home Screen"</span> select karo</>,
      'Confirm karo — POS app jaisa install ho jayega',
    ],
    desktop: [
      'Browser ke address bar mein install icon dhundo (right side)',
      'Ya menu se "Install POS Management System" select karo',
      'Confirm karo — POS desktop app jaise khulega',
    ],
    other: [
      'Browser ke menu mein "Install" / "Add to Home Screen" option dhundo',
      'POS icon device pe add ho jayega',
    ],
  };

  const steps = stepsByPlatform[platform] || stepsByPlatform.other;
  const title = platform === 'ios'
    ? 'iPhone / iPad pe install karo'
    : platform === 'android'
      ? 'Android pe install karo'
      : 'POS app install karo';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <HiOutlineShare className="w-5 h-5 text-brand-500" />
            <h3 className="font-heading font-semibold text-slate-800 dark:text-slate-100 text-sm">{title}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 dark:text-slate-200">
            <HiOutlineX className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          {steps.map((step, i) => (
            <div key={i} className="flex gap-3 items-start">
              <div className="w-6 h-6 rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 text-xs font-bold flex items-center justify-center flex-shrink-0">
                {i + 1}
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">{step}</p>
            </div>
          ))}

          {platform === 'ios' && (
            <p className="text-[11px] text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-700">
              Note: iOS pe install link Safari mein hi kaam karta hai — Chrome iOS mein yeh option nahi hota.
            </p>
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-700 flex justify-end bg-slate-50 dark:bg-slate-700/40">
          <button onClick={onClose} className="btn-primary btn-sm">Got it</button>
        </div>
      </div>
    </div>
  );
}
