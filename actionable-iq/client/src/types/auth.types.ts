export interface User {
  email: string;
  name: string;
  picture?: string;
  sub?: string; // Google's user ID
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  idToken: string | null; // Google ID token for Workload Identity
  loading: boolean;
  error: string | null;
} 