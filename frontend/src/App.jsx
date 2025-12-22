import React, { useState, useEffect } from 'react';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState('user');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = async () => {
      try {
        // Check if IAP is enabled by looking at the response headers
        const response = await fetch('/health');
        if (response.ok) {
          // Get IAP user info from the backend
          const response2 = await fetch('/api/user-info');
          if (response2.ok) {
            const userData = await response2.json();
            setUser({
              id: userData.id || 'iap-user',
              name: userData.name || 'IAP User',
              email: userData.email || 'user@example.com',
              iapId: userData.iapId || userData.id
            });
            setUserRole(userData.role || 'user');
          } else {
            // Dev mode - auto-authenticate with consistent user ID
            setUser({
              id: 'Abuthabu A',
              name: 'Development User',
              email: 'ahamedbeema1989@gmail.com',
              iapId: 'dev-user'
            });
            setUserRole('superadmin');
          }
        }
      } catch (err) {
        console.warn('Auth check failed:', err);
        // Check if user has stored token
        const token = localStorage.getItem('iapToken');
        if (token) {
          // Parse JWT and extract user info
          const userData = JSON.parse(atob(token.split('.')[1]));
          setUser({
            id: userData.sub,
            name: userData.name,
            email: userData.email,
            iapId: userData.sub
          });
          setUserRole(userData.role || 'user');
        }
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLoginSuccess = (userData, role) => {
    setUser(userData);
    setUserRole(role);
  };

  const handleLogout = () => {
    localStorage.removeItem('iapToken');
    setUser(null);
    setUserRole('user');
  };

  if (loading) {
    return <div className="loading-spinner">Loading...</div>;
  }

  return (
    <div className="app">
      {user ? (
        <>
          <HomePage user={user} userRole={userRole} />
          <footer className="app-footer">
            <button className="btn-logout" onClick={handleLogout}>
              Logout
            </button>
          </footer>
        </>
      ) : (
        <LoginPage onLoginSuccess={handleLoginSuccess} />
      )}
    </div>
  );
}

export default App;
