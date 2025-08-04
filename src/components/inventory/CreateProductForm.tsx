import React, { useState, useEffect } from 'react';
import { X, Loader2, Plus, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useUI } from '../../context/UIContext';
import { useTheme } from '../../context/ThemeContext';

interface CreateProductFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateProductForm({ onClose, onSuccess }: CreateProductFormProps) {
  const { organization } = useAuthStore();
  const { addToast } = useUI();
  const { theme, getThemeStyle } = useTheme();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingCategories, setExistingCategories] = useState<string[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    unit_price: '',
    stock_quantity: '',
    reorder_point: ''
  });

  useEffect(() => {
    if (!organization) return;
    loadExistingCategories();
  }, [organization]);

  const loadExistingCategories = async () => {
    if (!organization?.id) return;

    try {
      const { data, error } = await supabase
        .from('categories')
        .select('name')
        .eq('organization_id', organization.id)
        .order('name');

      if (error) throw error;

      setExistingCategories(data?.map(category => category.name) || []);
    } catch (error) {
      console.error('Error loading categories:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to load categories'
      });
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
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
      const fileName = `${Date.now()}.${fileExt}`;
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

  const handleSubmit = async () => {
    if (!organization) return;

    const numericPrice = parseFloat(formData.unit_price);
    const numericQuantity = parseInt(formData.stock_quantity);
    const numericReorderPoint = parseInt(formData.reorder_point);

    if (isNaN(numericPrice) || numericPrice < 0) {
      addToast({
        type: 'error',
        title: 'Invalid Price',
        message: 'Please enter a valid unit price'
      });
      return;
    }

    if (isNaN(numericQuantity) || numericQuantity < 0) {
      addToast({
        type: 'error',
        title: 'Invalid Quantity',
        message: 'Please enter a valid stock quantity'
      });
      return;
    }

    if (isNaN(numericReorderPoint) || numericReorderPoint < 0) {
      addToast({
        type: 'error',
        title: 'Invalid Reorder Point',
        message: 'Please enter a valid reorder point'
      });
      return;
    }

    if (!formData.category) {
      addToast({
        type: 'error',
        title: 'Invalid Category',
        message: 'Please select or enter a category'
      });
      return;
    }

    if (!formData.name.trim()) {
      addToast({
        type: 'error',
        title: 'Invalid Name',
        message: 'Please enter a product name'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      let imageUrl = null;
      if (imageFile) {
        imageUrl = await uploadImage();
      }

      const { error } = await supabase
        .from('products')
        .insert([{
          organization_id: organization.id,
          name: formData.name.trim(),
          category: formData.category.trim(),
          description: formData.description.trim() || null,
          unit_price: numericPrice,
          stock_quantity: numericQuantity,
          reorder_point: numericReorderPoint,
          image_url: imageUrl
        }]);

      if (error) throw error;

      addToast({
        type: 'success',
        title: 'Product Created',
        message: 'Product has been created successfully'
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating product:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to create product'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className={`flex justify-between items-center p-4 border-b ${getThemeStyle(theme, 'border', 'primary')}`}>
        <h3 className={`text-sm font-medium ${getThemeStyle(theme, 'text', 'primary')}`}>Create Product</h3>
        <button
          type="button"
          onClick={onClose}
          className={`${getThemeStyle(theme, 'text', 'muted')} hover:${getThemeStyle(theme, 'text', 'primary')}`}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          <div>
            <label className={`block text-xs font-medium ${getThemeStyle(theme, 'text', 'secondary')}`}>
              Product Image
            </label>
            <div className="mt-1 flex items-center space-x-4">
              <div className={`w-24 h-24 border-2 border-dashed rounded-lg flex items-center justify-center ${getThemeStyle(theme, 'border', 'primary')} ${imagePreview ? 'border-none' : ''}`}>
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover rounded-lg" />
                ) : (
                  <ImageIcon className={`w-8 h-8 ${getThemeStyle(theme, 'text', 'muted')}`} />
                )}
              </div>
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  id="product-image"
                />
                <label
                  htmlFor="product-image"
                  className={`inline-flex items-center px-3 py-1.5 border border-transparent rounded-md text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer`}
                >
                  {imagePreview ? 'Change Image' : 'Upload Image'}
                </label>
              </div>
            </div>
          </div>

          <div>
            <label className={`block text-xs font-medium ${getThemeStyle(theme, 'text', 'secondary')}`}>
              Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className={`mt-1 block w-full rounded-md border ${getThemeStyle(theme, 'border', 'primary')} py-1.5 px-2 text-xs ${getThemeStyle(theme, 'text', 'primary')} ${getThemeStyle(theme, 'background', 'primary')} focus:ring-1 focus:ring-blue-500 focus:border-blue-500`}
            />
          </div>

          <div>
            <label className={`block text-xs font-medium ${getThemeStyle(theme, 'text', 'secondary')}`}>
              Category *
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              className={`mt-1 block w-full rounded-md border ${getThemeStyle(theme, 'border', 'primary')} py-1.5 px-2 text-xs ${getThemeStyle(theme, 'text', 'primary')} ${getThemeStyle(theme, 'background', 'primary')} focus:ring-1 focus:ring-blue-500 focus:border-blue-500`}
            >
              <option value="">Select a category</option>
              {existingCategories.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={`block text-xs font-medium ${getThemeStyle(theme, 'text', 'secondary')}`}>
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className={`mt-1 block w-full rounded-md border ${getThemeStyle(theme, 'border', 'primary')} py-1.5 px-2 text-xs ${getThemeStyle(theme, 'text', 'primary')} ${getThemeStyle(theme, 'background', 'primary')} focus:ring-1 focus:ring-blue-500 focus:border-blue-500`}
            />
          </div>

          <div>
            <label className={`block text-xs font-medium ${getThemeStyle(theme, 'text', 'secondary')}`}>
              Unit Price *
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.unit_price}
              onChange={(e) => setFormData(prev => ({ ...prev, unit_price: e.target.value }))}
              className={`mt-1 block w-full rounded-md border ${getThemeStyle(theme, 'border', 'primary')} py-1.5 px-2 text-xs ${getThemeStyle(theme, 'text', 'primary')} ${getThemeStyle(theme, 'background', 'primary')} focus:ring-1 focus:ring-blue-500 focus:border-blue-500`}
            />
          </div>

          <div>
            <label className={`block text-xs font-medium ${getThemeStyle(theme, 'text', 'secondary')}`}>
              Stock Quantity *
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={formData.stock_quantity}
              onChange={(e) => setFormData(prev => ({ ...prev, stock_quantity: e.target.value }))}
              className={`mt-1 block w-full rounded-md border ${getThemeStyle(theme, 'border', 'primary')} py-1.5 px-2 text-xs ${getThemeStyle(theme, 'text', 'primary')} ${getThemeStyle(theme, 'background', 'primary')} focus:ring-1 focus:ring-blue-500 focus:border-blue-500`}
            />
          </div>

          <div>
            <label className={`block text-xs font-medium ${getThemeStyle(theme, 'text', 'secondary')}`}>
              Reorder Point *
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={formData.reorder_point}
              onChange={(e) => setFormData(prev => ({ ...prev, reorder_point: e.target.value }))}
              className={`mt-1 block w-full rounded-md border ${getThemeStyle(theme, 'border', 'primary')} py-1.5 px-2 text-xs ${getThemeStyle(theme, 'text', 'primary')} ${getThemeStyle(theme, 'background', 'primary')} focus:ring-1 focus:ring-blue-500 focus:border-blue-500`}
            />
          </div>
        </div>
      </div>

      <div className={`flex justify-end gap-2 p-4 border-t ${getThemeStyle(theme, 'border', 'primary')}`}>
        <button
          type="button"
          onClick={onClose}
          className={`px-3 py-1.5 text-xs font-medium ${getThemeStyle(theme, 'text', 'primary')} hover:${getThemeStyle(theme, 'text', 'secondary')}`}
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-400"
        >
          {isSubmitting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            'Create Product'
          )}
        </button>
      </div>
    </div>
  );
} 