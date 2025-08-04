import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Calendar, User, Package, ChevronLeft, ChevronRight, MessageSquare, Paperclip, MoreHorizontal, FolderTree, ChevronDown, Printer, CreditCard } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useUI } from '../../context/UIContext';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import CreateOrderForm from './CreateOrderForm';
import { format, startOfWeek, endOfWeek, getWeek, getYear, isAfter, startOfMonth, endOfMonth, addMonths, addWeeks, addYears, startOfYear, endOfYear, addDays } from 'date-fns';
import { CURRENCIES, ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from '../../utils/constants';
import { useTheme } from '../../context/ThemeContext';
import DateRangeSelector, { DateFilterType } from '../common/DateRangeSelector';
import OrderReceipt from './OrderReceipt';
import { RecordPayment } from '../common/RecordPayment';

interface Order {
  id: string;
  order_number: string;
  client_id: string;
  description: string | null;
  due_date: string | null;
  status: keyof typeof ORDER_STATUS_COLORS;
  total_amount: number;
  outstanding_balance: number;
  payment_status: 'unpaid' | 'partially_paid' | 'paid';
  created_at: string;
  client: {
    name: string;
    image_url?: string;
  };
  workers: {
    id: string;
    worker_id: string;
    worker: {
      name: string;
      image?: string;
    };
    project_id: string;
    project: {
      name: string;
    };
    status: string;
  }[];
  services: {
    id: string;
    service_id: string;
    service: {
      name: string;
    };
    quantity: number;
    cost: number;
  }[];
}

export default function OrdersList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<keyof typeof ORDER_STATUS_COLORS | 'all'>('all');
  const [showAddOrder, setShowAddOrder] = useState(searchParams.get('showCreateForm') === 'true');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dateFilterType, setDateFilterType] = useState<'day' | 'week' | 'month' | 'year'>('week');
  const [isMobile, setIsMobile] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  
  const { organization } = useAuthStore();
  const { confirm, addToast } = useUI();
  const { theme, getThemeStyle } = useTheme();
  const navigate = useNavigate();
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

  // Calculate date range based on filter type
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

  useEffect(() => {
    if (!organization) return;
    filterallOrders();
  }, [organization, currentDate, dateFilterType, allOrders, statusFilter, searchQuery]);

  // Add an immediate load when component mounts
  useEffect(() => {
    if (organization) {
      loadOrders();
    }
  }, [organization?.id]); // Only depend on organization ID

  useEffect(() => {
    // Update showAddOrder when the query parameter changes
    setShowAddOrder(searchParams.get('showCreateForm') === 'true');
  }, [searchParams]);

  const filterallOrders = () => {
    const filteredOrders = allOrders.filter(order => {
      // Check if search matches
      const matchesSearch = !searchQuery || 
        order.order_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.client?.name?.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Check if status matches
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      
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
  }

  const loadOrders = async () => {
    if (!organization?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          client:clients(name, image_url),
          workers:order_workers(
            id,
            worker_id,
            worker:workers(name, image),
            project_id,
            project:worker_projects(name),
            status
          ),
          services:order_services(
            id,
            service_id,
            service:services(name),
            quantity,
            cost
          ),
          outstanding_balance,
          payment_status
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

  const handleDateChange = (direction: 'prev' | 'next') => {
    setStatusFilter('all');
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

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // We'll let the effect handle the filtering
  }

  const handleFilterTypeChange = (type: DateFilterType) => {
    setStatusFilter('all');
    setDateFilterType(type);
  };

  // Use orders directly rather than filtering again
  const filteredOrders = orders;

  // Add a function to handle closing the form
  const handleCloseForm = () => {
    setShowAddOrder(false);
    // Remove the query parameter when closing the form
    searchParams.delete('showCreateForm');
    setSearchParams(searchParams);
  };

  // Add handler functions for print receipt and make payment
  const handlePrintReceipt = (order: Order, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation to order details
    setSelectedOrder(order);
    setShowReceipt(true);
  };

  const handleMakePayment = (order: Order, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation to order details
    setSelectedOrder(order);
    setShowPaymentForm(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const getStatusCount = (status: string) => {
    return orders.filter(order => order.status === status).length;
  };

  // Get status label with count
  const getStatusLabelWithCount = (status: keyof typeof ORDER_STATUS_COLORS | 'all') => {
    if (status === 'all') {
      return `All (${orders.length})`;
    }
    return `${ORDER_STATUS_LABELS[status]} (${getStatusCount(status)})`;
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

  return (
    <div className={`min-h-screen ${getThemeStyle(theme, 'background', 'primary')}`}>
      <div className="py-4 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
          <h1 className={`text-xl sm:text-2xl font-medium ${getThemeStyle(theme, 'text', 'primary')}`}>Orders</h1>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
            
            <div className="relative w-full sm:w-auto sm:ml-2">
              <div className={`flex items-center px-3 py-1 border rounded-md focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 ${getThemeStyle(theme, 'background', 'secondary')} ${getThemeStyle(theme, 'border', 'primary')}`}>
                <Search className={`h-4 w-4 ${getThemeStyle(theme, 'text', 'muted')}`} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search orders..."
                  className={`ml-2 flex-1 outline-none bg-transparent text-sm ${getThemeStyle(theme, 'text', 'primary')}`}
                />
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <button
                onClick={() => setShowAddOrder(true)}
                className="inline-flex items-center justify-center px-2 py-1.5 border border-transparent rounded-lg shadow-sm text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200 flex-1 sm:flex-none"
              >
                <Plus className="h-4 w-4 mr-1" />
                Create
              </button>

              <Link
                to="/dashboard/orders/services"
                className="inline-flex items-center justify-center px-2 py-1.5 border border-transparent rounded-lg shadow-sm text-xs font-medium text-white bg-green-600 hover:bg-green-700 transition-colors duration-200 flex-1 sm:flex-none"
              >
                <Package className="h-4 w-4 mr-2" />
                Manage Services
              </Link>
            </div>
          </div>
        </div>

        {/* Date Range Selector - Using the new component */}
        <div className="mb-4 sm:mb-6">
          <DateRangeSelector
            currentDate={currentDate}
            dateFilterType={dateFilterType}
            onDateChange={handleDateChange}
            onFilterTypeChange={handleFilterTypeChange}
            itemCount={orders.length}
            itemLabel="orders"
          />
        </div>

        {/* Status Tabs - Mobile Dropdown / Desktop Tabs */}
        <div className={`border-b ${getThemeStyle(theme, 'border', 'primary')} mb-4 sm:mb-6`}>
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
                  <button
                    onClick={() => {
                      setStatusFilter('pending');
                      setShowStatusDropdown(false);
                    }}
                    className={`block w-full text-left px-3 py-2 text-sm ${statusFilter === 'pending' ? 'bg-blue-50 text-blue-700' : getThemeStyle(theme, 'text', 'primary')}`}
                  >
                    Pending ({getStatusCount('pending')})
                  </button>
                  <button
                    onClick={() => {
                      setStatusFilter('in_progress');
                      setShowStatusDropdown(false);
                    }}
                    className={`block w-full text-left px-3 py-2 text-sm ${statusFilter === 'in_progress' ? 'bg-blue-50 text-blue-700' : getThemeStyle(theme, 'text', 'primary')}`}
                  >
                    Working ({getStatusCount('in_progress')})
                  </button>
                  <button
                    onClick={() => {
                      setStatusFilter('completed');
                      setShowStatusDropdown(false);
                    }}
                    className={`block w-full text-left px-3 py-2 text-sm ${statusFilter === 'completed' ? 'bg-blue-50 text-blue-700' : getThemeStyle(theme, 'text', 'primary')}`}
                  >
                    Complete ({getStatusCount('completed')})
                  </button>
                  <button
                    onClick={() => {
                      setStatusFilter('cancelled');
                      setShowStatusDropdown(false);
                    }}
                    className={`block w-full text-left px-3 py-2 text-sm ${statusFilter === 'cancelled' ? 'bg-blue-50 text-blue-700' : getThemeStyle(theme, 'text', 'primary')}`}
                  >
                    Cancelled ({getStatusCount('cancelled')})
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* Desktop Tabs */}
          <nav className="hidden sm:flex -mb-px space-x-2 min-w-max pb-1 overflow-x-auto" aria-label="Tabs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`whitespace-nowrap py-2 sm:py-3 px-1 border-b-2 font-medium text-xs ${
                statusFilter === 'all'
                  ? 'border-blue-500 text-blue-600'
                  : `border-transparent ${getThemeStyle(theme, 'text', 'muted')} hover:text-gray-900 dark:hover:text-gray-100 hover:border-gray-300`
              }`}
            >
              All
              <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                statusFilter === 'all' ? 'bg-blue-100 text-blue-800' : `${getThemeStyle(theme, 'background', 'accent')} ${getThemeStyle(theme, 'text', 'tertiary')}`
              }`}>
                {orders.length}
              </span>
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`whitespace-nowrap py-2 sm:py-3 px-1 border-b-2 font-medium text-xs ${
                statusFilter === 'pending'
                  ? 'border-blue-500 text-blue-600'
                  : `border-transparent ${getThemeStyle(theme, 'text', 'muted')} hover:text-gray-900 dark:hover:text-gray-100 hover:border-gray-300`
              }`}
            >
              Pending
              <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                statusFilter === 'pending' ? 'bg-blue-100 text-blue-800' : `${getThemeStyle(theme, 'background', 'accent')} ${getThemeStyle(theme, 'text', 'tertiary')}`
              }`}>
                {getStatusCount('pending')}
              </span>
            </button>
            
            <button
              onClick={() => setStatusFilter('in_progress')}
              className={`whitespace-nowrap py-2 sm:py-3 px-1 border-b-2 font-medium text-xs ${
                statusFilter === 'in_progress'
                  ? 'border-blue-500 text-blue-600'
                  : `border-transparent ${getThemeStyle(theme, 'text', 'muted')} hover:text-gray-900 dark:hover:text-gray-100 hover:border-gray-300`
              }`}
            >
              Working
              <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                statusFilter === 'in_progress' ? 'bg-blue-100 text-blue-800' : `${getThemeStyle(theme, 'background', 'accent')} ${getThemeStyle(theme, 'text', 'tertiary')}`
              }`}>
                {getStatusCount('in_progress')}
              </span>
            </button>
            
            <button
              onClick={() => setStatusFilter('completed')}
              className={`whitespace-nowrap py-2 sm:py-3 px-1 border-b-2 font-medium text-xs ${
                statusFilter === 'completed'
                  ? 'border-blue-500 text-blue-600'
                  : `border-transparent ${getThemeStyle(theme, 'text', 'muted')} hover:text-gray-900 dark:hover:text-gray-100 hover:border-gray-300`
              }`}
            >
              Complete
              <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                statusFilter === 'completed' ? 'bg-blue-100 text-blue-800' : `${getThemeStyle(theme, 'background', 'accent')} ${getThemeStyle(theme, 'text', 'tertiary')}`
              }`}>
                {getStatusCount('completed')}
              </span>
            </button>
            
            <button
              onClick={() => setStatusFilter('cancelled')}
              className={`whitespace-nowrap py-2 sm:py-3 px-1 border-b-2 font-medium text-xs ${
                statusFilter === 'cancelled'
                  ? 'border-blue-500 text-blue-600'
                  : `border-transparent ${getThemeStyle(theme, 'text', 'muted')} hover:text-gray-900 dark:hover:text-gray-100 hover:border-gray-300`
              }`}
            >
              Cancelled
              <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                statusFilter === 'cancelled' ? 'bg-blue-100 text-blue-800' : `${getThemeStyle(theme, 'background', 'accent')} ${getThemeStyle(theme, 'text', 'tertiary')}`
              }`}>
                {getStatusCount('cancelled')}
              </span>
            </button>
          </nav>
        </div>

        {/* Orders List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          {isLoading ? (
            <div className={`rounded-lg shadow-sm p-6 sm:p-8 text-center ${getThemeStyle(theme, 'background', 'secondary')} lg:col-span-2`}>
              <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 mx-auto border-b-2 border-blue-600"></div>
              <p className={`mt-3 sm:mt-4 ${getThemeStyle(theme, 'text', 'muted')}`}>Loading orders...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className={`rounded-lg shadow-sm p-6 sm:p-8 text-center lg:col-span-2`}>
              <div className={`mx-auto h-10 w-10 sm:h-12 sm:w-12 ${getThemeStyle(theme, 'text', 'muted')}`}>
                <Package className="h-10 w-10 sm:h-12 sm:w-12" />
              </div>
              <h3 className={`mt-2 text-sm font-medium ${getThemeStyle(theme, 'text', 'primary')}`}>No orders found</h3>
              <p className={`mt-1 text-xs sm:text-sm ${getThemeStyle(theme, 'text', 'muted')}`}>
                {orders.length > 0 
                  ? `Found ${orders.length} orders, but none match the current filter '${statusFilter}'.`
                  : "No orders found in the database for this time period."}
              </p>
              {/* <div className="mt-4 sm:mt-6">
                <button
                  onClick={() => setShowAddOrder(true)}
                  className="inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 border border-transparent text-xs sm:text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                  Create Order
                </button>
              </div> */}
            </div>
          ) : (
            filteredOrders.map(order => (
              <div 
                key={order.id}
                onClick={() => navigate(`/dashboard/orders/${order.id}`)}
                className="block cursor-pointer"
              >
                <div 
                  className={`border-l-4 border rounded-lg overflow-hidden hover:bg-gray-100 dark:hover:bg-gray-700 transition-shadow ${
                    order.status === 'cancelled' ? 'opacity-75' : ''
                  } ${
                    order.status === 'cancelled' 
                      ? 'border-l-red-400' 
                      : order.status === 'pending'
                      ? 'border-l-yellow-500'
                      : order.status === 'in_progress'
                      ? 'border-l-blue-200'
                      : 'border-l-green-200'
                  } ${getThemeStyle(theme, 'border', 'secondary')}`}
                >
                  <div className="px-3 sm:px-4 py-2 sm:py-3">
                    {/* Header: Client + Order Number */}
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 mr-2 sm:mr-3">
                          {order.client?.image_url ? (
                            <div className={`h-7 w-7 sm:h-8 sm:w-8 rounded-full overflow-hidden ${order.status === 'cancelled' ? 'opacity-75' : ''}`}>
                              <img 
                                src={order.client.image_url} 
                                alt={order.client?.name || 'Client'} 
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className={`h-7 w-7 sm:h-8 sm:w-8 rounded-full ${getAvatarColor(order.client?.name || '')} flex items-center justify-center text-xs sm:text-sm text-white font-medium ${order.status === 'cancelled' ? 'opacity-75' : ''}`}>
                              {getInitials(order.client?.name || '')}
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className={`text-sm sm:text-base font-semibold ${getThemeStyle(theme, 'text', 'primary')} ${order.status === 'cancelled' ? 'line-through' : ''}`}>
                            {order.client?.name || 'Unknown Client'}
                          </h3>
                          <p className={`text-xs ${getThemeStyle(theme, 'text', 'muted')} ${order.status === 'cancelled' ? 'line-through' : ''}`}>
                            {order.services && order.services.length > 0 
                              ? (order.services[0]?.service?.name || 'Unknown Service') + (order.services.length > 1 ? ` (+${order.services.length - 1})` : '')
                              : 'No services'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs sm:text-sm font-medium ${
                            order.status === 'cancelled' 
                              ? `${getThemeStyle(theme, 'text', 'muted')} line-through` 
                              : 'text-blue-600'
                          }`}
                        >
                          {order.order_number}
                        </span>
                        
                        {/* Action Buttons */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => handlePrintReceipt(order, e)}
                            className={`p-1 text-blue-600 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-blue-600 transition-colors`}
                            title="Print Receipt"
                          >
                            <Printer className="h-4 w-4" />
                          </button>
                          
                          {order.payment_status !== 'paid' && order.status !== 'cancelled' && (
                            <button
                              onClick={(e) => handleMakePayment(order, e)}
                              className={`p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 text-green-600 hover:text-green-600 transition-colors`}
                              title="Make Payment"
                            >
                              <CreditCard className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Middle section: flexbox for responsive layout */}
                    <div className={`flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 border-t border-b ${getThemeStyle(theme, 'border', 'primary')}`}>
                      {/* Dates */}
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2 sm:mb-0">
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Calendar className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${order.status === 'cancelled' ? 'text-gray-400' : ''}`} />
                          <span className={order.status === 'cancelled' ? 'line-through' : ''}>
                            Created: {format(new Date(order.created_at), 'MMM d, yyyy')}
                          </span>
                        </div>
                        {order.due_date && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Calendar className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${order.status === 'cancelled' ? 'text-gray-400' : ''}`} />
                            <span className={order.status === 'cancelled' ? 'line-through' : ''}>
                              Due: {format(new Date(order.due_date), 'MMM d, yyyy')}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {/* Status Badge - keep this visible without strike-through */}
                      <span className={`inline-flex items-center px-2 w-fit py-0.5 rounded-full text-xs font-medium ${
                        ORDER_STATUS_COLORS[order.status]?.bg
                      } ${
                        ORDER_STATUS_COLORS[order.status]?.text
                      }`}>
                        {ORDER_STATUS_LABELS[order.status] || 'Unknown Status'}
                      </span>
                    </div>
                    
                    {/* Footer: Workers + Payment Info */}
                    <div className="flex justify-between sm:items-start pt-2">
                      {/* Workers */}
                      <div className="mb-2 sm:mb-0 max-w-[60%]">
                        {order.workers?.length > 0 ? (
                          <div>
                            <div className="flex items-center">
                              <div className="flex -space-x-1 mr-2">
                                {order.workers.slice(0, 3).map((worker, index) => (
                                  <div key={index} className={`inline-block  flex-shrink-0 h-5 w-5 sm:h-6 sm:w-6 rounded-full overflow-hidden ${order.status === 'cancelled' ? 'opacity-75' : ''}`}>
                                    {worker.worker.image ? (
                                      <img 
                                        src={worker.worker.image} 
                                        alt={worker.worker.name} 
                                        className="h-full w-full object-cover"
                                      />
                                    ) : (
                                      <div className={`h-full w-full ${getAvatarColor(worker.worker.name)} flex items-center justify-center text-xs text-white font-medium`}>
                                        {getInitials(worker.worker.name)}
                                      </div>
                                    )}
                                  </div>
                                ))}
                                {order.workers.length > 3 && (
                                  <div className={`inline-block h-5 w-5 sm:h-6 sm:w-6 rounded-full ${getThemeStyle(theme, 'background', 'accent')} flex items-center justify-center text-xs font-medium ring-2 ring-white ${order.status === 'cancelled' ? 'opacity-75' : ''}`}>
                                    +{order.workers.length - 3}
                                  </div>
                                )}
                              </div>
                              
                              {order.workers.length === 1 ? (
                                <div className="flex flex-wrap items-center">
                                  <span className={`text-xs ${getThemeStyle(theme, 'text', 'secondary')} font-medium mr-2 ${order.status === 'cancelled' ? 'line-through' : ''}`}>
                                    {order.workers[0].worker.name}
                                  </span>
                                  
                                  {order.workers[0].project?.name && (
                                    <span className={`text-xs ${getThemeStyle(theme, 'text', 'tertiary')} mr-2 ${order.status === 'cancelled' ? 'line-through' : ''}`}>
                                      • {order.workers[0].project.name}
                                    </span>
                                  )}
                                  
                                  {order.workers[0].status && (
                                    <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                                      order.workers[0].status === 'active' ? 'bg-green-100 text-green-800' : `${getThemeStyle(theme, 'background', 'accent')} ${getThemeStyle(theme, 'text', 'tertiary')}`
                                    } ${order.status === 'cancelled' ? 'line-through' : ''}`}>
                                      {order.workers[0].status}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center">
                                  <span className={`text-xs ${getThemeStyle(theme, 'text', 'secondary')} font-medium mr-2 ${order.status === 'cancelled' ? 'line-through' : ''}`}>
                                    {order.workers.length} workers assigned
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center">
                            <div className={`h-5 w-5 sm:h-6 sm:w-6 rounded-full ${getThemeStyle(theme, 'background', 'accent')} flex items-center justify-center text-xs font-medium mr-2 ${order.status === 'cancelled' ? 'opacity-75' : ''}`}>
                              <User className={`h-3 w-3 ${getThemeStyle(theme, 'text', 'muted')} ${order.status === 'cancelled' ? 'opacity-75' : ''}`} />
                            </div>
                            <span className={`text-xs ${getThemeStyle(theme, 'text', 'muted')} ${order.status === 'cancelled' ? 'line-through' : ''}`}>No workers assigned</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Payment Info */}
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className={`text-xs sm:text-sm font-medium ${getThemeStyle(theme, 'text', 'primary')} ${order.status === 'cancelled' ? 'line-through' : ''}`}>
                            {currencySymbol} {order.total_amount.toFixed(2)}
                          </div>
                          <div className={`text-xs ${
                            order.status === 'cancelled' 
                              ? `${getThemeStyle(theme, 'text', 'muted')} line-through` 
                              : order.payment_status === 'paid' 
                              ? 'text-green-600' 
                              : order.payment_status === 'partially_paid' 
                              ? 'text-red-700' 
                              : 'text-red-600'
                          }`}>
                            {currencySymbol} {order.outstanding_balance.toFixed(2)}
                            <span className={`ml-1 hidden sm:block ${order.status === 'cancelled' ? getThemeStyle(theme, 'text', 'muted') : getThemeStyle(theme, 'text', 'tertiary')} text-xs`}>
                              {order.payment_status === 'paid' 
                                ? '(Paid)' 
                                : order.payment_status === 'partially_paid' 
                                ? '(Outstanding)' 
                                : '(Unpaid)'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create Order Modal */}
      {showAddOrder && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className={`absolute inset-0 ${getThemeStyle(theme, 'modal', 'overlay')} transition-opacity`} onClick={handleCloseForm} />
            
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-0 sm:pl-10">
              <div className={`pointer-events-auto w-screen max-w-full sm:max-w-md transform transition-transform duration-500 ease-in-out ${showAddOrder ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className={`flex h-full flex-col ${getThemeStyle(theme, 'modal', 'background')} shadow-xl`}>
                                 
                  <div className="flex-1 overflow-y-auto">
                    <div className="px-4 sm:px-6 py-3 sm:py-4">
                      <CreateOrderForm
                        onClose={handleCloseForm}
                        onSuccess={loadOrders}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceipt && selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className={`absolute inset-0 ${getThemeStyle(theme, 'modal', 'overlay')} transition-opacity`} onClick={() => setShowReceipt(false)} />
            
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-0 sm:pl-10">
              <div className="pointer-events-auto w-screen max-w-full sm:max-w-md transform transition-transform duration-500 ease-in-out translate-x-0">
                <div className={`flex h-full flex-col ${getThemeStyle(theme, 'modal', 'background')} shadow-xl`}>
                  <div className="flex-1 overflow-y-auto">
                    <div className="px-4 sm:px-6 py-3 sm:py-4">
                      <OrderReceipt
                        orderId={selectedOrder.id}
                        onClose={() => setShowReceipt(false)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentForm && selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className={`absolute inset-0 ${getThemeStyle(theme, 'modal', 'overlay')} transition-opacity`} onClick={() => setShowPaymentForm(false)} />
            
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-0 sm:pl-10">
              <div className="pointer-events-auto w-screen max-w-full sm:max-w-md transform transition-transform duration-500 ease-in-out translate-x-0">
                <div className={`flex h-full flex-col ${getThemeStyle(theme, 'modal', 'background')} shadow-xl`}>
                  <div className="flex-1 overflow-y-auto">
                    <div className="px-4 sm:px-6 py-3 sm:py-4">
                      <RecordPayment
                        orderId={selectedOrder.id}
                        orderNumber={selectedOrder.order_number}
                        clientName={selectedOrder.client?.name}
                        outstandingBalance={selectedOrder.outstanding_balance}
                        onPaymentRecorded={() => {
                          loadOrders();
                          setShowPaymentForm(false);
                        }}
                        isOpen={showPaymentForm}
                        onClose={() => setShowPaymentForm(false)}
                        currencySymbol={currencySymbol}
                        orderType="service_order"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}