import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Edit2, Trash2, Upload, Loader2, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { useUI } from '../context/UIContext';
import { useTheme } from '../context/ThemeContext';
import { Link } from 'react-router-dom';
import { startOfWeek, endOfWeek, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { CURRENCIES } from '../utils/constants';

interface Worker {
  id: string;
  name: string;
  whatsapp: string | null;
  image: string | null;
  stats?: {
    totalEarnings: number;
    weeklyProjectTotal: number;
    allTimeTasks: number;
    weeklyTasks: number;
    dailyTasks: number;
    assignedTasks: number;
    completedTasks: number;
    inProgressTasks: number;
  };
}

interface Task {
  id: string;
  organization_id: string;
  worker_id: string;
  project_id: string;
  description?: string;
  due_date: string;
  status: 'pending' | 'in_progress' | 'delayed' | 'completed';
  amount: number;
  completed_at?: string;
  late_reason?: string;
  created_at: string;
  updated_at: string;
  status_changed_at?: string;
  delay_reason?: string;
  order_id?: string;
  project?: {
    id: string;
    name: string;
  };
  worker?: {
    id: string;
    name: string;
  };
}

export default function WorkersList() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddWorker, setShowAddWorker] = useState(false);
  const [newWorker, setNewWorker] = useState({
    name: '',
    whatsapp: '',
    image: ''
  });
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { organization } = useAuthStore();
  const { confirm, addToast } = useUI();
  const { theme, getThemeStyle } = useTheme();
  const currencySymbol = organization ? (CURRENCIES[organization.currency]?.symbol || organization.currency) : '';

  const validateFile = (file: File): string | null => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      return 'Please upload a JPG, JPEG, or PNG file';
    }

    if (file.size > 5 * 1024 * 1024) {
      return 'Image must be less than 5MB';
    }

    return null;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const error = validateFile(file);
      if (error) {
        addToast({
          type: 'error',
          title: 'Invalid File',
          message: error
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const loadWorkersWithStats = async () => {
    if (!organization) return;

    try {
      setIsLoading(true);
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 0 }); // Sunday
      const weekEnd = endOfWeek(now, { weekStartsOn: 0 }); // Saturday
      const dayStart = startOfDay(now);
      const dayEnd = endOfDay(now);

      // Load workers and tasks in parallel
      const [workersResponse, tasksResponse] = await Promise.all([
        supabase
          .from('workers')
          .select('*')
          .eq('organization_id', organization.id)
          .order('name'),
        supabase
          .from('tasks')
          .select('*')
          .eq('organization_id', organization.id)
          .gte('created_at', weekStart.toISOString())
          .lte('created_at', weekEnd.toISOString())
          .not('status', 'eq', 'cancelled')
      ]);

      if (workersResponse.error) throw workersResponse.error;
      if (tasksResponse.error) throw tasksResponse.error;

      const workersWithStats = workersResponse.data?.map(worker => {
        const workerTasks = tasksResponse.data?.filter(task => task.worker_id === worker.id) || [];
        
        // Filter tasks for current week
        const weeklyTasks = workerTasks.filter(task => 
          isWithinInterval(new Date(task.created_at), { start: weekStart, end: weekEnd })
        );

        // Get completed tasks (all time and weekly)
        const allCompletedTasks = workerTasks.filter(task => task.status === 'completed');
        const weeklyCompletedTasks = weeklyTasks.filter(task => task.status === 'completed');
        const weeklyAssignedTasks = weeklyTasks.filter(task => task.status === 'pending');
        const weeklyInProgressTasks = weeklyTasks.filter(task => task.status === 'in_progress');
        
        // Calculate earnings (all time and weekly)
        const totalEarnings = allCompletedTasks.reduce((sum, task) => sum + task.amount, 0);
        const weeklyProjectTotal = weeklyTasks.reduce((sum, task) => sum + task.amount, 0);

        const stats = {
          totalEarnings,
          weeklyProjectTotal,
          assignedTasks: weeklyAssignedTasks.length,
          completedTasks: weeklyCompletedTasks.length,
          allTimeTasks: workerTasks.length,
          weeklyTasks: weeklyTasks.length,
          dailyTasks: workerTasks.filter(task =>
            isWithinInterval(new Date(task.created_at), { start: dayStart, end: dayEnd })
          ).length,
          inProgressTasks: weeklyInProgressTasks.length
        };

        return { ...worker, stats };
      }) || [];

      setWorkers(workersWithStats);
    } catch (error) {
      console.error('Error loading workers:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to load workers. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWorkersWithStats();
  }, [organization]);

  const addWorker = async () => {
    if (!organization || !newWorker.name.trim()) return;

    try {
      setIsUploading(true);
      let imageUrl = null;

      // Upload image if selected
      if (selectedFile) {
        const error = validateFile(selectedFile);
        if (error) {
          throw new Error(error);
        }

        const fileExt = selectedFile.name.split('.').pop()?.toLowerCase();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${organization.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('profiles')
          .upload(filePath, selectedFile, {
            contentType: selectedFile.type,
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('profiles')
          .getPublicUrl(filePath);

        imageUrl = publicUrl;
      }

      // Create worker
      const { data, error } = await supabase
        .from('workers')
        .insert([{
          organization_id: organization.id,
          name: newWorker.name.trim(),
          whatsapp: newWorker.whatsapp.trim() || null,
          image: imageUrl
        }])
        .select()
        .single();

      if (error) throw error;

      setWorkers(prev => [...prev, { ...data, stats: {
        totalEarnings: 0,
        weeklyProjectTotal: 0,
        assignedTasks: 0,
        completedTasks: 0,
        allTimeTasks: 0,
        weeklyTasks: 0,
        dailyTasks: 0,
        inProgressTasks: 0
      }}]);
      setNewWorker({ name: '', whatsapp: '', image: '' });
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setShowAddWorker(false);
    } catch (error) {
      console.error('Error adding worker:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to add worker'
      });
    } finally {
      setIsUploading(false);
    }
  };

  const deleteWorker = async (workerId: string) => {
    const confirmed = await confirm({
      title: 'Delete Worker',
      message: 'Are you sure you want to delete this worker? This action cannot be undone.',
      type: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });

    if (!confirmed) return;

    try {
      // Delete worker's image from storage if it exists
      const worker = workers.find(w => w.id === workerId);
      if (worker?.image) {
        const imagePath = worker.image.split('/').slice(-2).join('/');
        await supabase.storage
          .from('profiles')
          .remove([imagePath]);
      }

      // Delete worker from database
      const { error } = await supabase
        .from('workers')
        .delete()
        .eq('id', workerId);

      if (error) throw error;

      // Update local state
      setWorkers(prev => prev.filter(w => w.id !== workerId));
      
      addToast({
        type: 'success',
        title: 'Worker Deleted',
        message: 'The worker has been deleted successfully.'
      });
    } catch (error) {
      console.error('Error deleting worker:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to delete worker. Please try again.'
      });
    }
  };

  // Filter workers based on search query
  const filteredWorkers = workers.filter(worker =>
    worker.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${getThemeStyle(theme, 'background', 'primary')}`}>
        <div className="text-center">
          <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${getThemeStyle(theme, 'text', 'accent')} mx-auto`}></div>
          <p className={`mt-4 ${getThemeStyle(theme, 'text', 'secondary')}`}>Loading workers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 p-4 min-h-[calc(100vh-50px)] ${getThemeStyle(theme, 'background', 'primary')}`}>
      {/* Banner Image */}
      <div className="relative w-full h-40 md:h-48 rounded-lg overflow-hidden mb-4">
        <img 
          src="/images/workers-banner.webp"
          alt="Workers Management" 
          className="w-full h-full object-cover"
        />
        <div className={`absolute inset-0 bg-gradient-to-r ${theme === 'dark' ? 'from-blue-900/80' : 'from-blue-600/70'} to-transparent flex items-center`}>
          <div className="p-4 text-white">
            <h1 className="text-2xl md:text-3xl font-bold">Workers Management</h1>
            <p className="mt-1 text-base md:text-lg">Manage your team efficiently</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <h2 className={`text-xl font-bold ${getThemeStyle(theme, 'text', 'primary')}`}>Workers</h2>
        <div className="flex items-center flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className={`flex items-center px-3 py-1.5 border w-full sm:w-auto rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 flex-1 sm:flex-initial ${getThemeStyle(theme, 'border', 'primary')} ${getThemeStyle(theme, 'background', 'secondary')}`}>
            <Search className={getThemeStyle(theme, 'text', 'muted')} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search workers..."
              className={`ml-2 flex-1 outline-none bg-transparent text-sm ${getThemeStyle(theme, 'text', 'primary')} placeholder:${getThemeStyle(theme, 'text', 'muted')}`}
            />
          </div>
          <button
            onClick={() => setShowAddWorker(true)}
            className="inline-flex items-center px-3 w-full sm:w-auto py-1.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Worker
          </button>
        </div>
      </div>

      {showAddWorker && (
        <>
          {/* Overlay */}
          <div 
            className={`fixed inset-0 ${getThemeStyle(theme, 'modal', 'overlay')} z-40`}
            onClick={() => setShowAddWorker(false)}
          />
          
          {/* Sliding Panel */}
          <div className={`mt-0 fixed right-0 top-0 h-screen w-[300px] ${getThemeStyle(theme, 'background', 'secondary')} shadow-lg z-50 transform transition-transform duration-300 ease-in-out ${showAddWorker ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="h-full flex flex-col">
              {/* Header */}
              <div className={`p-4 border-b ${getThemeStyle(theme, 'border', 'primary')} flex justify-between items-center`}>
                <h3 className={`text-lg font-medium ${getThemeStyle(theme, 'text', 'primary')}`}>Add New Worker</h3>
                <button
                  onClick={() => setShowAddWorker(false)}
                  className={`p-1 rounded-full ${getThemeStyle(theme, 'interactive', 'hover', 'background')}`}
                >
                  <XCircle className={`h-5 w-5 ${getThemeStyle(theme, 'text', 'muted')}`} />
                </button>
              </div>

              {/* Form Content */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium ${getThemeStyle(theme, 'text', 'secondary')}`}>Name *</label>
                    <input
                      type="text"
                      value={newWorker.name}
                      onChange={(e) => setNewWorker(prev => ({ ...prev, name: e.target.value }))}
                      className={`mt-1 block w-full rounded-md border py-1.5 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 text-sm ${
                        getThemeStyle(theme, 'border', 'primary')
                      } ${getThemeStyle(theme, 'background', 'primary')} ${getThemeStyle(theme, 'text', 'primary')}`}
                      placeholder="Enter worker name"
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium ${getThemeStyle(theme, 'text', 'secondary')}`}>WhatsApp Number</label>
                    <input
                      type="text"
                      value={newWorker.whatsapp}
                      onChange={(e) => setNewWorker(prev => ({ ...prev, whatsapp: e.target.value }))}
                      className={`mt-1 block w-full rounded-md border py-1.5 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 text-sm ${
                        getThemeStyle(theme, 'border', 'primary')
                      } ${getThemeStyle(theme, 'background', 'primary')} ${getThemeStyle(theme, 'text', 'primary')}`}
                      placeholder="Enter WhatsApp number"
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium ${getThemeStyle(theme, 'text', 'secondary')}`}>Profile Image</label>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      accept="image/*"
                      className="hidden"
                    />
                    <div className="mt-1 flex items-center space-x-4">
                      {selectedFile ? (
                        <div className="flex items-center space-x-2">
                          <span className={`text-sm ${getThemeStyle(theme, 'text', 'muted')}`}>{selectedFile.name}</span>
                          <button
                            onClick={() => {
                              setSelectedFile(null);
                              if (fileInputRef.current) {
                                fileInputRef.current.value = '';
                              }
                            }}
                            className="text-red-600 hover:text-red-700"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className={`inline-flex items-center px-3 py-1.5 border rounded-md shadow-sm text-sm font-medium ${
                            getThemeStyle(theme, 'border', 'primary')
                          } ${getThemeStyle(theme, 'text', 'secondary')} ${getThemeStyle(theme, 'background', 'secondary')} ${getThemeStyle(theme, 'interactive', 'hover', 'background')}`}
                        >
                          <Upload className="h-4 w-4 mr-1" />
                          Choose Image
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className={`p-4 border-t ${getThemeStyle(theme, 'border', 'primary')} flex justify-end space-x-3`}>
                <button
                  onClick={() => {
                    setShowAddWorker(false);
                    setSelectedFile(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                  className={`px-3 py-1.5 text-sm font-medium ${getThemeStyle(theme, 'text', 'secondary')} ${getThemeStyle(theme, 'interactive', 'hover', 'text')}`}
                >
                  Cancel
                </button>
                <button
                  onClick={addWorker}
                  disabled={!newWorker.name.trim() || isUploading}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 flex items-center"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add Worker'
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <div className='overflow-hidden'>
        {filteredWorkers.length === 0 ? (
          <div className={`text-center ${getThemeStyle(theme, 'text', 'muted')} py-6`}>
            {searchQuery ? 'No workers found matching your search.' : 'No workers added yet.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredWorkers.map(worker => (
              <Link
                key={worker.id}
                to={`/dashboard/workers/${worker.id}`}
                className={`block ${getThemeStyle(theme, 'background', 'secondary')} ${getThemeStyle(theme, 'border', 'primary')} border rounded-lg shadow-sm hover:shadow-md transition-shadow`}
              >
                <div className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className={`h-12 w-12 rounded-full ${getThemeStyle(theme, 'avatar', 'background')} flex items-center justify-center overflow-hidden flex-shrink-0`}>
                      {worker.image ? (
                        <img src={worker.image} alt={worker.name} className="h-full w-full object-cover" />
                      ) : (
                        <span className={`text-xl font-medium ${getThemeStyle(theme, 'avatar', 'text')}`}>
                          {worker.name[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`text-base font-semibold ${getThemeStyle(theme, 'text', 'primary')} truncate`}>{worker.name}</h3>
                      {worker.whatsapp && (
                        <p className={`text-xs ${getThemeStyle(theme, 'text', 'muted')} truncate`}>WhatsApp: {worker.whatsapp}</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className={`${getThemeStyle(theme, 'background', 'accent')} rounded p-2 text-center`}>
                      <p className={getThemeStyle(theme, 'text', 'muted')}>Week Earnings</p>
                      <p className="font-medium text-green-600 dark:text-green-400">{currencySymbol} {worker.stats?.totalEarnings.toFixed(2)}</p>
                    </div>
                    <div className={`${getThemeStyle(theme, 'background', 'accent')} rounded p-2 text-center`}>
                      <p className={getThemeStyle(theme, 'text', 'muted')}>Projects Total</p>
                      <p className="font-medium text-blue-600 dark:text-blue-400">{currencySymbol} {worker.stats?.weeklyProjectTotal.toFixed(2)}</p>
                    </div>
                    <div className={`${getThemeStyle(theme, 'background', 'accent')} rounded p-2 text-center`}>
                      <p className={getThemeStyle(theme, 'text', 'muted')}>Assigned</p>
                      <p className="font-medium text-yellow-600 dark:text-yellow-400">{worker.stats?.assignedTasks}</p>
                    </div>
                    <div className={`${getThemeStyle(theme, 'background', 'accent')} rounded p-2 text-center`}>
                      <p className={getThemeStyle(theme, 'text', 'muted')}>Completed</p>
                      <p className="font-medium text-green-600 dark:text-green-400">{worker.stats?.completedTasks}</p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
