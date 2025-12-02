import React, { useState, useEffect } from 'react';
import '../styles/LoginPage.css';

const LoginPage = ({ onLoginSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if user is already authenticated
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      // This would check with your IAP protected backend
      const token = localStorage.getItem('iapToken');
      if (token) {
        // Validate token
        const response = await fetch('/health', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          // User is authenticated
          const userData = JSON.parse(atob(token.split('.')[1]));
          onLoginSuccess({
            id: userData.sub,
            name: userData.name,
            email: userData.email,
            iapId: userData.sub
          }, userData.role || 'user');
        }
      }
    } catch (err) {
      console.error('Auth check failed:', err);
    }
  };

  const handleIAPLogin = async () => {
    try {
      setLoading(true);
      setError('');

      // In production, this would be handled by Google IAP
      // The application would be behind IAP which adds the Authorization header
      // For development, you would mock this or use a test token

      // Simulate getting IAP token from Authorization header
      const mockToken = localStorage.getItem('mockIapToken');

      if (!mockToken) {
        throw new Error('Please ensure your application is behind Google Identity-Aware Proxy (IAP)');
      }

      // Validate token with backend
      const response = await fetch('/api/health', {
        headers: {
          'Authorization': `Bearer ${mockToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Authentication failed');
      }

      // Store token
      localStorage.setItem('iapToken', mockToken);

      // Parse user data from token
      const userData = JSON.parse(atob(mockToken.split('.')[1]));
      onLoginSuccess({
        id: userData.sub,
        name: userData.name,
        email: userData.email,
        iapId: userData.sub
      }, userData.role || 'user');
    } catch (err) {
      setError(err.message || 'Login failed. Please ensure IAP is configured.');
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
            onClick={handleIAPLogin}
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Sign In with Google IAP'}
          </button>

          <div className="login-info">
            <p>This application uses Google Identity-Aware Proxy (IAP) for secure authentication.</p>
            <p>Ensure your application is deployed behind IAP for production use.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
