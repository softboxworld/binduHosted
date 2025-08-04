import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Package, BarChart2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { useUI } from '../context/UIContext';
import { useTheme } from '../context/ThemeContext';
import { Product } from '../types/inventory';
import CreateCategoryForm from '../components/inventory/CreateCategoryForm';
import EditCategoryForm from '../components/inventory/EditCategoryForm';
import ReassignProductsModal from '../components/inventory/ReassignProductsModal';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface Category {
  id: string;
  name: string;
  product_count: number;
}

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryToReassign, setCategoryToReassign] = useState<Category | null>(null);
  const { organization } = useAuthStore();
  const { confirm, addToast } = useUI();
  const { theme, getThemeStyle } = useTheme();

  useEffect(() => {
    if (!organization) return;
    loadCategories();
    loadProducts();
  }, [organization]);

  const loadProducts = async () => {
    if (!organization?.id) return;

    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('organization_id', organization.id);

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to load products'
      });
    }
  };

  const loadCategories = async () => {
    if (!organization?.id) return;

    try {
      // First get all categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .eq('organization_id', organization.id)
        .order('name');

      if (categoriesError) throw categoriesError;

      // Then get counts for each category
      const categoriesWithCount = await Promise.all(
        categoriesData.map(async (category) => {
          const { count, error: countError } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', organization.id)
            .eq('category', category.name);

          if (countError) throw countError;

          return {
            id: category.id,
            name: category.name,
            product_count: count || 0
          };
        })
      );

      setCategories(categoriesWithCount);
    } catch (error) {
      console.error('Error loading categories:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to load categories'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
    // Check if category has products
    const hasProducts = products.some(p => p.category === categoryName);
    if (hasProducts) {
      // Find the category object
      const category = categories.find(c => c.id === categoryId);
      if (category) {
        setCategoryToReassign(category);
      }
      return;
    }

    const confirmed = await confirm({
      title: 'Delete Category',
      message: 'Are you sure you want to delete this category? This action cannot be undone.',
      type: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;

      setCategories(prev => prev.filter(c => c.id !== categoryId));
      addToast({
        type: 'success',
        title: 'Category Deleted',
        message: 'Category has been deleted successfully.'
      });
    } catch (error) {
      console.error('Error deleting category:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to delete category'
      });
    }
  };

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 p-4">
      <div className="flex-1 space-y-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className={`flex items-center px-2 py-1.5 border rounded-md focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500 flex-1 sm:flex-none ${getThemeStyle(theme, 'background', 'primary')}`}>
              <Search className="h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search categories..."
                className={`ml-2 w-full sm:w-64 text-xs outline-none bg-transparent ${getThemeStyle(theme, 'text', 'primary')}`}
              />
            </div>
          </div>
          <button
            onClick={() => setShowAddCategory(true)}
            className="inline-flex items-center px-2 py-1.5 rounded-md text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200 w-full sm:w-auto justify-center"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Category
          </button>
        </div>

        {/* Categories List - Mobile View */}
        <div className="block lg:hidden space-y-4">
          {filteredCategories.length === 0 ? (
            <div className={`p-4 text-center text-xs ${getThemeStyle(theme, 'text', 'muted')}`}>
              No categories found.
            </div>
          ) : (
            filteredCategories.map(category => (
              <div
                key={category.id}
                className={`p-4 rounded-lg ${getThemeStyle(theme, 'background', 'primary')} border ${getThemeStyle(theme, 'border', 'primary')}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`h-8 w-8 rounded-md ${getThemeStyle(theme, 'background', 'accent')} flex items-center justify-center`}>
                      <Package className={`h-4 w-4 ${getThemeStyle(theme, 'text', 'muted')}`} />
                    </div>
                    <span className={`text-sm font-medium ${getThemeStyle(theme, 'text', 'primary')}`}>
                      {category.name}
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 text-xs rounded-md ${getThemeStyle(theme, 'background', 'accent')} ${getThemeStyle(theme, 'text', 'secondary')}`}>
                    {category.product_count} {category.product_count === 1 ? 'product' : 'products'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingCategory(category)}
                    className={`flex-1 p-2 rounded-md ${getThemeStyle(theme, 'background', 'accent')} ${getThemeStyle(theme, 'text', 'muted')} hover:${getThemeStyle(theme, 'text', 'primary')} flex items-center justify-center gap-2`}
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    <span className="text-xs">Edit</span>
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(category.id, category.name)}
                    className={`flex-1 p-2 rounded-md ${getThemeStyle(theme, 'background', 'accent')} ${getThemeStyle(theme, 'text', 'muted')} hover:text-red-500 flex items-center justify-center gap-2`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span className="text-xs">Delete</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Categories Table - Desktop View */}
        <div className={`hidden lg:block ${getThemeStyle(theme, 'background', 'primary')}`}>
          {filteredCategories.length === 0 ? (
            <div className={`p-4 text-center text-xs ${getThemeStyle(theme, 'text', 'muted')}`}>
              No categories found.
            </div>
          ) : (
            <table className="min-w-full">
              <thead>
                <tr className={`border-b ${getThemeStyle(theme, 'border', 'primary')}`}>
                  <th className={`px-4 py-2 text-left text-xs font-medium ${getThemeStyle(theme, 'text', 'muted')}`}>
                    Category Name
                  </th>
                  <th className={`px-4 py-2 text-left text-xs font-medium ${getThemeStyle(theme, 'text', 'muted')}`}>
                    Products
                  </th>
                  <th className={`px-4 py-2 text-left text-xs font-medium ${getThemeStyle(theme, 'text', 'muted')}`}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-opacity-2">
                {filteredCategories.map(category => (
                  <tr key={category.id} className={`hover:bg-gray-300 dark:hover:bg-gray-800 transition-colors duration-150`}>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <div className={`h-8 w-8 rounded-md ${getThemeStyle(theme, 'background', 'accent')} flex items-center justify-center`}>
                          <Package className={`h-4 w-4 ${getThemeStyle(theme, 'text', 'muted')}`} />
                        </div>
                        <span className={`text-xs font-medium ${getThemeStyle(theme, 'text', 'primary')}`}>
                          {category.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 text-xs rounded-md ${getThemeStyle(theme, 'background', 'accent')} ${getThemeStyle(theme, 'text', 'secondary')}`}>
                        {category.product_count} {category.product_count === 1 ? 'product' : 'products'}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingCategory(category)}
                          className={`p-1.5 rounded-md ${getThemeStyle(theme, 'background', 'accent')} ${getThemeStyle(theme, 'text', 'muted')} hover:${getThemeStyle(theme, 'text', 'primary')}`}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category.id, category.name)}
                          className={`p-1.5 rounded-md ${getThemeStyle(theme, 'background', 'accent')} ${getThemeStyle(theme, 'text', 'muted')} hover:text-red-500`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Right Panel - Category Statistics */}
      <div className={`w-full lg:w-[300px] ${getThemeStyle(theme, 'background', 'secondary')} rounded-lg p-4 space-y-4`}>
        <h3 className={`text-sm font-medium ${getThemeStyle(theme, 'text', 'primary')}`}>Category Statistics</h3>
        
        <div className="space-y-3">
          <div className={`p-3 rounded-lg ${getThemeStyle(theme, 'background', 'accent')}`}>
            <div className="flex items-center gap-2">
              <Package className="h-3.5 w-3.5 text-blue-500" />
              <span className={`text-xs ${getThemeStyle(theme, 'text', 'secondary')}`}>Total Categories</span>
            </div>
            <p className={`text-sm font-medium mt-1 ${getThemeStyle(theme, 'text', 'primary')}`}>
              {categories.length}
            </p>
          </div>

          <div className={`p-3 rounded-lg ${getThemeStyle(theme, 'background', 'accent')}`}>
            <div className="flex items-center gap-2">
              <BarChart2 className="h-3.5 w-3.5 text-purple-500" />
              <span className={`text-xs ${getThemeStyle(theme, 'text', 'secondary')}`}>Category Distribution</span>
            </div>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categories.map(cat => ({ name: cat.name, value: cat.product_count }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categories.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Add Category Modal */}
      {showAddCategory && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowAddCategory(false)} />
            <div className={`relative transform overflow-hidden rounded-lg shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl ${getThemeStyle(theme, 'background', 'primary')}`}>
              <CreateCategoryForm
                onClose={() => setShowAddCategory(false)}
                onSuccess={loadCategories}
              />
            </div>
          </div>
        </div>
      )}

      {/* Edit Category Modal */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setEditingCategory(null)} />
            <div className={`relative transform overflow-hidden rounded-lg shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl ${getThemeStyle(theme, 'background', 'primary')}`}>
              <EditCategoryForm
                category={editingCategory}
                onClose={() => setEditingCategory(null)}
                onSuccess={loadCategories}
              />
            </div>
          </div>
        </div>
      )}

      {/* Reassign Products Modal */}
      {categoryToReassign && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setCategoryToReassign(null)} />
            <div className={`relative transform overflow-hidden rounded-lg shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl ${getThemeStyle(theme, 'background', 'primary')}`}>
              <ReassignProductsModal
                categoryToDelete={categoryToReassign}
                categories={categories}
                onClose={() => setCategoryToReassign(null)}
                onSuccess={loadCategories}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 