import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';
import { useUI } from '../context/UIContext';
import { useTheme } from '../context/ThemeContext';
import { CURRENCIES } from '../utils/constants';
import { startOfWeek, endOfWeek, startOfDay, format, isAfter, getWeek, getYear, startOfMonth, endOfMonth, startOfYear, endOfYear, addWeeks, addMonths, addYears, addDays, endOfDay } from 'date-fns';
import DateRangeSelector from '../components/common/DateRangeSelector';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  MinusCircle,
  Trash2,
  Search,
  ChevronDown,
  Clock,
  AlertCircle
} from 'lucide-react';
import AddTaskModal from './modals/AddTaskModal';
import TaskStatusUpdateModal from './modals/TaskStatusUpdateModal';

/**
 * ============================================================================
 * Constants and Type Definitions
 * ============================================================================
 */

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
 * Icons for each task status
 */
const STATUS_ICONS = {
  pending: Clock,
  in_progress: Clock,
  completed: CheckCircle,
  delayed: AlertCircle,
  cancelled: XCircle
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
  project: {
    id: string;
    name: string;
    price: number;
  };
  worker: {
    id: string;
    name: string;
  };
}

/**
 * Interface for Worker data
 */
interface Worker {
  id: string;
  name: string;
}

/**
 * Interface for WorkerProject data
 */
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

/**
 * Props for TasksList component
 */
interface TasksListProps {
  status?: TaskStatus;
}

/**
 * ============================================================================
 * Component Implementation
 * ============================================================================
 */

/**
 * TasksList Component
 * 
 * Displays a list of tasks with filtering, sorting, and status management capabilities.
 * 
 * @param {TasksListProps} props - Component props
 * @returns {JSX.Element} Rendered component
 */
