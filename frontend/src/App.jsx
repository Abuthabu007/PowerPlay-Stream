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
        console.log('[AUTH] Starting auth check...');
        
        // Set a timeout for the user-info request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        try {
          const response = await fetch('/api/user-info', {
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          
          console.log('[AUTH] user-info response status:', response.status);
          
          if (response.ok) {
            const userData = await response.json();
            console.log('[AUTH] user-info data:', userData);
            
            if (userData && userData.id) {
              // User is authenticated via IAP
              setUser({
                id: userData.id || 'iap-user',
                name: userData.name || 'User',
                email: userData.email || 'user@example.com',
                iapId: userData.iapId || userData.id
              });
              setUserRole(userData.role || 'user');
              console.log('[AUTH] User authenticated:', userData.email);
            } else {
              // No user data - use dev mode
              console.log('[AUTH] No user data in response - using dev mode');
              setUser({
                id: 'dev-user-123',
                name: 'Development User',
                email: 'ahamedbeema1989@gmail.com',
                iapId: 'dev-user-123'
              });
              setUserRole('superadmin');
            }
          } else {
            // Request failed - use dev mode
            console.log('[AUTH] user-info request failed - using dev mode');
            setUser({
              id: 'dev-user-123',
              name: 'Development User',
              email: 'ahamedbeema1989@gmail.com',
              iapId: 'dev-user-123'
            });
            setUserRole('superadmin');
          }
        } catch (fetchErr) {
          console.warn('[AUTH] user-info fetch error:', fetchErr.message);
          // Timeout or network error - use dev mode
          setUser({
            id: 'dev-user-123',
            name: 'Development User',
            email: 'ahamedbeema1989@gmail.com',
            iapId: 'dev-user-123'
          });
          setUserRole('superadmin');
        }
      } catch (err) {
        console.warn('[AUTH] Auth check error:', err);
        // Fallback to dev mode
        setUser({
          id: 'dev-user-123',
          name: 'Development User',
          email: 'ahamedbeema1989@gmail.com',
          iapId: 'dev-user-123'
        });
        setUserRole('superadmin');
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
