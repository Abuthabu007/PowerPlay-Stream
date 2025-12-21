import React, { useState, useEffect } from 'react';
import '../styles/LoginPage.css';

const LoginPage = ({ onLoginSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Check if user is already authenticated
  useEffect(() => {
    checkAuthentication();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAuthentication = async () => {
    try {
      // Check if token exists
      const token = localStorage.getItem('authToken');
      if (token) {
        // Try to validate with backend
        const response = await fetch('/api/health');
        if (response.ok) {
          // User is authenticated
          onLoginSuccess({
            id: 'user-' + Date.now(),
            name: 'Test User',
            email: 'test@example.com'
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

      // Test backend connectivity
      const response = await fetch('/api/health');

      if (!response.ok) {
        throw new Error('Backend not responding. Please check server.');
      }

      // Create mock auth token for testing
      const mockToken = btoa(JSON.stringify({
        sub: 'user-' + Date.now(),
        name: 'Test User',
        email: 'test@example.com',
        role: 'user'
      }));

      // Store token
      localStorage.setItem('authToken', mockToken);

      // Success
      onLoginSuccess({
        id: 'user-' + Date.now(),
        name: 'Test User',
        email: 'test@example.com'
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
