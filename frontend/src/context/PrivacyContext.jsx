import { createContext, useContext, useEffect, useState } from 'react';

// Privacy Mode (a.k.a. "Stealth View"). A per-session toggle for the cashier
// to obfuscate big-number widgets when a stranger walks into the shop.
//
// HOW IT WORKS
//   • Toggle ON  → display widgets show value × SCALE (default 0.33). Real
//                   data in DB / calculations is unchanged.
//   • Toggle OFF → real numbers shown.
//
// IMPORTANT — what this MUST NOT touch:
//   • Cart line totals, grand total, change due (cashier would charge wrong)
//   • Receipt content (customer needs the real total)
//   • Customer balance forms / record-payment (would deduct wrong amount)
//   • Product create / edit forms (would save wrong cost / price)
//
// Usage: import { useMaskedCurrency, useMaskedNumber } where you render a
// summary widget. Anywhere else, use formatCurrency / formatNumber directly.

const PrivacyContext = createContext(null);

const SCALE = 0.33; // -77% display
const STORAGE_KEY = 'pos.privacyMode';

export function PrivacyProvider({ children }) {
  const [enabled, setEnabled] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch { return false; }
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0'); } catch {}
  }, [enabled]);

  // Keyboard shortcut — Ctrl/Cmd + Shift + P toggles. Quick to hit one-handed
  // when someone walks up unexpectedly.
  useEffect(() => {
    const handler = (e) => {
      const isMod = e.ctrlKey || e.metaKey;
      if (isMod && e.shiftKey && (e.key === 'P' || e.key === 'p')) {
        e.preventDefault();
        setEnabled(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const toggle = () => setEnabled(prev => !prev);

  // Scale helpers. We round so the masked number still looks "real" (no decimals
  // for counts; currency keeps its formatting up to the caller).
  const maskNumber = (n) => {
    if (!enabled) return n;
    const num = Number(n);
    if (!Number.isFinite(num)) return n;
    return Math.round(num * SCALE);
  };

  const maskCurrency = (n) => {
    if (!enabled) return n;
    const num = Number(n);
    if (!Number.isFinite(num)) return n;
    // Keep currency at integer scale — looks more natural than 13,267.91
    return Math.round(num * SCALE);
  };

  return (
    <PrivacyContext.Provider value={{ enabled, toggle, setEnabled, maskNumber, maskCurrency, scale: SCALE }}>
      {children}
    </PrivacyContext.Provider>
  );
}

export function usePrivacy() {
  const ctx = useContext(PrivacyContext);
  if (!ctx) throw new Error('usePrivacy must be used inside <PrivacyProvider>');
  return ctx;
}

// Convenience hooks for the most common cases. These are NOT components —
// they return a transformed value, so callers can pass it to formatCurrency/
// formatNumber and keep their existing layout.
export function useMaskedCurrency() {
  const { maskCurrency } = usePrivacy();
  return maskCurrency;
}

export function useMaskedNumber() {
  const { maskNumber } = usePrivacy();
  return maskNumber;
}
