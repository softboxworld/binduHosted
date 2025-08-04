/**
 * Task Status Types and Constants
 */
export const TASK_STATUS_LABELS = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  delayed: 'Delayed',
  cancelled: 'Cancelled'
} as const;

export const TASK_STATUS_ICONS = {
  pending: 'Clock',
  in_progress: 'Clock',
  completed: 'CheckCircle',
  delayed: 'AlertCircle',
  cancelled: 'XCircle'
} as const;

export const TASK_STATUS_COLORS = {
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

export type TaskStatus = keyof typeof TASK_STATUS_LABELS;

export interface Task {
  id: string;
  organization_id: string;
  worker_id: string;
  project_id: string;
  description?: string;
  due_date: string;
  status: TaskStatus;
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
  deductions?: {
    id: string;
    amount: number;
    reason: string;
    created_at: string;
  }[];
}

export interface Worker {
  id: string;
  name: string;
  completedEarnings: number; // New field
  totalEarnings: number;
  image: string;
  whatsapp?: string;
  projectRates: Record<string, number>;
  workerProjects: Project[];
  taskStats: {
    allTime: number;
    weekly: number;
    daily: number;
  };
}

export interface Project {
  id: string;
  name: string;
  basePrice: number;
  description?: string;
  isEditing?: boolean;
}