import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useUI } from '../../context/UIContext';
import { useTheme } from '../../context/ThemeContext';
import { format } from 'date-fns';
import { 
  ArrowLeft, Phone, MapPin, Calendar, User, 
  DollarSign, Package, FileText, Upload, X,
  Loader2, XCircle, Edit2, Trash2, CheckCircle, Plus
} from 'lucide-react';
import { CURRENCIES } from '../../utils/constants';
import DateRangeSelector, { DateFilterType } from '../common/DateRangeSelector';
import { ConfirmationModal } from '../common/ConfirmationModal';

interface Client {
  id: string;
  name: string;
  phone: string;
  address: string;
  date_of_birth: string;
  custom_fields?: Array<{
    id: string;
    title: string;
    value: string;
    type: 'text' | 'file';
  }>;
  total_balance: number;
  orders?: Array<{
    id: string;
    order_number: string;
    total_amount: number;
    outstanding_balance: number;
    created_at: string;
    status: string;
  }>;
  sales_orders?: Array<{
    id: string;
    order_number: string;
    total_amount: number;
    outstanding_balance: number;
    payment_status: 'unpaid' | 'partial' | 'paid';
    notes?: string;
    created_at: string;
  }>;
  image_url?: string;
  status: string;
}

interface Order {
  id: string;
  order_number: string;
  total_amount: number;
  outstanding_balance: number;
  created_at: string;
  status: string;
}

interface CustomField {
  title: string;
  value: string;
  type: 'text' | 'file';
  file: File | null;
}

interface SalesOrder {
  id: string;
  order_number: string;
  total_amount: number;
  outstanding_balance: number;
  payment_status: 'unpaid' | 'partial' | 'paid';
  notes?: string;
  created_at: string;
}

interface EditClientModalProps {
  client: Client;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedClient: Client) => Promise<void>;
  isSubmitting: boolean;
}

function EditClientModal({ client, isOpen, onClose, onSave, isSubmitting }: EditClientModalProps) {
  const [editedClient, setEditedClient] = useState<Client>(client);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(editedClient);
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40 bg-gray-500 bg-opacity-75 transition-opacity" 
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-[400px] max-w-full overflow-y-auto bg-white dark:bg-dark-bg-secondary shadow-xl transform transition-transform duration-300 ease-in-out">
        <form onSubmit={handleSubmit} className="h-full flex flex-col">
          <div className="flex-1 px-4 pt-5 pb-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-dark-text-primary">Edit Client Details</h3>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Name</label>
                <input
                  type="text"
                  value={editedClient.name}
                  onChange={(e) => setEditedClient(prev => ({ ...prev, name: e.target.value }))}
                  className="mt-1 block w-full min-h-[30px] py-2 px-4 rounded-lg border-gray-300 dark:border-dark-border-primary shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-colors duration-200 bg-white dark:bg-dark-bg-tertiary text-gray-900 dark:text-dark-text-primary"
                  placeholder="Enter client name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Phone</label>
                <input
                  type="tel"
                  value={editedClient.phone || ''}
                  onChange={(e) => setEditedClient(prev => ({ ...prev, phone: e.target.value }))}
                  className="mt-1 block w-full min-h-[30px] py-2 px-4 rounded-lg border-gray-300 dark:border-dark-border-primary shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-colors duration-200 bg-white dark:bg-dark-bg-tertiary text-gray-900 dark:text-dark-text-primary"
                  placeholder="Enter phone number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Address</label>
                <textarea
                  value={editedClient.address || ''}
                  onChange={(e) => setEditedClient(prev => ({ ...prev, address: e.target.value }))}
                  rows={3}
                  className="mt-1 block w-full min-h-[30px] py-2 px-4 rounded-lg border-gray-300 dark:border-dark-border-primary shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-colors duration-200 bg-white dark:bg-dark-bg-tertiary text-gray-900 dark:text-dark-text-primary"
                  placeholder="Enter client address"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Date of Birth</label>
                <input
                  type="date"
                  value={editedClient.date_of_birth || ''}
                  onChange={(e) => setEditedClient(prev => ({ ...prev, date_of_birth: e.target.value }))}
                  className="mt-1 block w-full min-h-[30px] py-2 px-4 rounded-lg border-gray-300 dark:border-dark-border-primary shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-colors duration-200 bg-white dark:bg-dark-bg-tertiary text-gray-900 dark:text-dark-text-primary"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-dark-border-primary px-4 py-4 sm:px-6">
            <div className="flex flex-col space-y-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm disabled:bg-gray-400 transition-colors duration-200"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin h-4 w-4 mr-2" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full inline-flex justify-center rounded-lg border border-gray-300 dark:border-dark-border-primary shadow-sm px-4 py-2 bg-white dark:bg-dark-bg-secondary text-base font-medium text-gray-700 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm transition-colors duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}

interface AddCustomFieldModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (field: CustomField) => Promise<void>;
  isSubmitting: boolean;
}

