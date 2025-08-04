import React, { useState } from 'react';
import { Plus, CheckCircle, XCircle, MinusCircle, Trash2, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format, isAfter, startOfDay, endOfDay } from 'date-fns';
import { useUI } from '../../context/UIContext';
import { useTheme } from '../../context/ThemeContext';
import { CURRENCIES } from '../../utils/constants';
import { Task, TaskStatus, TASK_STATUS_LABELS, TASK_STATUS_COLORS, TASK_STATUS_ICONS } from '../../types';
import AddTaskModal from '../modals/AddTaskModal';
import TaskStatusUpdateModal from '../modals/TaskStatusUpdateModal';

interface WorkerProject {
  project_id: string;
  rate: number;
  project: {
    id: string;
    name: string;
  };
}

interface WorkerTasksProps {
  worker: {
    id: string;
    name: string;
  };
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  workerProjects: WorkerProject[];
  organization: {
    id: string;
    currency: string;
  };
}

const baseInputClasses = "mt-1 block w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2";

export default function WorkerTasks({
  worker,
  tasks,
  setTasks,
  workerProjects,
  organization
}: WorkerTasksProps) {
  const [showAddTask, setShowAddTask] = useState(false);
  const [showStatusUpdate, setShowStatusUpdate] = useState<string | null>(null);
  const { confirm, addToast } = useUI();
  const { theme } = useTheme();
  const currencySymbol = CURRENCIES[organization.currency]?.symbol || organization.currency;


  const handleAddTask = async (taskData: any) => {
    setTasks(prev => [taskData, ...prev]);
    setShowAddTask(false);
  };


  const handleDeleteTask = async (taskId: string) => {
    const confirmed = await confirm({
      title: 'Delete Task',
      message: 'Are you sure you want to delete this task? This action cannot be undone.',
      type: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: 'cancelled' as TaskStatus })
        .eq('id', taskId);

      if (error) throw error;

      setTasks(prev => prev.map(task =>
        task.id === taskId
          ? { ...task, status: 'cancelled' as TaskStatus }
          : task
      ));

      addToast({
        type: 'success',
        title: 'Task Deleted',
        message: 'The task has been marked as cancelled.'
      });
    } catch (error) {
      console.error('Error deleting task:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to delete task. Please try again.'
      });
    }
  };

  return (
    <div className={`overflow-hidden`}>
      <div className="px-4 py-5 sm:p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className={`text-lg font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Tasks</h2>
          <button
            onClick={() => setShowAddTask(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </button>
        </div>

        {/* Add Task Modal */}
        <AddTaskModal
          isOpen={showAddTask}
          onClose={() => setShowAddTask(false)}
          organizationId={organization.id}
          currencySymbol={currencySymbol}
          workerId={worker.id}
          onTaskAdded={handleAddTask}
        />

        <div className="space-y-4">
          {tasks.length === 0 ? (
            <div className={`text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} py-8`}>
              No tasks found. Start by adding a new task.
            </div>
          ) : (
            <div className="grid gap-2">
              {tasks.map(task => {
                const project = workerProjects.find(wp => wp.id === task.project_id);
                const statusColors = TASK_STATUS_COLORS[task.status];

                // Get the appropriate icon based on the task status
                const getStatusIcon = () => {
                  switch (TASK_STATUS_ICONS[task.status]) {
                    case 'Clock':
                      return <Clock className="h-4 w-4" />;
                    case 'CheckCircle':
                      return <CheckCircle className="h-4 w-4" />;
                    case 'AlertCircle':
                      return <AlertCircle className="h-4 w-4" />;
                    case 'XCircle':
                      return <XCircle className="h-4 w-4" />;
                    default:
                      return <Clock className="h-4 w-4" />;
                  }
                };

                return (
                  <div key={task.id} className={`border-l-4 ${statusColors.border} p-2`}>
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                      {/* Mobile Layout */}
                      <div className="sm:hidden space-y-2">
                        {/* First Line: Icon + Name | Amount */}
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className={statusColors.icon}>
                              {getStatusIcon()}
                            </span>
                            <h4 className={`text-sm font-medium ${task.status === 'cancelled'
                                ? 'line-through text-gray-400'
                                : theme === 'dark'
                                  ? 'text-white'
                                  : 'text-gray-900'
                              }`}>
                              {project?.name}
                            </h4>
                          </div>
                          <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {currencySymbol} {task.amount.toFixed(2)}
                          </p>
                        </div>

                        {/* Second Line: Date | Actions */}
                        <div className="flex justify-between items-center">
                          <div className="flex gap-2 text-xs text-gray-500">
                            <span>{format(new Date(task.created_at), 'MMM d, HH:mm')}</span>
                            {task.completed_at && (
                              <span>✓ {format(new Date(task.completed_at), 'MMM d, HH:mm')}</span>
                            )}
                          </div>
                          {task.status !== 'cancelled' && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setShowStatusUpdate(task.id)}
                                className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors.bg} ${statusColors.text} ${statusColors.hover}`}
                              >
                                {TASK_STATUS_LABELS[task.status]}
                              </button>
                              <button
                                onClick={() => handleDeleteTask(task.id)}
                                className={`p-1 ${theme === 'dark' ? 'text-red-400 hover:text-red-300' : 'text-red-400 hover:text-red-600'} rounded-full ${theme === 'dark' ? 'hover:bg-gray-600' : 'hover:bg-red-50'
                                  }`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Desktop Layout */}
                      <div className="hidden sm:flex sm:col-span-4 items-center gap-2">
                        <span className={statusColors.icon}>
                          {getStatusIcon()}
                        </span>
                        <div>
                          <h4 className={`text-sm font-medium mb-1 ${task.status === 'cancelled'
                              ? 'line-through text-gray-400'
                              : theme === 'dark'
                                ? 'text-white'
                                : 'text-gray-900'
                            }`}>
                            {project?.name}
                          </h4>
                          {task.description && (
                            <p className={`text-xs ${task.status === 'cancelled'
                                ? 'line-through text-gray-400'
                                : theme === 'dark'
                                  ? 'text-gray-400'
                                  : 'text-gray-500'
                              }`}>{task.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="hidden sm:block sm:col-span-4 text-xs text-gray-500">
                        {task.late_reason && (
                          <p className="text-orange-600">Late: {task.late_reason}</p>
                        )}
                        {task.status === 'delayed' && task.delay_reason && (
                          <p className="text-red-600">Delay: {task.delay_reason}</p>
                        )}
                        <div className="flex gap-2">
                          <span>{format(new Date(task.created_at), 'MMM d, HH:mm')}</span>
                          {task.completed_at && (
                            <span>✓ {format(new Date(task.completed_at), 'MMM d, HH:mm')}</span>
                          )}
                        </div>
                      </div>

                      <div className="hidden sm:block sm:col-span-2 text-right text-xs">
                        <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{currencySymbol} {task.amount.toFixed(2)}</p>
                      </div>

                      <div className="hidden sm:flex sm:col-span-2 items-center justify-end gap-1">
                        {task.status !== 'cancelled' && (
                          <>
                            <button
                              onClick={() => setShowStatusUpdate(task.id)}
                              className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors.bg} ${statusColors.text} ${statusColors.hover}`}
                            >
                              {TASK_STATUS_LABELS[task.status]}
                            </button>
                            <button
                              onClick={() => handleDeleteTask(task.id)}
                              className={`p-1 ${theme === 'dark' ? 'text-red-400 hover:text-red-300' : 'text-red-400 hover:text-red-600'} rounded-full ${theme === 'dark' ? 'hover:bg-gray-600' : 'hover:bg-red-50'
                                }`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Task Status Update Modal */}
      {showStatusUpdate && (
        <TaskStatusUpdateModal
          isOpen={!!showStatusUpdate}
          onClose={() => setShowStatusUpdate(null)}
          task={tasks.find(t => t.id === showStatusUpdate) || null}
          onStatusUpdate={(updatedTask) => {
            setTasks(prev => prev.map(task =>
              task.id === updatedTask.id ? updatedTask as Task : task
            ));
            setShowStatusUpdate(null);
          }}
        />
      )}
    </div>
  );
}