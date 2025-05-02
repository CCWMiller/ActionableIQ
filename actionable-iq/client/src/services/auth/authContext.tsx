import React, { createContext, useContext, useEffect, ReactNode, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  selectIsAuthenticated, 
  selectUser, 
  selectAuthLoading, 
  loginSuccess, 
  logout 
} from '../../store/slices/authSlice';
import { isTokenValid } from './authService';
import { authApi } from '../api/authApi';
import { User } from '../../types/auth.types';

// Define the type for our context
interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  login: (token: string, idToken?: string) => void;
  logout: () => void;
}

// Create the context with a default value
const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  loading: false,
  login: () => {},
  logout: () => {},
});

// Provider component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectUser);
  const loading = useSelector(selectAuthLoading);
  const [initialCheckDone, setInitialCheckDone] = useState(false);

  // Check if token is valid on mount and validate with backend
  useEffect(() => {
    const validateAuth = async () => {
      try {
        // First check if we have a token and it's not expired
        if (isTokenValid()) {
          const storedToken = localStorage.getItem('auth_token');
          const storedIdToken = localStorage.getItem('id_token');
          
          if (storedToken) {
            // Validate with backend
            const response = await authApi.validateToken(storedToken);
            if (response.isValid) {
              // Token is valid, update Redux store if needed
              if (!isAuthenticated) {
                dispatch(loginSuccess({ 
                  token: storedToken, 
                  idToken: storedIdToken || undefined 
                }));
              }
            } else {
              // Token is invalid according to backend
              dispatch(logout());
            }
          }
        } else {
          // No token or expired token
          dispatch(logout());
        }
      } catch (error) {
        // Error during validation
        console.error('Auth validation error:', error);
        dispatch(logout());
      } finally {
        setInitialCheckDone(true);
      }
    };

    if (!initialCheckDone) {
      validateAuth();
    }
  }, [dispatch, isAuthenticated, initialCheckDone]);

  // Login function
  const handleLogin = (token: string, idToken?: string) => {
    dispatch(loginSuccess({ token, idToken }));
  };

  // Logout function
  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (token) {
        // Attempt to revoke token on backend
        await authApi.revokeToken(token);
      }
    } catch (error) {
      console.error('Error revoking token:', error);
    } finally {
      // Always clear local state regardless of API response
      dispatch(logout());
    }
  };

  // Value object to be provided by the context
  const value = {
    isAuthenticated,
    user,
    loading: loading || !initialCheckDone,
    login: handleLogin,
    logout: handleLogout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = () => useContext(AuthContext); 