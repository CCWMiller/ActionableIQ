import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './services/auth/authContext';
import './App.css';
import LandingPage from './components/landing/LandingPage';
import ProtectedRoute from './components/routing/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import QueryPage from './features/query/QueryPage';

// Placeholder component for Excel Upload page
// This will be implemented later
const ExcelUploadPage = () => <div className="p-4 bg-white rounded-lg shadow">Excel Upload Page (Protected)</div>;

function App() {
  // Your Google OAuth Client ID (replace with actual client ID when in production)
  const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || 'your-client-id';

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public route */}
            <Route path="/" element={<LandingPage />} />
            
            {/* Protected routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/query" element={<QueryPage />} />
                <Route path="/excel-upload" element={<ExcelUploadPage />} />
              </Route>
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
