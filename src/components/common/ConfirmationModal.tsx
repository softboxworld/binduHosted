import { X } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { getThemeStyle } from '../../config/theme';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmButtonClass?: string;
}

export const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmButtonClass = 'bg-red-600 hover:bg-red-700'
}: ConfirmationModalProps) => {
  const { theme } = useTheme();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className={`absolute inset-0 ${getThemeStyle(theme, 'modal', 'overlay')}`}></div>
        </div>

        <div className={`inline-block align-bottom ${getThemeStyle(theme, 'modal', 'background')} rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full`}>
          <div className={`flex items-center justify-between px-6 py-4 border-b ${getThemeStyle(theme, 'border', 'primary')}`}>
            <h3 className={`text-lg font-semibold ${getThemeStyle(theme, 'text', 'primary')}`}>{title}</h3>
            <button
              onClick={onClose}
              className={`${getThemeStyle(theme, 'text', 'muted')} ${getThemeStyle(theme, 'interactive', 'hover', 'text')}`}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="px-6 py-4">
            <p className={`text-sm ${getThemeStyle(theme, 'text', 'secondary')}`}>{message}</p>
          </div>

          <div className="flex justify-end space-x-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 border ${getThemeStyle(theme, 'border', 'primary')} rounded-md text-sm font-medium ${getThemeStyle(theme, 'text', 'secondary')} ${getThemeStyle(theme, 'interactive', 'hover', 'background')} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${confirmButtonClass} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 