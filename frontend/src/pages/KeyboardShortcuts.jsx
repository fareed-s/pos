import { SHORTCUT_GROUPS } from '../utils/shortcuts';

// Renders one key cap — split on `+` so each key gets its own pill.
function Combo({ combo }) {
  const parts = combo.split('+').map(p => p.trim());
  return (
    <span className="inline-flex items-center gap-1 flex-wrap">
      {parts.map((p, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          <kbd className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-100 text-xs font-mono font-semibold shadow-sm min-w-[28px] text-center">
            {p}
          </kbd>
          {i < parts.length - 1 && <span className="text-slate-400 text-xs">+</span>}
        </span>
      ))}
    </span>
  );
}

export default function KeyboardShortcuts() {
  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div>
        <h1 className="text-2xl font-heading font-bold text-slate-800 dark:text-slate-100">
          Keyboard Shortcuts
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Speed up your day — every binding wired into the app, in one place. Press{' '}
          <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-xs font-mono">Shift</kbd>{' '}
          +{' '}
          <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-xs font-mono">?</kbd>{' '}
          from anywhere to come back here.
        </p>
      </div>

      <div className="rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
        <strong>Tip:</strong> Navigation shortcuts (Alt + letter) work from any screen,
        but are paused while you're typing in a form so they don't interfere with text.
      </div>

      {SHORTCUT_GROUPS.map(group => (
        <section key={group.name} className="card overflow-hidden">
          <header className="px-5 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
            <h2 className="text-base font-heading font-semibold text-slate-800 dark:text-slate-100">
              {group.name}
            </h2>
            {group.description && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{group.description}</p>
            )}
          </header>

          <ul className="divide-y divide-slate-100 dark:divide-slate-700">
            {group.items.map(item => (
              <li key={item.combo} className="flex items-center justify-between px-5 py-3 gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                <span className="text-sm text-slate-700 dark:text-slate-200">{item.description}</span>
                <Combo combo={item.combo} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
