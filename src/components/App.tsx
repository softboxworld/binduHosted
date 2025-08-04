import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { useTheme } from '../context/ThemeContext';
import AuthLayout from './components/auth/AuthLayout';
import SignIn from './components/auth/SignIn';
import SignUp from './components/auth/SignUp';
import Dashboard from './components/Dashboard';
import LandingPage from './components/LandingPage';
import ConfirmDialog from './components/ui/ConfirmDialog';
import ToastContainer from './components/ui/ToastContainer';
import { useConfirmDialog, useToast } from './hooks';

export default function App() {
  const { user, error, initialized } = useAuthStore();
  const { dialog, handleConfirm, handleCancel } = useConfirmDialog();
  const { toasts, removeToast } = useToast();
  const { getThemeStyle, theme } = useTheme();

  // Show loading state during initialization
  if (!initialized) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${getThemeStyle(theme, 'background', 'primary')}`}>
        <div className="text-center">
          <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${getThemeStyle(theme, 'text', 'accent')} mx-auto`}></div>
          <p className={`mt-4 ${getThemeStyle(theme, 'text', 'secondary')}`}>Loading application...</p>
        </div>
      </div>
    );
  }

  // Show error state if there's an error
  if (error) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${getThemeStyle(theme, 'background', 'primary')}`}>
        <div className={`text-center max-w-md mx-auto px-4 ${getThemeStyle(theme, 'text', 'primary')}`}>
          <div className={`text-red-600 mb-2`}>Error: {error}</div>
          <button
            onClick={() => window.location.reload()}
            className={`px-4 py-2 ${getThemeStyle(theme, 'background', 'accent')} ${getThemeStyle(theme, 'text', 'inverse')} rounded ${getThemeStyle(theme, 'interactive', 'hover', 'background')}`}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className={getThemeStyle(theme, 'background', 'primary')}>
        <Routes>
          {/* Show landing page for unauthenticated users */}
          <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
          
          {/* Auth routes */}
          <Route element={<AuthLayout />}>
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
          </Route>

          {/* Protected routes */}
          <Route
            path="/dashboard/*"
            element={user ? <Dashboard /> : <Navigate to="/signin" replace />}
          />
        </Routes>

        {/* Global Confirmation Dialog */}
        <ConfirmDialog
          isOpen={dialog.isOpen}
          title={dialog.title}
          message={dialog.message}
          type={dialog.type}
          confirmText={dialog.confirmText}
          cancelText={dialog.cancelText}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />

        {/* Global Toast Container */}
        <ToastContainer toasts={toasts} onClose={removeToast} />
      </div>
    </BrowserRouter>
  );
}