import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Phone, Mail, Home, Shield, Edit2, Trash2, Calendar, Loader2, CheckCircle, DollarSign, Download, MessageSquare, User } from 'lucide-react';
import { startOfWeek, endOfWeek, format, isAfter, getWeek, getYear, startOfMonth, endOfMonth, startOfYear, endOfYear, addWeeks, addMonths, addYears, addDays } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { useUI } from '../context/UIContext';
import { useTheme } from '../context/ThemeContext';
import WorkerProjects from './worker/WorkerProjects';
import WorkerTasks from './worker/WorkerTasks';
import { CURRENCIES } from '../utils/constants';
import type { Task } from '../types';
import { generateWorkerReport } from '../utils/reportUtils';
import DateRangeSelector, { DateFilterType } from './common/DateRangeSelector';

interface Worker {
  id: string;
  name: string;
  whatsapp: string | null;
  image: string | null;
  organization_id: string;
}

interface Organization {
  id: string;
  currency: string;
}

interface WorkerProject {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  price: number;
  created_at: string;
  updated_at: string;
  status: string;
  worker_id: string;
}

export default function WorkerDetails() {
  const [worker, setWorker] = useState<Worker | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedWorker, setEditedWorker] = useState<Worker | null>(null);
  const [workerProjects, setWorkerProjects] = useState<WorkerProject[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dateFilterType, setDateFilterType] = useState<DateFilterType>('week');
  
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { organization } = useAuthStore();
  const { confirm, addToast } = useUI();
  const { theme, getThemeStyle } = useTheme();
  const currencySymbol = organization?.currency ? CURRENCIES[organization.currency]?.symbol || organization.currency : CURRENCIES['USD'].symbol;

  // Calculate date range based on filter type
  const getDateRange = () => {
    switch (dateFilterType) {
      case 'day':
        return {
          start: new Date(currentDate.setHours(0, 0, 0, 0)),
          end: new Date(currentDate.setHours(23, 59, 59, 999))
        };
      case 'week':
        return {
          start: startOfWeek(currentDate, { weekStartsOn: 1 }),
          end: endOfWeek(currentDate, { weekStartsOn: 1 })
        };
      case 'month':
        return {
          start: startOfMonth(currentDate),
          end: endOfMonth(currentDate)
        };
      case 'year':
        return {
          start: startOfYear(currentDate),
          end: endOfYear(currentDate)
        };
    }
  };

  const { start: dateRangeStart, end: dateRangeEnd } = getDateRange();

  // Filter tasks based on current date range
  const filteredTasks = tasks.filter(task => {
    const taskDate = new Date(task.created_at);
    return taskDate >= dateRangeStart && taskDate <= dateRangeEnd;
  });

  useEffect(() => {
    if (!organization || !id) return;
    loadData();
  }, [id, organization]);

  const loadData = async () => {
    try {
      // Load worker details with organization_id
      const { data: workerData, error: workerError } = await supabase
        .from('workers')
        .select('*, organization:organizations(id)')
        .eq('id', id)
        .single();

      if (workerError) throw workerError;
      setWorker({
        ...workerData,
        organization_id: workerData.organization.id
      });
      setEditedWorker({
        ...workerData,
        organization_id: workerData.organization.id
      });

      // Load worker's projects
      const { data: workerProjectsData, error: workerProjectsError } = await supabase
        .from('worker_projects')
        .select('*')
        .eq('worker_id', id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (workerProjectsError) throw workerProjectsError;
      setWorkerProjects(workerProjectsData || []);

      // Load all worker's tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          *
        `)
        .eq('worker_id', id)
        .eq('organization_id', organization?.id)
        .order('created_at', { ascending: false });

      if (tasksError) throw tasksError;
      setTasks(tasksData || []);

    } catch (error) {
      console.error('Error loading data:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to load worker data. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditWorker = async () => {
    if (!worker || !editedWorker || !organization) return;

    try {
      const { error } = await supabase
        .from('workers')
        .update({
          name: editedWorker.name,
          whatsapp: editedWorker.whatsapp,
          image: editedWorker.image
        })
        .eq('id', worker.id)
        .eq('organization_id', organization.id);

      if (error) throw error;
      
      setWorker(editedWorker);
      setIsEditing(false);

      addToast({
        type: 'success',
        title: 'Worker Updated',
        message: 'Worker details have been updated successfully.'
      });
    } catch (error) {
      console.error('Error updating worker:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to update worker. Please try again.'
      });
    }
  };

  const handleDeleteWorker = async () => {
    if (!worker) return;

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
      if (worker.image) {
        const imagePath = worker.image.split('/').slice(-2).join('/');
        await supabase.storage
          .from('profiles')
          .remove([imagePath]);
      }

      // Delete worker from database
      const { error } = await supabase
        .from('workers')
        .delete()
        .eq('id', worker.id);

      if (error) throw error;

      addToast({
        type: 'success',
        title: 'Worker Deleted',
        message: 'The worker has been deleted successfully.'
      });

      // Navigate back to workers list
      navigate('/dashboard/workers');
    } catch (error) {
      console.error('Error deleting worker:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to delete worker. Please try again.'
      });
    }
  };

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


  const handleGeneratePdfReport = async () => {
    if (!worker) return;
    
    try {
      const pdf = generateWorkerReport(
        worker,
        filteredTasks,
        { start: dateRangeStart, end: dateRangeEnd },
        currencySymbol
      );
      
      // Save the PDF
      pdf.save(`${worker.name}_report_${format(dateRangeStart, 'yyyy-MM-dd')}.pdf`);
      
      addToast({
        type: 'success',
        title: 'Report Generated',
        message: 'PDF report has been generated successfully.'
      });
    } catch (error) {
      console.error('Error generating PDF report:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to generate PDF report. Please try again.'
      });
    }
  };

  const handleSendWhatsAppReport = () => {
    if (!worker?.whatsapp) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'No WhatsApp number available for this worker.'
      });
      return;
    }

    const message = encodeURIComponent(`
Hi ${worker.name},

Here's your work report:
Total Tasks: ${tasks.length}
Completed Tasks: ${tasks.filter(t => t.status === 'completed').length}
Total Earnings: ${currencySymbol}${tasks.reduce((sum, task) => sum + task.amount, 0).toFixed(2)}
    `);

    window.open(`https://wa.me/${worker.whatsapp}?text=${message}`, '_blank');
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!worker || !event.target.files || !event.target.files[0]) return;

    try {
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${worker.id}-${Math.random()}.${fileExt}`;
      const filePath = `${worker.organization_id}/${fileName}`;

      // Upload image to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get the public URL of the uploaded image
      const { data: { publicUrl } } = supabase.storage
        .from('profiles')
        .getPublicUrl(filePath);

      // Update worker's image URL in the database
      const { error: updateError } = await supabase
        .from('workers')
        .update({ image: publicUrl })
        .eq('id', worker.id);

      if (updateError) throw updateError;

      // Update local state
      setWorker(prev => prev ? { ...prev, image: publicUrl } : null);
      setEditedWorker(prev => prev ? { ...prev, image: publicUrl } : null);

      addToast({
        type: 'success',
        title: 'Success',
        message: 'Profile image updated successfully.'
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to upload image. Please try again.'
      });
    }
  };

  if (isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${getThemeStyle('background')}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className={`mt-4 ${getThemeStyle('text.secondary')}`}>Loading worker details...</p>
        </div>
      </div>
    );
  }

  if (!worker) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${getThemeStyle('background')}`}>
        <div className="text-center">
          <p className={getThemeStyle('text.secondary')}>Worker not found.</p>
          <button
            onClick={() => navigate('/dashboard/workers')}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Workers
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-[calc(100vh-64px)] `}>
      {/* Top Navigation Bar */}
      <div className="flex flex-col lg:flex-row">
        {/* Left Panel - Worker Info */}
        <div className={`w-full lg:w-80  lg:border-r lg:min-h-[calc(100vh-64px)] `}>
          <div className="p-4 lg:p-6 space-y-6 lg:space-y-8">
            {/* Worker Profile */}
            <div className="flex flex-col items-center">
              <div className="relative inline-block">
                {worker?.image ? (
                  <img
                    src={worker.image}
                    alt={worker?.name}
                    className={`w-20 h-20 lg:w-24 lg:h-24 rounded-md mx-auto ring-4`}
                  />
                ) : (
                  <div className={`w-20 h-20 lg:w-24 lg:h-24 rounded-md mx-auto ring-4 ${getThemeStyle(theme, 'background', 'secondary')} flex items-center justify-center bg-gray-100`}>
                    <User className="w-12 h-12 text-gray-400" />
                  </div>
                )}
                {isEditing && (
                  <label
                    className="absolute bottom-0 right-0 p-1.5 bg-blue-600 rounded-full text-white hover:bg-blue-700 shadow-sm cursor-pointer"
                  >
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <Edit2 className="h-4 w-4" />
                  </label>
                )}
              </div>
              <h2 className={`mt-4 text-lg lg:text-xl font-semibold ${getThemeStyle('text.primary')} text-center`}>{worker?.name}</h2>
              
              {/* Report Buttons */}
              <div className="mt-4 flex items-center justify-center space-x-6">
                <button
                  onClick={handleGeneratePdfReport}
                  className="flex flex-col items-center"
                >
                  <div className={`w-10 h-10 flex items-center justify-center rounded-full ${getThemeStyle('button.secondary')}`}>
                    <Download className={getThemeStyle('icon')} />
                  </div>
                  <span className={`mt-1 text-xs ${getThemeStyle('text.secondary')}`}>PDF</span>
                </button>
                {worker?.whatsapp && (
                  <button
                    onClick={handleSendWhatsAppReport}
                    className="flex flex-col items-center"
                  >
                    <div className={`w-10 h-10 flex items-center justify-center rounded-full ${getThemeStyle('button.secondary')}`}>
                      <Phone className={getThemeStyle('icon')} />
                    </div>
                    <span className={`mt-1 text-xs ${getThemeStyle('text.secondary')}`}>WhatsApp</span>
                  </button>
                )}
              </div>
            </div>

            {/* Client Details Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className={`text-sm font-bold ${getThemeStyle('text.primary')}`}>Worker Details</h3>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className={`inline-flex items-center px-2.5 py-1.5 border rounded-md text-xs font-medium ${getThemeStyle('button.secondary')}`}
                  >
                    <Edit2 className="h-3 w-3 mr-1" />
                    Edit
                  </button>
                )}
              </div>
              <div className="space-y-4">
                {isEditing ? (
                  <>
                    <div>
                      <label className={`block text-sm font-medium ${getThemeStyle(theme, 'text', 'secondary')} mb-1`}>Name</label>
                      <input
                        type="text"
                        value={editedWorker?.name || ''}
                        onChange={(e) => setEditedWorker(prev => prev ? { ...prev, name: e.target.value } : null)}
                        className={`block w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${getThemeStyle('input')}`}
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium ${getThemeStyle(theme, 'text', 'secondary')} mb-1`}>WhatsApp</label>
                      <input
                        type="text"
                        value={editedWorker?.whatsapp || ''}
                        onChange={(e) => setEditedWorker(prev => prev ? { ...prev, whatsapp: e.target.value } : null)}
                        className={`block w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${getThemeStyle('input')}`}
                      />
                    </div>
                    <div className="flex space-x-3 pt-2">
                      <button
                        onClick={handleEditWorker}
                        className="flex-1 inline-flex justify-center items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          setEditedWorker(worker);
                        }}
                        className={`flex-1 inline-flex justify-center items-center px-3 py-2 border rounded-md shadow-sm text-sm font-medium ${getThemeStyle('button.secondary')}`}
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center text-sm">
                      <Phone className={`h-4 w-4 ${getThemeStyle(theme, 'icon')} mr-3`} />
                      <span className={getThemeStyle(theme, 'text', 'secondary')}>{worker?.whatsapp || 'No phone number'}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Worker Stats Section */}
            <div>
              <h3 className={`text-sm font-bold ${getThemeStyle(theme, 'text', 'primary')}`}>All Time Worker Stats</h3>
              <div className={`divide-y ${getThemeStyle(theme, 'divider')}`}>
                <div className="py-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Calendar className={`h-4 w-4 ${getThemeStyle(theme, 'icon')} mr-2`} />
                      <p className={`text-xs font-medium ${getThemeStyle(theme, 'text', 'secondary')}`}>Assigned Tasks</p>
                    </div>
                    <p className={`text-xs font-semibold ${getThemeStyle(theme, 'text', 'primary')}`}>
                      {tasks.filter(t => t.status === 'pending').length} | {currencySymbol}
                      {tasks.filter(t => t.status === 'pending').reduce((sum, task) => sum + task.amount, 0).toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="py-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Loader2 className={`h-4 w-4 ${getThemeStyle(theme, 'icon')} mr-2`} />
                      <p className={`text-xs font-medium ${getThemeStyle(theme, 'text', 'secondary')}`}>In Progress</p>
                    </div>
                    <p className={`text-xs font-semibold ${getThemeStyle(theme, 'text', 'primary')}`}>
                      {tasks.filter(t => t.status === 'in_progress').length} | {currencySymbol}
                      {tasks.filter(t => t.status === 'in_progress').reduce((sum, task) => sum + task.amount, 0).toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="py-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <CheckCircle className={`h-4 w-4 ${getThemeStyle(theme, 'icon')} mr-2`} />
                      <p className={`text-xs font-medium ${getThemeStyle(theme, 'text', 'secondary')}`}>Completed Tasks</p>
                    </div>
                    <p className={`text-xs font-semibold ${getThemeStyle(theme, 'text', 'primary')}`}>
                      {tasks.filter(t => t.status === 'completed').length} | {currencySymbol}
                      {tasks.filter(t => t.status === 'completed').reduce((sum, task) => sum + task.amount, 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Projects Section */}
            <WorkerProjects
              worker={worker}
              workerProjects={workerProjects}
              setWorkerProjects={setWorkerProjects}
              organization={organization || { id: '', currency: 'USD' }}
            />
            <div className="pt-3">
              <button
                onClick={handleDeleteWorker}
                className={`w-full inline-flex justify-center items-center px-3 py-2 border rounded-md text-xs font-medium ${getThemeStyle('button.danger')}`}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Worker
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel - Tasks */}
        <div className={`flex-1 p-4 lg:p-6 ${getThemeStyle('background')}`}>
          {/* Date Filter */}
          <div className={getThemeStyle('background')}>
            <div className="p-4">
              <DateRangeSelector
                currentDate={currentDate}
                dateFilterType={dateFilterType}
                onDateChange={handleDateChange}
                onFilterTypeChange={handleFilterTypeChange}
                itemCount={filteredTasks.length}
                itemLabel="tasks"
              />
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4">
              <div className={`border-l-4 border-yellow-500 p-3 flex items-center justify-between ${getThemeStyle('background')}`}>
                <h3 className="text-xs font-medium text-yellow-800">Assigned Tasks</h3>
                <p className="text-base lg:text-lg font-bold text-yellow-600 mt-1">
                  {filteredTasks.filter(task => task.status === 'pending').length}
                </p>
              </div>
              <div className={`border-l-4 border-blue-500 p-3 flex items-center justify-between ${getThemeStyle('background')}`}>
                <h3 className="text-xs font-medium text-blue-800">In Progress</h3>
                <p className="text-base lg:text-lg font-bold text-blue-600 mt-1">
                  {filteredTasks.filter(task => task.status === 'in_progress').length}
                </p>
              </div>
              <div className={`border-l-4 border-green-500 p-3 flex items-center justify-between ${getThemeStyle('background')}`}>
                <h3 className="text-xs font-medium text-green-800">Completed</h3>
                <p className="text-base lg:text-lg font-bold text-green-600 mt-1">
                  {filteredTasks.filter(task => task.status === 'completed').length}
                </p>
              </div>
              <div className={`border-l-4 border-gray-400 p-3 flex items-center justify-between ${getThemeStyle('background')}`}>
                <h3 className="text-xs font-medium text-gray-800">Cancelled</h3>
                <p className="text-base lg:text-lg font-bold text-gray-600 mt-1">
                  {filteredTasks.filter(task => task.status === 'cancelled').length}
                </p>
              </div>
            </div>
          </div>

          {/* Tasks List */}
          <WorkerTasks
            worker={worker}
            tasks={filteredTasks}
            setTasks={setTasks}
            workerProjects={workerProjects}
            organization={organization || { id: '', currency: 'USD' }}
          />
        </div>
      </div>
    </div>
  );
}