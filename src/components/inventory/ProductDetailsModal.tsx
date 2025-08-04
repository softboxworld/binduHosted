import { useState, useEffect } from 'react';
import { X, Edit2, Save, Image as ImageIcon, Package, Tag, DollarSign, AlertTriangle, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useUI } from '../../context/UIContext';
import { useTheme } from '../../context/ThemeContext';
import { Product } from '../../types/inventory';
import { CURRENCIES } from '../../utils/constants';

interface Category {
  id: number;
  name: string;
  organization_id: string;
}

interface ProductDetailsModalProps {
  product: Product;
  onClose: () => void;
  onUpdate: () => void;
}

export default function ProductDetailsModal({ product, onClose, onUpdate }: ProductDetailsModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedProduct, setEditedProduct] = useState<Product>({ ...product });
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(product.image_url || null);
  
  const { organization } = useAuthStore();
  const { addToast } = useUI();
  const { theme, getThemeStyle } = useTheme();
  const currencySymbol = organization?.currency ? CURRENCIES[organization.currency]?.symbol || organization.currency : '';

  useEffect(() => {
    loadCategories();
  }, [organization]);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const updatedProduct = {
      ...editedProduct,
      [name]: name === 'unit_price' || name === 'reorder_point' || name === 'stock_quantity' 
        ? parseFloat(value) 
        : value
    };
    
    setEditedProduct(updatedProduct);
    
    // Update the product in the parent component for real-time display
    if (isEditing) {
      onUpdate();
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async () => {
    if (!imageFile || !organization?.id) return null;
    
    try {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${product.id}-${Date.now()}.${fileExt}`;
      const filePath = `products/${organization.id}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, imageFile);
        
      if (uploadError) {
        console.error('Error uploading image:', uploadError);
        addToast({
          type: 'error',
          title: 'Error',
          message: 'Failed to upload image'
        });
        return null;
      }
      
      const { data } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);
        
      return data.publicUrl;
    } catch (error) {
      console.error('Error in image upload process:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to process image upload'
      });
      return null;
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    
    try {
      let imageUrl = editedProduct.image_url;
      
      // Upload new image if selected
      if (imageFile) {
        const uploadedImageUrl = await uploadImage();
        if (uploadedImageUrl) {
          imageUrl = uploadedImageUrl;
        } else {
          // If image upload failed, keep the existing image URL
          addToast({
            type: 'warning',
            title: 'Warning',
            message: 'Failed to upload new image. Keeping existing image.'
          });
        }
      }
      
      const { error } = await supabase
        .from('products')
        .update({
          ...editedProduct,
          image_url: imageUrl
        })
        .eq('id', product.id);
        
      if (error) throw error;
      
      addToast({
        type: 'success',
        title: 'Product Updated',
        message: 'Product has been updated successfully.'
      });
      
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating product:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to update product'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    
    try {
      // Delete the product from the database
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', product.id);
        
      if (error) throw error;
      
      // If the product has an image, delete it from storage
      if (product.image_url) {
        try {
          const imagePath = product.image_url.split('/').pop();
          if (imagePath) {
            await supabase.storage
              .from('product-images')
              .remove([`products/${organization?.id}/${imagePath}`]);
          }
        } catch (storageError) {
          console.error('Error deleting product image:', storageError);
          // Continue with the deletion process even if image deletion fails
        }
      }
      
      addToast({
        type: 'success',
        title: 'Product Deleted',
        message: 'Product has been deleted successfully.'
      });
      
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error deleting product:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to delete product'
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className={`h-full flex flex-col ${getThemeStyle(theme, 'background', 'primary')}`}>
      {/* Header */}
      <div className={`flex justify-between items-center p-4 border-b ${getThemeStyle(theme, 'border', 'primary')}`}>
        <h2 className={`text-sm font-medium ${getThemeStyle(theme, 'text', 'primary')}`}>
          Product Details
        </h2>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
            >
              <Save className="h-3.5 w-3.5 mr-1" />
              Save
            </button>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
            >
              <Edit2 className="h-3.5 w-3.5 mr-1" />
              Edit
            </button>
          )}
          <button
            onClick={onClose}
            className={`p-1.5 rounded-md ${getThemeStyle(theme, 'background', 'accent')} ${getThemeStyle(theme, 'text', 'muted')} hover:${getThemeStyle(theme, 'text', 'primary')}`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-6">
          {/* Product Image */}
          <div className="flex flex-col">
            <div className={`h-32 w-32 rounded-lg ${getThemeStyle(theme, 'background', 'accent')} flex items-center justify-center overflow-hidden mb-2`}>
              {imagePreview ? (
                <img 
                  src={imagePreview} 
                  alt={product.name} 
                  className="h-full w-full object-cover"
                />
              ) : (
                <ImageIcon className={`h-12 w-12 ${getThemeStyle(theme, 'text', 'muted')}`} />
              )}
            </div>
            {isEditing && (
              <div className="mt-2">
                <label className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200 cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  Change Image
                </label>
              </div>
            )}
          </div>
          
          {/* Product Information */}
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className={`block text-xs font-medium mb-1 ${getThemeStyle(theme, 'text', 'muted')}`}>
                Product Name
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="name"
                  value={editedProduct.name}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 rounded-md border text-sm ${getThemeStyle(theme, 'border', 'primary')} ${getThemeStyle(theme, 'background', 'primary')} ${getThemeStyle(theme, 'text', 'primary')}`}
                />
              ) : (
                <p className={`text-sm ${getThemeStyle(theme, 'text', 'primary')}`}>{editedProduct.name}</p>
              )}
            </div>
            
            {/* Description */}
            <div>
              <label className={`block text-xs font-medium mb-1 ${getThemeStyle(theme, 'text', 'muted')}`}>
                Description
              </label>
              {isEditing ? (
                <textarea
                  name="description"
                  value={editedProduct.description || ''}
                  onChange={handleInputChange}
                  rows={3}
                  className={`w-full px-3 py-2 rounded-md border text-sm ${getThemeStyle(theme, 'border', 'primary')} ${getThemeStyle(theme, 'background', 'primary')} ${getThemeStyle(theme, 'text', 'primary')}`}
                />
              ) : (
                <p className={`text-sm ${getThemeStyle(theme, 'text', 'primary')}`}>
                  {editedProduct.description || 'No description provided'}
                </p>
              )}
            </div>
            
            {/* Category */}
            <div>
              <label className={`block text-xs font-medium mb-1 ${getThemeStyle(theme, 'text', 'muted')}`}>
                Category
              </label>
              {isEditing ? (
                <select
                  name="category"
                  value={editedProduct.category}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 rounded-md border text-sm ${getThemeStyle(theme, 'border', 'primary')} ${getThemeStyle(theme, 'background', 'primary')} ${getThemeStyle(theme, 'text', 'primary')}`}
                >
                  {categories.map(category => (
                    <option key={category.id} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>
              ) : (
                <p className={`text-sm ${getThemeStyle(theme, 'text', 'primary')}`}>{editedProduct.category}</p>
              )}
            </div>
            
            {/* Stock Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-xs font-medium mb-1 ${getThemeStyle(theme, 'text', 'muted')}`}>
                  Current Stock
                </label>
                {isEditing ? (
                  <input
                    type="number"
                    name="stock_quantity"
                    value={editedProduct.stock_quantity}
                    onChange={handleInputChange}
                    min="0"
                    className={`w-full px-3 py-2 rounded-md border text-sm ${getThemeStyle(theme, 'border', 'primary')} ${getThemeStyle(theme, 'background', 'primary')} ${getThemeStyle(theme, 'text', 'primary')}`}
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <Package className={`h-4 w-4 ${editedProduct.stock_quantity <= editedProduct.reorder_point ? 'text-red-500' : 'text-green-500'}`} />
                    <p className={`text-sm font-medium ${
                      editedProduct.stock_quantity <= editedProduct.reorder_point
                        ? 'text-red-500'
                        : getThemeStyle(theme, 'text', 'primary')
                    }`}>
                      {editedProduct.stock_quantity} units
                    </p>
                  </div>
                )}
              </div>
              
              <div>
                <label className={`block text-xs font-medium mb-1 ${getThemeStyle(theme, 'text', 'muted')}`}>
                  Reorder Point
                </label>
                {isEditing ? (
                  <input
                    type="number"
                    name="reorder_point"
                    value={editedProduct.reorder_point}
                    onChange={handleInputChange}
                    min="0"
                    className={`w-full px-3 py-2 rounded-md border text-sm ${getThemeStyle(theme, 'border', 'primary')} ${getThemeStyle(theme, 'background', 'primary')} ${getThemeStyle(theme, 'text', 'primary')}`}
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={`h-4 w-4 ${getThemeStyle(theme, 'text', 'muted')}`} />
                    <p className={`text-sm ${getThemeStyle(theme, 'text', 'primary')}`}>
                      {editedProduct.reorder_point} units
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Price */}
            <div>
              <label className={`block text-xs font-medium mb-1 ${getThemeStyle(theme, 'text', 'muted')}`}>
                Unit Price
              </label>
              {isEditing ? (
                <div className="relative">
                  <span className={`absolute left-3 top-2 ${getThemeStyle(theme, 'text', 'muted')}`}>
                    {currencySymbol}
                  </span>
                  <input
                    type="number"
                    name="unit_price"
                    value={editedProduct.unit_price}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    className={`w-full pl-8 pr-3 py-2 rounded-md border text-sm ${getThemeStyle(theme, 'border', 'primary')} ${getThemeStyle(theme, 'background', 'primary')} ${getThemeStyle(theme, 'text', 'primary')}`}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <DollarSign className={`h-4 w-4 ${getThemeStyle(theme, 'text', 'muted')}`} />
                  <p className={`text-sm ${getThemeStyle(theme, 'text', 'primary')}`}>
                    {currencySymbol} {editedProduct.unit_price.toFixed(2)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Delete Button Area */}
      <div className={`p-4 border-t ${getThemeStyle(theme, 'border', 'primary')}`}>
        {showDeleteConfirm ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className={`text-sm font-medium ${getThemeStyle(theme, 'text', 'primary')}`}>
                Confirm Deletion
              </p>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className={`p-1 rounded-md ${getThemeStyle(theme, 'background', 'accent')} ${getThemeStyle(theme, 'text', 'muted')} hover:${getThemeStyle(theme, 'text', 'primary')}`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className={`text-sm ${getThemeStyle(theme, 'text', 'primary')}`}>
              Are you sure you want to delete this product? This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium text-white bg-red-600 hover:bg-red-700 transition-colors duration-200"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 transition-colors duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors duration-200"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Delete Product
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 