export default function TasksList({ status }: TasksListProps) {
  // ===== Context and State =====
  const { organization } = useAuthStore();
  const { theme, getThemeStyle } = useTheme();
  const { confirm, addToast } = useUI();

  // Data state
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // UI state
  const [showAddTask, setShowAddTask] = useState(false);
  const [showStatusUpdate, setShowStatusUpdate] = useState<string | null>(null);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Filter state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dateFilterType, setDateFilterType] = useState<'day' | 'week' | 'month' | 'year'>('week');
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [delayReason, setDelayReason] = useState('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  
  // Derived values
  const currencySymbol = organization?.currency ? CURRENCIES[organization.currency]?.symbol || organization.currency : '';

  // ===== Effects =====

  /**
   * Handle window resize for responsive design
   */
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

  /**
   * Close dropdown when clicking outside
   */
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

  /**
   * Calculate date range based on filter type
   */
  const dateRange = useMemo(() => {
    switch (dateFilterType) {
      case 'day':
        return {
          start: startOfDay(currentDate),
          end: endOfDay(currentDate)
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
  }, [currentDate, dateFilterType]);

  /**
   * Load tasks and workers data
   */
  const loadData = useCallback(async () => {
    if (!organization?.id || !dateRange) return;
    const orgId = organization.id;

    try {
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          *,
          project:worker_projects!project_id (
            id,
            name,
            price
          ),
          worker:workers!worker_id (
            id,
            name
          )
        `)
        .eq('organization_id', orgId)
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString())
        .order('created_at', { ascending: false });

      if (tasksError) throw tasksError;
      setTasks(tasksData || []);

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [organization?.id, dateRange]);

  /**
   * Load data when component mounts or dependencies change
   */
  useEffect(() => {
    let mounted = true;

    if (organization?.id && dateRange) {
      loadData();
    }

    return () => {
      mounted = false;
    };
  }, [loadData]);

  // ===== Event Handlers =====

  /**
   * Handle date navigation
   */
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
        default:
          return newDate;
      }
    });
  };

  /**
   * Handle task added callback
   */
  const handleTaskAdded = (newTask: Task) => {
    setTasks(prev => [newTask, ...prev]);
  };

  /**
   * Delete a task (mark as cancelled)
   */
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
        .update({ status: 'cancelled' })
        .eq('id', taskId);

      if (error) throw error;

      setTasks(prev => prev.map(task =>
        task.id === taskId
          ? { ...task, status: 'cancelled' }
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

  /**
   * Handle task status update
   */
  const handleStatusUpdate = (updatedTask: Task) => {
    setTasks(prev =>
      prev.map(task =>
        task.id === updatedTask.id ? updatedTask : task
      )
    );
  };

  /**
   * Get status label with count
   */
  const getStatusLabelWithCount = (statusKey: TaskStatus | null) => {
    if (!statusKey) {
      return `All Tasks (${tasks.length})`;
    }
    return `${STATUS_LABELS[statusKey]} (${tasks.filter(t => t.status === statusKey).length})`;
  };

  // ===== Render =====

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-[calc(100vh-50px)] px-4 pt-4 ${getThemeStyle(theme, 'background', 'primary')}`}>
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className={`text-xl font-semibold ${getThemeStyle(theme, 'text', 'primary')}`}>
          Tasks
        </h2>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-auto">
            <div className={`flex items-center px-3 py-1.5 rounded-lg border ${getThemeStyle(theme, 'border', 'primary')} ${getThemeStyle(theme, 'background', 'primary')}`}>
              <Search className={`h-4 w-4 ${getThemeStyle(theme, 'text', 'muted')}`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks..."
                className={`ml-2 text-sm bg-transparent border-none focus:outline-none w-full ${getThemeStyle(theme, 'text', 'primary')} placeholder:${getThemeStyle(theme, 'text', 'muted')}`}
              />
            </div>
          </div>
          <button
            onClick={() => setShowAddTask(true)}
            className={`inline-flex items-center justify-center px-3 py-1.5 border ${getThemeStyle(theme, 'border', 'primary')} rounded-lg text-sm font-medium ${getThemeStyle(theme, 'text', 'primary')} ${getThemeStyle(theme, 'background', 'primary')} ${getThemeStyle(theme, 'interactive', 'hover', 'background')} transition-colors duration-200 w-full sm:w-auto`}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create
          </button>
        </div>
      </div>

      {/* Date Navigation */}
      <div className={`rounded-lg shadow-sm mt-4`}>
        <div className="p-4">
          <DateRangeSelector
            currentDate={currentDate}
            onDateChange={handleDateChange}
            dateFilterType={dateFilterType}
            onFilterTypeChange={(type) => setDateFilterType(type as 'day' | 'week' | 'month' | 'year')}
            itemCount={tasks.length}
            itemLabel="tasks"
          />
        </div>

        {/* Status Tabs - Mobile Dropdown / Desktop Tabs */}
        <div className={`px-4 mb-6`}>
          {/* Mobile Dropdown */}
          <div className="block sm:hidden status-dropdown-container">
            <button
              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
              className={`flex items-center justify-between w-full px-3 py-2 border rounded-md ${getThemeStyle(theme, 'background', 'secondary')} ${getThemeStyle(theme, 'border', 'primary')}`}
            >
              <span className={`text-sm font-medium ${getThemeStyle(theme, 'text', 'primary')}`}>
                {getStatusLabelWithCount(status || null)}
              </span>
              <ChevronDown className={`h-4 w-4 ${getThemeStyle(theme, 'text', 'muted')} transition-transform ${showStatusDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showStatusDropdown && (
              <div className={`absolute z-10 mt-1 w-full rounded-md shadow-lg ${getThemeStyle(theme, 'background', 'secondary')} ${getThemeStyle(theme, 'border', 'primary')} border`}>
                <div className="py-1">
                  <Link
                    to="/dashboard/tasks"
                    className={`block w-full text-left px-3 py-2 text-sm ${!status ? 'bg-blue-50 text-blue-700' : getThemeStyle(theme, 'text', 'primary')}`}
                    onClick={() => setShowStatusDropdown(false)}
                  >
                    All Tasks ({tasks.length})
                  </Link>
                  {Object.entries(STATUS_LABELS).map(([key, label]) => (
                    <Link
                      key={key}
                      to={`/dashboard/tasks/${key}`}
                      className={`block w-full text-left px-3 py-2 text-sm ${status === key ? 'bg-blue-50 text-blue-700' : getThemeStyle(theme, 'text', 'primary')}`}
                      onClick={() => setShowStatusDropdown(false)}
                    >
                      {label} ({tasks.filter(t => t.status === key).length})
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Desktop Tabs */}
          <nav className="hidden sm:flex space-x-8" aria-label="Status filters">
            <Link
              to="/dashboard/tasks"
              className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-xs ${!status
                  ? 'border-blue-500 text-blue-600'
                  : `border-transparent ${getThemeStyle(theme, 'text', 'muted')} hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300`
                }`}
            >
              All Tasks
              <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${!status ? 'bg-blue-100 text-blue-800' : `${getThemeStyle(theme, 'background', 'accent')} ${getThemeStyle(theme, 'text', 'tertiary')}`
                }`}>
                {tasks.length}
              </span>
            </Link>
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <Link
                key={key}
                to={`/dashboard/tasks/${key}`}
                className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-xs ${status === key
                    ? 'border-blue-500 text-blue-600'
                    : `border-transparent ${getThemeStyle(theme, 'text', 'muted')} hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300`
                  }`}
              >
                {label}
                <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${status === key ? 'bg-blue-100 text-blue-800' : `${getThemeStyle(theme, 'background', 'accent')} ${getThemeStyle(theme, 'text', 'tertiary')}`
                  }`}>
                  {tasks.filter(t => t.status === key).length}
                </span>
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Add Task Modal */}
      <AddTaskModal 
        isOpen={showAddTask}
        onClose={() => setShowAddTask(false)}
        organizationId={organization?.id || ''}
        currencySymbol={currencySymbol}
        workerId={null}
        onTaskAdded={handleTaskAdded}
      />

      {/* Tasks List */}
      <div className={`${getThemeStyle(theme, 'background', 'secondary')} rounded-lg shadow-sm`}>
        <div className="p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : tasks.length === 0 ? (
            <div className={`text-center ${getThemeStyle(theme, 'text', 'muted')} py-8`}>
              {status ? 'No tasks found matching this status.' : 'No tasks found for this period.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tasks.map(task => {
                return (
                  <div
                    key={task.id}
                    className={`${getThemeStyle(theme, 'background', 'primary')} border ${getThemeStyle(theme, 'border', 'primary')} rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200`}
                  >
                    <div className="p-4">
                      {/* Task Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <div className={`p-1.5 rounded-full ${STATUS_COLORS[task.status].bg}`}>
                            {React.createElement(STATUS_ICONS[task.status], {
                              className: `h-4 w-4 ${STATUS_COLORS[task.status].icon}`
                            })}
                          </div>
                          <div>
                            <h4 className={`text-sm font-medium ${task.status === 'cancelled' ? 'line-through text-gray-400' : getThemeStyle(theme, 'text', 'primary')}`}>
                              {task.project?.name || 'Unknown Project'}
                            </h4>
                            <p className={`text-xs ${task.status === 'cancelled' ? 'line-through text-gray-400' : getThemeStyle(theme, 'text', 'muted')}`}>
                              {task.worker?.name || 'Unknown Worker'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-semibold ${getThemeStyle(theme, 'text', 'primary')}`}>
                            {currencySymbol} {task.amount.toFixed(2)}
                          </p>
                        </div>
                      </div>

                      {/* Task Details */}
                      <div className="space-y-2">
                        {task.description && (
                          <p className={`text-sm ${task.status === 'cancelled' ? 'line-through text-gray-400' : getThemeStyle(theme, 'text', 'secondary')}`}>
                            {task.description}
                          </p>
                        )}
                        {task.delay_reason && (
                          <p className="text-xs text-red-600 dark:text-red-400">
                            Delay reason: {task.delay_reason}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                          <span>Created: {format(new Date(task.created_at), 'MMM d, yyyy HH:mm')}</span>
                          {task.completed_at && (
                            <span>Completed: {format(new Date(task.completed_at), 'MMM d, yyyy HH:mm')}</span>
                          )}
                        </div>
                      </div>

                      {/* Task Actions */}
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <button
                          onClick={() => {
                            if (task.status !== 'cancelled') {
                              setSelectedTask(task);
                              setShowStatusUpdate(task.id);
                            }
                          }}
                          className={`px-3 py-1.5 text-xs font-medium rounded-full ${STATUS_COLORS[task.status].bg} ${STATUS_COLORS[task.status].text} ${STATUS_COLORS[task.status].hover}`}
                        >
                          {STATUS_LABELS[task.status]}
                        </button>
                        {task.status !== 'cancelled' && (
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="text-red-400 hover:text-red-600 dark:hover:text-red-300 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 p-1"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
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
      <TaskStatusUpdateModal
        isOpen={!!showStatusUpdate}
        onClose={() => {
          setShowStatusUpdate(null);
          setSelectedTask(null);
        }}
        task={selectedTask}
        onStatusUpdate={(updatedTask: Task) => {
          setTasks(prev =>
            prev.map(task =>
              task.id === updatedTask.id ? updatedTask : task
            )
          );
        }}
      />
    </div>
  );
}