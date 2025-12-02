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
      } catch (err) {
        console.error('Auth check failed:', err);
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
