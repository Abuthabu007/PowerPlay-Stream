import React, { useState, useEffect } from 'react';
import '../styles/LoginPage.css';

const LoginPage = ({ onLoginSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isIAPEnabled, setIsIAPEnabled] = useState(false);

  // Check if user is already authenticated
  useEffect(() => {
    checkAuthentication();
    checkIAPStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkIAPStatus = async () => {
    try {
      // Try to get IAP identity token from window
      if (window.gapi && window.gapi.auth2) {
        const auth2 = window.gapi.auth2.getAuthInstance();
        if (auth2 && auth2.isSignedIn.get()) {
          setIsIAPEnabled(true);
        }
      }
    } catch (err) {
      console.log('IAP not available, using mock auth');
    }
  };

  const checkAuthentication = async () => {
    try {
      // Check if token exists
      const token = localStorage.getItem('iapToken') || localStorage.getItem('authToken');
      if (token) {
        // Try to validate with backend
        const response = await fetch('/api/health', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          // User is authenticated
          onLoginSuccess({
            id: 'user-' + Date.now(),
            name: 'Authenticated User',
            email: 'user@example.com'
          }, 'user');
        }
      }
    } catch (err) {
      console.error('Auth check failed:', err);
    }
  };

  const handleLogin = async () => {
    try {
      setLoading(true);
      setError('');

      // Get IAP token if available
      let token = null;
      
      if (window.gapi && window.gapi.auth2) {
        try {
          const auth2 = window.gapi.auth2.getAuthInstance();
          if (auth2 && auth2.isSignedIn.get()) {
            const profile = auth2.currentUser.get();
            token = profile.getAuthResponse().id_token;
            console.log('Using IAP token');
          }
        } catch (iapErr) {
          console.log('Could not get IAP token, using mock token');
        }
      }

      // Fallback to mock token if IAP not available
      if (!token) {
        token = btoa(JSON.stringify({
          sub: 'mock-user-' + Date.now(),
          name: 'Test User',
          email: 'test@example.com',
          role: 'user'
        }));
        console.log('Using mock token');
      }

      // Test backend connectivity with token
      const response = await fetch('/api/health', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Backend not responding. Please check server.');
      }

      // Store token
      localStorage.setItem('iapToken', token);

      // Success
      onLoginSuccess({
        id: 'user-' + Date.now(),
        name: 'Authenticated User',
        email: 'user@example.com'
      }, 'user');
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <h1>🎬 PowerPlay Stream</h1>
          <p className="subtitle">Video Streaming & Management Platform</p>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button
            className="btn-login"
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Sign In'}
          </button>

          <div className="login-info">
            <p>Development Mode - Test credentials available</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
