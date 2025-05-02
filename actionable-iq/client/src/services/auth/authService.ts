import { jwtDecode } from 'jwt-decode';
import { User, AuthState } from '../../types/auth.types';

// Local storage keys
const TOKEN_KEY = 'auth_token';
const ID_TOKEN_KEY = 'id_token';
const USER_KEY = 'user_info';

// Initial state
const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  token: null,
  idToken: null,
  loading: false,
  error: null
};

/**
 * Saves the authentication token and user data to local storage
 */
export const saveAuth = (token: string, idToken?: string): AuthState => {
  try {
    // Decode the token to get user information
    const decodedUser = jwtDecode<User>(token);
    
    // Save to local storage
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(decodedUser));
    
    // Save ID token if provided
    if (idToken) {
      localStorage.setItem(ID_TOKEN_KEY, idToken);
    }
    
    return {
      isAuthenticated: true,
      user: decodedUser,
      token,
      idToken: idToken || null,
      loading: false,
      error: null
    };
  } catch (error) {
    console.error('Error saving authentication:', error);
    return initialState;
  }
};

/**
 * Loads authentication data from local storage
 */
export const loadAuth = (): AuthState => {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const userJson = localStorage.getItem(USER_KEY);
    const idToken = localStorage.getItem(ID_TOKEN_KEY);
    
    if (!token || !userJson) {
      return initialState;
    }
    
    const user = JSON.parse(userJson) as User;
    
    return {
      isAuthenticated: true,
      user,
      token,
      idToken,
      loading: false,
      error: null
    };
  } catch (error) {
    console.error('Error loading authentication:', error);
    return initialState;
  }
};

/**
 * Clears authentication data from local storage
 */
export const clearAuth = (): AuthState => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(ID_TOKEN_KEY);
  return initialState;
};

/**
 * Checks if the current token is valid
 */
export const isTokenValid = (): boolean => {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return false;
    
    const decodedToken = jwtDecode<{exp: number}>(token);
    const currentTime = Date.now() / 1000;
    
    return decodedToken.exp > currentTime;
  } catch {
    return false;
  }
}; 