function AddCustomFieldModal({ isOpen, onClose, onAdd, isSubmitting }: AddCustomFieldModalProps) {
  const [field, setField] = useState<CustomField>({
    title: '',
    value: '',
    type: 'text',
    file: null
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onAdd(field);
    setField({ title: '', value: '', type: 'text', file: null });
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-[300px] max-w-full overflow-y-auto bg-white dark:bg-dark-bg-secondary shadow-xl transform transition-transform duration-300 ease-in-out">
        <form onSubmit={handleSubmit} className="h-full flex flex-col">
          <div className="flex-1 px-4 pt-5 pb-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-dark-text-primary">Add Custom Field</h3>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Field Title</label>
                <input
                  type="text"
                  value={field.title}
                  onChange={(e) => setField(prev => ({ ...prev, title: e.target.value }))}
                  className="mt-1 block w-full min-h-[30px] py-2 px-4 rounded-lg border-gray-300 dark:border-dark-border-primary shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-colors duration-200 bg-white dark:bg-dark-bg-tertiary text-gray-900 dark:text-dark-text-primary"
                  placeholder="Enter field title"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Field Type</label>
                <select
                  value={field.type}
                  onChange={(e) => setField(prev => ({ ...prev, type: e.target.value as 'text' | 'file' }))}
                  className="mt-1 block w-full min-h-[30px] py-2 px-4 rounded-lg border-gray-300 dark:border-dark-border-primary shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-colors duration-200 bg-white dark:bg-dark-bg-tertiary text-gray-900 dark:text-dark-text-primary"
                >
                  <option value="text">Text</option>
                  <option value="file">File</option>
                </select>
              </div>

              {field.type === 'text' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Value</label>
                  <input
                    type="text"
                    value={field.value}
                    onChange={(e) => setField(prev => ({ ...prev, value: e.target.value }))}
                    className="mt-1 block w-full min-h-[30px] py-2 px-4 rounded-lg border-gray-300 dark:border-dark-border-primary shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-colors duration-200 bg-white dark:bg-dark-bg-tertiary text-gray-900 dark:text-dark-text-primary"
                    placeholder="Enter field value"
                    required
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">File</label>
                  <input
                    type="file"
                    onChange={(e) => setField(prev => ({ ...prev, file: e.target.files?.[0] || null }))}
                    className="mt-1 block w-full text-sm text-gray-500 dark:text-dark-text-tertiary
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-lg file:border-0
                      file:text-sm file:font-medium
                      file:bg-blue-50 file:text-blue-700
                      dark:file:bg-blue-900/20 dark:file:text-blue-300
                      hover:file:bg-blue-100 dark:hover:file:bg-blue-900/30"
                    required
                  />
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-dark-border-primary px-4 py-4 sm:px-6">
            <div className="flex flex-col space-y-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm disabled:bg-gray-400 transition-colors duration-200"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin h-4 w-4 mr-2" />
                    Adding...
                  </>
                ) : (
                  'Add Field'
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full inline-flex justify-center rounded-lg border border-gray-300 dark:border-dark-border-primary shadow-sm px-4 py-2 bg-white dark:bg-dark-bg-secondary text-base font-medium text-gray-700 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm transition-colors duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}

interface DeleteArchiveModalProps {
  client: Client;
  isOpen: boolean;
  onClose: () => void;
  onArchive: () => Promise<void>;
  onDelete: () => Promise<void>;
  isSubmitting: boolean;
}

function DeleteArchiveModal({ client, isOpen, onClose, onArchive, onDelete, isSubmitting }: DeleteArchiveModalProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40 bg-gray-500 bg-opacity-75 transition-opacity" 
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-[400px] max-w-full overflow-y-auto bg-white dark:bg-dark-bg-secondary shadow-xl transform transition-transform duration-300 ease-in-out">
        <div className="h-full flex flex-col">
          <div className="flex-1 px-4 pt-5 pb-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-dark-text-primary">Client Options</h3>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                      Choose an Action
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                      <p>
                        Please select whether you want to archive or permanently delete this client.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  onClick={onArchive}
                  disabled={isSubmitting}
                  className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm disabled:bg-gray-400 transition-colors duration-200"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin h-4 w-4 mr-2" />
                      Archiving...
                    </>
                  ) : (
                    'Archive Client'
                  )}
                </button>
                <button
                  onClick={onDelete}
                  disabled={isSubmitting}
                  className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:text-sm disabled:bg-gray-400 transition-colors duration-200"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin h-4 w-4 mr-2" />
                      Deleting...
                    </>
                  ) : (
                    'Delete Client Permanently'
                  )}
                </button>
                <button
                  onClick={onClose}
                  className="w-full inline-flex justify-center rounded-lg border border-gray-300 dark:border-dark-border-primary shadow-sm px-4 py-2 bg-white dark:bg-dark-bg-secondary text-base font-medium text-gray-700 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm transition-colors duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

interface EditCustomFieldModalProps {
  field: {
    id: string;
    title: string;
    value: string;
    type: 'text' | 'file';
    file?: File | null;
  };
  isOpen: boolean;
  onClose: () => void;
  onSave: (field: { id: string; title: string; value: string; type: 'text' | 'file'; file?: File | null }) => Promise<void>;
  isSubmitting: boolean;
}

