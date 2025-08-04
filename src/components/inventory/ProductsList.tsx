import { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Edit2, Trash2, Package, ChevronDown, FolderTree, TrendingUp, AlertTriangle, BarChart2, ChevronRight, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useUI } from '../../context/UIContext';
import { useTheme } from '../../context/ThemeContext';
import { Product } from '../../types/inventory';
import { CURRENCIES } from '../../utils/constants';
import CreateProductForm from './CreateProductForm';
import ProductDetailsModal from './ProductDetailsModal';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { getThemeStyle } from '../../utils/themeUtils';

interface Category {
  id: number;
  name: string;
  organization_id: string;
}

interface ProductStats {
  lowStockCount: number;
  totalProducts: number;
  totalValue: number;
  categoryDistribution: { name: string; value: number }[];
}

export default function ProductsList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const { organization } = useAuthStore();
  const { confirm, addToast } = useUI();
  const { theme, getThemeStyle } = useTheme();
  const currencySymbol = organization?.currency ? CURRENCIES[organization.currency]?.symbol || organization.currency : '';
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Filter categories based on search
  const filteredCategories = useMemo(() => {
    if (!categorySearch) return categories;
    return categories.filter(category =>
      category.name.toLowerCase().includes(categorySearch.toLowerCase())
    );
  }, [categories, categorySearch]);

  // Calculate product statistics
  const productStats = useMemo((): ProductStats => {
    const lowStockCount = products.filter(p => p.stock_quantity <= p.reorder_point).length;
    const totalValue = products.reduce((sum, p) => sum + (p.stock_quantity * p.unit_price), 0);

    const categoryDistribution = categories.map(category => ({
      name: category.name,
      value: products.filter(p => p.category === category.name).length
    }));

    return {
      lowStockCount,
      totalProducts: products.length,
      totalValue,
      categoryDistribution
    };
  }, [products, categories]);

  useEffect(() => {
    if (!organization) return;
    loadProducts();
    loadCategories();
  }, [organization]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadProducts = async () => {
    if (!organization?.id) return;

    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('organization_id', organization.id)
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to load products'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadCategories = async () => {
    if (!organization?.id) return;

    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('organization_id', organization.id)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to load categories'
      });
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    const confirmed = await confirm({
      title: 'Delete Product',
      message: 'Are you sure you want to delete this product? This action cannot be undone.',
      type: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;

      setProducts(prev => prev.filter(p => p.id !== productId));
      addToast({
        type: 'success',
        title: 'Product Deleted',
        message: 'Product has been deleted successfully.'
      });
    } catch (error) {
      console.error('Error deleting product:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to delete product'
      });
    }
  };

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
  };

  const handleCloseProductDetails = () => {
    setSelectedProduct(null);
  };

  const filteredProducts = products.filter(product =>
    (categoryFilter === 'all' || product.category === categoryFilter) &&
    (product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase()))
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
    <div className={`flex flex-col lg:flex-row gap-4 min-h-screen ${getThemeStyle(theme, 'background', 'primary')}`}>
      {/* Main Content */}
      <div className="flex-1 space-y-4">
        {/* Header Section */}
        <div className={`${getThemeStyle(theme, 'background', 'primary')} rounded-lg p-4`}>
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${getThemeStyle(theme, 'text', 'muted')}`} />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-9 pr-4 py-1.5 text-xs rounded-md ${getThemeStyle(theme, 'background', 'primary')} ${getThemeStyle(theme, 'text', 'primary')} ${getThemeStyle(theme, 'border', 'primary')} border-2 focus:outline-none focus:ring-1 focus:ring-blue-500`}
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative">
                <button
                  onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                  className={`w-full sm:w-auto px-3 py-1.5 text-xs rounded-md ${getThemeStyle(theme, 'background', 'primary')} ${getThemeStyle(theme, 'text', 'primary')} ${getThemeStyle(theme, 'border', 'primary')} flex items-center justify-between`}
                >
                  <span>{categoryFilter === 'all' ? 'Category: All' : `Category: ${categoryFilter}`}</span>
                  <ChevronRight className={`h-3 w-3 ml-2 transform ${showCategoryDropdown ? 'rotate-90' : ''}`} />
                </button>
                {showCategoryDropdown && (
                  <div className={`absolute z-10 mt-1 w-full sm:w-48 rounded-md shadow-lg ${getThemeStyle(theme, 'background', 'primary')} ${getThemeStyle(theme, 'border', 'primary')} border`}>
                    <div className="p-2">
                      <input
                        type="text"
                        placeholder="Search categories..."
                        value={categorySearch}
                        onChange={(e) => setCategorySearch(e.target.value)}
                        className={`w-full px-2 py-1 text-xs rounded-md ${getThemeStyle(theme, 'background', 'secondary')} ${getThemeStyle(theme, 'text', 'primary')} ${getThemeStyle(theme, 'border', 'primary')} focus:outline-none focus:ring-1 focus:ring-blue-500`}
                      />
                      <button
                        className={`w-full text-left px-3 py-1.5 text-xs ${getThemeStyle(theme, 'text', 'primary')} hover:${getThemeStyle(theme, 'background', 'accent')}`}
                        onClick={() => {
                          setCategoryFilter('all');
                          setShowCategoryDropdown(false);
                          setCategorySearch('');
                        }}
                      >
                        All Categories
                      </button>
                      {filteredCategories.map(category => (
                        <button
                          key={category.id}
                          className={`w-full text-left px-3 py-1.5 text-xs ${getThemeStyle(theme, 'text', 'primary')} hover:${getThemeStyle(theme, 'background', 'accent')}`}
                          onClick={() => {
                            setCategoryFilter(category.name);
                            setShowCategoryDropdown(false);
                            setCategorySearch('');
                          }}
                        >
                          {category.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex flex-row items-stretch sm:items-center gap-2">
                <button
                  onClick={() => setShowAddProduct(true)}
                  className="w-full sm:w-auto inline-flex items-center justify-center px-3 py-1.5 rounded-md text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Product
                </button>
                <Link
                  to="/dashboard/categories"
                  className="w-full sm:w-auto inline-flex items-center justify-center px-3 py-1.5 border border-transparent rounded-lg shadow-sm text-xs font-medium text-white bg-green-600 hover:bg-green-700 transition-colors duration-200"
                >
                  <FolderTree className="h-4 w-4 mr-2" />
                  Manage Categories
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Products List */}
        <div className={`${getThemeStyle(theme, 'background', 'primary')} rounded-lg overflow-hidden px-4`}>
          {filteredProducts.length === 0 ? (
            <div className={`p-4 text-center text-xs ${getThemeStyle(theme, 'text', 'muted')}`}>
              No products found.
            </div>
          ) : isMobile ? (
            // Mobile Table View
            <div className="overflow-x-auto">
              <table className={`min-w-full ${getThemeStyle(theme, 'background', 'primary')}`}>
                <thead>
                  <tr className={`border-b ${getThemeStyle(theme, 'border', 'primary')}`}>
                    <th className={`px-2 py-1.5 text-left text-xs font-medium ${getThemeStyle(theme, 'text', 'muted')}`}>
                      Product
                    </th>
                    <th className={`px-2 py-1.5 text-left text-xs font-medium ${getThemeStyle(theme, 'text', 'muted')}`}>
                      Category
                    </th>
                    <th className={`px-2 py-1.5 text-left text-xs font-medium ${getThemeStyle(theme, 'text', 'muted')}`}>
                      Stock
                    </th>
                    <th className={`px-2 py-1.5 text-left text-xs font-medium ${getThemeStyle(theme, 'text', 'muted')}`}>
                      Price
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-opacity-2">
                  {filteredProducts.map((product) => (
                    <tr
                      key={product.id}
                      className={`hover:bg-gray-300 dark:hover:bg-gray-800 transition-colors duration-150 cursor-pointer`}
                      onClick={() => handleProductClick(product)}
                    >
                      <td className="px-2 py-1.5">
                        <div className="flex items-center gap-1.5">
                          <div className={`h-6 w-6 hidden xs:flex rounded-md ${getThemeStyle(theme, 'background', 'accent')} flex items-center justify-center overflow-hidden`}>
                            {product.image_url ? (
                              <img
                                src={product.image_url}
                                alt={product.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Package className={`h-3 w-3 ${getThemeStyle(theme, 'text', 'muted')}`} />
                            )}
                          </div>
                          <span className={`text-xs font-medium ${getThemeStyle(theme, 'text', 'primary')} truncate max-w-[80px]`}>
                            {product.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-2 py-1.5">
                        <span className={`px-1.5 py-0.5 text-xs rounded-md ${getThemeStyle(theme, 'background', 'accent')} ${getThemeStyle(theme, 'text', 'secondary')}`}>
                          {product.category}
                        </span>
                      </td>
                      <td className="px-2 py-1.5">
                        <div className="flex items-center gap-1">
                          <span className={`text-xs font-medium ${product.stock_quantity <= product.reorder_point
                              ? 'text-red-500'
                              : getThemeStyle(theme, 'text', 'primary')
                            }`}>
                            {product.stock_quantity}
                          </span>
                          {/* {product.stock_quantity <= product.reorder_point ? (
                            <span className="text-xs text-red-500">• Low</span>
                          ) : (
                            <span className="text-xs text-green-500">• High</span>
                          )} */}
                        </div>
                      </td>
                      <td className={`px-2 py-1.5 text-xs ${getThemeStyle(theme, 'text', 'primary')}`}>
                        {currencySymbol} {product.unit_price.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            // Desktop Table View
            <table className={`min-w-full ${getThemeStyle(theme, 'background', 'primary')}`}>
              <thead>
                <tr className={`border-b ${getThemeStyle(theme, 'border', 'primary')}`}>
                  <th className={`px-4 py-2 text-left text-xs font-medium ${getThemeStyle(theme, 'text', 'muted')}`}>
                    Product name
                  </th>
                  <th className={`px-4 py-2 text-left text-xs font-medium ${getThemeStyle(theme, 'text', 'muted')}`}>
                    Category
                  </th>
                  <th className={`px-4 py-2 text-left text-xs font-medium ${getThemeStyle(theme, 'text', 'muted')}`}>
                    Current Stock
                  </th>
                  <th className={`px-4 py-2 text-left text-xs font-medium ${getThemeStyle(theme, 'text', 'muted')}`}>
                    Unit Price
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-opacity-2">
                {filteredProducts.map((product) => (
                  <tr
                    key={product.id}
                    className={`hover:bg-gray-300 dark:hover:bg-gray-800 transition-colors duration-150 cursor-pointer`}
                    onClick={() => handleProductClick(product)}
                  >
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <div className={`h-8 w-8 rounded-md ${getThemeStyle(theme, 'background', 'accent')} flex items-center justify-center overflow-hidden`}>
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Package className={`h-4 w-4 ${getThemeStyle(theme, 'text', 'muted')}`} />
                          )}
                        </div>
                        <span className={`text-xs font-medium ${getThemeStyle(theme, 'text', 'primary')}`}>
                          {product.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 text-xs rounded-md ${getThemeStyle(theme, 'background', 'accent')} ${getThemeStyle(theme, 'text', 'secondary')}`}>
                        {product.category}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium ${product.stock_quantity <= product.reorder_point
                            ? 'text-red-500'
                            : getThemeStyle(theme, 'text', 'primary')
                          }`}>
                          {product.stock_quantity} {product.stock_quantity === 1 ? 'unit' : 'units'}
                        </span>
                        {product.stock_quantity <= product.reorder_point ? (
                          <span className="text-xs text-red-500">• Low</span>
                        ) : (
                          <span className="text-xs text-green-500">• High</span>
                        )}
                      </div>
                    </td>
                    <td className={`px-4 py-2 text-xs ${getThemeStyle(theme, 'text', 'primary')}`}>
                      {currencySymbol} {product.unit_price.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Right Panel - Product Statistics */}
      <div className={`w-full lg:w-[300px] ${getThemeStyle(theme, 'background', 'primary')} rounded-lg p-4 space-y-4`}>
        <h3 className={`text-sm font-medium ${getThemeStyle(theme, 'text', 'primary')}`}>Product Statistics</h3>

        {/* Stats content remains the same but with adjusted text sizes */}
        <div className={`p-3 rounded-lg ${getThemeStyle(theme, 'background', 'accent')}`}>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span className={`text-xs font-medium ${getThemeStyle(theme, 'text', 'primary')}`}>
              {productStats.lowStockCount} Products Low on Stock
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <div className={`p-3 rounded-lg ${getThemeStyle(theme, 'background', 'accent')}`}>
            <div className="flex items-center gap-2">
              <Package className="h-3.5 w-3.5 text-blue-500" />
              <span className={`text-xs ${getThemeStyle(theme, 'text', 'secondary')}`}>Total Products</span>
            </div>
            <p className={`text-sm font-medium mt-1 ${getThemeStyle(theme, 'text', 'primary')}`}>
              {productStats.totalProducts}
            </p>
          </div>

          <div className={`p-3 rounded-lg ${getThemeStyle(theme, 'background', 'accent')}`}>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5 text-green-500" />
              <span className={`text-xs ${getThemeStyle(theme, 'text', 'secondary')}`}>Total Inventory Value</span>
            </div>
            <p className={`text-sm font-medium mt-1 ${getThemeStyle(theme, 'text', 'primary')}`}>
              {currencySymbol}{productStats.totalValue.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Category Distribution Chart - remains mostly the same */}
        <div className={`p-3 rounded-lg ${getThemeStyle(theme, 'background', 'accent')}`}>
          <div className="flex items-center gap-2 mb-3">
            <BarChart2 className="h-3.5 w-3.5 text-purple-500" />
            <span className={`text-xs ${getThemeStyle(theme, 'text', 'secondary')}`}>Category Distribution</span>
          </div>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={productStats.categoryDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {productStats.categoryDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Product Details Modal */}
      {selectedProduct && (
        <div className="fixed inset-y-0 right-0 z-50 w-[85vw] sm:w-[350px] bg-white dark:bg-gray-800 shadow-xl">
          <ProductDetailsModal
            product={selectedProduct}
            onClose={handleCloseProductDetails}
            onUpdate={loadProducts}
          />
        </div>
      )}

      {/* Add Product Modal */}
      {showAddProduct && (
        <div className="fixed inset-y-0 right-0 z-50 w-[500px] bg-white dark:bg-gray-800 shadow-xl">
          <CreateProductForm
            onClose={() => setShowAddProduct(false)}
            onSuccess={loadProducts}
          />
        </div>
      )}
    </div>
  );
} 