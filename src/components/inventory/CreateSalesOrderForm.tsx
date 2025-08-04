import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, Loader2, Package, CreditCard, ChevronDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useUI } from '../../context/UIContext';
import { Product } from '../../types/inventory';
import { CURRENCIES } from '../../utils/constants';
import { Client } from '../../types/clients';
import { useTheme } from '../../context/ThemeContext';
import SalesOrderReceipt from './SalesOrderReceipt';
import { PAYMENT_METHODS } from '../../utils/inventory-constants';
import ClientSelector from '../common/ClientSelector';

interface OrderItem {
  product_id: string | null;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  is_custom_item: boolean;
  product?: Product;
}

interface CreateSalesOrderFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateSalesOrderForm({ onClose, onSuccess }: CreateSalesOrderFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [customItem, setCustomItem] = useState({
    name: '',
    quantity: 1,
    unit_price: 0
  });
  const [notes, setNotes] = useState('');
  const { organization } = useAuthStore();
  const { addToast } = useUI();
  const { theme, getThemeStyle } = useTheme();
  const currencySymbol = organization?.currency ? CURRENCIES[organization.currency]?.symbol || organization.currency : '';
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [showPaymentSection, setShowPaymentSection] = useState(true);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    if (organization) {
      loadProducts();
    }
  }, [organization]);

  useEffect(() => {
    if (productSearch.trim() === '') {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter(product => 
        product.name.toLowerCase().includes(productSearch.toLowerCase())
      );
      setFilteredProducts(filtered);
    }
  }, [productSearch, products]);

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
      setIsLoadingProducts(false);
    }
  };

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    setProductSearch(product.name);
    setShowProductDropdown(false);
    handleAddProduct(product.id);
  };

  const handleAddProduct = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    if (product.stock_quantity <= 0) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'This product is out of stock'
      });
      return;
    }

    const existingItem = orderItems.find(item => item.product_id === productId);
    if (existingItem) {
      if (existingItem.quantity >= product.stock_quantity) {
        addToast({
          type: 'error',
          title: 'Error',
          message: 'Not enough stock available'
        });
        return;
      }

      setOrderItems(prev => prev.map(item =>
        item.product_id === productId
          ? {
            ...item,
            quantity: item.quantity + 1,
            total_price: (item.quantity + 1) * item.unit_price
          }
          : item
      ));
    } else {
      setOrderItems(prev => [...prev, {
        product_id: product.id,
        name: product.name,
        quantity: 1,
        unit_price: product.unit_price,
        total_price: product.unit_price,
        is_custom_item: false,
        product
      }]);
    }
    
    // Clear the selected product after adding
    setSelectedProduct(null);
    setProductSearch('');
  };

  const handleAddCustomItem = () => {
    if (!customItem.name.trim() || customItem.quantity <= 0 || customItem.unit_price <= 0) return;

    setOrderItems(prev => [...prev, {
      product_id: null,
      name: customItem.name.trim(),
      quantity: customItem.quantity,
      unit_price: customItem.unit_price,
      total_price: customItem.quantity * customItem.unit_price,
      is_custom_item: true
    }]);

    setCustomItem({
      name: '',
      quantity: 1,
      unit_price: 0
    });
  };

  const handleRemoveItem = (index: number) => {
    setOrderItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateQuantity = (index: number, quantity: number) => {
    const item = orderItems[index];
    if (!item) return;

    if (!item.is_custom_item && item.product && quantity > item.product.stock_quantity) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Not enough stock available'
      });
      return;
    }

    if (quantity <= 0) {
      handleRemoveItem(index);
      return;
    }

    setOrderItems(prev => prev.map((item, i) =>
      i === index
        ? {
          ...item,
          quantity,
          total_price: quantity * item.unit_price
        }
        : item
    ));
  };

  const getTotalAmount = () => {
    return orderItems.reduce((sum, item) => sum + item.total_price, 0);
  };

  const getOutstandingAmount = () => {
    const total = getTotalAmount();
    const paid = parseFloat(paymentAmount) || 0;
    console.log(total, paid);
    return total - paid;
  };

  const getOutstandingColor = () => {
    const outstanding = getOutstandingAmount();
    const total = getTotalAmount();
    const percentage = (outstanding / total) * 100;
    
    if (percentage === 0) return 'bg-green-100 text-green-800';
    if (percentage <= 25) return 'bg-yellow-100 text-yellow-800';
    if (percentage <= 50) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  const handleCreateOrder = async () => {
    if (!organization || !selectedClient || orderItems.length === 0) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Please select a client and add at least one item to the order'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Create sales order
      const { data: orderData, error: orderError } = await supabase
        .from('sales_orders')
        .insert([{
          organization_id: organization.id,
          client_id: selectedClient.id,
          total_amount: getTotalAmount(),
          outstanding_balance: getTotalAmount(),
          notes: notes.trim() || null
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const { error: itemsError } = await supabase
        .from('sales_order_items')
        .insert(orderItems.map(item => ({
          sales_order_id: orderData.id,
          product_id: item.product_id,
          name: item.name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          is_custom_item: item.is_custom_item
        })));

      if (itemsError) throw itemsError;

      // Deduct inventory stock for each product
      for (const item of orderItems) {
        if (!item.is_custom_item && item.product_id && item.product) {
          const { error: stockError } = await supabase
            .from('products')
            .update({ stock_quantity: item.product.stock_quantity - item.quantity })
            .eq('id', item.product_id);

          if (stockError) throw stockError;
        }
      }

      // Handle initial payment if provided
      if (showPaymentSection && paymentAmount && paymentMethod) {
        const numericAmount = parseFloat(paymentAmount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
          throw new Error('Invalid payment amount');
        }

        if (numericAmount > getTotalAmount()) {
          throw new Error('Payment amount cannot exceed total amount');
        }

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) throw new Error('User not authenticated');

        const { error: paymentError } = await supabase.rpc('record_payment', {
          p_organization_id: organization.id,
          p_order_id: orderData.id,
          p_amount: numericAmount,
          p_payment_method: paymentMethod,
          p_payment_reference: paymentReference || null,
          p_recorded_by: user.id
        });

        if (paymentError) throw paymentError;
      }

      addToast({
        type: 'success',
        title: 'Order Created',
        message: 'Sales order has been created successfully.'
      });

      // Show the receipt
      setCreatedOrderId(orderData.id);
      setShowReceipt(true);
      
      onSuccess();
    } catch (error) {
      console.error('Error creating order:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to create order'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingProducts) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col ${getThemeStyle(theme, 'modal', 'background')} max-w-[450px] mx-auto  overflow-y-auto`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${getThemeStyle(theme, 'border', 'primary')}`}>
        <div className="flex items-center gap-2">
          <h2 className={`text-lg font-semibold ${getThemeStyle(theme, 'text', 'primary')}`}>Create Sales Order</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className={`p-1.5 rounded-full ${getThemeStyle(theme, 'interactive', 'hover', 'background')} ${getThemeStyle(theme, 'text', 'accent')} ${getThemeStyle(theme, 'interactive', 'hover', 'text')} transition-colors`}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1">
        <div className="p-4 space-y-6">
          {/* Client Selection Section */}
          <ClientSelector
            onClientSelect={setSelectedClient}
            selectedClient={selectedClient}
            showAddNew={true}
          />

          {/* Products Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className={`text-sm font-medium ${getThemeStyle(theme, 'text', 'secondary')}`}>Order Items</h3>
            </div>

            {/* Add Items Section */}
            <div className="grid grid-cols-1 gap-3">
              {/* Inventory Items */}
              <div className={`${getThemeStyle(theme, 'background', 'secondary')} rounded-lg p-3`}>
                <h4 className={`text-sm font-medium ${getThemeStyle(theme, 'text', 'secondary')} mb-2`}>Add from Inventory</h4>
                <div className="relative">
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => {
                      setProductSearch(e.target.value);
                      setShowProductDropdown(true);
                    }}
                    onFocus={() => setShowProductDropdown(true)}
                    placeholder="Search for a product"
                    className={`w-full rounded-lg border ${getThemeStyle(theme, 'border', 'primary')} ${getThemeStyle(theme, 'background', 'secondary')} px-3 py-2 text-sm ${getThemeStyle(theme, 'text', 'primary')} shadow-sm hover:border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors`}
                  />
                  {selectedProduct && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProduct(null);
                        setProductSearch('');
                      }}
                      className="absolute right-10 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  </div>
                  {showProductDropdown && filteredProducts.length > 0 && (
                    <div className={`absolute z-10 mt-1 w-full rounded-lg shadow-lg ${getThemeStyle(theme, 'background', 'secondary')} border ${getThemeStyle(theme, 'border', 'primary')} max-h-60 overflow-auto`}>
                      {filteredProducts.map(product => (
                        <div
                          key={product.id}
                          onClick={() => handleProductSelect(product)}
                          className={`px-3 py-2 text-sm cursor-pointer ${getThemeStyle(theme, 'text', 'primary')} hover:bg-blue-50 hover:text-blue-700 transition-colors ${product.stock_quantity <= 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <div className="flex justify-between">
                            <span>{product.name}</span>
                            <span className="text-xs">
                              {currencySymbol}{product.unit_price.toFixed(2)} ({product.stock_quantity} in stock)
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Custom Item */}
              <div className={`${getThemeStyle(theme, 'background', 'secondary')} rounded-lg p-3`}>
                <h4 className={`text-sm font-medium ${getThemeStyle(theme, 'text', 'secondary')} mb-2`}>Add Custom Item</h4>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={customItem.name}
                    onChange={(e) => setCustomItem(prev => ({ ...prev, name: e.target.value }))}
                    className={`w-full rounded-lg border ${getThemeStyle(theme, 'border', 'primary')} ${getThemeStyle(theme, 'background', 'secondary')} px-3 py-2 text-sm ${getThemeStyle(theme, 'text', 'primary')} placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors`}
                    placeholder="Item name"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      min="1"
                      value={customItem.quantity}
                      onChange={(e) => setCustomItem(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                      className={`w-full rounded-lg border ${getThemeStyle(theme, 'border', 'primary')} ${getThemeStyle(theme, 'background', 'secondary')} px-3 py-2 text-sm ${getThemeStyle(theme, 'text', 'primary')} focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors`}
                      placeholder="Quantity"
                    />
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className={`text-sm ${getThemeStyle(theme, 'text', 'muted')}`}>{currencySymbol}</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={customItem.unit_price}
                        onChange={(e) => setCustomItem(prev => ({ ...prev, unit_price: parseFloat(e.target.value) || 0 }))}
                        className={`w-full rounded-lg border ${getThemeStyle(theme, 'border', 'primary')} ${getThemeStyle(theme, 'background', 'secondary')} pl-7 pr-3 py-2 text-sm ${getThemeStyle(theme, 'text', 'primary')} focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors`}
                        placeholder="Price"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddCustomItem}
                    disabled={!customItem.name.trim() || customItem.quantity <= 0 || customItem.unit_price <= 0}
                    className={`bg-blue-600 w-full inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
                  >
                    Add Custom Item
                  </button>
                </div>
              </div>
            </div>

            {/* Order Items List */}
            {orderItems.length > 0 && (
              <div className={`border ${getThemeStyle(theme, 'border', 'primary')} rounded-lg overflow-hidden`}>
                <div className={`divide-y ${getThemeStyle(theme, 'border', 'primary')}`}>
                  {orderItems.map((item, index) => (
                    <div key={index} className={`p-3 ${getThemeStyle(theme, 'interactive', 'hover', 'background')} transition-colors`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1">
                          <Package className={`h-4 w-4 ${getThemeStyle(theme, 'text', 'accent')}`} />
                          <div>
                            <h4 className={`text-sm font-medium ${getThemeStyle(theme, 'text', 'primary')}`}>{item.name}</h4>
                            <p className={`text-xs ${getThemeStyle(theme, 'text', 'muted')}`}>
                              {currencySymbol}{item.unit_price.toFixed(2)} per unit
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(index, item.quantity - 1)}
                              className={`p-1 rounded-full ${getThemeStyle(theme, 'interactive', 'hover', 'background')} transition-colors`}
                            >
                              <Minus className="h-3 w-3 text-gray-500" />
                            </button>
                            <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(index, item.quantity + 1)}
                              className={`p-1 rounded-full ${getThemeStyle(theme, 'interactive', 'hover', 'background')} transition-colors`}
                              disabled={!item.is_custom_item && item.product && item.quantity >= item.product.stock_quantity}
                            >
                              <Plus className="h-3 w-3 text-gray-500" />
                            </button>
                          </div>
                          <div className="w-20 text-right">
                            <div className={`text-sm font-medium ${getThemeStyle(theme, 'text', 'primary')}`}>
                              {currencySymbol}{item.total_price.toFixed(2)}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className={`p-1 rounded-full ${getThemeStyle(theme, 'interactive', 'hover', 'background')} ${getThemeStyle(theme, 'text', 'accent')} ${getThemeStyle(theme, 'interactive', 'hover', 'text')} transition-colors`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className={`${getThemeStyle(theme, 'background', 'secondary')} px-3 py-2 flex justify-between items-center`}>
                  <span className={`text-sm font-medium ${getThemeStyle(theme, 'text', 'secondary')}`}>Total Amount</span>
                  <span className={`text-base font-semibold ${getThemeStyle(theme, 'text', 'primary')}`}>
                    {currencySymbol}{getTotalAmount().toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Notes Section */}
          <div className="space-y-2">
            <label className={`block text-sm font-medium ${getThemeStyle(theme, 'text', 'secondary')}`}>
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className={`w-full rounded-lg border ${getThemeStyle(theme, 'border', 'primary')} ${getThemeStyle(theme, 'background', 'secondary')} px-3 py-2 text-sm ${getThemeStyle(theme, 'text', 'primary')} placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors`}
              placeholder="Add any notes about this order"
            />
          </div>

          {/* Payment Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CreditCard className={`h-4 w-4 ${getThemeStyle(theme, 'text', 'accent')}`} />
              <h3 className={`text-sm font-medium ${getThemeStyle(theme, 'text', 'secondary')}`}>Initial Payment</h3>
            </div>

            <div className={`space-y-3 ${getThemeStyle(theme, 'background', 'secondary')} rounded-lg p-3`}>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className={`block text-sm font-medium ${getThemeStyle(theme, 'text', 'secondary')} mb-1.5`}>
                    Payment Amount
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className={`text-sm ${getThemeStyle(theme, 'text', 'muted')}`}>{currencySymbol}</span>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={getTotalAmount()}
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className={`w-full rounded-lg border ${getThemeStyle(theme, 'border', 'primary')} ${getThemeStyle(theme, 'background', 'secondary')} pl-7 pr-3 py-2 text-sm ${getThemeStyle(theme, 'text', 'primary')} focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors`}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-medium ${getThemeStyle(theme, 'text', 'secondary')} mb-1.5`}>
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className={`w-full rounded-lg border ${getThemeStyle(theme, 'border', 'primary')} ${getThemeStyle(theme, 'background', 'secondary')} px-3 py-2 text-sm ${getThemeStyle(theme, 'text', 'primary')} focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors`}
                  >
                    <option value="">Select a payment method</option>
                    {Object.entries(PAYMENT_METHODS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium ${getThemeStyle(theme, 'text', 'secondary')} mb-1.5`}>
                  Payment Reference
                </label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  className={`w-full rounded-lg border ${getThemeStyle(theme, 'border', 'primary')} ${getThemeStyle(theme, 'background', 'secondary')} px-3 py-2 text-sm ${getThemeStyle(theme, 'text', 'primary')} focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors`}
                  placeholder="e.g., Transaction ID, Check number"
                />
              </div>

              {/* Outstanding Amount Indicator */}
              <div className={`mt-2 p-2 rounded-lg ${getOutstandingColor()}`}>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Outstanding Amount</span>
                  <span className="text-sm font-semibold">
                    {currencySymbol}{getOutstandingAmount().toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className={`border-t ${getThemeStyle(theme, 'border', 'primary')} ${getThemeStyle(theme, 'background', 'secondary')} px-4 py-3`}>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className={`px-3 py-2 text-sm font-medium ${getThemeStyle(theme, 'text', 'secondary')} ${getThemeStyle(theme, 'interactive', 'hover', 'text')} ${getThemeStyle(theme, 'interactive', 'hover', 'background')} rounded-lg transition-colors`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreateOrder}
            disabled={isSubmitting || !selectedClient || orderItems.length === 0}
            className="inline-flex items-center px-3 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin h-4 w-4 mr-2" />
                Creating...
              </>
            ) : (
              'Create Sale'
            )}
          </button>
        </div>
      </div>

      {/* Receipt Modal */}
      {showReceipt && createdOrderId && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div 
              className={`fixed inset-0 ${getThemeStyle(theme, 'modal', 'overlay')} transition-opacity`}
              onClick={() => {
                setShowReceipt(false);
                setCreatedOrderId(null);
                onClose();
              }} 
            />
            <div className={`relative transform overflow-hidden rounded-xl ${getThemeStyle(theme, 'modal', 'background')} text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg`}>
              <SalesOrderReceipt 
                orderId={createdOrderId} 
                onClose={() => {
                  setShowReceipt(false);
                  setCreatedOrderId(null);
                  onClose();
                }} 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 