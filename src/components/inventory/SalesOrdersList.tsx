import { useState, useEffect } from 'react';
import { Plus, Search, Trash2, Package, User, CreditCard, Printer, ChevronDown, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useUI } from '../../context/UIContext';
import { useTheme } from '../../context/ThemeContext';
import { SalesOrder } from '../../types/inventory';
import { PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS } from '../../utils/inventory-constants';
import { CURRENCIES } from '../../utils/constants';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addMonths, addWeeks, addYears, startOfYear, endOfYear, addDays, isAfter, getWeek, getYear } from 'date-fns';
import CreateSalesOrderForm from './CreateSalesOrderForm';
import { RecordPayment } from '../common/RecordPayment';
import { Link, useSearchParams } from 'react-router-dom';
import SalesOrderReceipt from './SalesOrderReceipt';
import DateRangeSelector, { DateFilterType } from '../common/DateRangeSelector';

type PaymentStatus = keyof typeof PAYMENT_STATUS_LABELS;

export default function SalesOrdersList() {
  const { theme, getThemeStyle } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const [allOrders, setAllOrders] = useState<SalesOrder[]>([]);
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'all'>('all');
  const [showAddOrder, setShowAddOrder] = useState(searchParams.get('showCreateForm') === 'true');
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dateFilterType, setDateFilterType] = useState<DateFilterType>('week');
  const [isMobile, setIsMobile] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const { organization } = useAuthStore();
  const { confirm, addToast } = useUI();
  const currencySymbol = organization?.currency ? CURRENCIES[organization.currency]?.symbol || organization.currency : '';

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };

    // Initial check
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.status-dropdown-container')) {
        setShowStatusDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const getDateRange = () => {
    // Create a copy of the date to avoid mutation
    const dateCopy = new Date(currentDate);
    switch (dateFilterType) {
      case 'day':
        return {
          start: new Date(new Date(dateCopy).setHours(0, 0, 0, 0)),
          end: new Date(new Date(dateCopy).setHours(23, 59, 59, 999))
        };
      case 'week':
        return {
          start: startOfWeek(dateCopy, { weekStartsOn: 1 }),
          end: endOfWeek(dateCopy, { weekStartsOn: 1 })
        };
      case 'month':
        return {
          start: startOfMonth(dateCopy),
          end: endOfMonth(dateCopy)
        };
      case 'year':
        return {
          start: startOfYear(dateCopy),
          end: endOfYear(dateCopy)
        };
    }
  };

  const { start: dateRangeStart, end: dateRangeEnd } = getDateRange();

  const handleDateChange = (direction: 'prev' | 'next') => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      switch (dateFilterType) {
        case 'day':
          return direction === 'prev' ? addDays(newDate, -1) : addDays(newDate, 1);
        case 'week':
          return direction === 'prev' ? addWeeks(newDate, -1) : addWeeks(newDate, 1);
        case 'month':
          return direction === 'prev' ? addMonths(newDate, -1) : addMonths(newDate, 1);
        case 'year':
          return direction === 'prev' ? addYears(newDate, -1) : addYears(newDate, 1);
      }
    });
  };

  const handleFilterTypeChange = (type: DateFilterType) => {
    setDateFilterType(type);
  };

  useEffect(() => {
    if (!organization) return;
    loadOrders();
  }, [organization?.id]); // Only load all orders when organization changes

  useEffect(() => {
    if (!organization) return;
    filterAllOrders();
  }, [organization, currentDate, dateFilterType, allOrders, statusFilter, searchQuery]);

  useEffect(() => {
    // Update showAddOrder when the query parameter changes
    setShowAddOrder(searchParams.get('showCreateForm') === 'true');
  }, [searchParams]);

  const filterAllOrders = () => {
    if (!allOrders.length) return;

    const filteredOrders = allOrders.filter(order => {
      // Check if search matches
      const matchesSearch = !searchQuery ||
        order.order_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.client?.name?.toLowerCase().includes(searchQuery.toLowerCase());

      // Check if status matches
      const matchesStatus = statusFilter === 'all' || order.payment_status === statusFilter;

      // If there's a search query, we ignore date range filter
      if (searchQuery) {
        return matchesSearch && matchesStatus;
      }

      // If no search query, also check date range
      const createdDate = new Date(order.created_at);
      const matchesDateRange = createdDate >= dateRangeStart && createdDate <= dateRangeEnd;

      return matchesDateRange && matchesStatus && matchesSearch;
    });

    setOrders(filteredOrders);
  };

  const loadOrders = async () => {
    if (!organization?.id) return;

    try {
      const { data, error } = await supabase
        .from('sales_orders')
        .select(`
          *,
          client:clients(name, image_url),
          items:sales_order_items(
            id,
            product_id,
            name,
            quantity,
            unit_price,
            total_price,
            is_custom_item,
            product:products(*)
          )
        `)
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAllOrders(data || []);
    } catch (error) {
      console.error('Error loading orders:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to load orders'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrintReceipt = (order: SalesOrder) => {
    setSelectedOrder(order);
    setShowReceipt(true);
  };

  // Update to use the input directly to update searchQuery which triggers filtering
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // The useEffect will handle filtering
  };

  // Get status label with count
  const getStatusLabelWithCount = (status: PaymentStatus | 'all') => {
    if (status === 'all') {
      return `All (${orders.length})`;
    }
    return `${PAYMENT_STATUS_LABELS[status]} (${orders.filter(order => order.payment_status === status).length})`;
  };

  // Get initials for avatar
  const getInitials = (name: string) => {
    if (!name) return '';
    const names = name.split(' ');
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return (names[0].charAt(0) + names[1].charAt(0)).toUpperCase();
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-blue-500', 'bg-pink-500', 'bg-purple-500',
      'bg-green-500', 'bg-yellow-500', 'bg-red-500',
      'bg-indigo-500', 'bg-teal-500'
    ];

    if (!name) return colors[0];

    // Simple hash function to determine color
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={`space-y p-4 min-h-screen ${getThemeStyle(theme, 'background', 'primary')}`}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <h1 className={`text-xl sm:text-2xl font-medium ${getThemeStyle(theme, 'text', 'primary')}`}>Sales Orders</h1>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">

          <div className="relative w-full sm:w-auto sm:ml-2">
            <div className={`flex items-center px-3 py-1.5 border rounded-lg ${getThemeStyle(theme, 'border', 'primary')} ${getThemeStyle(theme, 'background', 'primary')}`}>
              <Search className={`h-4 w-4 ${getThemeStyle(theme, 'text', 'accent')}`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search orders..."
                className={`ml-2 flex-1 outline-none text-sm ${getThemeStyle(theme, 'background', 'primary')} ${getThemeStyle(theme, 'text', 'primary')}`}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <button
              onClick={() => setShowAddOrder(true)}
              className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200 flex-1 sm:flex-none"
            >
              <Plus className="h-4 w-4 mr-1" />
              Create
            </button>
          </div>
        </div>
      </div>

      <div className={`${getThemeStyle(theme, 'background', 'primary')} rounded-lg overflow-hidden`}>
        <div className="px-4 py-3 space-y-3">
          {/* Date Range Selector */}
          <div className="flex items-center justify-center sm:justify-between">
            <DateRangeSelector
              currentDate={currentDate}
              dateFilterType={dateFilterType}
              onDateChange={handleDateChange}
              onFilterTypeChange={handleFilterTypeChange}
              itemCount={orders.length}
              itemLabel="orders"
            />
          </div>

          {/* Status Filters - Mobile Dropdown / Desktop Tabs */}
          <div className={`border-b ${getThemeStyle(theme, 'border', 'primary')} -mb-3`}>
            {/* Mobile Dropdown */}
            <div className="block sm:hidden status-dropdown-container">
              <button
                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                className={`flex items-center justify-between w-full px-3 py-2 border rounded-md ${getThemeStyle(theme, 'background', 'secondary')} ${getThemeStyle(theme, 'border', 'primary')}`}
              >
                <span className={`text-sm font-medium ${getThemeStyle(theme, 'text', 'primary')}`}>
                  {getStatusLabelWithCount(statusFilter)}
                </span>
                <ChevronDown className={`h-4 w-4 ${getThemeStyle(theme, 'text', 'muted')} transition-transform ${showStatusDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showStatusDropdown && (
                <div className={`absolute z-10 mt-1 w-full rounded-md shadow-lg ${getThemeStyle(theme, 'background', 'secondary')} ${getThemeStyle(theme, 'border', 'primary')} border`}>
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setStatusFilter('all');
                        setShowStatusDropdown(false);
                      }}
                      className={`block w-full text-left px-3 py-2 text-sm ${statusFilter === 'all' ? 'bg-blue-50 text-blue-700' : getThemeStyle(theme, 'text', 'primary')}`}
                    >
                      All ({orders.length})
                    </button>
                    {(Object.entries(PAYMENT_STATUS_LABELS) as [PaymentStatus, string][]).map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => {
                          setStatusFilter(key);
                          setShowStatusDropdown(false);
                        }}
                        className={`block w-full text-left px-3 py-2 text-sm ${statusFilter === key ? 'bg-blue-50 text-blue-700' : getThemeStyle(theme, 'text', 'primary')}`}
                      >
                        {label} ({orders.filter(order => order.payment_status === key).length})
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Desktop Tabs */}
            <nav className="hidden sm:flex -mb-px space-x-2" aria-label="Tabs">
              <button
                onClick={() => setStatusFilter('all')}
                className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-xs ${statusFilter === 'all'
                  ? 'border-blue-500 text-blue-600'
                  : `border-transparent ${getThemeStyle(theme, 'text', 'muted')} hover:text-gray-900 dark:hover:text-gray-100 hover:border-gray-300`
                  }`}
              >
                All
                <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${statusFilter === 'all' ? 'bg-blue-100 text-blue-800' : `${getThemeStyle(theme, 'background', 'accent')} ${getThemeStyle(theme, 'text', 'tertiary')}`
                  }`}>
                  {orders.length}
                </span>
              </button>
              {(Object.entries(PAYMENT_STATUS_LABELS) as [PaymentStatus, string][]).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setStatusFilter(key)}
                  className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-xs ${statusFilter === key
                    ? 'border-blue-500 text-blue-600'
                    : `border-transparent ${getThemeStyle(theme, 'text', 'muted')} hover:text-gray-900 dark:hover:text-gray-100 hover:border-gray-300`
                    }`}
                >
                  {label}
                  <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${statusFilter === key ? 'bg-blue-100 text-blue-800' : `${getThemeStyle(theme, 'background', 'accent')} ${getThemeStyle(theme, 'text', 'tertiary')}`
                    }`}>
                    {orders.filter(order => order.payment_status === key).length}
                  </span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        <div className="overflow-x-auto px-4 py-2">
          {orders.length === 0 ? (
            <div className={`text-center ${getThemeStyle(theme, 'text', 'muted')} py-6`}>
              {searchQuery || statusFilter !== 'all'
                ? 'No orders found matching your search.'
                : 'No orders created yet. Start by creating a new order.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {orders.map(order => (
                <Link
                  key={order.id}
                  to={`/dashboard/sales/${order.id}`}
                  className="block"
                >
                  <div
                    className={`h-full border-l-4 border rounded-lg overflow-hidden hover:bg-gray-100 dark:hover:bg-gray-700 transition-shadow ${order.payment_status === 'unpaid' ? 'border-l-red-500' :
                      order.payment_status === 'partially_paid' ? 'border-l-orange-500' :
                        order.payment_status === 'cancelled' ? 'border-l-gray-500' :
                          'border-l-green-500'
                      } ${getThemeStyle(theme, 'border', 'secondary')}`}
                  >
                    <div className={`px-4 py-2 ${order.payment_status === 'cancelled' ? 'line-through' : ''}`}>
                      {/* Header: Client + Order Number */}
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 mr-3">
                            {order.client?.image_url ? (
                              <img
                                src={order.client.image_url}
                                alt={order.client?.name || 'Client'}
                                className="h-8 w-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className={`h-8 w-8 rounded-full flex items-center justify-center ${getAvatarColor(order.client?.name || '')} text-white font-medium`}>
                                {getInitials(order.client?.name || '')}
                              </div>
                            )}
                          </div>
                          <div>
                            <h3 className={`text-base font-semibold ${getThemeStyle(theme, 'text', 'primary')}`}>
                              {order.client?.name || 'Unknown Client'}
                            </h3>
                            <p className={`text-xs ${getThemeStyle(theme, 'text', 'muted')}`}>
                              {order.items && order.items.length > 0
                                ? (order.items[0]?.name || 'Unknown Item') + (order.items.length > 1 ? ` (+${order.items.length - 1})` : '')
                                : 'No items'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-blue-600">
                            {order.order_number}
                          </span>

                          <div className="flex space-x-2">
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handlePrintReceipt(order);
                              }}
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                              title="Print Receipt"
                            >
                              <Printer className="h-4 w-4" />
                            </button>
                            {order.payment_status !== 'paid' && order.payment_status !== 'cancelled' && (
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setSelectedOrder(order);
                                  setShowPaymentForm(true);
                                }}
                                className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                                title="Record Payment"
                              >
                                <CreditCard className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Middle section: Date and Status */}
                      <div className={`flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 border-t border-b ${getThemeStyle(theme, 'border', 'primary')}`}>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="h-3.5 w-3.5" />
                          <span>Created: {format(new Date(order.created_at), 'MMM d, yyyy')}</span>
                        </div>

                        <span className={`inline-flex mt-[4px] items-center px-2.5 py-0.5 rounded-full w-fit text-xs font-medium ${PAYMENT_STATUS_COLORS[order.payment_status].bg
                          } ${PAYMENT_STATUS_COLORS[order.payment_status].text
                          }`}>
                          {PAYMENT_STATUS_LABELS[order.payment_status]}
                        </span>
                      </div>

                      {/* Footer: Items and Payment Info */}
                      <div className="flex justify-between sm:items-start pt-2">
                        <div className="mb-2 sm:mb-0 max-w-[60%]">
                          <div className="space-y-1">
                            {order.items?.slice(0, 2).map(item => (
                              <div key={item.id} className="flex items-center text-xs">

                                {item?.image_url ? (
                                  <img
                                    src={item.image_url}
                                    alt={item?.name || 'Product'}
                                    className="h-[20px] w-[20px] mr-1.5 rounded-full object-cover"
                                  />
                                ) : (
                                  <Package className={`h-3.5 w-3.5 ${getThemeStyle(theme, 'text', 'accent')} mr-1.5`} />
                                )}
                                <span className={getThemeStyle(theme, 'text', 'primary')}>{item.name}</span>
                                <span className={`ml-1.5 ${getThemeStyle(theme, 'text', 'muted')}`}>
                                  × {item.quantity}
                                </span>
                              </div>
                            ))}
                            {order.items && order.items.length > 2 && (
                              <div className={`text-xs ${getThemeStyle(theme, 'text', 'muted')}`}>
                                +{order.items.length - 2} more items
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Payment Info */}
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className={`text-sm font-medium ${getThemeStyle(theme, 'text', 'primary')}`}>
                              {currencySymbol} {order.total_amount.toFixed(2)}
                            </div>
                            <div className={`text-xs ${order.payment_status === 'paid'
                              ? 'text-green-600'
                              : order.payment_status === 'partially_paid'
                                ? 'text-red-600'
                                : order.payment_status === 'cancelled'
                                  ? 'text-gray-600'
                                  : 'text-red-600'
                              }`}>
                              {currencySymbol} {order.outstanding_balance.toFixed(2)}
                              <span className={`ml-1 hidden sm:block ${getThemeStyle(theme, 'text', 'tertiary')} text-xs`}>
                                {order.payment_status === 'paid'
                                  ? '(Paid)'
                                  : order.payment_status === 'partially_paid'
                                    ? '(Outstanding)'
                                    : order.payment_status === 'cancelled'
                                      ? '(Cancelled)'
                                      : '(Unpaid)'}
                              </span>
                            </div>
                          </div>

                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {showAddOrder && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className={`fixed inset-0 ${getThemeStyle(theme, 'modal', 'overlay')} transition-opacity`} onClick={() => {
              setShowAddOrder(false);
              searchParams.delete('showCreateForm');
              setSearchParams(searchParams);
            }} />
            <div className="fixed inset-y-0 right-0 flex max-w-full pl-10 pointer-events-none">
              <div className={`pointer-events-auto w-screen max-w-[450px] transform transition ease-in-out duration-300 ${showAddOrder ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className={`h-full ${getThemeStyle(theme, 'modal', 'background')} shadow-xl`}>
                  <CreateSalesOrderForm
                    onClose={() => {
                      setShowAddOrder(false);
                      searchParams.delete('showCreateForm');
                      setSearchParams(searchParams);
                    }}
                    onSuccess={loadOrders}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPaymentForm && selectedOrder && (
        <RecordPayment
          orderId={selectedOrder.id}
          orderNumber={selectedOrder.order_number}
          clientName={selectedOrder.client?.name}
          outstandingBalance={selectedOrder.outstanding_balance}
          onPaymentRecorded={loadOrders}
          isOpen={showPaymentForm}
          onClose={() => {
            setShowPaymentForm(false);
            setSelectedOrder(null);
          }}
          currencySymbol={currencySymbol}
          orderType="sales_order"
        />
      )}

      {showReceipt && selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div
              className={`fixed inset-0 ${getThemeStyle(theme, 'modal', 'overlay')} transition-opacity`}
              onClick={() => {
                setShowReceipt(false);
                setSelectedOrder(null);
              }}
            />
            <div className={`relative transform overflow-hidden rounded-xl ${getThemeStyle(theme, 'modal', 'background')} text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg`}>
              <SalesOrderReceipt
                orderId={selectedOrder.id}
                onClose={() => {
                  setShowReceipt(false);
                  setSelectedOrder(null);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 