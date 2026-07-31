import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount, if we already have a stored access token, hydrate the session
  // by calling the protected /auth/me endpoint.
  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const token = api.getAccessToken();
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.get('/auth/me');
        if (cancelled) return;
        if (res?.success && res?.data) {
          setUser(res.data.user);
          setProfile(res.data.profile);
        } else {
          api.clearTokens();
        }
      } catch {
        // token invalid/expired — api.get already attempted a refresh.
        api.clearTokens();
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    bootstrap();
    return () => { cancelled = true; };
  }, []);

  async function syncFromLogin(data) {
    if (data?.accessToken) api.setAccessToken(data.accessToken);
    if (data?.refreshToken) api.setRefreshToken(data.refreshToken);
    if (data?.user) setUser(data.user);
    if (data?.profile) setProfile(data.profile);
  }

  async function signUp(email, password, fullName, role = 'user', businessName, propertyDetails = {}) {
    try {
      const res = await api.post('/auth/register', { email, password, fullName, role, businessName, ...propertyDetails });
      if (!res?.success) {
        const message = res?.error?.message || 'Registration failed.';
        return { data: null, error: { message } };
      }
      // Registration now requires email verification before the account is
      // usable, so no tokens are issued here.
      return { data: { email, devOtp: res.devOtp }, error: null };
    } catch (err) {
      return { data: null, error: { message: err?.message || 'Registration failed.' } };
    }
  }

  async function signIn(email, password) {
    try {
      const res = await api.post('/auth/login', { email, password });
      if (!res?.success) {
        const message = res?.error?.message || 'Invalid email or password.';
        return { data: null, error: { message } };
      }
      const { accessToken, refreshToken, user, profile } = res.data;
      await syncFromLogin({ accessToken, refreshToken, user, profile });
      return { data: { session: { access_token: accessToken, refresh_token: refreshToken }, user, profile }, error: null };
    } catch (err) {
      const message = err?.status === 401 ? 'Invalid email or password.' : (err?.message || 'Sign in failed.');
      return { data: null, error: { message, code: err?.code, details: err?.details } };
    }
  }

  // Verify a 6-digit email code; on success the account is activated and the
  // user is signed in directly.
  async function verifyEmailAndSignIn(email, code) {
    try {
      const res = await api.post('/auth/verify-email', { email, code });
      if (!res?.success) {
        const message = res?.error?.message || 'Verification failed.';
        return { data: null, error: { message } };
      }
      const { accessToken, refreshToken, user, profile } = res.data;
      await syncFromLogin({ accessToken, refreshToken, user, profile });
      return { data: { user, profile }, error: null };
    } catch (err) {
      return { data: null, error: { message: err?.message || 'Verification failed.', code: err?.code } };
    }
  }

  async function resendVerificationEmail(email) {
    try {
      const res = await api.post('/auth/resend-verification', { email });
      if (!res?.success) {
        return { data: null, error: { message: res?.error?.message || 'Could not resend the code.' } };
      }
      return { data: { devOtp: res.devOtp }, error: null };
    } catch (err) {
      return { data: null, error: { message: err?.message || 'Could not resend the code.' } };
    }
  }

  // Google OAuth via the custom JWT backend. Exchanges a Google ID token for
  // our own access/refresh tokens. Loads Google Identity Services on demand.
  async function signInWithGoogle() {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      return { data: null, error: { message: 'Google sign-in is not configured. Please use email and password.' } };
    }
    try {
      const idToken = await getGoogleCredential(clientId);
      if (!idToken) {
        return { data: null, error: { message: 'Google sign-in was cancelled.' } };
      }
      const res = await api.post('/auth/google', { idToken });
      if (!res?.success) {
        const message = res?.error?.message || 'Google sign-in failed.';
        return { data: null, error: { message } };
      }
      const { accessToken, refreshToken, user, profile } = res.data;
      await syncFromLogin({ accessToken, refreshToken, user, profile });
      return { data: { session: { access_token: accessToken, refresh_token: refreshToken }, user, profile }, error: null };
    } catch (err) {
      return { data: null, error: { message: err?.message || 'Google sign-in failed.' } };
    }
  }

  async function signOut() {
    try {
      await api.post('/auth/logout');
    } catch {
      /* best-effort */
    }
    api.clearTokens();
    setUser(null);
    setProfile(null);
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signUp, signIn, signInWithGoogle, verifyEmailAndSignIn, resendVerificationEmail, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

// Loads Google Identity Services and resolves with a Google ID token.
function getGoogleCredential(clientId) {
  return new Promise((resolve, reject) => {
    function attempt() {
      if (window.google && window.google.accounts && window.google.accounts.id) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => resolve(response.credential),
        });
        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            reject(new Error('Google sign-in was cancelled.'));
          }
        });
        return;
      }
      // Script not ready yet — retry shortly.
      setTimeout(attempt, 100);
    }

    if (!document.getElementById('google-gsi-script')) {
      const script = document.createElement('script');
      script.id = 'google-gsi-script';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.onerror = () => reject(new Error('Failed to load Google sign-in.'));
      document.head.appendChild(script);
    }
    attempt();
  });
}
