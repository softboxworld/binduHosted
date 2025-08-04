import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import AuthLayout from './components/auth/AuthLayout';
import SignIn from './components/auth/SignIn';
import SignUp from './components/auth/SignUp';
import Dashboard from './components/Dashboard';
import OrganizationSetup from './components/OrganizationSetup';
import LandingPage from './components/LandingPage';
import { UIProvider } from './context/UIContext';
import { ThemeProvider } from './context/ThemeContext';

export default function App() {
  const { user, error, initialized } = useAuthStore();

  // Show loading state during initialization
  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading application...</p>
        </div>
      </div>
    );
  }

  // Show error state if there's an error
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-red-600 dark:text-red-400 mb-2">Error: {error}</div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <UIProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-gray-50 dark:bg-dark-bg-primary text-gray-900 dark:text-dark-text-primary">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/auth" element={<AuthLayout />}>
                <Route path="signin" element={<SignIn />} />
                <Route path="signup" element={<SignUp />} />
              </Route>
              <Route
                path="/dashboard/*"
                element={user ? <Dashboard /> : <Navigate to="/auth/signin" />}
              />
              <Route
                path="/organization-setup"
                element={user ? <OrganizationSetup /> : <Navigate to="/auth/signin" />}
              />
            </Routes>
          </div>
        </BrowserRouter>
      </UIProvider>
    </ThemeProvider>
  );
}