import React, { useState, useEffect } from 'react';
import '../styles/LoginPage.css';

/**
 * Helper: Create a simple JWT-like token for development
 * Real IAP will provide an actual JWT from Google
 */
const createMockJWT = () => {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({
    sub: 'mock-user-' + Date.now(),
    name: 'Test User',
    email: 'test@example.com',
    role: 'user',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600
  }));
  const signature = btoa('mock-signature');
  return `${header}.${payload}.${signature}`;
};

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
      let tokenSource = 'unknown';
      let tokenPayload = null;
      
      if (window.gapi && window.gapi.auth2) {
        try {
          const auth2 = window.gapi.auth2.getAuthInstance();
          if (auth2 && auth2.isSignedIn.get()) {
            const profile = auth2.currentUser.get();
            token = profile.getAuthResponse().id_token;
            tokenSource = 'IAP';
            console.log('[LOGIN] Using real IAP token');
          }
        } catch (iapErr) {
          console.log('[LOGIN] Could not get IAP token, using mock token:', iapErr.message);
        }
      }

      // Fallback to mock JWT token if IAP not available
      if (!token) {
        token = createMockJWT();
        tokenSource = 'mock';
        console.log('[LOGIN] Using mock JWT token');
      }

      // Extract payload from token to get user info
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          tokenPayload = payload;
          console.log('[LOGIN] Extracted user from token:', payload.email, payload.name);
        }
      } catch (parseErr) {
        console.warn('[LOGIN] Could not parse token payload:', parseErr.message);
      }

      // Test backend connectivity with token
      console.log(`[LOGIN] Testing backend with ${tokenSource} token...`);
      const response = await fetch('/api/health', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[LOGIN] Backend error:', response.status, errorData);
        throw new Error('Backend not responding. Please check server.');
      }

      console.log('[LOGIN] Backend validation successful');
      
      // Store token
      localStorage.setItem('iapToken', token);
      localStorage.setItem('tokenSource', tokenSource);

      // Try to fetch user info from backend for authenticated user
      let userData = null;
      try {
        console.log('[LOGIN] Fetching user info from backend...');
        
        // Add a timeout for user-info request (don't wait forever)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          console.log('[LOGIN] User info request timeout - using token data');
          controller.abort();
        }, 3000); // 3 second timeout
        
        const userInfoResponse = await fetch('/api/user-info', {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (userInfoResponse.ok) {
          userData = await userInfoResponse.json();
          console.log('[LOGIN] User info from backend:', userData);
        } else {
          console.warn('[LOGIN] User info endpoint returned:', userInfoResponse.status);
        }
      } catch (userInfoErr) {
        console.warn('[LOGIN] Could not fetch user info:', userInfoErr.message);
      }

      // Use backend user info if available, fallback to token payload, then defaults
      const finalUserData = {
        id: userData?.id || tokenPayload?.sub || 'user-' + Date.now(),
        name: userData?.name || tokenPayload?.name || 'User',
        email: userData?.email || tokenPayload?.email || 'user@example.com',
        iapId: userData?.iapId || tokenPayload?.sub || 'user-' + Date.now()
      };

      const userRole = userData?.role || tokenPayload?.role || 'user';

      console.log('[LOGIN] User logged in:', finalUserData.email, '(' + finalUserData.name + ')');
      
      // Success - pass real user data
      onLoginSuccess(finalUserData, userRole);
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
      console.error('[LOGIN] Error:', err);
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
            <p>{isIAPEnabled ? 'IAP Enabled' : 'Development Mode - Test credentials'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
