import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useUI } from '../../context/UIContext';
import { useTheme } from '../../context/ThemeContext';
import { CURRENCIES } from '../../utils/constants';
import { format } from 'date-fns';
import { Plus, Minus, X, User, FileText, Calendar, CreditCard, DollarSign, Search, Loader2, ChevronDown } from 'lucide-react';
import OrderReceipt from './OrderReceipt';
import { PAYMENT_METHODS } from '../../utils/inventory-constants';
import ClientSelector from '../common/ClientSelector';

interface Client {
  id: string;
  name: string;
  custom_fields?: {
    id: string;
    title: string;
    value: string;
    type: string;
  }[];
}

interface Worker {
  id: string;
  name: string;
}

interface Service {
  id: string;
  name: string;
  cost: number;
}

interface OrderService {
  service: Service;
  quantity: number;
}

interface CreateOrderFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateOrderForm({ onClose, onSuccess }: CreateOrderFormProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [workerProjects, setWorkerProjects] = useState<{ [key: string]: any[] }>({});
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedCustomFields, setSelectedCustomFields] = useState<string[]>([]);
  const [selectedServices, setSelectedServices] = useState<OrderService[]>([]);
  const [selectedWorkers, setSelectedWorkers] = useState<{
    worker_id: string;
    project_id: string;
  }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    due_date: '',
    initial_payment: null as number | null,
    payment_method: '',
    payment_reference: ''
  });
  const [showOrderSummary, setShowOrderSummary] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<any>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [selectedClientName, setSelectedClientName] = useState('');
  const [workerSearch, setWorkerSearch] = useState('');
  const [showWorkerDropdown, setShowWorkerDropdown] = useState(false);
  const [filteredWorkers, setFilteredWorkers] = useState<Worker[]>([]);
  const [currentWorkerIndex, setCurrentWorkerIndex] = useState<number | null>(null);
  const [serviceSearch, setServiceSearch] = useState('');
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);

  const { organization } = useAuthStore();
  const { addToast } = useUI();
  const { theme, getThemeStyle } = useTheme();
  const currencySymbol = organization?.currency ? CURRENCIES[organization.currency]?.symbol || organization.currency : CURRENCIES['USD'].symbol;

  useEffect(() => {
    if (!organization?.id) return;
    loadData();
  }, [organization]);

  const loadData = async () => {
    if (!organization?.id) return;

    try {
      // Load clients with their custom fields
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select(`
          *,
          custom_fields:client_custom_fields(*)
        `)
        .eq('organization_id', organization.id);

      if (clientsError) throw clientsError;
      setClients(clientsData || []);

      // Load workers
      const { data: workersData, error: workersError } = await supabase
        .from('workers')
        .select('id, name')
        .eq('organization_id', organization.id);

      if (workersError) throw workersError;
      setWorkers(workersData || []);

      // Load services
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .eq('organization_id', organization.id);

      if (servicesError) throw servicesError;
      setServices(servicesData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to load required data'
      });
    }
  };

  const loadWorkerProjects = async (workerId: string) => {
    try {
      const { data, error } = await supabase
        .from('worker_projects')
        .select(`
          id,
          name,
          price,
          worker_id
        `)
        .eq('worker_id', workerId)
        .eq('status', 'active');

      if (error) throw error;
      setWorkerProjects(prev => ({
        ...prev,
        [workerId]: data || []
      }));
    } catch (error) {
      console.error('Error loading worker projects:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to load worker projects'
      });
    }
  };

  const handleCreateOrder = async () => {
    if (!organization || !selectedClient || selectedServices.length === 0) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Please select a client and add at least one service to the order'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Start a transaction
      const { data: orderData, error: orderError } = await supabase.rpc('create_order', {
        p_organization_id: organization.id,
        p_client_id: selectedClient.id,
        p_description: formData.description.trim() || null,
        p_due_date: formData.due_date || null,
        p_total_amount: totalAmount,
        p_workers: selectedWorkers
          .filter(w => w.worker_id && w.project_id)
          .map(w => ({
            worker_id: w.worker_id,
            project_id: w.project_id
          })),
        p_services: selectedServices.map(({ service, quantity }) => ({
          service_id: service.id,
          quantity,
          cost: service.cost * quantity
        })),
        p_custom_fields: selectedCustomFields
      });

      if (orderError) throw orderError;
      if (!orderData) throw new Error('Failed to create order');

      // Record initial payment if any
      if (formData.initial_payment !== null && formData.initial_payment > 0 && formData.payment_method) {
        const { error: paymentError } = await supabase.rpc('record_payment', {
          p_organization_id: organization.id,
          p_order_id: orderData.id,
          p_amount: formData.initial_payment,
          p_payment_method: formData.payment_method,
          p_payment_reference: formData.payment_reference,
          p_recorded_by: (await supabase.auth.getUser()).data.user?.id
        });

        if (paymentError) throw paymentError;
      }

      setCreatedOrder(orderData);
      setShowOrderSummary(true);

      addToast({
        type: 'success',
        title: 'Order Created',
        message: 'The order has been created successfully.'
      });

      onSuccess();
    } catch (error) {
      console.error('Error creating order:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to create order. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const filteredWorkersList = workers.filter(worker =>
    worker.name.toLowerCase().includes(workerSearch.toLowerCase())
  );

  const filteredServices = services.filter(service =>
    service.name.toLowerCase().includes(serviceSearch.toLowerCase())
  );

  const handleServiceQuantity = (service: Service, action: 'add' | 'remove' | 'update', value?: number) => {
    setSelectedServices(prev => {
      const existing = prev.find(s => s.service.id === service.id);

      if (action === 'add' && !existing) {
        return [...prev, { service, quantity: 1 }];
      }

      if (action === 'remove') {
        return prev.filter(s => s.service.id !== service.id);
      }

      if (action === 'update' && value !== undefined) {
        return prev.map(s =>
          s.service.id === service.id
            ? { ...s, quantity: Math.max(1, value) }
            : s
        );
      }

      return prev;
    });
  };

  const totalAmount = selectedServices.reduce(
    (sum, { service, quantity }) => sum + (service.cost * quantity),
    0
  );

  const handleWorkerSelect = (worker: Worker, index: number) => {
    const newWorkers = [...selectedWorkers];
    newWorkers[index] = {
      ...newWorkers[index],
      worker_id: worker.id,
      project_id: ''  // Reset project when worker changes
    };
    setSelectedWorkers(newWorkers);
    setWorkerSearch('');
    setShowWorkerDropdown(false);
    setCurrentWorkerIndex(null);

    // Load projects for the selected worker
    loadWorkerProjects(worker.id);
  };

  if (showOrderSummary && createdOrder) {
    return (
      <OrderReceipt orderId={createdOrder.id} onClose={onClose} />
    );
  }

  return (
    <div className={`h-full flex flex-col ${getThemeStyle(theme, 'modal', 'background')} max-w-[450px] mx-auto overflow-y-auto`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${getThemeStyle(theme, 'border', 'primary')}`}>
        <div className="flex items-center gap-2">
          <h2 className={`text-lg font-semibold ${getThemeStyle(theme, 'text', 'primary')}`}>Create Order</h2>
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
          {/* General Order Info Section */}
          <section className={`space-y-6`}>
            <div className="space-y-4">
              {/* Client Selection */}
              <div className="space-y-2">
                <ClientSelector
                  onClientSelect={(client) => {
                    setSelectedClient(client);
                    setSelectedClientName(client?.name || '');
                  }}
                  onCustomFieldsSelect={setSelectedCustomFields}
                  selectedClient={selectedClient}
                  selectedCustomFields={selectedCustomFields}
                />
              </div>

              {/* Custom Fields Selection */}
              {selectedClient?.custom_fields && selectedClient.custom_fields.length > 0 && (
                <div className={`space-y-2 p-4 rounded-lg border ${getThemeStyle(theme, 'border', 'primary')} ${getThemeStyle(theme, 'background', 'secondary')}`}>
                  <label className={`block text-sm font-medium ${getThemeStyle(theme, 'text', 'secondary')}`}>
                    Custom Fields
                  </label>
                  <div className="space-y-2">
                    {selectedClient.custom_fields.map(field => (
                      <label key={field.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={selectedCustomFields.includes(field.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCustomFields(prev => [...prev, field.id]);
                            } else {
                              setSelectedCustomFields(prev => prev.filter(id => id !== field.id));
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-3 w-3"
                        />
                        <span className={`text-xs ${getThemeStyle(theme, 'text', 'tertiary')}`}>{field.title}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Worker Assignment */}
              <div className="mt-4">
                <h4 className={`text-sm mt-4 font-semibold ${getThemeStyle(theme, 'text', 'primary')}`}>Add Workers</h4>
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setSelectedWorkers([...selectedWorkers, { worker_id: '', project_id: '' }])}
                    className={`inline-flex items-center px-2 py-1 mt-2 border ${getThemeStyle(theme, 'border', 'primary')} rounded-md text-sm font-medium ${getThemeStyle(theme, 'text', 'primary')} ${getThemeStyle(theme, 'background', 'secondary')} hover:${getThemeStyle(theme, 'background', 'accent')}`}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                  </button>
                </div>

                {selectedWorkers.map((selectedWorker, index) => (
                  <div key={index} className="flex items-center gap-2 mt-2">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={selectedWorker.worker_id ? workers.find(w => w.id === selectedWorker.worker_id)?.name || '' : workerSearch}
                        onChange={(e) => {
                          if (selectedWorker.worker_id) {
                            // If a worker is already selected, clear the selection
                            const newWorkers = [...selectedWorkers];
                            newWorkers[index] = {
                              ...newWorkers[index],
                              worker_id: '',
                              project_id: ''
                            };
                            setSelectedWorkers(newWorkers);
                          }
                          setWorkerSearch(e.target.value);
                          setShowWorkerDropdown(true);
                          setCurrentWorkerIndex(index);
                        }}
                        onFocus={() => {
                          if (!selectedWorker.worker_id) {
                            setShowWorkerDropdown(true);
                            setCurrentWorkerIndex(index);
                          }
                        }}
                        placeholder="Search for a worker"
                        className={`block w-full px-2 py-1.5 text-xs border ${getThemeStyle(theme, 'border', 'primary')} rounded-md ${getThemeStyle(theme, 'background', 'secondary')} ${getThemeStyle(theme, 'text', 'primary')}`}
                      />
                      {selectedWorker.worker_id && (
                        <button
                          type="button"
                          onClick={() => {
                            const newWorkers = [...selectedWorkers];
                            newWorkers[index] = {
                              ...newWorkers[index],
                              worker_id: '',
                              project_id: ''
                            };
                            setSelectedWorkers(newWorkers);
                          }}
                          className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                        <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                      </div>
                      {showWorkerDropdown && currentWorkerIndex === index && filteredWorkersList.length > 0 && (
                        <div className={`absolute z-10 mt-1 w-full rounded-md shadow-lg ${getThemeStyle(theme, 'background', 'secondary')} border ${getThemeStyle(theme, 'border', 'primary')} max-h-60 overflow-auto`}>
                          {filteredWorkersList.map(worker => (
                            <div
                              key={worker.id}
                              onClick={() => handleWorkerSelect(worker, index)}
                              className={`px-2.5 py-1.5 text-xs cursor-pointer ${getThemeStyle(theme, 'text', 'primary')} hover:bg-blue-50 hover:text-blue-700`}
                            >
                              {worker.name}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex-1">
                      <select
                        value={selectedWorker.project_id || ''}
                        onChange={(e) => {
                          const newWorkers = [...selectedWorkers];
                          newWorkers[index].project_id = e.target.value;
                          setSelectedWorkers(newWorkers);
                        }}
                        disabled={!selectedWorker.worker_id}
                        className={`block w-full px-2 py-1.5 text-xs border ${getThemeStyle(theme, 'border', 'primary')} rounded-md ${getThemeStyle(theme, 'background', 'secondary')} ${getThemeStyle(theme, 'text', 'primary')} disabled:opacity-60`}
                      >
                        <option value="">Select Project</option>
                        {selectedWorker.worker_id && workerProjects[selectedWorker.worker_id]?.map(wp => (
                          <option key={wp.id} value={wp.id}>
                            {wp.name} - {currencySymbol} {wp.price.toFixed(2)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const newWorkers = selectedWorkers.filter((_, i) => i !== index);
                        setSelectedWorkers(newWorkers);
                      }}
                      className={`p-1 ${getThemeStyle(theme, 'text', 'muted')} hover:text-red-500 rounded-full`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Description */}
              <div className="mt-4">
                <h4 className={`text-[16px] font-semibold ${getThemeStyle(theme, 'text', 'primary')}`}>Order Details</h4>
                <label className={`block mt-2 text-sm font-medium ${getThemeStyle(theme, 'text', 'secondary')} mb-1`}>
                  Description
                </label>
                <div className="relative">
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={2}
                    className={`block w-full px-3 py-2 text-xs border ${getThemeStyle(theme, 'border', 'primary')} rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none ${getThemeStyle(theme, 'background', 'secondary')} ${getThemeStyle(theme, 'text', 'primary')}`}
                    placeholder="Order description"
                  />
                </div>
                <label className={`block mt-2 text-sm font-medium ${getThemeStyle(theme, 'text', 'secondary')} mb-1`}>
                  Due Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                    min={format(new Date(), 'yyyy-MM-dd')}
                    onClick={(e) => {
                      // Ensure the calendar popup appears
                      const input = e.target as HTMLInputElement;
                      input.showPicker();
                    }}
                    className={`block w-full px-3 py-1.5 text-xs border ${getThemeStyle(theme, 'border', 'primary')} rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${getThemeStyle(theme, 'background', 'secondary')} ${getThemeStyle(theme, 'text', 'primary')} cursor-pointer`}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Services Section */}
          <section>
            <div className="flex items-center space-x-3">
              <h3 className={`text-base mb-2 font-semibold ${getThemeStyle(theme, 'text', 'primary')}`}>Services</h3>
            </div>

            <div className="space-y-4">
              {/* Service Search and Dropdown */}
              <div className="relative">
                <div className="flex items-center">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={serviceSearch}
                      onChange={(e) => {
                        setServiceSearch(e.target.value);
                        setShowServiceDropdown(true);
                      }}
                      onFocus={() => setShowServiceDropdown(true)}
                      placeholder="Search for a service"
                      className={`w-full rounded-lg border ${getThemeStyle(theme, 'border', 'primary')} ${getThemeStyle(theme, 'background', 'secondary')} px-3 py-2 text-sm ${getThemeStyle(theme, 'text', 'primary')} shadow-sm hover:border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors`}
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowServiceDropdown(!showServiceDropdown)}
                    className={`ml-2 p-1.5 rounded-lg ${getThemeStyle(theme, 'background', 'secondary')} ${getThemeStyle(theme, 'text', 'primary')} border ${getThemeStyle(theme, 'border', 'primary')}`}
                  >
                    <Search className="h-4 w-4" />
                  </button>
                </div>
                
                {showServiceDropdown && filteredServices.length > 0 && (
                  <div className={`absolute z-10 mt-1 w-full rounded-lg shadow-lg ${getThemeStyle(theme, 'background', 'secondary')} border ${getThemeStyle(theme, 'border', 'primary')} max-h-60 overflow-auto`}>
                    {filteredServices.map(service => (
                      <div
                        key={service.id}
                        onClick={() => {
                          handleServiceQuantity(service, 'add');
                          setServiceSearch('');
                          setShowServiceDropdown(false);
                        }}
                        className={`px-3 py-2 text-sm cursor-pointer ${getThemeStyle(theme, 'text', 'primary')} hover:bg-blue-50 hover:text-blue-700 flex justify-between items-center`}
                      >
                        <span>{service.name}</span>
                        <span className={`${getThemeStyle(theme, 'text', 'muted')}`}>
                          {currencySymbol} {service.cost.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Services */}
              <div className="space-y-2">
                {selectedServices.length === 0 ? (
                  <div className={`text-center pb-4 text-sm ${getThemeStyle(theme, 'text', 'muted')}`}>
                    No services selected. Search and add services above.
                  </div>
                ) : (
                  selectedServices.map(({ service, quantity }) => (
                    <div
                      key={service.id}
                      className={`p-3 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className={`text-sm font-medium text-blue-700 dark:text-blue-400`}>{service.name}</h4>
                          <p className={`text-sm ${getThemeStyle(theme, 'text', 'muted')}`}>
                            {currencySymbol} {service.cost.toFixed(2)}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleServiceQuantity(service, 'update', quantity - 1)}
                              className={`p-1 rounded-full ${getThemeStyle(theme, 'interactive', 'hover', 'background')} transition-colors`}
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={quantity}
                              onChange={(e) => {
                                const value = parseInt(e.target.value) || 1;
                                handleServiceQuantity(service, 'update', value);
                              }}
                              className={`w-16 text-center text-sm border ${getThemeStyle(theme, 'border', 'primary')} rounded-lg ${getThemeStyle(theme, 'background', 'secondary')} ${getThemeStyle(theme, 'text', 'primary')}`}
                            />
                            <button
                              type="button"
                              onClick={() => handleServiceQuantity(service, 'update', quantity + 1)}
                              className={`p-1 rounded-full ${getThemeStyle(theme, 'interactive', 'hover', 'background')} transition-colors`}
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleServiceQuantity(service, 'remove')}
                            className="p-1 text-red-400 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          {/* Payment Details Section */}
          <section>
            <div className="flex mb-2 items-center space-x-3">
               <h3 className={`text-base font-semibold ${getThemeStyle(theme, 'text', 'primary')}`}>Payment Details</h3>
            </div>

            <div className="space-y-4">
              {/* Total Amount Display */}
              <div className={`p-2 ${getThemeStyle(theme, 'background', 'accent')} border ${getThemeStyle(theme, 'border', 'primary')} rounded-lg`}>
                <div className="flex justify-between items-center">
                  <span className={`text-sm font-medium ${getThemeStyle(theme, 'text', 'secondary')}`}>Total Amount</span>
                  <span className={`text-sm font-medium ${getThemeStyle(theme, 'text', 'primary')}`}>
                    {currencySymbol} {totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Payment Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CreditCard className={`h-4 w-4 ${getThemeStyle(theme, 'text', 'accent')}`} />
                  <h3 className={`text-sm font-bold ${getThemeStyle(theme, 'text', 'secondary')}`}>Initial Payment</h3>
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
                          min="0"
                          max={totalAmount}
                          step="0.01"
                          value={formData.initial_payment === null ? '' : formData.initial_payment}
                          onChange={(e) => {
                            const value = e.target.value === '' ? null : Math.max(0, parseFloat(e.target.value) || 0);
                            
                            // Check if the payment amount exceeds the total amount
                            if (value !== null && value > totalAmount) {
                              addToast({
                                type: 'error',
                                title: 'Invalid Payment Amount',
                                message: `Payment amount cannot exceed the total amount of ${currencySymbol} ${totalAmount.toFixed(2)}`
                              });
                              // Set the value to the maximum allowed (total amount)
                              setFormData(prev => ({ ...prev, initial_payment: totalAmount }));
                            } else {
                              setFormData(prev => ({ ...prev, initial_payment: value }));
                            }
                          }}
                          className={`block w-full pl-7 pr-3 py-2 text-sm border ${getThemeStyle(theme, 'border', 'primary')} rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${getThemeStyle(theme, 'background', 'secondary')} ${getThemeStyle(theme, 'text', 'primary')}`}
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div>
                      <label className={`block text-sm font-medium ${getThemeStyle(theme, 'text', 'secondary')} mb-1.5`}>
                        Payment Method {formData.initial_payment !== null && formData.initial_payment > 0 ? '*' : ''}
                      </label>
                      <select
                        value={formData.payment_method}
                        onChange={(e) => setFormData(prev => ({ ...prev, payment_method: e.target.value }))}
                        className={`block w-full px-3 py-2 text-sm border ${getThemeStyle(theme, 'border', 'primary')} rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${getThemeStyle(theme, 'background', 'secondary')} ${getThemeStyle(theme, 'text', 'primary')}`}
                        required={formData.initial_payment !== null && formData.initial_payment > 0}
                      >
                        <option value="">Select Payment Method</option>
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
                      value={formData.payment_reference || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, payment_reference: e.target.value }))}
                      className={`block w-full px-3 py-2 text-sm border ${getThemeStyle(theme, 'border', 'primary')} rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${getThemeStyle(theme, 'background', 'secondary')} ${getThemeStyle(theme, 'text', 'primary')}`}
                      placeholder="e.g., Transaction ID, Check number"
                    />
                  </div>

                  {/* Outstanding Balance Display */}
                  <div className={`mt-2 p-2 rounded-lg ${(totalAmount - (formData.initial_payment ?? 0)) === 0
                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                    : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                    }`}>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Outstanding Balance</span>
                      <span className={`text-sm font-semibold ${(totalAmount - (formData.initial_payment ?? 0)) === 0
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                        }`}>
                        {currencySymbol} {(totalAmount - (formData.initial_payment ?? 0)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Form Actions */}
      <div className={`flex justify-end gap-3 py-4 px-4 border-t ${getThemeStyle(theme, 'border', 'primary')}`}>
        <button
          type="button"
          onClick={onClose}
          className={`px-4 py-2 text-sm font-medium ${getThemeStyle(theme, 'text', 'muted')} border ${getThemeStyle(theme, 'border', 'primary')} rounded-lg hover:${getThemeStyle(theme, 'background', 'accent')}`}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleCreateOrder}
          disabled={isSubmitting || !selectedClient || selectedServices.length === 0}
          className={`px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 dark:disabled:bg-gray-600 flex items-center`}
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Creating...
            </>
          ) : (
            'Create Order'
          )}
        </button>
      </div>
    </div>
  );
}