import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { RecordPayment } from '../common/RecordPayment';

interface OutstandingItem {
  id: string;
  type: 'sales_order' | 'service_order';
  number: string;
  client_name: string;
  outstanding_balance: number;
  created_at: string;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentRecorded: () => void;
  outstandingItems: OutstandingItem[];
  isLoading: boolean;
  currencySymbol: string;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  onPaymentRecorded,
  outstandingItems,
  isLoading,
  currencySymbol
}) => {
  const { theme, getThemeStyle } = useTheme();
  const [selectedOrder, setSelectedOrder] = useState<{ id: string; type: 'sales_order' | 'service_order'; outstandingBalance: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredOutstandingItems = [...outstandingItems]
    .filter(item => 
      item.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 transition-opacity" aria-hidden="true">
        <div className={`absolute inset-0 ${getThemeStyle(theme, 'modal', 'overlay')}`} onClick={onClose}></div>
      </div>

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-0 sm:pl-10">
        <div className={`w-screen max-w-md ${getThemeStyle(theme, 'modal', 'background')} shadow-xl overflow-y-auto`}>
          <div className={`flex items-center justify-between px-6 py-4 border-b ${getThemeStyle(theme, 'border', 'primary')}`}>
            <h3 className={`text-lg font-medium ${getThemeStyle(theme, 'text', 'primary')}`}>Record Payment</h3>
            <button 
              onClick={onClose} 
              className={`${getThemeStyle(theme, 'text', 'muted')} ${getThemeStyle(theme, 'interactive', 'hover', 'text')}`}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {selectedOrder ? (
            <div className="p-6">
              <RecordPayment
                orderId={selectedOrder.id}
                orderType={selectedOrder.type}
                orderNumber={selectedOrder.number}
                clientName={selectedOrder.client_name}
                outstandingBalance={selectedOrder.outstanding_balance}
                onPaymentRecorded={() => {
                  setSelectedOrder(null);
                  onClose();
                  onPaymentRecorded();
                }}
                isOpen={true}
                onClose={() => setSelectedOrder(null)}
                showTriggerButton={false}
                currencySymbol={currencySymbol}
              />
            </div>
          ) : (
            <div className="p-6">
              <div className="mb-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`${getThemeStyle(theme, 'background', 'primary')} 
                  ${getThemeStyle(theme, 'text', 'primary')} block w-full rounded-md shadow-sm 
                  h-[40px] pl-3 pr-12 sm:text-sm border ${getThemeStyle(theme, 'border', 'primary')}
                  focus:border-blue-500 focus:ring-blue-500`}
                  placeholder="Search by order number or ID..."
                />
              </div>

              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : filteredOutstandingItems.length === 0 ? (
                <div className="text-center py-8">
                  <p className={getThemeStyle(theme, 'text', 'muted')}>No outstanding items found</p>
                </div>
              ) : (
                <div className="space-y">
                  {filteredOutstandingItems.map((item) => (
                    <button
                      key={`${item.type}-${item.id}`}
                      onClick={() => setSelectedOrder({
                        id: item.id,
                        type: item.type,
                        outstandingBalance: item.outstanding_balance
                      })}
                      className={`w-full text-left p-2 ${getThemeStyle(theme, 'border', 'primary')} ${getThemeStyle(theme, 'interactive', 'hover', 'background')} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className={`text-sm font-medium ${getThemeStyle(theme, 'text', 'primary')}`}>
                            {item.number}
                          </p>
                          <p className={`text-xs ${getThemeStyle(theme, 'text', 'muted')}`}>
                            {item.client_name}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-medium ${getThemeStyle(theme, 'text', 'primary')}`}>
                            {currencySymbol} {item.outstanding_balance.toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })}
                          </p>
                          <p className={`text-xs ${getThemeStyle(theme, 'text', 'muted')}`}>
                            {new Date(item.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 