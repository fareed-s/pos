import { createContext, useContext, useReducer, useEffect } from 'react';
import { authAPI } from '../utils/api.js';

const AuthContext = createContext();

const initialState = {
  user: null,
  business: null,
  settings: null,
  subscription: null,
  isAuthenticated: false,
  isLoading: true,
};

function authReducer(state, action) {
  switch (action.type) {
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        business: action.payload.business,
        settings: action.payload.settings,
        subscription: action.payload.subscription || null,
        isAuthenticated: true,
        isLoading: false,
      };
    case 'AUTH_FAIL':
      return { ...state, user: null, business: null, settings: null, subscription: null, isAuthenticated: false, isLoading: false };
    case 'LOGOUT':
      return { ...initialState, isLoading: false };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'UPDATE_USER':
      return { ...state, user: { ...state.user, ...action.payload } };
    case 'UPDATE_BUSINESS':
      return { ...state, business: { ...state.business, ...action.payload } };
    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };
    default:
      return state;
  }
}

// Plan-specific alert window (days before expiry to start warning the user).
// Mirrors backend constants.expiryAlertDays.
const ALERT_DAYS = {
  trial: 1, monthly: 3, half_yearly: 15, yearly: 30, custom: 3,
  free_trial: 3, basic: 3, premium: 3,
};

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await authAPI.getMe();
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: {
          user: res.data.data.user,
          business: res.data.data.business,
          settings: res.data.data.settings,
          subscription: res.data.data.subscription,
        },
      });
    } catch {
      dispatch({ type: 'AUTH_FAIL' });
    }
  };

  const login = async (credentials) => {
    const res = await authAPI.login(credentials);
    if (res.data.success) {
      await checkAuth();
    }
    return res.data;
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch {
      // Server may be unreachable — still clear client state to avoid trapping the user
    } finally {
      dispatch({ type: 'LOGOUT' });
    }
  };

  // Derived subscription state for the UI (banners + view-only enforcement).
  const sub = state.subscription;
  let daysToExpire = null;
  if (sub?.endDate) {
    daysToExpire = Math.ceil((new Date(sub.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  }
  const isExpired = daysToExpire !== null && daysToExpire < 0;
  const alertWindow = ALERT_DAYS[sub?.plan] ?? 3;
  const isExpiringSoon = daysToExpire !== null && daysToExpire >= 0 && daysToExpire <= alertWindow;
  const viewOnly = isExpired && state.user?.role !== 'superadmin';

  // Per-component permission check. superadmin/businessadmin always pass.
  // manager/cashier checked against the persisted permissions matrix.
  const can = (module, action = 'edit') => {
    const role = state.user?.role;
    if (!role) return false;
    if (role === 'superadmin' || role === 'businessadmin') return true;
    const perms = state.user?.permissions;
    if (!perms) return false;
    const entry = perms instanceof Map ? perms.get(module) : perms[module];
    return !!(entry && entry[action]);
  };

  return (
    <AuthContext.Provider
      value={{
        ...state, dispatch, login, logout, checkAuth,
        daysToExpire, isExpired, isExpiringSoon, viewOnly,
        can,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
