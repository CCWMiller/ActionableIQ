import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { loadAuth, saveAuth, clearAuth } from '../../services/auth/authService';
import { AuthState } from '../../types/auth.types';
import { RootState } from '..';

// Define the initial state using the loadAuth function from authService
const initialState: AuthState = {
  ...loadAuth(),
  loading: false,
  error: null,
};

interface LoginSuccessPayload {
  token: string;
  idToken?: string;
}

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    loginSuccess: (state, action: PayloadAction<LoginSuccessPayload>) => {
      const authData = saveAuth(action.payload.token, action.payload.idToken);
      state.isAuthenticated = authData.isAuthenticated;
      state.user = authData.user;
      state.token = authData.token;
      state.idToken = authData.idToken;
      state.loading = false;
      state.error = null;
    },
    loginFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    logout: (state) => {
      const clearedState = clearAuth();
      state.isAuthenticated = clearedState.isAuthenticated;
      state.user = clearedState.user;
      state.token = clearedState.token;
      state.idToken = clearedState.idToken;
      state.loading = false;
      state.error = null;
    },
    updateIdToken: (state, action: PayloadAction<string>) => {
      state.idToken = action.payload;
      localStorage.setItem('id_token', action.payload);
    }
  },
});

// Export the action creators
export const { loginStart, loginSuccess, loginFailure, logout, updateIdToken } = authSlice.actions;

// Define selectors
export const selectAuth = (state: RootState) => state.auth as AuthState;
export const selectIsAuthenticated = (state: RootState) => (state.auth as AuthState).isAuthenticated;
export const selectUser = (state: RootState) => (state.auth as AuthState).user;
export const selectAuthLoading = (state: RootState) => (state.auth as AuthState).loading;
export const selectAuthError = (state: RootState) => (state.auth as AuthState).error;
export const selectIdToken = (state: RootState) => (state.auth as AuthState).idToken;

// Export the reducer
export default authSlice.reducer; 