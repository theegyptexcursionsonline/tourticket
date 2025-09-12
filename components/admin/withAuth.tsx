// components/admin/withAuth.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Login from './Login';

const withAuth = <P extends object>(WrappedComponent: React.ComponentType<P>) => {
  const WithAuthComponent: React.FC<P> = (props) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      // Check for the auth token in local storage
      const token = localStorage.getItem('admin-auth-token');
      if (token === 'secret-auth-token-for-admin-access') {
        setIsAuthenticated(true);
      }
      setIsLoading(false);
    }, []);
    
    const handleLoginSuccess = () => {
      setIsAuthenticated(true);
    };

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600"></div>
        </div>
      );
    }

    if (!isAuthenticated) {
      return <Login onLoginSuccess={handleLoginSuccess} />;
    }

    return <WrappedComponent {...props} />;
  };
  
  return WithAuthComponent;
};

export default withAuth;