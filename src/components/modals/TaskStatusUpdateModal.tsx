import React, { useState } from 'react';
import { XCircle } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useUI } from '../../context/UIContext';
import { supabase } from '../../lib/supabase';

/**
 * Status labels for task statuses
 */
const STATUS_LABELS = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  delayed: 'Delayed',
  cancelled: 'Cancelled'
} as const;

/**
 * Color schemes for each task status
 */
const STATUS_COLORS = {
  pending: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/20',
    text: 'text-yellow-800 dark:text-yellow-400',
    border: 'border-yellow-200 dark:border-yellow-800',
    hover: 'hover:bg-yellow-200 dark:hover:bg-yellow-900/30',
    icon: 'text-yellow-600 dark:text-yellow-400'
  },
  in_progress: {
    bg: 'bg-blue-100 dark:bg-blue-900/20',
    text: 'text-blue-800 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800',
    hover: 'hover:bg-blue-200 dark:hover:bg-blue-900/30',
    icon: 'text-blue-600 dark:text-blue-400'
  },
  completed: {
    bg: 'bg-green-100 dark:bg-green-900/20',
    text: 'text-green-800 dark:text-green-400',
    border: 'border-green-200 dark:border-green-800',
    hover: 'hover:bg-green-200 dark:hover:bg-green-900/30',
    icon: 'text-green-600 dark:text-green-400'
  },
  delayed: {
    bg: 'bg-red-100 dark:bg-red-900/20',
    text: 'text-red-800 dark:text-red-400',
    border: 'border-red-200 dark:border-red-800',
    hover: 'hover:bg-red-200 dark:hover:bg-red-900/30',
    icon: 'text-red-600 dark:text-red-400'
  },
  cancelled: {
    bg: 'bg-gray-100 dark:bg-gray-900/20',
    text: 'text-gray-800 dark:text-gray-400',
    border: 'border-gray-200 dark:border-gray-800',
    hover: 'hover:bg-gray-200 dark:hover:bg-gray-900/30',
    icon: 'text-gray-600 dark:text-gray-400'
  }
} as const;

/**
 * Type for task status
 */
type TaskStatus = keyof typeof STATUS_LABELS;

/**
 * Interface for Task data
 */
interface Task {
  id: string;
  worker_id: string;
  project_id: string;
  due_date: string;
  amount: number;
  status: TaskStatus;
  description?: string;
  completed_at?: string;
  created_at: string;
  notes?: string;
  delay_reason?: string;
  project?: {
    id: string;
    name: string;
  };
  worker?: {
    id: string;
    name: string;
  };
}

interface TaskStatusUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onStatusUpdate: (updatedTask: Task) => void;
}

export default function TaskStatusUpdateModal({
  isOpen,
  onClose,
  task,
  onStatusUpdate
}: TaskStatusUpdateModalProps) {
  const { theme, getThemeStyle } = useTheme();
  const { addToast } = useUI();
  const [delayReason, setDelayReason] = useState(task?.delay_reason || '');

  if (!isOpen || !task) return null;

  const updateTaskStatus = async (newStatus: TaskStatus, reason?: string) => {
    try {
      const updateData: any = {
        status: newStatus
      };

      // Add status-specific fields
      if (newStatus === 'completed') {
        updateData.completed_at = new Date().toISOString();
      } else if (newStatus === 'delayed') {
        updateData.delay_reason = reason;
      }

      // Always update status_changed_at
      updateData.status_changed_at = new Date().toISOString();

      const { error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', task.id);

      if (error) throw error;

      const updatedTask = { ...task, ...updateData };
      onStatusUpdate(updatedTask);
      onClose();

      addToast({
        type: 'success',
        title: 'Status Updated',
        message: `Task marked as ${STATUS_LABELS[newStatus]}`
      });
    } catch (error) {
      console.error('Error updating task status:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to update task status'
      });
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md ${getThemeStyle(theme, 'background', 'secondary')} rounded-lg shadow-lg z-50 p-6 border ${getThemeStyle(theme, 'border', 'primary')}`}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className={`text-lg font-medium ${getThemeStyle(theme, 'text', 'primary')}`}>
            Update Task Status
          </h3>
          <button
            onClick={onClose}
            className={`p-1 rounded-full ${getThemeStyle(theme, 'text', 'muted')} hover:${getThemeStyle(theme, 'background', 'accent')}`}
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4">
          <p className={`text-sm ${getThemeStyle(theme, 'text', 'secondary')}`}>
            <span className="font-medium">Project:</span> {task.project?.name || 'Unknown Project'}
          </p>
          <p className={`text-sm ${getThemeStyle(theme, 'text', 'secondary')}`}>
            <span className="font-medium">Worker:</span> {task.worker?.name || 'Unknown Worker'}
          </p>
          <p className={`text-sm ${getThemeStyle(theme, 'text', 'secondary')}`}>
            <span className="font-medium">Current Status:</span> {STATUS_LABELS[task.status]}
          </p>
        </div>

        <div className="space-y-3">
          {Object.entries(STATUS_LABELS).map(([key, label]) => (
            key !== 'cancelled' && (
              <button
                key={key}
                onClick={() => {
                  if (key === 'delayed' && !delayReason) {
                    addToast({
                      type: 'error',
                      title: 'Error',
                      message: 'Please provide a reason for the delay'
                    });
                    return;
                  }
                  updateTaskStatus(key as TaskStatus, key === 'delayed' ? delayReason : undefined);
                }}
                className={`w-full px-3 py-2 text-sm font-medium rounded-md ${task.status === key
                    ? `${STATUS_COLORS[key as TaskStatus].bg} ${STATUS_COLORS[key as TaskStatus].text}`
                    : `${getThemeStyle(theme, 'background', 'primary')} ${getThemeStyle(theme, 'text', 'primary')} ${getThemeStyle(theme, 'interactive', 'hover', 'background')}`
                  }`}
              >
                {label}
              </button>
            )
          ))}
        </div>

        <div className="mt-4">
          <label className={`block text-sm font-medium ${getThemeStyle(theme, 'text', 'primary')} mb-2`}>
            Delay Reason
          </label>
          <textarea
            value={delayReason}
            onChange={(e) => setDelayReason(e.target.value)}
            className={`block w-full rounded-md border ${getThemeStyle(theme, 'border', 'primary')} ${getThemeStyle(theme, 'background', 'primary')} py-2 px-3 text-sm ${getThemeStyle(theme, 'text', 'primary')} h-20`}
            placeholder="Required if marking as delayed"
          />
        </div>
      </div>
    </>
  );
} 