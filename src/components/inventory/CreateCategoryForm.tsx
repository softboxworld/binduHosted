import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useUI } from '../../context/UIContext';
import { useAuthStore } from '../../stores/authStore';
import { useTheme } from '../../context/ThemeContext';

interface CreateCategoryFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateCategoryForm({ onClose, onSuccess }: CreateCategoryFormProps) {
  const [categoryName, setCategoryName] = useState('');
  const { addToast } = useUI();
  const { organization } = useAuthStore();
  const { theme, getThemeStyle } = useTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization?.id) return;

    try {
      const { error } = await supabase
        .from('categories')
        .insert([{ 
          name: categoryName,
          organization_id: organization.id 
        }]);

      if (error) throw error;

      addToast({
        type: 'success',
        title: 'Category Created',
        message: 'The category has been created successfully.'
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating category:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to create category'
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`p-6 ${getThemeStyle(theme, 'modal', 'background')}`}>
      <h2 className={`text-lg font-bold mb-4 ${getThemeStyle(theme, 'text', 'primary')}`}>Create New Category</h2>
      <div className="mb-4">
        <label className={`block text-sm font-medium ${getThemeStyle(theme, 'text', 'secondary')}`}>Category Name</label>
        <input
          type="text"
          value={categoryName}
          onChange={(e) => setCategoryName(e.target.value)}
          className={`mt-1 block w-full h-8 border p-2 rounded-md ${getThemeStyle(theme, 'border', 'primary')} shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 ${getThemeStyle(theme, 'background', 'primary')} ${getThemeStyle(theme, 'text', 'primary')}`}
          required
        />
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className={`mr-2 inline-flex justify-center py-2 px-4 border ${getThemeStyle(theme, 'border', 'primary')} shadow-sm text-sm font-medium rounded-md ${getThemeStyle(theme, 'text', 'secondary')} ${getThemeStyle(theme, 'background', 'primary')} ${getThemeStyle(theme, 'interactive', 'hover', 'background')} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500`}
        >
          Cancel
        </button>
        <button
          type="submit"
          className={`inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md ${getThemeStyle(theme, 'text', 'inverse')} bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
        >
          Create
        </button>
      </div>
    </form>
  );
} 