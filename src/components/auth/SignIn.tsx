import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface Organization {
  country?: string;
  city?: string;
  address?: string;
  employee_count?: number;
  currency?: string;
}

function isOrganizationComplete(org: Organization | null): boolean {
  return Boolean(
    org?.country &&
    org?.city &&
    org?.address &&
    org?.employee_count &&
    org?.currency
  );
}

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn, user, organization } = useAuthStore();
  const { theme, getThemeStyle } = useTheme();

  if (user) {
    // Redirect to setup if organization info is incomplete
    if (!isOrganizationComplete(organization)) {
      return <Navigate to="/organization-setup" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    setError(null);
    setIsSubmitting(true);
    
    try {
      await signIn(email, password);
    } catch (err) {
      console.error('Sign in error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during sign in');
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          Welcome back
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Please sign in to your account to continue
        </p>
      </div>
      
      {error && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 rounded">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email address
          </label>
          <div className="mt-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-50 disabled:text-black text-black"
              placeholder="Enter your email"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="password" className={`block text-sm font-medium text-black`}>
              Password
            </label>
          </div>
          <div className="mt-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className={`h-5 w-5 text-black`} />
            </div>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
              className={`block w-full pl-10 pr-10 py-2 border ${getThemeStyle(theme, 'border', 'secondary')} text-black rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-50 disabled:text-gray-500`}
              placeholder="Enter your password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              {showPassword ? (
                <EyeOff className={`h-5 w-5 text-black hover:text-black cursor-pointer`} />
              ) : (
                <Eye className={`h-5 w-5 text-black hover:text-black cursor-pointer`} />
              )}
            </button>
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing in...
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </div>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600">
        Don't have an account?{' '}
        <Link
          to="/auth/signup"
          className="font-medium text-blue-600 hover:text-blue-500 transition-colors duration-200"
        >
          Sign up for free
        </Link>
      </p>
    </div>
  );
}