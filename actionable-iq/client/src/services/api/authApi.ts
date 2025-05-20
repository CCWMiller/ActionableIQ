import { apiClient } from './apiClient';

interface ValidateTokenResponse {
  isValid: boolean;
  user?: {
    email: string;
    name: string;
    picture?: string;
  };
}

interface GoogleAuthResponse {
  accessToken: string;
  refreshToken: string;
  idToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    profileImageUrl?: string;
  };
}

interface GoogleAuthRequest {
  AccessToken: string;
}

export const authApi = {
  /**
   * Validate a Google ID token with the backend
   */
  validateGoogleToken: (code: string) => 
    apiClient.post<GoogleAuthResponse>('/auth/google', {
      Code: code
    }),
  
  /**
   * Validate the current authentication token
   */
  validateToken: (token: string) => 
    apiClient.get<ValidateTokenResponse>('/auth/validate', { token }),
  
  /**
   * Revoke an authentication token
   */
  revokeToken: (token: string) => 
    apiClient.post('/auth/revoke', { token }),
}; 