function EditCustomFieldModal({ field, isOpen, onClose, onSave, isSubmitting }: EditCustomFieldModalProps) {
  const [editedField, setEditedField] = useState(field);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(editedField);
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40 bg-gray-500 bg-opacity-75 transition-opacity" 
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-[300px] max-w-full overflow-y-auto bg-white dark:bg-dark-bg-secondary shadow-xl transform transition-transform duration-300 ease-in-out">
        <form onSubmit={handleSubmit} className="h-full flex flex-col">
          <div className="flex-1 px-4 pt-5 pb-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-dark-text-primary">Edit Custom Field</h3>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Field Title</label>
                <input
                  type="text"
                  value={editedField.title}
                  onChange={(e) => setEditedField(prev => ({ ...prev, title: e.target.value }))}
                  className="mt-1 block w-full min-h-[30px] py-2 px-4 rounded-lg border-gray-300 dark:border-dark-border-primary shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-colors duration-200 bg-white dark:bg-dark-bg-tertiary text-gray-900 dark:text-dark-text-primary"
                  placeholder="Enter field title"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Field Type</label>
                <select
                  value={editedField.type}
                  onChange={(e) => setEditedField(prev => ({ ...prev, type: e.target.value as 'text' | 'file' }))}
                  className="mt-1 block w-full min-h-[30px] py-2 px-4 rounded-lg border-gray-300 dark:border-dark-border-primary shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-colors duration-200 bg-white dark:bg-dark-bg-tertiary text-gray-900 dark:text-dark-text-primary"
                >
                  <option value="text">Text</option>
                  <option value="file">File</option>
                </select>
              </div>

              {editedField.type === 'text' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Value</label>
                  <input
                    type="text"
                    value={editedField.value}
                    onChange={(e) => setEditedField(prev => ({ ...prev, value: e.target.value }))}
                    className="mt-1 block w-full min-h-[30px] py-2 px-4 rounded-lg border-gray-300 dark:border-dark-border-primary shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-colors duration-200 bg-white dark:bg-dark-bg-tertiary text-gray-900 dark:text-dark-text-primary"
                    placeholder="Enter field value"
                    required
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">File</label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setEditedField(prev => ({ ...prev, value: URL.createObjectURL(file) }));
                      }
                    }}
                    className="mt-1 block w-full text-sm text-gray-500 dark:text-dark-text-tertiary
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-lg file:border-0
                      file:text-sm file:font-medium
                      file:bg-blue-50 file:text-blue-700
                      dark:file:bg-blue-900/20 dark:file:text-blue-300
                      hover:file:bg-blue-100 dark:hover:file:bg-blue-900/30"
                  />
                  {editedField.value && (
                    <div className="mt-2">
                      <a href={editedField.value} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">
                        Current file
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-dark-border-primary px-4 py-4 sm:px-6">
            <div className="flex flex-col space-y-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm disabled:bg-gray-400 transition-colors duration-200"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin h-4 w-4 mr-2" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full inline-flex justify-center rounded-lg border border-gray-300 dark:border-dark-border-primary shadow-sm px-4 py-2 bg-white dark:bg-dark-bg-secondary text-base font-medium text-gray-700 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm transition-colors duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}

export default function ClientDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newCustomField, setNewCustomField] = useState<CustomField>({
    title: '',
    value: '',
    type: 'text',
    file: null
  });
  const { organization } = useAuthStore();
  const { addToast } = useUI();
  const currencySymbol = organization?.currency ? CURRENCIES[organization.currency]?.symbol || organization.currency : '';
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddCustomFieldModalOpen, setIsAddCustomFieldModalOpen] = useState(false);
  const [isDeleteArchiveModalOpen, setIsDeleteArchiveModalOpen] = useState(false);
  const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] = useState(false);
  const [isEditCustomFieldModalOpen, setIsEditCustomFieldModalOpen] = useState(false);
  const [selectedCustomField, setSelectedCustomField] = useState<{
    id: string;
    title: string;
    value: string;
    type: 'text' | 'file';
    file?: File | null;
  } | null>(null);
  
  // Date range filter state
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [dateFilterType, setDateFilterType] = useState<DateFilterType>('year');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id || !organization) return;
    loadClientDetails();
  }, [id, organization]);

  const loadClientDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select(`
          *,
          custom_fields:client_custom_fields(*),
          orders:orders(
            id,
            order_number,
            total_amount,
            outstanding_balance,
            created_at,
            status
          ),
          sales_orders:sales_orders(
            id,
            order_number,
            total_amount,
            outstanding_balance,
            payment_status,
            notes,
            created_at
          )
        `)
        .eq('id', id)
        .eq('organization_id', organization?.id)
        .single();

      if (error) throw error;

      // Calculate total balance from both orders and sales_orders
      const ordersBalance = data.orders?.reduce(
        (sum: number, order: Order) => sum + (order.outstanding_balance || 0),
        0
      ) || 0;

      const salesOrdersBalance = data.sales_orders?.reduce(
        (sum: number, order: SalesOrder) => sum + (order.outstanding_balance || 0),
        0
      ) || 0;

      setClient({
        ...data,
        total_balance: ordersBalance + salesOrdersBalance
      });
    } catch (error) {
      console.error('Error loading client details:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to load client details'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateClient = async (updatedClient: Client) => {
    if (!organization) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('clients')
        .update({
          name: updatedClient.name,
          phone: updatedClient.phone,
          address: updatedClient.address,
          date_of_birth: updatedClient.date_of_birth
        })
        .eq('id', updatedClient.id)
        .eq('organization_id', organization.id);

      if (error) throw error;

      setClient(updatedClient);
      setIsEditModalOpen(false);
      addToast({
        type: 'success',
        title: 'Success',
        message: 'Client details updated successfully'
      });
    } catch (error) {
      console.error('Error updating client:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to update client details'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddCustomField = async (field: CustomField) => {
    if (!client || !organization) return;

    setIsSubmitting(true);
    try {
      let fieldValue = field.value;

      if (field.type === 'file' && field.file) {
        const fileExt = field.file.name.split('.').pop()?.toLowerCase();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${organization.id}/clients/${client.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('profiles')
          .upload(filePath, field.file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('profiles')
          .getPublicUrl(filePath);

        fieldValue = publicUrl;
      }

      const { error } = await supabase
        .from('client_custom_fields')
        .insert({
          client_id: client.id,
          title: field.title.trim(),
          value: fieldValue,
          type: field.type
        });

      if (error) throw error;

      setIsAddCustomFieldModalOpen(false);
      loadClientDetails();
      addToast({
        type: 'success',
        title: 'Success',
        message: 'Custom field added successfully'
      });
    } catch (error) {
      console.error('Error adding custom field:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to add custom field'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCustomField = async (fieldId: string) => {
    if (!client) return;

    try {
      const { error } = await supabase
        .from('client_custom_fields')
        .delete()
        .eq('id', fieldId);

      if (error) throw error;

      loadClientDetails();
      addToast({
        type: 'success',
        title: 'Success',
        message: 'Custom field deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting custom field:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to delete custom field'
      });
    }
  };

  const handleArchiveClient = async () => {
    if (!client || !organization) return;

    setIsSubmitting(true);
    try {
      // Update client status to archived
      const { error: updateError } = await supabase
        .from('clients')
        .update({ status: 'archived' })
        .eq('id', client.id)
        .eq('organization_id', organization.id);

      if (updateError) throw updateError;

      addToast({
        type: 'success',
        title: 'Success',
        message: 'Client archived successfully'
      });

      navigate('/dashboard/clients');
    } catch (error) {
      console.error('Error archiving client:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to archive client'
      });
    } finally {
      setIsSubmitting(false);
      setIsDeleteArchiveModalOpen(false);
    }
  };

  const handleDeleteClient = async () => {
    if (!client || !organization) return;

    setIsSubmitting(true);
    try {
      // Delete custom fields
      const { error: customFieldsError } = await supabase
        .from('client_custom_fields')
        .delete()
        .eq('client_id', client.id);

      if (customFieldsError) throw customFieldsError;

      // Delete profile image if it exists
      if (client.image_url) {
        const filePath = client.image_url.split('/').slice(-3).join('/');
        const { error: storageError } = await supabase.storage
          .from('profiles')
          .remove([filePath]);

        if (storageError) {
          console.error('Error deleting profile image:', storageError);
        }
      }

      // Delete the client
      const { error: deleteError } = await supabase
        .from('clients')
        .delete()
        .eq('id', client.id)
        .eq('organization_id', organization.id);

      if (deleteError) throw deleteError;

      addToast({
        type: 'success',
        title: 'Success',
        message: 'Client deleted successfully'
      });

      navigate('/dashboard/clients');
    } catch (error) {
      console.error('Error deleting client:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to delete client'
      });
    } finally {
      setIsSubmitting(false);
      setIsDeleteArchiveModalOpen(false);
      setIsConfirmDeleteModalOpen(false);
    }
  };

  const handleClientActivation = async () => {
    if (!client || !organization) return;

    setIsSubmitting(true);
    try {
      const { error: updateError } = await supabase
        .from('clients')
        .update({ status: 'active' })
        .eq('id', client.id)
        .eq('organization_id', organization.id);

      if (updateError) throw updateError;

      // Reload client details to reflect the status change
      await loadClientDetails();

      addToast({
        type: 'success',
        title: 'Success',
        message: 'Client activated successfully'
      });
    } catch (error) {
      console.error('Error activating client:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to activate client'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter orders based on date range
  const getFilteredOrders = () => {
    if (!client) return [];
    
    const allOrders = [...(client.orders || []), ...(client.sales_orders || [])];
    
    // Calculate date range based on filter type
    let startDate: Date;
    let endDate: Date;
    
    switch (dateFilterType) {
      case 'day':
        startDate = new Date(currentDate);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(currentDate);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'week':
        // Get the start of the week (Monday)
        startDate = new Date(currentDate);
        startDate.setDate(currentDate.getDate() - currentDate.getDay() + 1);
        startDate.setHours(0, 0, 0, 0);
        
        // Get the end of the week (Sunday)
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'month':
        // Get the start of the month
        startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        startDate.setHours(0, 0, 0, 0);
        
        // Get the end of the month
        endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'year':
        // Get the start of the year
        startDate = new Date(currentDate.getFullYear(), 0, 1);
        startDate.setHours(0, 0, 0, 0);
        
        // Get the end of the year
        endDate = new Date(currentDate.getFullYear(), 11, 31);
        endDate.setHours(23, 59, 59, 999);
        break;
      default:
        return allOrders;
    }
    
    // Filter orders within the date range
    return allOrders.filter(order => {
      const orderDate = new Date(order.created_at);
      return orderDate >= startDate && orderDate <= endDate;
    });
  };

  // Handle date range navigation
  const handleDateChange = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    
    switch (dateFilterType) {
      case 'day':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
        break;
      case 'year':
        newDate.setFullYear(newDate.getFullYear() + (direction === 'next' ? 1 : -1));
        break;
    }
    
    setCurrentDate(newDate);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !client || !organization) return;

    setIsUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${organization.id}/clients/${client.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profiles')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('clients')
        .update({ image_url: publicUrl })
        .eq('id', client.id)
        .eq('organization_id', organization.id);

      if (updateError) throw updateError;

      // Update the client state with the new image URL
      setClient(prev => prev ? { ...prev, image_url: publicUrl } : null);
      addToast({
        type: 'success',
        title: 'Success',
        message: 'Client image updated successfully'
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to upload client image'
      });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleEditCustomField = async (field: { id: string; title: string; value: string; type: 'text' | 'file'; file?: File | null }) => {
    if (!client || !organization) return;

    setIsSubmitting(true);
    try {
      let fieldValue = field.value;

      if (field.type === 'file' && field.file) {
        const fileExt = field.file.name.split('.').pop()?.toLowerCase();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${organization.id}/clients/${client.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('profiles')
          .upload(filePath, field.file, {
            cacheControl: '3600',
            upsert: true
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('profiles')
          .getPublicUrl(filePath);

        fieldValue = publicUrl;
      }

      const { error } = await supabase
        .from('client_custom_fields')
        .update({
          title: field.title.trim(),
          value: fieldValue,
          type: field.type
        })
        .eq('id', field.id);

      if (error) throw error;

      setIsEditCustomFieldModalOpen(false);
      loadClientDetails();
      addToast({
        type: 'success',
        title: 'Success',
        message: 'Custom field updated successfully'
      });
    } catch (error) {
      console.error('Error updating custom field:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to update custom field'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading client details...</p>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Client not found.</p>
          <button
            onClick={() => navigate('/dashboard/clients')}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Clients
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg-primary">
      {client.status === 'archived' && (
      <h1 className="text-center text-red-500 text-5xl py-10 font-semibold">This Client is Archived.</h1>
      )}
      <div className="flex flex-col lg:flex-row">
        {/* Left Panel - Client Info */}
        <div className="w-full lg:w-80 bg-white dark:bg-dark-bg-secondary border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-dark-border-primary">
          <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-4 lg:space-y-4">
            {/* Header with Edit Button */}
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-dark-text-primary">Client Profile</h2>
              {client.status !== 'archived' && (
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="inline-flex items-center px-2 py-1 sm:px-2.5 sm:py-1.5 border border-gray-300 dark:border-dark-border-secondary rounded-md text-xs font-medium text-gray-700 dark:text-dark-text-secondary bg-white dark:bg-dark-bg-secondary hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary"
                >
                  <Edit2 className="h-3 w-3 mr-1" />
                  Edit
                </button>
              )}
            </div>

            {/* Client Profile Image */}
            <div className="">
              <div className="relative inline-block group">
                <div 
                  className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-md mx-auto bg-gray-100 dark:bg-dark-bg-tertiary flex items-center justify-center overflow-hidden cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {client.image_url ? (
                    <img 
                      src={client.image_url} 
                      alt={client.name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 text-gray-400 dark:text-dark-text-tertiary" />
                  )}
                  <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Upload className="h-6 w-6 text-white" />
                  </div>
                </div>
                {isUploadingImage && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 rounded-md">
                    <Loader2 className="h-6 w-6 text-white animate-spin" />
                  </div>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  className="hidden"
                />
              </div>
              <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-dark-text-primary mt-2 sm:mt-2">{client.name}</h2>
            </div>

            {/* Client Details Section */}
            <div className='space-y-2'>
              <div className="flex items-center text-xs sm:text-sm">
                <Phone className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 dark:text-dark-text-tertiary mr-2 sm:mr-3" />
                <span className="text-gray-600 dark:text-dark-text-secondary">{client.phone || 'No phone number'}</span>
              </div>
              <div className="flex items-center text-xs sm:text-sm">
                <MapPin className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 dark:text-dark-text-tertiary mr-2 sm:mr-3" />
                <span className="text-gray-600 dark:text-dark-text-secondary">{client.address || 'No address'}</span>
              </div>
              <div className="flex items-center text-xs sm:text-sm">
                <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 dark:text-dark-text-tertiary mr-2 sm:mr-3" />
                <span className="text-gray-600 dark:text-dark-text-secondary">
                  {client.date_of_birth ? format(new Date(client.date_of_birth), 'MMMM d, yyyy') : 'No date of birth'}
                </span>
              </div>
            </div>

            {/* Client Stats Section */}
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-black dark:text-dark-text-primary mb-2 sm:mb-3">All Time Client Stats</h3>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-2 sm:p-3 rounded-lg">
                  <div className="flex items-center">
                    <Package className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500 dark:text-blue-400 mr-1 sm:mr-2" />
                    <p className="text-[10px] sm:text-xs font-medium text-blue-700 dark:text-blue-300">Total Orders</p>
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-blue-900 dark:text-blue-100 mt-1">
                    {(client.orders?.length || 0) + (client.sales_orders?.length || 0)}
                  </p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-2 sm:p-3 rounded-lg">
                  <div className="flex items-center">
                    <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 dark:text-green-400 mr-1 sm:mr-2" />
                    <p className="text-[10px] sm:text-xs font-medium text-green-700 dark:text-green-300">Total Spent</p>
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-green-900 dark:text-green-100 mt-1">
                    {currencySymbol} {(
                      (client.orders?.reduce((sum, order) => sum + order.total_amount, 0) || 0) +
                      (client.sales_orders?.reduce((sum, order) => sum + order.total_amount, 0) || 0)
                    ).toFixed(2)}
                  </p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 p-2 sm:p-3 rounded-lg">
                  <div className="flex items-center">
                    <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-purple-500 dark:text-purple-400 mr-1 sm:mr-2" />
                    <p className="text-[10px] sm:text-xs font-medium text-purple-700 dark:text-purple-300">Completed Orders</p>
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-purple-900 dark:text-purple-100 mt-1">
                    {(client.orders?.filter(order => order.status === 'completed').length || 0) +
                     (client.sales_orders?.filter(order => order.payment_status === 'paid').length || 0)}
                  </p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 p-2 sm:p-3 rounded-lg">
                  <div className="flex items-center">
                    <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-amber-500 dark:text-amber-400 mr-1 sm:mr-2" />
                    <p className="text-[10px] sm:text-xs font-medium text-amber-700 dark:text-amber-300">Outstanding Balance</p>
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-amber-900 dark:text-amber-100 mt-1">
                    {currencySymbol} {client.total_balance.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            {/* Custom Fields Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs sm:text-sm font-bold text-black dark:text-dark-text-primary">Custom Information</h3>
                {client.status !== 'archived' && (
                  <button
                    onClick={() => setIsAddCustomFieldModalOpen(true)}
                    className="inline-flex items-center px-2 py-1 sm:px-2.5 sm:py-1.5 border border-gray-300 dark:border-dark-border-secondary rounded-md text-xs font-medium text-gray-700 dark:text-dark-text-secondary bg-white dark:bg-dark-bg-secondary hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Field
                  </button>
                )}
              </div>
              <div className="space-y-2 w-full">
                {client.custom_fields?.map((field) => (
                  <div key={field.id} className="flex items-center justify-between bg-gray-50 dark:bg-dark-bg-tertiary p-2 sm:p-3 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] sm:text-xs font-medium text-gray-700 dark:text-dark-text-secondary block truncate">{field.title}: </span>
                      {field.type === 'file' ? (
                        <a href={field.value} target="_blank" rel="noopener noreferrer" className="text-[10px] sm:text-xs text-primary-600 dark:text-dark-accent-primary hover:text-primary-800 dark:hover:text-dark-accent-secondary truncate block">
                          View File
                        </a>
                      ) : (
                        <span className="text-[10px] sm:text-xs text-gray-600 dark:text-dark-text-secondary">{field.value}</span>
                      )}
                    </div>
                    {client.status !== 'archived' && (
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => {
                            setSelectedCustomField(field);
                            setIsEditCustomFieldModalOpen(true);
                          }}
                          className="p-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        >
                          <Edit2 className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteCustomField(field.id)}
                          className="p-1 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {(!client.custom_fields || client.custom_fields.length === 0) && (
                  <div className="text-center text-gray-500 dark:text-dark-text-tertiary py-3 sm:py-4 text-xs">
                    No custom information added yet
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 sm:pt-3">
              {client.status === 'archived' ? (
                <button
                  onClick={handleClientActivation}
                  className="w-full inline-flex justify-center items-center px-3 py-2 border border-green-300 dark:border-green-700 rounded-md text-xs font-medium text-green-700 dark:text-green-400 bg-white dark:bg-dark-bg-secondary hover:bg-green-50 dark:hover:bg-green-900/20"
                >
                  <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                  Activate Client
                </button>
              ) : (
                <button
                  onClick={() => setIsDeleteArchiveModalOpen(true)}
                  className="w-full inline-flex justify-center items-center px-3 py-2 border border-red-300 dark:border-red-700 rounded-md text-xs font-medium text-red-700 dark:text-red-400 bg-white dark:bg-dark-bg-secondary hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                  Delete/Archive Client
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Middle Panel - Orders and Financial Info */}
        <div className="flex-1 p-3 sm:p-4 bg-white dark:bg-dark-bg-secondary">
          {/* Orders History */}
          <div className="bg-white dark:bg-dark-bg-secondary rounded-lg overflow-hidden">
            <div className="px-3 sm:px-4 py-2 sm:py-3 border-b border-gray-200 dark:border-dark-border-primary">
              <h3 className="text-xs sm:text-sm font-medium text-gray-900 dark:text-dark-text-primary">Orders History</h3>
              
              {/* Date Range Selector */}
              <div className="mt-2">
                <DateRangeSelector
                  currentDate={currentDate}
                  dateFilterType={dateFilterType}
                  onDateChange={handleDateChange}
                  onFilterTypeChange={setDateFilterType}
                  itemCount={getFilteredOrders().length}
                  itemLabel="orders"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              {getFilteredOrders().length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-border-primary">
                  <thead className="bg-gray-50 dark:bg-dark-bg-tertiary">
                    <tr>
                      <th scope="col" className="px-2 sm:px-4 py-2 text-left text-[10px] sm:text-xs font-medium text-gray-500 dark:text-dark-text-tertiary uppercase tracking-wider whitespace-nowrap">
                        Order #
                      </th>
                      <th scope="col" className="px-2 sm:px-4 py-2 text-left text-[10px] sm:text-xs font-medium text-gray-500 dark:text-dark-text-tertiary uppercase tracking-wider whitespace-nowrap">
                        Type
                      </th>
                      <th scope="col" className="px-2 sm:px-4 py-2 text-left text-[10px] sm:text-xs font-medium text-gray-500 dark:text-dark-text-tertiary uppercase tracking-wider whitespace-nowrap">
                        Date
                      </th>
                      <th scope="col" className="px-2 sm:px-4 py-2 text-left text-[10px] sm:text-xs font-medium text-gray-500 dark:text-dark-text-tertiary uppercase tracking-wider whitespace-nowrap">
                        Amount
                      </th>
                      <th scope="col" className="px-2 sm:px-4 py-2 text-left text-[10px] sm:text-xs font-medium text-gray-500 dark:text-dark-text-tertiary uppercase tracking-wider whitespace-nowrap">
                        Balance
                      </th>
                      <th scope="col" className="px-2 sm:px-4 py-2 text-left text-[10px] sm:text-xs font-medium text-gray-500 dark:text-dark-text-tertiary uppercase tracking-wider whitespace-nowrap">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-dark-bg-secondary divide-y divide-gray-200 dark:divide-dark-border-primary">
                    {getFilteredOrders()
                      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                      .map((order, index) => (
                        <tr key={`${order.id}-${index}`} className="hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary">
                          <td className="px-2 sm:px-4 py-2 whitespace-nowrap text-[10px] sm:text-xs font-medium">
                            <Link
                              to={`/dashboard/${'payment_status' in order ? 'sales' : 'orders'}/${order.id}`}
                              className="text-primary-600 dark:text-dark-accent-primary hover:text-primary-800 dark:hover:text-dark-accent-secondary"
                            >
                              {order.order_number}
                            </Link>
                          </td>
                          <td className="px-2 sm:px-4 py-2 whitespace-nowrap text-[10px] sm:text-xs text-gray-500 dark:text-dark-text-tertiary">
                            {'payment_status' in order ? 'Sales' : 'Order'}
                          </td>
                          <td className="px-2 sm:px-4 py-2 whitespace-nowrap text-[10px] sm:text-xs text-gray-500 dark:text-dark-text-tertiary">
                            {format(new Date(order.created_at), 'MMM d, yyyy')}
                          </td>
                          <td className="px-2 sm:px-4 py-2 whitespace-nowrap text-[10px] sm:text-xs text-gray-900 dark:text-dark-text-primary">
                            {currencySymbol} {order.total_amount.toFixed(2)}
                          </td>
                          <td className="px-2 sm:px-4 py-2 whitespace-nowrap">
                            <span className={`text-[10px] sm:text-xs font-medium ${
                              order.outstanding_balance > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                            }`}>
                              {currencySymbol} {order.outstanding_balance.toFixed(2)}
                            </span>
                          </td>
                          <td className="px-2 sm:px-4 py-2 whitespace-nowrap">
                            <span className={`px-1 sm:px-2 py-0.5 sm:py-1 inline-flex text-[10px] sm:text-xs leading-4 sm:leading-5 font-medium rounded-md ${
                              'payment_status' in order
                                ? order.payment_status === 'paid' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400' :
                                  order.payment_status === 'partial' ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400' :
                                  'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400'
                                : order.status === 'completed' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400' :
                                  order.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400' :
                                  'bg-gray-100 dark:bg-gray-900/20 text-gray-800 dark:text-gray-400'
                            }`}>
                              {'payment_status' in order
                                ? order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1)
                                : order.status.charAt(0).toUpperCase() + order.status.slice(1)
                              }
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center text-gray-500 dark:text-dark-text-tertiary py-3 sm:py-4 text-[10px] sm:text-xs">
                  No orders found for this client in the selected date range.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - Financial Dashboard */}
        <div className="w-full lg:w-80 bg-white dark:bg-dark-bg-secondary border-t lg:border-t-0 lg:border-l border-gray-200 dark:border-dark-border-primary">
          <div className="p-3 sm:p-4 lg:p-6">
            {/* Financial Summary */}
            <div className="space-y-4 sm:space-y-6">
              <h3 className="text-xs sm:text-sm font-bold text-black dark:text-dark-text-primary">Financial Overview</h3>
              
              {/* Total Summary Card */}
              <div className="border-b border-gray-200 dark:border-dark-border-primary pb-3 sm:pb-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-dark-text-primary">Total Balance</h4>
                  <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-primary-600 dark:text-dark-accent-primary" />
                </div>
                <div className="flex items-baseline justify-between">
                  <span className={`text-lg sm:text-xl lg:text-2xl font-bold ${
                    client.total_balance > 0 
                      ? 'text-red-700 dark:text-red-400' 
                      : 'text-green-700 dark:text-green-400'
                  }`}>
                    {currencySymbol} {client.total_balance.toFixed(2)}
                  </span>
                  <span className={`text-[10px] sm:text-xs font-medium px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full ${
                    client.total_balance > 0 
                      ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400' 
                      : 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                  }`}>
                    {client.total_balance > 0 ? 'Outstanding' : 'Cleared'}
                  </span>
                </div>
              </div>

              {/* Orders Summary Card */}
              <div>
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <h4 className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-dark-text-primary">Orders Summary</h4>
                  <Package className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500 dark:text-dark-text-tertiary" />
                </div>
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex justify-between items-baseline">
                    <span className="text-[10px] sm:text-xs text-gray-500 dark:text-dark-text-tertiary">Total Orders</span>
                    <span className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-dark-text-primary">{client.orders?.length || 0}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-[10px] sm:text-xs text-gray-500 dark:text-dark-text-tertiary">Total Amount</span>
                    <span className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-dark-text-primary">
                      {currencySymbol} {(client.orders?.reduce((sum, order) => sum + order.total_amount, 0) || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-[10px] sm:text-xs text-gray-500 dark:text-dark-text-tertiary">Outstanding Balance</span>
                    <span className={`text-xs sm:text-sm font-semibold ${
                      (client.orders?.reduce((sum, order) => sum + (order.outstanding_balance || 0), 0) || 0) > 0 
                        ? 'text-red-600 dark:text-red-400' 
                        : 'text-green-600 dark:text-green-400'
                    }`}>
                      {currencySymbol} {(client.orders?.reduce((sum, order) => sum + (order.outstanding_balance || 0), 0) || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sales Orders Summary Card */}
              <div>
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <h4 className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-dark-text-primary">Sales Orders Summary</h4>
                  <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500 dark:text-dark-text-tertiary" />
                </div>
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex justify-between items-baseline">
                    <span className="text-[10px] sm:text-xs text-gray-500 dark:text-dark-text-tertiary">Total Sales</span>
                    <span className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-dark-text-primary">{client.sales_orders?.length || 0}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-[10px] sm:text-xs text-gray-500 dark:text-dark-text-tertiary">Total Amount</span>
                    <span className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-dark-text-primary">
                      {currencySymbol} {(client.sales_orders?.reduce((sum, order) => sum + order.total_amount, 0) || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-[10px] sm:text-xs text-gray-500 dark:text-dark-text-tertiary">Outstanding Balance</span>
                    <span className={`text-xs sm:text-sm font-semibold ${
                      (client.sales_orders?.reduce((sum, order) => sum + (order.outstanding_balance || 0), 0) || 0) > 0 
                        ? 'text-red-600 dark:text-red-400' 
                        : 'text-green-600 dark:text-green-400'
                    }`}>
                      {currencySymbol} {(client.sales_orders?.reduce((sum, order) => sum + (order.outstanding_balance || 0), 0) || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <EditClientModal
        client={client}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleUpdateClient}
        isSubmitting={isSubmitting}
      />

      <AddCustomFieldModal
        isOpen={isAddCustomFieldModalOpen}
        onClose={() => setIsAddCustomFieldModalOpen(false)}
        onAdd={handleAddCustomField}
        isSubmitting={isSubmitting}
      />

      <DeleteArchiveModal
        client={client}
        isOpen={isDeleteArchiveModalOpen}
        onClose={() => setIsDeleteArchiveModalOpen(false)}
        onArchive={handleArchiveClient}
        onDelete={handleDeleteClient}
        isSubmitting={isSubmitting}
      />

      <ConfirmationModal
        isOpen={isConfirmDeleteModalOpen}
        onClose={() => setIsConfirmDeleteModalOpen(false)}
        onConfirm={handleDeleteClient}
        title="Confirm Permanent Deletion"
        message={`Are you sure you want to permanently delete ${client.name}? This action cannot be undone and will delete all client data including orders, custom fields, and files.`}
        confirmText="Delete Permanently"
        confirmButtonClass="bg-red-600 hover:bg-red-700"
      />

      {selectedCustomField && (
        <EditCustomFieldModal
          field={selectedCustomField}
          isOpen={isEditCustomFieldModalOpen}
          onClose={() => {
            setIsEditCustomFieldModalOpen(false);
            setSelectedCustomField(null);
          }}
          onSave={handleEditCustomField}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
} 