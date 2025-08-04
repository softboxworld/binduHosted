import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Trash2, Edit2, Phone, MapPin, Calendar, Upload, X, Loader2, Pencil, ChevronRight, Archive } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { useUI } from '../context/UIContext';
import { useTheme } from '../context/ThemeContext';
import { format } from 'date-fns';
import { CURRENCIES } from '../utils/constants';
import { Link } from 'react-router-dom';
import Pagination from '../components/common/Pagination';

interface CustomField {
  id: string;
  title: string;
  value: string;
  type: 'text' | 'file';
}

interface Client {
  id: string;
  name: string;
  phone: string;
  address: string;
  date_of_birth: string;
  custom_fields?: CustomField[];
  total_balance: number;
  orders?: Array<{ outstanding_balance: number }>;
  sales_orders?: Array<{ outstanding_balance: number }>;
  total_spent?: number;
  image_url?: string;
}

interface NewCustomField {
  title: string;
  value: string;
  type: 'text' | 'file';
  file: File | null;
}

interface NewClient {
  name: string;
  phone: string;
  address: string;
  date_of_birth: string;
  customFields: NewCustomField[];
  image_url?: string;
  image_file?: File | null;
}

export default function ClientsList() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'archived'>('active');
  const [editingClient, setEditingClient] = useState<string | null>(null);
  const [showAddClient, setShowAddClient] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalClients, setTotalClients] = useState(0);
  const [totalOrgClients, setTotalOrgClients] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const itemsPerPage = 20;
  const [newCustomField, setNewCustomField] = useState<NewCustomField>({
    title: '',
    value: '',
    type: 'text',
    file: null
  });
  const [newClient, setNewClient] = useState<NewClient>({
    name: '',
    phone: '',
    address: '',
    date_of_birth: '',
    customFields: [{ title: '', value: '', type: 'text', file: null }],
    image_url: '',
    image_file: null
  });
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { organization } = useAuthStore();
  const { confirm, addToast } = useUI();
  const { theme, getThemeStyle } = useTheme();
  const currencySymbol = organization?.currency ? CURRENCIES[organization.currency]?.symbol || organization.currency : '';
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (!organization) return;
    
    if (searchQuery.trim() === '') {
      // Reset to normal pagination mode when search is cleared
      setIsSearching(false);
      loadClients();
    }
    
    // Fetch the total number of clients in the organization
    fetchTotalClientsCount();
  }, [organization, statusFilter, currentPage, searchQuery]);

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

  // Fetch the total count of all clients in the organization regardless of status
  const fetchTotalClientsCount = async () => {
    if (!organization?.id) return;
    
    try {
      const { count } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organization.id);
        
      setTotalOrgClients(count || 0);
    } catch (error) {
      console.error('Error fetching total clients count:', error);
    }
  };

  const loadClients = async () => {
    if (!organization?.id) return;
    
    setIsLoading(true);

    try {
      // First get total count
      const { count: totalCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organization.id)
        .eq('status', statusFilter);

      setTotalClients(totalCount || 0);
      setTotalPages(Math.ceil((totalCount || 0) / itemsPerPage));

      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select(`
          *,
          custom_fields:client_custom_fields(*),
          orders:orders(outstanding_balance, total_amount),
          sales_orders:sales_orders(outstanding_balance, total_amount)
        `)
        .eq('organization_id', organization.id)
        .eq('status', statusFilter)
        .order('name')
        .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);

      if (clientsError) throw clientsError;

      // Calculate total balance and total spent for each client from both orders and sales_orders
      const clientsWithBalance = clientsData?.map(client => {
        const ordersBalance = client.orders?.reduce((sum: number, order: any) => sum + (order.outstanding_balance || 0), 0) || 0;
        const salesOrdersBalance = client.sales_orders?.reduce((sum: number, order: any) => sum + (order.outstanding_balance || 0), 0) || 0;
        
        // Calculate total spent from both orders and sales orders
        const ordersTotalSpent = client.orders?.reduce((sum: number, order: any) => sum + (order.total_amount || 0), 0) || 0;
        const salesOrdersTotalSpent = client.sales_orders?.reduce((sum: number, order: any) => sum + (order.total_amount || 0), 0) || 0;
        
        return {
          ...client,
          total_balance: ordersBalance + salesOrdersBalance,
          total_spent: ordersTotalSpent + salesOrdersTotalSpent
        };
      }) || [];

      setClients(clientsWithBalance);
    } catch (error) {
      console.error('Error loading clients:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to load clients'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!organization?.id || searchQuery.trim() === '') return;
    
    setIsSearching(true);
    setCurrentPage(1); // Reset to first page when searching
    
    try {
      // Search query using ilike for case-insensitive partial matching
      const { data: searchResults, error: searchError, count: totalCount } = await supabase
        .from('clients')
        .select(`
          *,
          custom_fields:client_custom_fields(*),
          orders:orders(outstanding_balance, total_amount),
          sales_orders:sales_orders(outstanding_balance, total_amount)
        `, { count: 'exact' })
        .eq('organization_id', organization.id)
        .eq('status', statusFilter)
        .ilike('name', `%${searchQuery}%`)
        .order('name');
      
      if (searchError) throw searchError;
      
      // Calculate total balance and total spent for search results
      const clientsWithBalance = searchResults?.map(client => {
        const ordersBalance = client.orders?.reduce((sum: number, order: any) => sum + (order.outstanding_balance || 0), 0) || 0;
        const salesOrdersBalance = client.sales_orders?.reduce((sum: number, order: any) => sum + (order.outstanding_balance || 0), 0) || 0;
        
        const ordersTotalSpent = client.orders?.reduce((sum: number, order: any) => sum + (order.total_amount || 0), 0) || 0;
        const salesOrdersTotalSpent = client.sales_orders?.reduce((sum: number, order: any) => sum + (order.total_amount || 0), 0) || 0;
        
        return {
          ...client,
          total_balance: ordersBalance + salesOrdersBalance,
          total_spent: ordersTotalSpent + salesOrdersTotalSpent
        };
      }) || [];
      
      setClients(clientsWithBalance);
      setTotalClients(totalCount || 0);
      setTotalPages(Math.ceil((totalCount || 0) / itemsPerPage));
    } catch (error) {
      console.error('Error searching clients:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to search clients'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create a temporary URL for preview
    const tempUrl = URL.createObjectURL(file);
    
    setNewClient(prev => ({ 
      ...prev, 
      image_url: tempUrl,
      image_file: file
    }));
  };

  const handleAddClient = async () => {
    if (!organization || !newClient.name.trim()) return;

    setIsUploading(true);
    try {
      let imageUrl = null;
      
      // Upload image if selected
      if (newClient.image_file) {
        setIsUploadingImage(true);
        try {
          const fileExt = newClient.image_file.name.split('.').pop()?.toLowerCase();
          const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
          const filePath = `${organization.id}/clients/temp/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('profiles')
            .upload(filePath, newClient.image_file, {
              cacheControl: '3600',
              upsert: true
            });

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('profiles')
            .getPublicUrl(filePath);

          imageUrl = publicUrl;
        } catch (error) {
          console.error('Error uploading image:', error);
          addToast({
            type: 'error',
            title: 'Error',
            message: 'Failed to upload client image'
          });
          setIsUploading(false);
          setIsUploadingImage(false);
          return;
        } finally {
          setIsUploadingImage(false);
        }
      }

      // First insert the client
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .insert([{
          organization_id: organization.id,
          name: newClient.name.trim(),
          phone: newClient.phone.trim(),
          address: newClient.address.trim(),
          date_of_birth: newClient.date_of_birth || null,
          image_url: imageUrl || null,
          status: 'active'
        }])
        .select()
        .single();

      if (clientError) {
        // Check if it's a duplicate name error (unique constraint violation)
        if (clientError.code === '23505') {
          addToast({
            type: 'error',
            title: 'Duplicate Client',
            message: 'A client with this name already exists. Please use a different name.'
          });
          return;
        }
        throw clientError;
      }

      // Then insert custom fields
      const validCustomFields = newClient.customFields.filter(field => 
        field.title.trim() && (field.type === 'text' ? field.value.trim() : field.file)
      );
      
      if (validCustomFields.length > 0) {
        for (const field of validCustomFields) {
          let fieldValue = field.value;

          if (field.type === 'file' && field.file) {
            // Upload file to storage
            const fileExt = field.file.name.split('.').pop()?.toLowerCase();
            const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `${organization.id}/clients/${clientData.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
              .from('profiles')
              .upload(filePath, field.file, {
                cacheControl: '3600',
                upsert: false
              });

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
              .from('profiles')
              .getPublicUrl(filePath);

            fieldValue = publicUrl;
          }

          // Create custom field record
          const { error: fieldError } = await supabase
            .from('client_custom_fields')
            .insert({
              client_id: clientData.id,
              title: field.title.trim(),
              value: fieldValue,
              type: field.type
            });

          if (fieldError) throw fieldError;
        }
      }

      // Reload clients to get the new data with custom fields
      await loadClients();

      setNewClient({
        name: '',
        phone: '',
        address: '',
        date_of_birth: '',
        customFields: [{ title: '', value: '', type: 'text', file: null }],
        image_url: '',
        image_file: null
      });
      setShowAddClient(false);

      addToast({
        type: 'success',
        title: 'Client Added',
        message: 'New client has been added successfully.'
      });
    } catch (error) {
      console.error('Error adding client:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to add client'
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    const confirmed = await confirm({
      title: 'Delete Client',
      message: 'Are you sure you want to delete this client? This will also delete all their custom information.',
      type: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId);

      if (error) throw error;

      setClients(prev => prev.filter(client => client.id !== clientId));

      addToast({
        type: 'success',
        title: 'Client Deleted',
        message: 'Client has been deleted successfully.'
      });
    } catch (error) {
      console.error('Error deleting client:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to delete client'
      });
    }
  };


  const addCustomField = () => {
    setNewClient(prev => ({
      ...prev,
      customFields: [...prev.customFields, { title: '', value: '', type: 'text', file: null }]
    }));
  };

  const removeCustomField = (index: number) => {
    setNewClient(prev => ({
      ...prev,
      customFields: prev.customFields.filter((_, i) => i !== index)
    }));
  };

  const updateCustomField = (index: number, updates: Partial<NewCustomField>) => {
    setNewClient(prev => ({
      ...prev,
      customFields: prev.customFields.map((f, i) => 
        i === index ? { ...f, ...updates } : f
      )
    }));
  };

  // Needed for pagination with search results
  const handlePageChange = (page: number) => {
    if (isSearching) {
      // We need to fetch the specified page of search results
      setCurrentPage(page);
      handleSearchPage(page);
    } else {
      // Normal pagination
      setCurrentPage(page);
    }
  };

  // Handle pagination for search results
  const handleSearchPage = async (page: number) => {
    if (!organization?.id || searchQuery.trim() === '') return;
    
    setIsLoading(true);
    
    try {
      const from = (page - 1) * itemsPerPage;
      const to = page * itemsPerPage - 1;
      
      // Search query with pagination
      const { data: searchResults, error: searchError } = await supabase
        .from('clients')
        .select(`
          *,
          custom_fields:client_custom_fields(*),
          orders:orders(outstanding_balance, total_amount),
          sales_orders:sales_orders(outstanding_balance, total_amount)
        `)
        .eq('organization_id', organization.id)
        .eq('status', statusFilter)
        .ilike('name', `%${searchQuery}%`)
        .order('name')
        .range(from, to);
      
      if (searchError) throw searchError;
      
      // Calculate total balance and total spent for search results
      const clientsWithBalance = searchResults?.map(client => {
        const ordersBalance = client.orders?.reduce((sum: number, order: any) => sum + (order.outstanding_balance || 0), 0) || 0;
        const salesOrdersBalance = client.sales_orders?.reduce((sum: number, order: any) => sum + (order.outstanding_balance || 0), 0) || 0;
        
        const ordersTotalSpent = client.orders?.reduce((sum: number, order: any) => sum + (order.total_amount || 0), 0) || 0;
        const salesOrdersTotalSpent = client.sales_orders?.reduce((sum: number, order: any) => sum + (order.total_amount || 0), 0) || 0;
        
        return {
          ...client,
          total_balance: ordersBalance + salesOrdersBalance,
          total_spent: ordersTotalSpent + salesOrdersTotalSpent
        };
      }) || [];
      
      setClients(clientsWithBalance);
    } catch (error) {
      console.error('Error fetching search results page:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to load search results page'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedClients.length === 0) return;

    const confirmed = await confirm({
      title: 'Delete Selected Clients',
      message: `Are you sure you want to delete ${selectedClients.length} client(s)? This action cannot be undone.`,
      type: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .in('id', selectedClients);

      if (error) throw error;

      setClients(prev => prev.filter(client => !selectedClients.includes(client.id)));
      setSelectedClients([]);
      setIsEditMode(false);

      addToast({
        type: 'success',
        title: 'Clients Deleted',
        message: `${selectedClients.length} client(s) have been deleted successfully.`
      });
    } catch (error) {
      console.error('Error deleting clients:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to delete clients'
      });
    }
  };

  const handleBulkArchive = async () => {
    if (selectedClients.length === 0) return;

    const confirmed = await confirm({
      title: 'Archive Selected Clients',
      message: `Are you sure you want to archive ${selectedClients.length} client(s)?`,
      type: 'warning',
      confirmText: 'Archive',
      cancelText: 'Cancel'
    });

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('clients')
        .update({ status: 'archived' })
        .in('id', selectedClients);

      if (error) throw error;

      setClients(prev => prev.filter(client => !selectedClients.includes(client.id)));
      setSelectedClients([]);
      setIsEditMode(false);

      addToast({
        type: 'success',
        title: 'Clients Archived',
        message: `${selectedClients.length} client(s) have been archived successfully.`
      });
    } catch (error) {
      console.error('Error archiving clients:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to archive clients'
      });
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedClients(clients.map(client => client.id));
    } else {
      setSelectedClients([]);
    }
  };

  const handleSelectClient = (clientId: string, checked: boolean) => {
    if (checked) {
      setSelectedClients(prev => [...prev, clientId]);
    } else {
      setSelectedClients(prev => prev.filter(id => id !== clientId));
    }
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center min-h-[400px] ${getThemeStyle(theme, 'background', 'primary')}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={`py-3 px-4 min-h-[calc(100vh-50px)] ${getThemeStyle(theme, 'background', 'primary')}`}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h2 className={`text-xl font-semibold ${getThemeStyle(theme, 'text', 'primary')}`}>
          Clients | {totalOrgClients} {isSearching || statusFilter !== 'active' ? `(${totalClients} ${isSearching ? 'found' : statusFilter})` : ''}
        </h2>
        <div className="flex items-center flex-col w-full sm:w-auto sm:flex-row gap-3">
          <div className={`flex items-center px-2 py-1.5 w-full sm:w-auto border rounded-md focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500 ${getThemeStyle(theme, 'border', 'primary')}`}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {setSearchQuery(e.target.value); handleSearch()}}
              placeholder="Search name"
              className={`ml-2 flex-1 outline-none bg-transparent text-sm ${getThemeStyle(theme, 'text', 'primary')}`}
            />
            <button 
              className={`ml-1 p-1 rounded-md bg-blue-400 text-white`}
            >
              <Search className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={() => setShowAddClient(true)}
            className="inline-flex items-center px-3 py-1.5 w-full sm:w-auto border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Client
          </button>
        </div>
      </div>

      {isEditMode && selectedClients.length > 0 && (
        <div className="mt-4 flex items-center gap-2">
          <span className={`text-sm ${getThemeStyle(theme, 'text', 'primary')}`}>
            {selectedClients.length} client(s) selected
          </span>
          <button
            onClick={handleBulkDelete}
            className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
          >
            <Trash2 className="h-4 w-4 mr-1.5" />
            Delete Selected
          </button>
          <button
            onClick={handleBulkArchive}
            className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700"
          >
            <Archive className="h-4 w-4 mr-1.5" />
            Archive Selected
          </button>
        </div>
      )}

      {showAddClient && (
        <>
          {/* Backdrop */}
          <div className={`fixed inset-0 z-40 ${getThemeStyle(theme, 'modal', 'overlay')} transition-opacity`} onClick={() => setShowAddClient(false)} />

          {/* Panel */}
          <div className={`fixed inset-y-0 right-0 z-50 w-[450px] max-w-full overflow-y-auto ${getThemeStyle(theme, 'modal', 'background')} shadow-xl transform transition-transform duration-300 ease-in-out`}>
            <div className="h-full flex flex-col">
              {/* Header */}
              <div className={`px-3 sm:px-4 py-2 sm:py-3 border-b ${getThemeStyle(theme, 'border', 'primary')} flex items-center justify-between`}>
                <h3 className={`text-base font-medium ${getThemeStyle(theme, 'text', 'primary')}`}>Add New Client</h3>
                <button
                  onClick={() => setShowAddClient(false)}
                  className={`${getThemeStyle(theme, 'text', 'muted')} ${getThemeStyle(theme, 'interactive', 'hover', 'text')}`}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Form Content */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-4">
                <div className="space-y-3 sm:space-y-4">
                  {/* Image Upload */}
                  <div className="flex flex-col items-center space-y-2">
                    <div 
                      className={`relative h-24 w-24 rounded-full overflow-hidden ${getThemeStyle(theme, 'background', 'secondary')} border-2 border-dashed ${getThemeStyle(theme, 'border', 'primary')} flex items-center justify-center cursor-pointer hover:border-blue-500 transition-colors`}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {newClient.image_url ? (
                        <img 
                          src={newClient.image_url} 
                          alt="Client" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Upload className={`h-8 w-8 ${getThemeStyle(theme, 'text', 'muted')}`} />
                      )}
                      {isUploadingImage && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Loader2 className="h-6 w-6 text-white animate-spin" />
                        </div>
                      )}
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageSelect}
                      accept="image/*"
                      className="hidden"
                    />
                    <span className={`text-xs ${getThemeStyle(theme, 'text', 'secondary')}`}>
                      Click to upload client photo
                    </span>
                  </div>

                  <div>
                    <label className={`block text-xs font-medium ${getThemeStyle(theme, 'text', 'secondary')}`}>Name *</label>
                    <input
                      type="text"
                      value={newClient.name}
                      onChange={(e) => setNewClient(prev => ({ ...prev, name: e.target.value }))}
                      className={`mt-1 block w-full rounded-md border ${getThemeStyle(theme, 'border', 'primary')} py-1.5 px-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 text-sm ${getThemeStyle(theme, 'background', 'secondary')} ${getThemeStyle(theme, 'text', 'primary')}`}
                      placeholder="Enter client name"
                    />
                  </div>

                  <div>
                    <label className={`block text-xs font-medium ${getThemeStyle(theme, 'text', 'secondary')}`}>Phone Number</label>
                    <input
                      type="tel"
                      value={newClient.phone}
                      onChange={(e) => setNewClient(prev => ({ ...prev, phone: e.target.value }))}
                      className={`mt-1 block w-full rounded-md border ${getThemeStyle(theme, 'border', 'primary')} py-1.5 px-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 text-sm ${getThemeStyle(theme, 'background', 'secondary')} ${getThemeStyle(theme, 'text', 'primary')}`}
                      placeholder="Enter phone number"
                    />
                  </div>

                  <div>
                    <label className={`block text-xs font-medium ${getThemeStyle(theme, 'text', 'secondary')}`}>Address</label>
                    <textarea
                      value={newClient.address}
                      onChange={(e) => setNewClient(prev => ({ ...prev, address: e.target.value }))}
                      rows={2}
                      className={`mt-1 block w-full rounded-md border ${getThemeStyle(theme, 'border', 'primary')} py-1.5 px-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 text-sm ${getThemeStyle(theme, 'background', 'secondary')} ${getThemeStyle(theme, 'text', 'primary')}`}
                      placeholder="Enter address"
                    />
                  </div>

                  <div>
                    <label className={`block text-xs font-medium ${getThemeStyle(theme, 'text', 'secondary')}`}>Date of Birth</label>
                    <input
                      type="date"
                      value={newClient.date_of_birth}
                      onChange={(e) => setNewClient(prev => ({ ...prev, date_of_birth: e.target.value }))}
                      className={`mt-1 block w-full rounded-md border ${getThemeStyle(theme, 'border', 'primary')} py-1.5 px-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 text-sm ${getThemeStyle(theme, 'background', 'secondary')} ${getThemeStyle(theme, 'text', 'primary')}`}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className={`text-xs font-medium ${getThemeStyle(theme, 'text', 'primary')}`}>Custom Information</h4>
                      <button
                        type="button"
                        onClick={addCustomField}
                        className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-100 dark:hover:bg-blue-800"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Field
                      </button>
                    </div>

                    {newClient.customFields.map((field, index) => (
                      <div key={index} className="flex items-start space-x-3">
                        <div className="flex-1 space-y-3">
                          <div>
                            <label className={`block text-xs font-medium ${getThemeStyle(theme, 'text', 'secondary')}`}>Title</label>
                            <input
                              type="text"
                              value={field.title}
                              onChange={(e) => updateCustomField(index, { title: e.target.value })}
                              className={`mt-1 block w-full rounded-md border ${getThemeStyle(theme, 'border', 'primary')} py-1.5 px-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 text-sm ${getThemeStyle(theme, 'background', 'secondary')} ${getThemeStyle(theme, 'text', 'primary')}`}
                              placeholder="Enter field title"
                            />
                          </div>
                          <div>
                            <label className={`block text-xs font-medium ${getThemeStyle(theme, 'text', 'secondary')}`}>Type</label>
                            <select
                              value={field.type}
                              onChange={(e) => updateCustomField(index, { type: e.target.value as 'text' | 'file' })}
                              className={`mt-1 block w-full rounded-md border ${getThemeStyle(theme, 'border', 'primary')} py-1.5 px-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 text-sm ${getThemeStyle(theme, 'background', 'secondary')} ${getThemeStyle(theme, 'text', 'primary')}`}
                            >
                              <option value="text">Text</option>
                              <option value="file">File</option>
                            </select>
                          </div>
                          {field.type === 'text' ? (
                            <div>
                              <label className={`block text-xs font-medium ${getThemeStyle(theme, 'text', 'secondary')}`}>Value</label>
                              <input
                                type="text"
                                value={field.value || ''}
                                onChange={(e) => updateCustomField(index, { value: e.target.value })}
                                className={`mt-1 block w-full rounded-md border ${getThemeStyle(theme, 'border', 'primary')} py-1.5 px-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 text-sm ${getThemeStyle(theme, 'background', 'secondary')} ${getThemeStyle(theme, 'text', 'primary')}`}
                                placeholder="Enter value"
                              />
                            </div>
                          ) : (
                            <div>
                              <label className={`block text-xs font-medium ${getThemeStyle(theme, 'text', 'secondary')}`}>File</label>
                              <div className="mt-1 flex items-center">
                                <input
                                  type="file"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      updateCustomField(index, { file });
                                    }
                                  }}
                                  className="hidden"
                                  id={`file-${index}`}
                                />
                                <label
                                  htmlFor={`file-${index}`}
                                  className={`cursor-pointer inline-flex items-center px-3 py-1.5 border ${getThemeStyle(theme, 'border', 'primary')} rounded-md shadow-sm text-xs font-medium ${getThemeStyle(theme, 'text', 'secondary')} ${getThemeStyle(theme, 'background', 'secondary')} ${getThemeStyle(theme, 'interactive', 'hover', 'background')}`}
                                >
                                  <Upload className="h-3 w-3 mr-1.5" />
                                  Choose File
                                </label>
                                {field.file && (
                                  <span className={`ml-2 text-xs ${getThemeStyle(theme, 'text', 'tertiary')} truncate max-w-[150px]`}>
                                    {field.file.name}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeCustomField(index)}
                          className="mt-6 p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className={`px-3 sm:px-4 py-2 sm:py-3 border-t ${getThemeStyle(theme, 'border', 'primary')} flex justify-end space-x-2`}>
                <button
                  onClick={() => setShowAddClient(false)}
                  className={`px-3 py-1.5 text-xs font-medium ${getThemeStyle(theme, 'text', 'secondary')} ${getThemeStyle(theme, 'interactive', 'hover', 'text')}`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddClient}
                  disabled={!newClient.name.trim()}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-blue-500 disabled:bg-gray-400 dark:disabled:bg-gray-600"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="animate-spin h-3 w-3 mr-1.5" />
                      Adding...
                    </>
                  ) : (
                    'Add Client'
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <div className={`shadow-sm rounded-sm overflow-hidden mt-8`}>
        {clients.length === 0 ? (
          <div className={`text-center ${getThemeStyle(theme, 'text', 'tertiary')} py-6 text-sm`}>
            {searchQuery ? 'No clients found matching your search.' : 'No clients added yet.'}
          </div>
        ) : isMobile ? (
          // Mobile card view
          <div className={`divide-y ${getThemeStyle(theme, 'border', 'primary')}`}>
            {clients.map(client => (
              <Link
                key={client.id}
                to={`/dashboard/clients/${client.id}`}
                className={`block p-3 ${getThemeStyle(theme, 'interactive', 'hover', 'background')}`}
              >
                <div className="flex items-center">
                  <div className={`h-10 w-10 rounded-full ${getThemeStyle(theme, 'avatar', 'background')} flex items-center justify-center ${getThemeStyle(theme, 'avatar', 'text')} text-sm font-medium mr-3 overflow-hidden`}>
                    {client.image_url ? (
                      <img 
                        src={client.image_url} 
                        alt={client.name} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      client.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium ${getThemeStyle(theme, 'text', 'primary')} truncate`}>
                      {client.name}
                    </div>
                    <div className={`text-xs ${getThemeStyle(theme, 'text', 'tertiary')} truncate`}>
                      {client.phone || 'No phone'} | {client.address}
                    </div>
                  </div>
                  <ChevronRight className={`h-5 w-5 ${getThemeStyle(theme, 'text', 'tertiary')}`} />
                </div>
                <div className="mt-2 flex justify-between text-xs">
                  <div className={getThemeStyle(theme, 'text', 'tertiary')}>
                    Spent: <span className={`font-medium ${getThemeStyle(theme, 'text', 'primary')}`}>{currencySymbol} {client.total_spent?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className={`font-medium ${client.total_balance > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                    Balance: {currencySymbol} {client.total_balance.toFixed(2)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          // Desktop table view
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className={`border-b ${getThemeStyle(theme, 'border', 'primary')}`}>
                  {isEditMode && (
                    <th scope="col" className={`px-3 py-2 text-left text-xs font-medium ${getThemeStyle(theme, 'text', 'tertiary')} uppercase tracking-wider w-[50px]`}>
                      <input
                        type="checkbox"
                        checked={selectedClients.length === clients.length}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className={`h-4 w-4 text-blue-600 focus:ring-blue-500 ${getThemeStyle(theme, 'background', 'primary')} border-gray-300 rounded`}
                      />
                    </th>
                  )}
                  <th scope="col" className={`px py-2 text-left text-xs font-medium ${getThemeStyle(theme, 'text', 'tertiary')} uppercase tracking-wider w-[80px]`}>
                    
                  </th>
                  <th scope="col" className={`pl-3 py-2 text-left text-xs font-medium ${getThemeStyle(theme, 'text', 'tertiary')} uppercase tracking-wider w-[250px]`}>
                    Client Name
                  </th>
                  <th scope="col" className={`pl-3 py-2 text-left text-xs font-medium ${getThemeStyle(theme, 'text', 'tertiary')} uppercase tracking-wider w-[200px]`}>
                    Contact Info
                  </th>
                  <th scope="col" className={`pl-3 py-2 text-right text-xs font-medium ${getThemeStyle(theme, 'text', 'tertiary')} uppercase tracking-wider w-[150px]`}>
                    Total Spent
                  </th>
                  <th scope="col" className={`pl-3 py-2 text-right text-xs font-medium ${getThemeStyle(theme, 'text', 'tertiary')} uppercase tracking-wider w-[150px]`}>
                    Balance
                  </th>
                  <th scope="col" className={`pl-3 py-2 text-center text-xs font-medium ${getThemeStyle(theme, 'text', 'tertiary')} uppercase tracking-wider w-[80px]`}>
                    View
                  </th>
                </tr>
              </thead>
              <tbody className={`${getThemeStyle(theme, 'background', 'secondary')}`}>
                {clients.map(client => (
                  <tr key={client.id} className={`border-b ${getThemeStyle(theme, 'border', 'primary')} ${getThemeStyle(theme, 'interactive', 'hover', 'background')} cursor-pointer`}>
                    {isEditMode && (
                      <td className="px-3 py-2 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedClients.includes(client.id)}
                          onChange={(e) => handleSelectClient(client.id, e.target.checked)}
                          className={`h-4 w-4 text-blue-600 focus:ring-blue-500 ${getThemeStyle(theme, 'background', 'primary')} border-gray-300 rounded`}
                        />
                      </td>
                    )}
                    <Link
                      to={`/dashboard/clients/${client.id}`}
                      className="contents"
                    >
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className={`h-10 w-10 rounded-full ${getThemeStyle(theme, 'avatar', 'background')} flex items-center justify-center ${getThemeStyle(theme, 'avatar', 'text')} text-sm font-medium overflow-hidden`}>
                          {client.image_url ? (
                            <img 
                              src={client.image_url} 
                              alt={client.name} 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            client.name.charAt(0).toUpperCase()
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className={`text-sm font-medium ${getThemeStyle(theme, 'text', 'primary')}`}>
                          {client.name}
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className={`text-xs ${getThemeStyle(theme, 'text', 'tertiary')}`}>
                          {client.phone || 'No phone'}
                        </div>
                        <div className={`text-xs ${getThemeStyle(theme, 'text', 'tertiary')}`}>
                          {client.address}
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-right">
                        <div className={`text-sm font-medium ${getThemeStyle(theme, 'text', 'primary')}`}>
                          {currencySymbol} {client.total_spent?.toFixed(2) || '0.00'}
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-right">
                        <div className={`text-sm font-medium ${client.total_balance > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                          {currencySymbol} {client.total_balance.toFixed(2)}
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-center">
                        <ChevronRight className={`h-5 w-5 mx-auto ${getThemeStyle(theme, 'text', 'tertiary')}`} />
                      </td>
                    </Link>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {totalPages > 1 && (
          <div className="mt-4">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        )}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className={`inline-flex mt-8 items-center px-3 py-1.5 w-full sm:w-auto border rounded-md shadow-sm text-sm font-medium ${
              isEditMode 
                ? 'bg-red-600 text-white hover:bg-red-700' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {isEditMode ? (
              <>
                <X className="h-4 w-4 mr-1.5" />
                Cancel Edit
              </>
            ) : (
              <>
                <Edit2 className="h-4 w-4 mr-1.5" />
                Edit Mode
              </>
            )}
          </button>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'active' | 'archived')}
            className={`px-2 py-1.5 w-full sm:w-auto border rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${getThemeStyle(theme, 'border', 'primary')} ${getThemeStyle(theme, 'text', 'primary')} bg-transparent`}
          >
            <option value="active">Active Clients</option>
            <option value="archived">Archived Clients</option>
          </select>
        </div>
      </div>
    </div>
  );
}