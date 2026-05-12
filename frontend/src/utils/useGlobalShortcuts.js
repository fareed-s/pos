import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { isTypingInForm } from './shortcuts';

// Binds the app-wide shortcuts (navigation, theme toggle, help page) once.
// Mount this from Sidebar.jsx — every protected route renders through it.
//
// Privacy toggle (Ctrl+Shift+P) is intentionally NOT here — it already lives
// inside PrivacyContext so it works even on the POS full-screen route which
// bypasses Sidebar.
export default function useGlobalShortcuts() {
  const navigate = useNavigate();
  const { toggle: toggleTheme } = useTheme();

  useEffect(() => {
    const handler = (e) => {
      // Help page: Shift+? or Alt+K — allowed even while typing in inputs so
      // a user stuck mid-form can still discover the binding.
      if ((e.shiftKey && e.key === '?') || (e.altKey && (e.key === 'k' || e.key === 'K'))) {
        e.preventDefault();
        navigate('/shortcuts');
        return;
      }

      // Theme toggle.
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'L' || e.key === 'l')) {
        e.preventDefault();
        toggleTheme();
        return;
      }

      // Navigation shortcuts — Alt + letter. Skip when typing so Alt+letter
      // characters in forms still work.
      if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (isTypingInForm()) return;

      const map = {
        d: '/dashboard',
        s: '/pos',
        p: '/products',
        i: '/inventory',
        e: '/expiry',
        c: '/customers',
        u: '/udhar',
        r: '/reports',
        h: '/sales',
        l: '/price-lookup',
      };
      const target = map[e.key?.toLowerCase()];
      if (target) {
        e.preventDefault();
        navigate(target);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate, toggleTheme]);
}
