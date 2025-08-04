import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useTheme } from '../../context/ThemeContext';
import { useUI } from '../../context/UIContext';
import { Plus, X, ChevronDown, Loader2, Trash2 } from 'lucide-react';

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

interface ClientSelectorProps {
  onClientSelect: (client: Client | null) => void;
  onCustomFieldsSelect?: (fieldIds: string[]) => void;
  selectedClient: Client | null;
  selectedCustomFields?: string[];
  showAddNew?: boolean;
}

interface CustomField {
  title: string;
  value: string;
  type: 'text' | 'file';
  file: File | null;
}

export default function ClientSelector({
  onClientSelect,
  onCustomFieldsSelect,
  selectedClient,
  selectedCustomFields = [],
  showAddNew = true,
}: ClientSelectorProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [selectedClientName, setSelectedClientName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [newClient, setNewClient] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    image_url: '',
    image_file: null as File | null,
    customFields: [{ title: '', value: '', type: 'text' as const, file: null as File | null }]
  });

  const { organization } = useAuthStore();
  const { getThemeStyle, theme } = useTheme();
  const { addToast } = useUI();

  useEffect(() => {
    if (!organization?.id) return;
    loadClients();
  }, [organization]);

  const loadClients = async (searchQuery = '') => {
    if (!organization?.id) return;

    setIsLoading(true);
    try {
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select(`
          *,
          custom_fields:client_custom_fields(*)
        `)
        .eq('organization_id', organization.id)
        .ilike('name', `%${searchQuery}%`)
        .limit(50);

      if (clientsError) throw clientsError;
      setClients(clientsData || []);
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

  const handleCreateClient = async () => {
    if (!organization?.id || !newClient.name.trim()) return;

    setIsCreatingClient(true);
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
          setIsCreatingClient(false);
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
          email: newClient.email.trim(),
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

      // Add the new client to the list and select it
      setClients(prev => [...prev, clientData]);
      handleClientSelect(clientData);
      setShowNewClientModal(false);
      setNewClient({
        name: '',
        phone: '',
        address: '',
        email: '',
        image_url: '',
        image_file: null,
        customFields: [{ title: '', value: '', type: 'text', file: null }]
      });

      addToast({
        type: 'success',
        title: 'Client Created',
        message: 'New client has been created successfully.'
      });
    } catch (error) {
      console.error('Error creating client:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to create client'
      });
    } finally {
      setIsCreatingClient(false);
    }
  };

  const handleAddCustomField = () => {
    setNewClient(prev => ({
      ...prev,
      customFields: [...prev.customFields, { title: '', value: '', type: 'text', file: null }]
    }));
  };

  const handleRemoveCustomField = (index: number) => {
    setNewClient(prev => ({
      ...prev,
      customFields: prev.customFields.filter((_, i) => i !== index)
    }));
  };

  const handleCustomFieldChange = (index: number, field: Partial<CustomField>) => {
    setNewClient(prev => ({
      ...prev,
      customFields: prev.customFields.map((f, i) => 
        i === index ? { ...f, ...field } : f
      )
    }));
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setClientSearch(value);
    setShowClientDropdown(true);
    loadClients(value);
  };

  const handleClientSelect = (client: Client) => {
    setSelectedClientName(client.name);
    setClientSearch(client.name);
    setShowClientDropdown(false);
    onClientSelect(client);
    if (onCustomFieldsSelect) {
      onCustomFieldsSelect(client.custom_fields?.map(f => f.id) || []);
    }
  };

  const handleClearClient = () => {
    onClientSelect(null);
    setSelectedClientName('');
    setClientSearch('');
    setShowClientDropdown(false);
    if (onCustomFieldsSelect) {
      onCustomFieldsSelect([]);
    }
  };

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className={`text-sm font-bold ${getThemeStyle(theme, 'text', 'primary')}`}>Select Client</h3>
          {showAddNew && (
            <button
              type="button"
              onClick={() => setShowNewClientModal(true)}
              className={`text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1.5`}
            >
              <Plus className="h-4 w-4" />
              Add New Client
            </button>
          )}
        </div>
        <div className="relative">
          <input
            type="text"
            value={clientSearch}
            onChange={handleSearchChange}
            onFocus={() => setShowClientDropdown(true)}
            placeholder="Search for a client"
            className={`w-full rounded-lg border ${getThemeStyle(theme, 'border', 'primary')} ${getThemeStyle(theme, 'background', 'secondary')} px-3 py-2 text-sm ${getThemeStyle(theme, 'text', 'primary')} shadow-sm hover:border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors`}
          />
          {selectedClient && (
            <button
              type="button"
              onClick={handleClearClient}
              className="absolute right-10 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            {isLoading ? (
              <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            )}
          </div>
          {showClientDropdown && clients.length > 0 && (
            <div className={`absolute z-10 mt-1 w-full rounded-lg shadow-lg ${getThemeStyle(theme, 'background', 'secondary')} border ${getThemeStyle(theme, 'border', 'primary')} max-h-60 overflow-auto`}>
              {clients.map(client => (
                <div
                  key={client.id}
                  onClick={() => handleClientSelect(client)}
                  className={`px-3 py-2 text-sm cursor-pointer ${getThemeStyle(theme, 'text', 'primary')} hover:bg-blue-50 hover:text-blue-700 transition-colors`}
                >
                  {client.name}
                </div>
              ))}
            </div>
          )}
        </div>
        {selectedClient && (
          <div className={`text-sm ${getThemeStyle(theme, 'text', 'secondary')}`}>
            Selected: {selectedClientName}
          </div>
        )}
      </div>

      {/* New Client Modal */}
      {showNewClientModal && (
        <div className="fixed inset-0 z-50">
          <div className={`absolute inset-0 ${getThemeStyle(theme, 'modal', 'overlay')} transition-opacity`} />
          <div className="fixed inset-0 z-10 overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <div className={`relative transform overflow-hidden rounded-lg ${getThemeStyle(theme, 'modal', 'background')} text-left shadow-xl transition-all sm:my-8 w-full max-w-[450px]`}>
                <div className={`${getThemeStyle(theme, 'modal', 'background')} px-4 pb-4 pt-5 sm:p-6 sm:pb-4`}>
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                      <h3 className={`text-lg font-semibold leading-6 ${getThemeStyle(theme, 'text', 'primary')}`}>
                        Add New Client
                      </h3>
                      <div className="mt-4 space-y-4">
                        <div>
                          <label className={`block text-sm font-medium ${getThemeStyle(theme, 'text', 'secondary')} mb-1.5`}>Name *</label>
                          <input
                            type="text"
                            value={newClient.name}
                            onChange={(e) => setNewClient(prev => ({ ...prev, name: e.target.value }))}
                            className={`block w-full rounded-lg border ${getThemeStyle(theme, 'border', 'primary')} ${getThemeStyle(theme, 'background', 'secondary')} px-3 py-2 text-sm ${getThemeStyle(theme, 'text', 'primary')} focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors`}
                            placeholder="Enter client name"
                          />
                        </div>
                        <div>
                          <label className={`block text-sm font-medium ${getThemeStyle(theme, 'text', 'secondary')} mb-1.5`}>Email</label>
                          <input
                            type="email"
                            value={newClient.email}
                            onChange={(e) => setNewClient(prev => ({ ...prev, email: e.target.value }))}
                            className={`block w-full rounded-lg border ${getThemeStyle(theme, 'border', 'primary')} ${getThemeStyle(theme, 'background', 'secondary')} px-3 py-2 text-sm ${getThemeStyle(theme, 'text', 'primary')} focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors`}
                            placeholder="Enter email address"
                          />
                        </div>
                        <div>
                          <label className={`block text-sm font-medium ${getThemeStyle(theme, 'text', 'secondary')} mb-1.5`}>Phone</label>
                          <input
                            type="tel"
                            value={newClient.phone}
                            onChange={(e) => setNewClient(prev => ({ ...prev, phone: e.target.value }))}
                            className={`block w-full rounded-lg border ${getThemeStyle(theme, 'border', 'primary')} ${getThemeStyle(theme, 'background', 'secondary')} px-3 py-2 text-sm ${getThemeStyle(theme, 'text', 'primary')} focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors`}
                            placeholder="Enter phone number"
                          />
                        </div>
                        <div>
                          <label className={`block text-sm font-medium ${getThemeStyle(theme, 'text', 'secondary')} mb-1.5`}>Address</label>
                          <textarea
                            value={newClient.address}
                            onChange={(e) => setNewClient(prev => ({ ...prev, address: e.target.value }))}
                            rows={2}
                            className={`block w-full rounded-lg border ${getThemeStyle(theme, 'border', 'primary')} ${getThemeStyle(theme, 'background', 'secondary')} px-3 py-2 text-sm ${getThemeStyle(theme, 'text', 'primary')} focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors`}
                            placeholder="Enter address"
                          />
                        </div>
                        <div>
                          <label className={`block text-sm font-medium ${getThemeStyle(theme, 'text', 'secondary')} mb-1.5`}>Profile Image</label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setNewClient(prev => ({ ...prev, image_file: file }));
                              }
                            }}
                            className={`block w-full rounded-lg border ${getThemeStyle(theme, 'border', 'primary')} ${getThemeStyle(theme, 'background', 'secondary')} px-3 py-2 text-sm ${getThemeStyle(theme, 'text', 'primary')} focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors`}
                          />
                        </div>

                        {/* Custom Fields Section */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className={`text-sm font-medium ${getThemeStyle(theme, 'text', 'secondary')}`}>Custom Fields</h4>
                            <button
                              type="button"
                              onClick={handleAddCustomField}
                              className={`text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1.5`}
                            >
                              <Plus className="h-4 w-4" />
                              Add Field
                            </button>
                          </div>
                          {newClient.customFields.map((field, index) => (
                            <div key={index} className="space-y-2">
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={field.title}
                                  onChange={(e) => handleCustomFieldChange(index, { title: e.target.value })}
                                  placeholder="Field Title"
                                  className={`flex-1 rounded-lg border ${getThemeStyle(theme, 'border', 'primary')} ${getThemeStyle(theme, 'background', 'secondary')} px-3 py-2 text-sm ${getThemeStyle(theme, 'text', 'primary')} focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors`}
                                />
                                <select
                                  value={field.type}
                                  onChange={(e) => handleCustomFieldChange(index, { type: e.target.value as 'text' | 'file' })}
                                  className={`rounded-lg border ${getThemeStyle(theme, 'border', 'primary')} ${getThemeStyle(theme, 'background', 'secondary')} px-3 py-2 text-sm ${getThemeStyle(theme, 'text', 'primary')} focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors`}
                                >
                                  <option value="text">Text</option>
                                  <option value="file">File</option>
                                </select>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveCustomField(index)}
                                  className={`p-2 text-gray-400 hover:text-gray-600`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                              {field.type === 'text' ? (
                                <input
                                  type="text"
                                  value={field.value}
                                  onChange={(e) => handleCustomFieldChange(index, { value: e.target.value })}
                                  placeholder="Field Value"
                                  className={`w-full rounded-lg border ${getThemeStyle(theme, 'border', 'primary')} ${getThemeStyle(theme, 'background', 'secondary')} px-3 py-2 text-sm ${getThemeStyle(theme, 'text', 'primary')} focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors`}
                                />
                              ) : (
                                <input
                                  type="file"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      handleCustomFieldChange(index, { file });
                                    }
                                  }}
                                  className={`w-full rounded-lg border ${getThemeStyle(theme, 'border', 'primary')} ${getThemeStyle(theme, 'background', 'secondary')} px-3 py-2 text-sm ${getThemeStyle(theme, 'text', 'primary')} focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors`}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className={`${getThemeStyle(theme, 'background', 'secondary')} px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6`}>
                  <button
                    type="button"
                    onClick={handleCreateClient}
                    disabled={!newClient.name.trim() || isCreatingClient}
                    className="inline-flex w-full justify-center rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 sm:ml-3 sm:w-auto disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    {isCreatingClient ? (
                      <>
                        <Loader2 className="animate-spin h-4 w-4 mr-2" />
                        Creating...
                      </>
                    ) : (
                      'Create Client'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewClientModal(false)}
                    className={`mt-3 inline-flex w-full justify-center rounded-lg px-3 py-2 text-sm font-medium ${getThemeStyle(theme, 'text', 'primary')} shadow-sm ring-1 ring-inset ${getThemeStyle(theme, 'border', 'primary')} ${getThemeStyle(theme, 'interactive', 'hover', 'background')} sm:mt-0 sm:w-auto`}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 