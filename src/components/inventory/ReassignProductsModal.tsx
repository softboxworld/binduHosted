import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useUI } from '../../context/UIContext';
import { useTheme } from '../../context/ThemeContext';

interface Category {
  id: string;
  name: string;
}

interface ReassignProductsModalProps {
  categoryToDelete: Category;
  categories: Category[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function ReassignProductsModal({ 
  categoryToDelete, 
  categories, 
  onClose, 
  onSuccess 
}: ReassignProductsModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { organization } = useAuthStore();
  const { addToast } = useUI();
  const { theme, getThemeStyle } = useTheme();

  // Filter out the category being deleted
  const availableCategories = categories.filter(cat => cat.id !== categoryToDelete.id);

  const handleReassign = async () => {
    if (!selectedCategory || !organization?.id) return;
    
    setIsSubmitting(true);
    
    try {
      // Update all products in the category being deleted to the new category
      const { error } = await supabase
        .from('products')
        .update({ category: selectedCategory })
        .eq('organization_id', organization.id)
        .eq('category', categoryToDelete.name);
      
      if (error) throw error;
      
      // Now delete the category
      const { error: deleteError } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryToDelete.id);
      
      if (deleteError) throw deleteError;
      
      addToast({
        type: 'success',
        title: 'Success',
        message: 'Products reassigned and category deleted successfully'
      });
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error reassigning products:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to reassign products and delete category'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`h-full flex flex-col ${getThemeStyle(theme, 'background', 'primary')}`}>
      {/* Header */}
      <div className={`flex justify-between items-center p-4 border-b ${getThemeStyle(theme, 'border', 'primary')}`}>
        <h2 className={`text-sm font-medium ${getThemeStyle(theme, 'text', 'primary')}`}>
          Reassign Products
        </h2>
        <button
          onClick={onClose}
          className={`p-1.5 rounded-md ${getThemeStyle(theme, 'background', 'accent')} ${getThemeStyle(theme, 'text', 'muted')} hover:${getThemeStyle(theme, 'text', 'primary')}`}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          <p className={`text-xs ${getThemeStyle(theme, 'text', 'primary')}`}>
            The category <span className="font-medium">{categoryToDelete.name}</span> has products associated with it. 
            Please select a new category to reassign these products before deleting.
          </p>
          
          <div>
            <label className={`block text-xs font-medium mb-1 ${getThemeStyle(theme, 'text', 'muted')}`}>
              Select New Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className={`w-full px-3 py-2 rounded-md border text-sm ${getThemeStyle(theme, 'border', 'primary')} ${getThemeStyle(theme, 'background', 'primary')} ${getThemeStyle(theme, 'text', 'primary')}`}
            >
              <option value="">Select a category</option>
              {availableCategories.map(category => (
                <option key={category.id} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <div className={`flex justify-end gap-2 p-4 border-t ${getThemeStyle(theme, 'border', 'primary')}`}>
        <button
          type="button"
          onClick={onClose}
          className={`px-3 py-1.5 text-xs font-medium ${getThemeStyle(theme, 'text', 'primary')} hover:${getThemeStyle(theme, 'text', 'secondary')}`}
        >
          Cancel
        </button>
        <button
          onClick={handleReassign}
          disabled={isSubmitting || !selectedCategory}
          className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-400"
        >
          {isSubmitting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            'Reassign & Delete'
          )}
        </button>
      </div>
    </div>
  );
} 