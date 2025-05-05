import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated, selectUser, selectAuthLoading } from '../../store/slices/authSlice';
import GoogleLogin from '../auth/GoogleLogin';

const LandingPage: React.FC = () => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectUser);
  const loading = useSelector(selectAuthLoading);
  const navigate = useNavigate();

  useEffect(() => {
    // When user is authenticated, redirect to the Query Page
    if (isAuthenticated && !loading) {
      navigate('/query');
    }
  }, [isAuthenticated, user, loading, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">ActionableIQ</h1>
          <p className="text-gray-600">
            A powerful analytics tool for Google Analytics data
          </p>
        </div>
        
        {loading ? (
          <div className="flex justify-center">
            <div 
              role="status"
              aria-label="Loading"
              className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"
            />
          </div>
        ) : !isAuthenticated ? (
          <div className="flex flex-col items-center">
            <p className="mb-4 text-gray-700">Sign in to access your analytics</p>
            <GoogleLogin 
              onSuccess={() => console.log('Login successful')}
              onError={(error) => console.error('Login failed:', error)}
              className="w-full"
            />
          </div>
        ) : (
          <div className="text-center">
            <p className="text-green-600 mb-4">You are signed in!</p>
            <p className="text-gray-700">Redirecting to dashboard...</p>
            {/* Navigation will be implemented later */}
          </div>
        )}
      </div>
    </div>
  );
};

export default LandingPage; 