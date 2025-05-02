import React, { useState } from 'react';
import { useGoogleLogin, CodeResponse } from '@react-oauth/google';
import { useDispatch } from 'react-redux';
import { loginStart, loginSuccess, loginFailure } from '../../store/slices/authSlice';
import { useAuth } from '../../services/auth/authContext';
import { authApi } from '../../services/api/authApi';

interface GoogleLoginProps {
  onSuccess?: () => void;
  onError?: (error: any) => void;
  buttonText?: string;
  className?: string;
}

const GoogleLogin: React.FC<GoogleLoginProps> = ({
  onSuccess,
  onError,
  buttonText = 'Sign in with Google',
  className = '',
}) => {
  const dispatch = useDispatch();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (codeResponse: CodeResponse) => {
      // Start login process
      dispatch(loginStart());
      setIsLoading(true);
      
      try {
        // Get the code from the response
        const { code } = codeResponse;
        
        if (!code) {
          throw new Error('No authorization code received from Google');
        }
        
        console.log('Received Google authorization code, validating with backend...');
        
        // Validate the code with our backend
        const authResponse = await authApi.validateGoogleToken(code);
        
        console.log('Backend response received');
        
        if (!authResponse) {
          throw new Error('No response received from backend');
        }
        
        // Get the JWT token and ID token from our backend
        const { accessToken, idToken } = authResponse;
        
        if (!accessToken || !idToken) {
          throw new Error('Missing tokens in backend response');
        }
        
        console.log('Successfully validated token with backend');
        
        // Dispatch success action and call auth context
        dispatch(loginSuccess({ token: accessToken, idToken }));
        login(accessToken, idToken);
        
        // Call the onSuccess callback if provided
        if (onSuccess) {
          onSuccess();
        }
      } catch (error: any) {
        console.error('Authentication error:', error);
        
        // Get a more specific error message for common issues
        let errorMessage = 'Failed to authenticate with Google';
        
        if (error?.message) {
          errorMessage = error.message;
          
          // Handle specific backend error cases
          if (error.message.includes('Bad Request')) {
            console.error('Backend validation failed - check server logs for details');
            errorMessage = 'Server could not validate your Google credentials. Please try again or contact support.';
          } else if (error.message.includes('Authentication failed')) {
            errorMessage = 'Your session has expired. Please log in again.';
          }
        }
        
        // Dispatch failure action
        dispatch(loginFailure(errorMessage));
        
        if (onError) {
          onError(error);
        }
      } finally {
        setIsLoading(false);
      }
    },
    onError: (errorResponse) => {
      console.error('Google Login Error:', errorResponse);
      
      // Dispatch failure action
      dispatch(loginFailure('Google authentication failed'));
      
      if (onError) {
        onError(errorResponse);
      }
    },
    scope: 'openid email profile https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/analytics',
    flow: 'auth-code',
    select_account: true
  });

  return (
    <button
      onClick={() => handleGoogleLogin()}
      disabled={isLoading}
      className={`flex items-center justify-center bg-white text-gray-700 py-2 px-4 rounded-md border border-gray-300 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
        isLoading ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`}
      type="button"
    >
      {isLoading ? (
        <div className="mr-2 w-5 h-5 border-t-2 border-b-2 border-indigo-500 rounded-full animate-spin"></div>
      ) : (
        <svg 
          className="w-5 h-5 mr-2" 
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z"
            fill="#4285F4"
          />
          <path
            d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z"
            fill="#34A853"
          />
          <path
            d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z"
            fill="#FBBC05"
          />
          <path
            d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z"
            fill="#EA4335"
          />
        </svg>
      )}
      {buttonText}
    </button>
  );
};

export default GoogleLogin; 