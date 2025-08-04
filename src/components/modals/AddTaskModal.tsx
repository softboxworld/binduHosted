import React, { useState, useEffect } from 'react';
import { Plus, XCircle } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { isAfter, startOfDay } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { useUI } from '../../context/UIContext';
import { CURRENCIES } from '../../utils/constants';

// Types
interface Worker {
  id: string;
  name: string;
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

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  currencySymbol: string;
  workerId: string | null;
  onTaskAdded?: (task: any) => void;
}

export default function AddTaskModal({ isOpen, onClose, organizationId, currencySymbol, workerId, onTaskAdded }: AddTaskModalProps) {
  const { theme, getThemeStyle } = useTheme();
  const { addToast } = useUI();

  // State
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [workerProjects, setWorkerProjects] = useState<WorkerProject[]>([]);
  const [newTask, setNewTask] = useState({
    worker_id: workerId || '',
    project_id: '',
    description: '',
    status: 'pending',
    due_date: new Date().toISOString().split('T')[0],
    delay_reason: ''
  });

  // Load workers when component mounts
  useEffect(() => {
    const loadWorkers = async () => {
      if (!organizationId) return;
      if (workerId) {
        try {
          const { data, error } = await supabase
            .from('workers')
            .select('id, name')
            .eq('id', workerId);

          if (error) throw error;
          setWorkers(data || []);
        } catch (error) {
          console.error('Error loading worker:', error);
          addToast({
            type: 'error',
            title: 'Error',
            message: 'Failed to load worker'
          });
        }
        return
      }
      try {
        const { data, error } = await supabase
          .from('workers')
          .select('id, name')
          .eq('organization_id', organizationId);

        if (error) throw error;
        setWorkers(data || []);
      } catch (error) {
        console.error('Error loading workers:', error);
        addToast({
          type: 'error',
          title: 'Error',
          message: 'Failed to load workers'
        });
      }
    };

    loadWorkers();
  }, [organizationId, addToast]);

  // Load worker projects when worker is selected
  useEffect(() => {
    const loadWorkerProjects = async () => {
      if (!organizationId || !newTask.worker_id) return;

      try {
        const { data, error } = await supabase
          .from('worker_projects')
          .select('*')
          .eq('worker_id', newTask.worker_id)
          .eq('status', 'active')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setWorkerProjects(data || []);
      } catch (error) {
        console.error('Error loading worker projects:', error);
        addToast({
          type: 'error',
          title: 'Error',
          message: 'Failed to load projects for this worker'
        });
      }
    };

    loadWorkerProjects();
  }, [organizationId, newTask.worker_id, addToast]);

  // Add task function
  const addTask = async () => {
    if (!organizationId || !newTask.worker_id || !newTask.project_id) return;

    const project = workerProjects.find(wp => wp.id === newTask.project_id);
    if (!project) return;

    const taskDate = new Date(newTask.due_date);
    const today = startOfDay(new Date());
    const needsDelayReason = isAfter(today, taskDate);

    if (needsDelayReason) {
      if (!newTask.delay_reason) {
        addToast({
          type: 'error',
          title: 'Invalid Date',
          message: 'Please provide a reason for adding a task for a past date.'
        });
        return;
      }
    }

    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert([{
          organization_id: organizationId,
          worker_id: newTask.worker_id,
          project_id: newTask.project_id,
          description: newTask.description.trim() || null,
          due_date: newTask.due_date,
          status: newTask.status,
          amount: project.price,
          delay_reason: needsDelayReason ? newTask.delay_reason : null
        }])
        .select()
        .single();

      if (error) throw error;

      // Call the callback if provided
      if (onTaskAdded && data) {
        onTaskAdded(data);
      }

      // Reset form and close modal
      setNewTask({
        worker_id: '',
        project_id: '',
        description: '',
        status: 'pending',
        due_date: new Date().toISOString().split('T')[0],
        delay_reason: ''
      });
      onClose();

      addToast({
        type: 'success',
        title: 'Task Added',
        message: 'The task has been successfully added.'
      });
    } catch (error) {
      console.error('Error adding task:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to add task. Please try again.'
      });
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Slide-in Modal */}
      <div
        className={`fixed right-0 top-0 h-full w-[480px] max-w-full ${getThemeStyle(theme, 'background', 'secondary')} shadow-lg z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className={`p-4 border-b ${getThemeStyle(theme, 'border', 'primary')} flex items-center justify-between`}>
            <h3 className={`text-lg font-medium ${getThemeStyle(theme, 'text', 'primary')}`}>
              Add New Task
            </h3>
            <button
              onClick={onClose}
              className={`p-2 rounded-full ${getThemeStyle(theme, 'text', 'muted')} hover:${getThemeStyle(theme, 'background', 'accent')}`}
            >
              <XCircle className="h-5 w-5" />
            </button>
          </div>

          {/* Form Content */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium ${getThemeStyle(theme, 'text', 'secondary')} mb-2`}>
                  Worker *
                </label>
                <select
                  value={newTask.worker_id}
                  onChange={(e) => setNewTask(prev => ({ ...prev, worker_id: e.target.value, project_id: '' }))}
                  className={`block w-full rounded-lg border ${getThemeStyle(theme, 'border', 'primary')} ${getThemeStyle(theme, 'background', 'primary')} py-2 px-3 text-sm ${getThemeStyle(theme, 'text', 'primary')} focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                >
                  <option value="">Select a worker</option>
                  {workers.map(worker => (
                    <option key={worker.id} value={worker.id}>{worker.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-sm font-medium ${getThemeStyle(theme, 'text', 'secondary')} mb-2`}>
                  Project *
                </label>
                <select
                  value={newTask.project_id}
                  onChange={(e) => setNewTask(prev => ({ ...prev, project_id: e.target.value }))}
                  className={`block w-full rounded-lg border ${getThemeStyle(theme, 'border', 'primary')} ${getThemeStyle(theme, 'background', 'primary')} py-2 px-3 text-sm ${getThemeStyle(theme, 'text', 'primary')} focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50`}
                  disabled={!newTask.worker_id}
                >
                  <option value="">Select a project</option>
                  {workerProjects.map(wp => (
                    <option key={wp.id} value={wp.id}>
                      {wp.name} - {currencySymbol} {wp.price.toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-sm font-medium ${getThemeStyle(theme, 'text', 'secondary')} mb-2`}>
                  Description
                </label>
                <input
                  type="text"
                  value={newTask.description}
                  onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                  className={`block w-full rounded-lg border ${getThemeStyle(theme, 'border', 'primary')} ${getThemeStyle(theme, 'background', 'primary')} py-2 px-3 text-sm ${getThemeStyle(theme, 'text', 'primary')} focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                  placeholder="Enter task description (optional)"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium ${getThemeStyle(theme, 'text', 'secondary')} mb-2`}>
                  Due Date *
                </label>
                <input
                  type="date"
                  value={newTask.due_date}
                  onChange={(e) => setNewTask(prev => ({ ...prev, due_date: e.target.value }))}
                  className={`block w-full rounded-lg border ${getThemeStyle(theme, 'border', 'primary')} ${getThemeStyle(theme, 'background', 'primary')} py-2 px-3 text-sm ${getThemeStyle(theme, 'text', 'primary')} focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>

              {isAfter(startOfDay(new Date()), new Date(newTask.due_date)) && (
                <div>
                  <label className={`block text-sm font-medium ${getThemeStyle(theme, 'text', 'secondary')} mb-2`}>
                    Reason for Delay
                  </label>
                  <textarea
                    value={newTask.delay_reason}
                    onChange={(e) => setNewTask(prev => ({ ...prev, delay_reason: e.target.value, status: 'delayed' }))}
                    className={`block w-full rounded-lg border ${getThemeStyle(theme, 'border', 'primary')} ${getThemeStyle(theme, 'background', 'primary')} py-2 px-3 text-sm ${getThemeStyle(theme, 'text', 'primary')} focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-20`}
                    placeholder="Please provide a reason for adding this task after the date"
                    required
                  />
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className={`p-4 border-t ${getThemeStyle(theme, 'border', 'primary')} flex justify-end gap-3`}>
            <button
              onClick={onClose}
              className={`px-4 py-2 text-sm font-medium ${getThemeStyle(theme, 'text', 'secondary')} border ${getThemeStyle(theme, 'border', 'primary')} rounded-lg ${getThemeStyle(theme, 'background', 'primary')} ${getThemeStyle(theme, 'interactive', 'hover', 'background')} transition-colors duration-200`}
            >
              Cancel
            </button>
            <button
              onClick={addTask}
              disabled={!newTask.worker_id || !newTask.project_id}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 dark:disabled:bg-gray-600 flex items-center transition-colors duration-200"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </button>
          </div>
        </div>
      </div>
    </>
  );
} 