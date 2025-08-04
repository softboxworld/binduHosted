import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Mail, Lock, Eye, EyeOff, Building2 } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { getPasswordStrength, getPasswordStrengthColor, getPasswordStrengthText, validatePassword } from '../../utils/passwordUtils';

interface Organization {
  country?: string;
  city?: string;
  address?: string;
  employee_count?: number;
  currency?: string;
  name: string;
}

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState(validatePassword(''));
  const signUp = useAuthStore((state) => state.signUp);
  const { theme, getThemeStyle } = useTheme();

  useEffect(() => {
    setPasswordValidation(validatePassword(password));
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate password requirements
    const validation = validatePassword(password);
    const allCriteriaMet = Object.values(validation).every(Boolean);
    
    if (!allCriteriaMet) {
      setError('Password must meet all requirements');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      await signUp(email, password, organizationName);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const strength = getPasswordStrength(password);
  const strengthColor = getPasswordStrengthColor(strength);
  const strengthText = getPasswordStrengthText(strength);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          Create your account
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Get started with your free business account
        </p>
      </div>
      
      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 p-4 rounded">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="organization" className="block text-sm font-medium text-gray-700">
            Organization name
          </label>
          <div className="mt-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Building2 className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="organization"
              type="text"
              required
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none text-black focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Enter your organization name"
            />
          </div>
        </div>

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
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none text-black focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Enter your email"
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <div className="mt-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none text-black focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Create a password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              {showPassword ? (
                <EyeOff className={`h-5 w-5 ${getThemeStyle(theme, 'text', 'muted')} hover:${getThemeStyle(theme, 'text', 'secondary')} cursor-pointer`} />
              ) : (
                <Eye className={`h-5 w-5 ${getThemeStyle(theme, 'text', 'muted')} hover:${getThemeStyle(theme, 'text', 'secondary')} cursor-pointer`} />
              )}
            </button>
          </div>
          
          {/* Password strength indicator */}
          {password && (
            <div className="mt-2">
              <div className="flex items-center space-x-2">
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${strengthColor} transition-all duration-300`}
                    style={{ 
                      width: strength === 'weak' ? '33%' : 
                             strength === 'medium' ? '66%' : '100%' 
                    }}
                  />
                </div>
                <span className={`text-xs ${getThemeStyle(theme, 'text', 'muted')}`}>
                  {strengthText}
                </span>
              </div>
              <ul className="mt-2 text-xs space-y-1">
                <li className={`${passwordValidation.hasMinLength ? 'text-green-500' : getThemeStyle(theme, 'text', 'muted')}`}>
                  • At least 8 characters
                </li>
                <li className={`${passwordValidation.hasUpperCase ? 'text-green-500' : getThemeStyle(theme, 'text', 'muted')}`}>
                  • One uppercase letter
                </li>
                <li className={`${passwordValidation.hasLowerCase ? 'text-green-500' : getThemeStyle(theme, 'text', 'muted')}`}>
                  • One lowercase letter
                </li>
                <li className={`${passwordValidation.hasSpecialChar ? 'text-green-500' : getThemeStyle(theme, 'text', 'muted')}`}>
                  • One special character
                </li>
              </ul>
            </div>
          )}
        </div>

        <div>
          <label htmlFor="confirmPassword" className={`block text-sm font-medium text-black`}>
            Confirm Password
          </label>
          <div className="mt-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className={`h-5 w-5 text-black`} />
            </div>
            <input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none text-black focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
              placeholder="Confirm your password"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              {showConfirmPassword ? (
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
            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
          >
            Create account
          </button>
        </div>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600">
        Already have an account?{' '}
        <Link
          to="/auth/signin"
          className="font-medium text-blue-600 hover:text-blue-500 transition-colors duration-200"
        >
          Sign in instead
        </Link>
      </p>
    </div>
  );
}