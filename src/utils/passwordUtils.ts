export type PasswordStrength = 'weak' | 'medium' | 'strong';

interface PasswordValidation {
  hasMinLength: boolean;
  hasUpperCase: boolean;
  hasLowerCase: boolean;
  hasSpecialChar: boolean;
}

export function validatePassword(password: string): PasswordValidation {
  return {
    hasMinLength: password.length >= 8,
    hasUpperCase: /[A-Z]/.test(password),
    hasLowerCase: /[a-z]/.test(password),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };
}

export function getPasswordStrength(password: string): PasswordStrength {
  if (!password) return 'weak';
  
  const validation = validatePassword(password);
  const criteriaMet = Object.values(validation).filter(Boolean).length;
  
  if (criteriaMet <= 2) return 'weak';
  if (criteriaMet === 3) return 'medium';
  return 'strong';
}

export function getPasswordStrengthColor(strength: PasswordStrength): string {
  switch (strength) {
    case 'weak':
      return 'bg-red-500';
    case 'medium':
      return 'bg-yellow-500';
    case 'strong':
      return 'bg-green-500';
  }
}

export function getPasswordStrengthText(strength: PasswordStrength): string {
  switch (strength) {
    case 'weak':
      return 'Weak password';
    case 'medium':
      return 'Medium strength';
    case 'strong':
      return 'Strong password';
  }
} 