import React, { useState, useRef, useEffect } from 'react';
import { ShoppingCart, CreditCard, DollarSign, ChevronDown } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import CreateOrderForm from '../orders/CreateOrderForm';
import CreateSalesOrderForm from '../inventory/CreateSalesOrderForm';

interface QuickActionsProps {
  onRecordPayment: () => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({ onRecordPayment }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateOrderForm, setShowCreateOrderForm] = useState(false);
  const [showCreateSaleForm, setShowCreateSaleForm] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const orderFormRef = useRef<HTMLDivElement>(null);
  const saleFormRef = useRef<HTMLDivElement>(null);
  const { theme, getThemeStyle } = useTheme();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
      if (orderFormRef.current && !orderFormRef.current.contains(event.target as Node)) {
        setShowCreateOrderForm(false);
      }
      if (saleFormRef.current && !saleFormRef.current.contains(event.target as Node)) {
        setShowCreateSaleForm(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCreateOrder = () => {
    setIsOpen(false);
    setShowCreateOrderForm(true);
  };

  const handleCreateSale = () => {
    setIsOpen(false);
    setShowCreateSaleForm(true);
  };

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`inline-flex items-center px-3 py-1.5 border ${getThemeStyle(theme, 'border', 'primary')} shadow-sm text-xs font-medium rounded-md ${getThemeStyle(theme, 'text', 'secondary')} ${getThemeStyle(theme, 'background', 'primary')} ${getThemeStyle(theme, 'interactive', 'hover', 'background')} focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-blue-500 transition-colors duration-200`}
        >
          Quick Actions
          <ChevronDown className="ml-1.5 h-3.5 w-3.5" />
        </button>

        {isOpen && (
          <div className={`origin-top-right absolute right-0 mt-1 w-48 rounded-md shadow-sm ${getThemeStyle(theme, 'sidebar', 'shadow')} ${getThemeStyle(theme, 'background', 'primary')} ring-1 ring-black ring-opacity-5 z-10`}>
            <div className="py-1" role="menu" aria-orientation="vertical">
              <button
                onClick={handleCreateOrder}
                className={`flex items-center w-full px-3 py-2 text-xs ${getThemeStyle(theme, 'text', 'secondary')} ${getThemeStyle(theme, 'interactive', 'hover', 'background')} transition-colors duration-200`}
                role="menuitem"
              >
                <ShoppingCart className="h-3.5 w-3.5 mr-2 text-indigo-500" />
                Create Order
              </button>
              <button
                onClick={handleCreateSale}
                className={`flex items-center w-full px-3 py-2 text-xs ${getThemeStyle(theme, 'text', 'secondary')} ${getThemeStyle(theme, 'interactive', 'hover', 'background')} transition-colors duration-200`}
                role="menuitem"
              >
                <CreditCard className="h-3.5 w-3.5 mr-2 text-emerald-500" />
                Create Sale
              </button>
              <button
                onClick={() => {
                  setIsOpen(false);
                  onRecordPayment();
                }}
                className={`flex items-center w-full px-3 py-2 text-xs ${getThemeStyle(theme, 'text', 'secondary')} ${getThemeStyle(theme, 'interactive', 'hover', 'background')} transition-colors duration-200`}
                role="menuitem"
              >
                <DollarSign className="h-3.5 w-3.5 mr-2 text-blue-500" />
                Record Payment
              </button>
            </div>
          </div>
        )}
      </div>

      {showCreateOrderForm && (
        <div 
          ref={orderFormRef}
          className={`fixed right-0 top-0 h-screen w-[90vw] sm:w-[450px] overflow-y-auto ${getThemeStyle(theme, 'background', 'primary')} shadow-lg z-50`}
        >
          <CreateOrderForm
            onClose={() => setShowCreateOrderForm(false)}
            onSuccess={() => setShowCreateOrderForm(false)}
          />
        </div>
      )}

      {showCreateSaleForm && (
        <div 
          ref={saleFormRef}
          className={`fixed right-0 top-0 h-screen w-[90vw] sm:w-[450px] overflow-y-auto ${getThemeStyle(theme, 'background', 'primary')} shadow-lg z-50`}
        >
          <CreateSalesOrderForm
            onClose={() => setShowCreateSaleForm(false)}
            onSuccess={() => setShowCreateSaleForm(false)}
          />
        </div>
      )}
    </>
  );
}; 