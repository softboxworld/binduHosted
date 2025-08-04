import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useUI } from '../../context/UIContext';
import { useTheme } from '../../context/ThemeContext';
import { getThemeStyle } from '../../config/theme';
import { CURRENCIES } from '../../utils/constants';
import { format } from 'date-fns';
import { 
  ArrowLeft, Calendar, User, Package, CreditCard,
  FileText, DollarSign, Trash2, X
} from 'lucide-react';
import { RecordPayment } from '../common/RecordPayment';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS } from '../../utils/inventory-constants';

interface Payment {
  id: string;
  amount: number;
  payment_method: string;
  transaction_reference: string;
  created_at: string;
  recorded_by: string;
  status: string;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancellation_reason: string | null;
}

interface SalesOrderItem {
  id: string;
  product_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  is_custom_item: boolean;
  product?: {
    id: string;
    name: string;
    stock_quantity: number;
  };
}

interface SalesOrder {
  id: string;
  order_number: string;
  client: {
    name: string;
  };
  notes: string;
  total_amount: number;
  outstanding_balance: number;
  payment_status: 'unpaid' | 'partially_paid' | 'paid' | 'cancelled';
  status: 'active' | 'cancelled';
  created_at: string;
  items: SalesOrderItem[];
  payments: Payment[];
}

