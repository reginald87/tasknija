import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';

export default function GitHubCallback() {
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    async function handleCallback() {
      const code = searchParams.get('code');
      if (!code) {
        setError('No authorization code received from GitHub.');
        return;
      }
      try {
        const res = await api.post('/auth/github', { code });
        if (!res?.success) {
          setError(res?.error?.message || 'GitHub sign-in failed.');
          return;
        }
        const { accessToken, refreshToken, user, profile } = res.data;
        api.setAccessToken(accessToken);
        api.setRefreshToken(refreshToken);
        navigate('/dashboard');
      } catch (err) {
        setError(err?.message || 'GitHub sign-in failed.');
      }
    }
    handleCallback();
  }, [searchParams, navigate]);

  if (error) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h2 className="auth-title">GitHub Sign-In Failed</h2>
          <p className="auth-error">{error}</p>
          <button className="auth-btn auth-btn-primary" onClick={() => navigate('/login')}>
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2 className="auth-title">Completing GitHub Sign-In...</h2>
        <p>Please wait while we set up your account.</p>
      </div>
    </div>
  );
}