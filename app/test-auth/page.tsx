'use client';

import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';

export default function TestAuth() {
  const { user, isLoading, isAuthenticated, loginWithRedirect, logout } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6 text-center">Auth Test</h1>
        
        {isAuthenticated ? (
          <div className="text-center">
            <div className="mb-4">
              {user?.picture ? (
                <Image
                  src={user.picture}
                  alt={user.name || 'User'}
                  width={80}
                  height={80}
                  className="rounded-full mx-auto"
                />
              ) : (
                <div className="w-20 h-20 bg-slate-200 rounded-full mx-auto flex items-center justify-center">
                  <span className="text-2xl">👤</span>
                </div>
              )}
            </div>
            
            <h2 className="text-xl font-semibold text-green-600 mb-2">✅ Authenticated</h2>
            <div className="space-y-2 mb-6">
              <p><strong>Name:</strong> {user?.name}</p>
              <p><strong>Email:</strong> {user?.email}</p>
              <p><strong>ID:</strong> {user?.id}</p>
            </div>
            
            <button 
              onClick={logout}
              className="w-full bg-red-600 text-white px-4 py-3 rounded-lg hover:bg-red-700 transition-colors"
            >
              Logout
            </button>
          </div>
        ) : (
          <div className="text-center">
            <h2 className="text-xl font-semibold text-red-600 mb-4">❌ Not Authenticated</h2>
            <p className="mb-6 text-slate-600">Please login to test the authentication</p>
            <button 
              onClick={loginWithRedirect}
              className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Login with Auth0
            </button>
          </div>
        )}
        
        <div className="mt-8 pt-6 border-t">
          <h3 className="font-semibold mb-2">Debug Info:</h3>
          <div className="text-sm text-slate-600 space-y-1">
            <p>Loading: {isLoading ? 'Yes' : 'No'}</p>
            <p>Authenticated: {isAuthenticated ? 'Yes' : 'No'}</p>
            <p>User Object: {user ? 'Present' : 'Null'}</p>
          </div>
        </div>
        
        <div className="mt-6 text-center">
          <a 
            href="/"
            className="text-blue-600 hover:underline"
          >
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}