export default function SalesOrderDetails() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<SalesOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelPaymentModalOpen, setIsCancelPaymentModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const { organization } = useAuthStore();
  const { addToast } = useUI();
  const { theme } = useTheme();
  const currencySymbol = organization?.currency ? CURRENCIES[organization.currency]?.symbol || organization.currency : CURRENCIES['USD'].symbol;

  useEffect(() => {
    if (!id) return;
    loadOrderDetails();
  }, [id]);

  const loadOrderDetails = async () => {
    try {
      // First get the order details
      const { data: orderData, error: orderError } = await supabase
        .from('sales_orders')
        .select(`
          *,
          client:clients(name),
          items:sales_order_items(
            id,
            product_id,
            name,
            quantity,
            unit_price,
            total_price,
            is_custom_item,
            product:products(
              id,
              name,
              stock_quantity
            )
          )
        `)
        .eq('id', id)
        .single();

      if (orderError) throw orderError;

      // Then get the payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .eq('reference_type', 'sales_order')
        .eq('reference_id', id);

      if (paymentsError) throw paymentsError;

      // Combine the data
      setOrder({
        ...orderData,
        payments: paymentsData || []
      } as SalesOrder);
    } catch (error) {
      console.error('Error loading order:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to load order details'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    try {
      // Update order status to cancelled
      const { error: orderError } = await supabase
        .from('sales_orders')
        .update({ 
          status: 'cancelled',
          payment_status: 'cancelled'
        })
        .eq('id', orderId);

      if (orderError) throw orderError;

      // Update all associated payments to cancelled status
      const { error: paymentsError } = await supabase
        .from('payments')
        .update({ 
          status: 'cancelled'
        })
        .eq('reference_type', 'sales_order')
        .eq('reference_id', orderId);

      if (paymentsError) throw paymentsError;

      addToast({
        type: 'success',
        title: 'Order Cancelled',
        message: 'The order and all associated payments have been cancelled successfully.'
      });
      
      // Refresh the order details
      await loadOrderDetails();
    } catch (error) {
      console.error('Error cancelling order:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to cancel order. Please try again.'
      });
    }
  };

  const handleCancelPayment = async (paymentId: string, reason: string) => {
    try {
      // Start a transaction to update both payment and order
      const { error: paymentError } = await supabase
        .from('payments')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancelled_by: organization?.id || null,
          cancellation_reason: reason
        })
        .eq('id', paymentId);

      if (paymentError) throw paymentError;

      // Get the payment amount before updating
      const { data: payment, error: getPaymentError } = await supabase
        .from('payments')
        .select('amount')
        .eq('id', paymentId)
        .single();

      if (getPaymentError) throw getPaymentError;

      // Update the order's outstanding balance
      const { error: orderError } = await supabase
        .from('sales_orders')
        .update({
          outstanding_balance: order!.outstanding_balance + payment.amount
        })
        .eq('id', order!.id);

      if (orderError) throw orderError;

      // Refresh the order details
      await loadOrderDetails();

      addToast({
        type: 'success',
        title: 'Payment Cancelled',
        message: 'The payment has been cancelled successfully and the outstanding balance has been updated.'
      });

      setIsCancelPaymentModalOpen(false);
      setSelectedPayment(null);
      setCancellationReason('');
    } catch (error) {
      console.error('Error cancelling payment:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to cancel the payment'
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className={`${getThemeStyle(theme, 'text', 'muted')}`}>Order not found.</p>
        <Link
          to="/dashboard/sales"
          className={`mt-4 inline-flex items-center ${getThemeStyle(theme, 'text', 'accent')} ${getThemeStyle(theme, 'interactive', 'hover', 'text')}`}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Sales Orders
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            to="/dashboard/sales"
            className={`${getThemeStyle(theme, 'text', 'muted')} ${getThemeStyle(theme, 'interactive', 'hover', 'text')}`}
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h2 className={`text-xl font-semibold ${order.status === 'cancelled' ? 'text-gray-400 line-through' : getThemeStyle(theme, 'text', 'primary')}`}>
              Order {order.order_number}
            </h2>
            <p className={`text-sm ${getThemeStyle(theme, 'text', 'muted')} mt-0.5`}>
              Created on {format(new Date(order.created_at), 'MMM d, yyyy HH:mm')}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Client Info */}
          <div className={`${getThemeStyle(theme, 'background', 'secondary')} rounded-lg overflow-hidden ${order.status === 'cancelled' ? 'opacity-75' : ''}`}>
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className={`text-sm font-medium ${getThemeStyle(theme, 'text', 'primary')}`}>Client Information</h3>
            </div>
            <div className="p-4">
              <div className="flex items-center space-x-3">
                <User className={`h-4 w-4 ${getThemeStyle(theme, 'text', 'muted')}`} />
                <span className={`text-sm font-medium ${getThemeStyle(theme, 'text', 'primary')} ${order.status === 'cancelled' ? 'line-through text-gray-400' : ''}`}>
                  {order.client.name}
                </span>
              </div>
            </div>
          </div>

          {/* Items */}
          <div className={`${getThemeStyle(theme, 'background', 'secondary')} rounded-lg overflow-hidden ${order.status === 'cancelled' ? 'opacity-75' : ''}`}>
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className={`text-sm font-medium ${getThemeStyle(theme, 'text', 'primary')}`}>Order Items</h3>
            </div>
            <div className="p-4">
              <div className="space-y-2">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-3 ${getThemeStyle(theme, 'background', 'primary')} rounded-md ${order.status === 'cancelled' ? 'line-through text-gray-400' : ''}`}
                  >
                    <div className="flex items-center space-x-3">
                      <Package className={`h-4 w-4 ${getThemeStyle(theme, 'text', 'muted')}`} />
                      <div>
                        <p className={`text-sm font-medium ${getThemeStyle(theme, 'text', 'primary')}`}>
                          {item.name}
                        </p>
                        <p className={`text-xs ${getThemeStyle(theme, 'text', 'muted')}`}>
                          Quantity: {item.quantity} × {currencySymbol} {item.unit_price.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div className={`text-sm font-medium ${getThemeStyle(theme, 'text', 'primary')}`}>
                      {currencySymbol} {item.total_price.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-between text-sm">
                  <span className={`font-medium ${getThemeStyle(theme, 'text', 'primary')}`}>Total Amount</span>
                  <span className={`font-bold ${order.status === 'cancelled' ? 'line-through text-gray-400' : getThemeStyle(theme, 'text', 'primary')}`}>
                    {currencySymbol} {order.total_amount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div className={`${getThemeStyle(theme, 'background', 'secondary')} rounded-lg overflow-hidden ${order.status === 'cancelled' ? 'opacity-75' : ''}`}>
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <h3 className={`text-sm font-medium ${getThemeStyle(theme, 'text', 'primary')}`}>Notes</h3>
              </div>
              <div className="p-4">
                <p className={`text-sm ${getThemeStyle(theme, 'text', 'muted')} ${order.status === 'cancelled' ? 'line-through text-gray-400' : ''}`}>{order.notes}</p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Payment Details */}
          <div className={`${getThemeStyle(theme, 'background', 'secondary')} rounded-lg overflow-hidden ${order.status === 'cancelled' ? 'opacity-75' : ''}`}>
            <div className={`py-4 ${getThemeStyle(theme, 'border', 'primary')}`}>
              <div className="flex items-center justify-between px-4">
                <h3 className={`text-base font-semibold ${getThemeStyle(theme, 'text', 'primary')} flex items-center`}>
                  <DollarSign className={`h-5 w-5 mr-2 ${getThemeStyle(theme, 'text', 'muted')}`} />
                  Payment Details | &nbsp; <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                    ${order.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                      order.payment_status === 'partially_paid' ? 'bg-yellow-100 text-yellow-800' :
                      order.payment_status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-red-100 text-red-800'}`}>
                    {order.payment_status === 'paid' ? 'Paid' :
                     order.payment_status === 'partially_paid' ? 'Partially Paid' :
                     order.payment_status === 'cancelled' ? 'Cancelled' :
                     'Unpaid'}
                  </span>
                </h3>
              </div>
            </div>
            <div className="p-4">
              <div className="space-y-4">
                {/* Payment Summary */}
                <div className="grid grid-cols-1 gap-4">
                  <div className="border-l-4 border-blue-500 rounded-xs py-2 px-4">
                    <p className="text-xs text-blue-600 font-medium">Total Amount</p>
                    <p className={`text-lg font-bold ${order.status === 'cancelled' ? 'line-through text-gray-400' : 'text-blue-900'}`}>
                      {currencySymbol} {order.total_amount.toFixed(2)}
                    </p>
                  </div>
                  <div className="border-l-4 border-green-500 rounded-xs py-2 px-4">
                    <p className="text-xs text-green-600 font-medium">Amount Paid</p>
                    <p className={`text-lg font-bold ${order.status === 'cancelled' ? 'line-through text-gray-400' : 'text-green-900'}`}>
                      {currencySymbol} {(order.total_amount - order.outstanding_balance).toFixed(2)}
                    </p>
                  </div>
                  <div className="border-l-4 border-orange-500 rounded-xs py-2 px-4">
                    <p className="text-xs text-orange-600 font-medium">Outstanding Balance</p>
                    <p className={`text-lg font-bold ${order.status === 'cancelled' ? 'line-through text-gray-400' : 'text-orange-900'}`}>
                      {currencySymbol} {order.outstanding_balance.toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Record Payment Button */}
                {order.payment_status !== 'paid' && order.status !== 'cancelled' && (
                  <button
                    onClick={() => setShowPaymentModal(true)}
                    className="w-full inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Record Payment
                  </button>
                )}

                {/* Payment History */}
                <div>
                  <h4 className={`text-sm font-semibold ${getThemeStyle(theme, 'text', 'primary')}`}>Payment History</h4>
                  {order.payments && order.payments.length > 0 ? (
                    <div className={`divide-y ${getThemeStyle(theme, 'border', 'primary')}`}>
                      {order.payments.map(payment => (
                        <div key={payment.id} className={`py-2 px flex flex-col space-y-1 ${payment.status === 'cancelled' ? 'opacity-75' : ''}`}>
                          <div className="flex justify-between items-center">
                            <div className="flex items-center space-x-2">
                              <p className={`text-xs font-medium ${payment.status === 'cancelled' ? 'line-through text-gray-400' : getThemeStyle(theme, 'text', 'primary')}`}>
                                {currencySymbol} {payment.amount.toFixed(2)}
                              </p>
                              {payment.status === 'cancelled' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  Cancelled
                                </span>
                              )}
                            </div>
                            <p className={`text-xs ${payment.status === 'cancelled' ? 'line-through text-gray-400' : getThemeStyle(theme, 'text', 'muted')}`}>
                              {format(new Date(payment.created_at), 'MMM d, yyyy h:mm a')}
                            </p>
                          </div>
                          <div className="flex justify-between items-center">
                            <p className={`text-xs ${payment.status === 'cancelled' ? 'line-through text-gray-400' : getThemeStyle(theme, 'text', 'muted')} truncate`}>
                              {payment.payment_method} • {payment.transaction_reference}
                            </p>
                            {payment.status !== 'cancelled' && (
                              <button
                                onClick={() => {
                                  setSelectedPayment(payment);
                                  setIsCancelPaymentModalOpen(true);
                                }}
                                className="text-xs text-red-600 hover:text-red-800"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                          {payment.status === 'cancelled' && payment.cancellation_reason && (
                            <p className="text-xs text-red-600 mt-1">
                              Reason: {payment.cancellation_reason}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className={`text-xs ${getThemeStyle(theme, 'text', 'muted')} italic`}>No payments recorded yet</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Delete Order Button */}
          {order.status !== 'cancelled' && (
            <div className={`${getThemeStyle(theme, 'background', 'secondary')} rounded-lg overflow-hidden`}>
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <h3 className={`text-sm font-medium ${getThemeStyle(theme, 'text', 'primary')}`}>Danger Zone</h3>
              </div>
              <div className="p-4">
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="w-full inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Cancel Order
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <RecordPayment
          orderId={order.id}
          orderType="sales_order"
          orderNumber={order.order_number}
          clientName={order.client.name}
          outstandingBalance={order.outstanding_balance}
          onPaymentRecorded={loadOrderDetails}
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          currencySymbol={currencySymbol}
        />
      )}

      {/* Cancel Order Confirmation Modal */}
      <ConfirmationModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={() => {
          handleDeleteOrder(order.id);
          setShowCancelModal(false);
        }}
        title="Cancel Order"
        message="Are you sure you want to cancel this order? This action cannot be undone and will cancel all associated payments."
        confirmText="Yes, Cancel Order"
        cancelText="No, Keep Order"
        confirmButtonClass="bg-red-600 hover:bg-red-700"
      />

      {/* Cancel Payment Modal */}
      {isCancelPaymentModalOpen && selectedPayment && (
        <div className={`fixed inset-0 ${getThemeStyle(theme, 'modal', 'overlay')} flex items-center justify-center z-50 p-4`}>
          <div className={`${getThemeStyle(theme, 'modal', 'background')} rounded-lg p-6 max-w-md w-full mx-4`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className={`text-base font-medium ${getThemeStyle(theme, 'text', 'primary')}`}>Cancel Payment</h3>
              <button
                onClick={() => {
                  setIsCancelPaymentModalOpen(false);
                  setSelectedPayment(null);
                  setCancellationReason('');
                }}
                className={`${getThemeStyle(theme, 'text', 'accent')} hover:${getThemeStyle(theme, 'text', 'muted')}`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mb-4">
              <label htmlFor="cancellation-reason" className={`block text-xs font-medium ${getThemeStyle(theme, 'text', 'secondary')} mb-1`}>
                Reason for Cancellation
              </label>
              <textarea
                id="cancellation-reason"
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                className={`w-full px-3 py-2 border ${getThemeStyle(theme, 'border', 'primary')} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-xs`}
                rows={3}
                placeholder="Please provide a reason for cancelling this payment..."
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setIsCancelPaymentModalOpen(false);
                  setSelectedPayment(null);
                  setCancellationReason('');
                }}
                className={`px-4 py-2 text-xs font-medium ${getThemeStyle(theme, 'text', 'secondary')} ${getThemeStyle(theme, 'background', 'primary')} border ${getThemeStyle(theme, 'border', 'primary')} rounded-md ${getThemeStyle(theme, 'interactive', 'hover', 'background')} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
              >
                Cancel
              </button>
              <button
                onClick={() => handleCancelPayment(selectedPayment.id, cancellationReason)}
                disabled={!cancellationReason.trim()}
                className="px-4 py-2 text-xs font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 