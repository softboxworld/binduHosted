import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useUI } from '../../context/UIContext';
import { useTheme } from '../../context/ThemeContext';
import { CURRENCIES } from '../../utils/constants';
import { format } from 'date-fns';
import {
  ArrowLeft, Calendar, User, Package, Clock,
  FileText, CheckCircle, XCircle, AlertTriangle, DollarSign,
  X, Printer, Plus
} from 'lucide-react';
import { LucideIcon } from 'lucide-react';
import { RecordPayment } from '../common/RecordPayment';
import { CancelOrderModal } from './CancelOrderModal';
import OrderReceipt from './OrderReceipt';
import { AddWorkersModal } from './AddWorkersModal';

type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'delayed' | 'cancelled';
type OrderStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'closed';

const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  delayed: 'Delayed',
  cancelled: 'Cancelled'
};

const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
  completed: 'bg-green-100 text-green-800 border-green-200',
  delayed: 'bg-red-100 text-red-800 border-red-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200'
};

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  closed: 'Closed'
};

const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
  completed: 'bg-green-100 text-green-800 border-green-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
  closed: 'bg-gray-100 text-gray-800 border-gray-200'
};

const STATUS_ICONS: Record<OrderStatus, LucideIcon> = {
  pending: AlertTriangle,
  in_progress: Clock,
  completed: CheckCircle,
  cancelled: XCircle,
  closed: CheckCircle
};

interface Payment {
  id: string;
  amount: number;
  payment_method: string;
  payment_reference: string;
  created_at: string;
  status: string;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancellation_reason: string | null;
}

interface OrderService {
  id: string;
  service: {
    name: string;
  };
  quantity: number;
  cost: number;
}

interface CustomField {
  id: string;
  field: {
    title: string;
    value: string;
  };
}

interface OrderWorker {
  id: string;
  worker: {
    id: string;
    name: string;
  };
  project: {
    id: string;
    name: string;
    price: number;
  };
  status: string;
  task_description: string;
  start_date: string;
  end_date: string;
  amount: number;
}

interface Task {
  id: string;
  status: TaskStatus;
  description?: string;
  created_at: string;
  completed_at?: string;
  delay_reason?: string;
  worker_id: string;
  project_id: string;
  order_id: string;
}

interface Order {
  id: string;
  order_number: string;
  client: {
    name: string;
  };
  description: string;
  due_date: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'closed';
  total_amount: number;
  outstanding_balance: number;
  payment_status: 'unpaid' | 'partially_paid' | 'paid' | 'cancelled';
  created_at: string;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancellation_reason: string | null;
  workers: OrderWorker[];
  services: OrderService[];
  payments: Payment[];
  custom_fields: CustomField[];
  tasks: Task[];
}

export default function OrderDetails() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isDelayModalOpen, setIsDelayModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [delayReason, setDelayReason] = useState('');
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [isAddWorkersModalOpen, setIsAddWorkersModalOpen] = useState(false);
  const [isCancelPaymentModalOpen, setIsCancelPaymentModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const { organization } = useAuthStore();
  const { addToast } = useUI();
  const { getThemeStyle, theme } = useTheme();
  const currencySymbol = organization?.currency ? CURRENCIES[organization.currency]?.symbol || organization.currency : CURRENCIES['USD'].symbol;

  useEffect(() => {
    if (!id) return;
    loadOrderDetails();
  }, [id]);

  const loadOrderDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          client:clients(name),
          workers:order_workers(
            id,
            worker_id,
            status,
            worker:workers(name),
            project:worker_projects(
              id,
              name,
              price
            )
          ),
          services:order_services(
            id,
            service_id,
            quantity,
            cost,
            service:services(name)
          ),
          custom_fields:order_custom_fields(
            id,
            field:client_custom_fields(title, value)
          )
        `)
        .eq('id', id)
        .single();

      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .eq('reference_type', 'service_order')
        .eq('reference_id', id);

      // Load tasks for this order
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          *,
          project:worker_projects(
            id,
            name,
            price
          ),
          worker:workers(name)
        `)
        .eq('order_id', id);

      if (error) throw error;
      if (tasksError) throw tasksError;

      setOrder({ ...data, payments: paymentsData || [], tasks: tasksData || [] } as Order);
    } catch (error) {
      console.error('Error loading order:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to load order details'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus: Order['status']) => {
    if (!order) return;

    // Check if trying to set status to 'closed' without full payment
    if (newStatus === 'closed' && order.payment_status !== 'paid') {
      addToast({
        type: 'error',
        title: 'Cannot Close Order',
        message: 'Order must be fully paid before it can be closed'
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', order.id);

      if (error) throw error;

      setOrder(prev => prev ? { ...prev, status: newStatus } : null);
      addToast({
        type: 'success',
        title: 'Status Updated',
        message: `Order status updated to ${ORDER_STATUS_LABELS[newStatus]}`
      });
    } catch (error) {
      console.error('Error updating status:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to update order status'
      });
    }
  };

  const handleDeleteOrder = async (reason: string, cancelWorkerTasks: boolean) => {
    if (!order) return;

    try {
      // Update order status to cancelled
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          status: 'cancelled',
          cancellation_reason: reason,
          cancelled_at: new Date().toISOString(),
          cancelled_by: organization?.id || null
        })
        .eq('id', order.id);

      if (orderError) throw orderError;

      // Only update worker tasks if the user chose to do so
      if (cancelWorkerTasks) {
        const { error: taskError } = await supabase
          .from('tasks')
          .update({ status: 'cancelled' })
          .eq('order_id', order.id);

        if (taskError) throw taskError;
      }

      // Update all associated payments to cancelled status
      const { error: paymentsError } = await supabase
        .from('payments')
        .update({
          status: 'cancelled'
        })
        .eq('reference_type', 'service_order')
        .eq('reference_id', order.id);

      if (paymentsError) throw paymentsError;
      // Refresh the order details
      await loadOrderDetails();

      addToast({
        type: 'success',
        title: 'Order Cancelled',
        message: 'The order and all associated worker tasks and payments have been cancelled successfully.'
      });

      setIsCancelModalOpen(false);
    } catch (error) {
      console.error('Error cancelling order:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to cancel the order'
      });
    }
  };

  const handleUpdateWorkerStatus = async (workerId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('order_workers')
        .update({ status: newStatus })
        .eq('id', workerId);

      if (error) throw error;

      // Refresh the order details to show updated status
      loadOrderDetails();

      addToast({
        type: 'success',
        title: 'Status Updated',
        message: 'Worker task status has been updated'
      });
    } catch (error) {
      console.error('Error updating worker status:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to update worker status'
      });
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: TaskStatus, delayReason?: string) => {
    try {
      const updateData: any = {
        status: newStatus,
        status_changed_at: new Date().toISOString()
      };

      if (newStatus === 'completed') {
        updateData.completed_at = new Date().toISOString();
      } else if (newStatus === 'delayed' && delayReason) {
        updateData.delay_reason = delayReason;
      }

      const { error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', taskId);

      if (error) throw error;

      // Refresh the order details to show updated status
      loadOrderDetails();

      addToast({
        type: 'success',
        title: 'Status Updated',
        message: `Task status updated to ${TASK_STATUS_LABELS[newStatus]}`
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

  const handleStatusChange = (task: Task, newStatus: TaskStatus) => {
    if (newStatus === 'delayed') {
      setSelectedTask(task);
      setIsDelayModalOpen(true);
    } else {
      handleUpdateTaskStatus(task.id, newStatus);
    }
  };

  const handleDelaySubmit = () => {
    if (selectedTask && delayReason.trim()) {
      handleUpdateTaskStatus(selectedTask.id, 'delayed', delayReason.trim());
      setIsDelayModalOpen(false);
      setDelayReason('');
      setSelectedTask(null);
    }
  };

  const handleAddWorkers = async (selectedWorkers: { worker_id: string; project_id: string }[]) => {
    if (!order) return;

    try {
      // Insert new workers into order_workers table
      const { error } = await supabase
        .from('order_workers')
        .insert(
          selectedWorkers.map(worker => ({
            order_id: order.id,
            worker_id: worker.worker_id,
            project_id: worker.project_id,
            status: 'assigned'
          }))
        );

      if (error) throw error;

      // Refresh the order details
      await loadOrderDetails();

      addToast({
        type: 'success',
        title: 'Workers Added',
        message: 'Workers have been successfully added to the order'
      });

      setIsAddWorkersModalOpen(false);
    } catch (error) {
      console.error('Error adding workers:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to add workers to the order'
      });
    }
  };

  const handleCancelPayment = async (paymentId: string, reason: string) => {
    try {
      // Start a transaction to update both payment and order
      const { error: paymentError } = await supabase
        .from('payments')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancelled_by: organization?.id || null,
          cancellation_reason: reason
        })
        .eq('id', paymentId);

      if (paymentError) throw paymentError;

      // Get the payment amount before updating
      const { data: payment, error: getPaymentError } = await supabase
        .from('payments')
        .select('amount')
        .eq('id', paymentId)
        .single();

      if (getPaymentError) throw getPaymentError;

      // Update the order's outstanding balance
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          outstanding_balance: order!.outstanding_balance + payment.amount
        })
        .eq('id', order!.id);

      if (orderError) throw orderError;

      // Refresh the order details
      await loadOrderDetails();

      addToast({
        type: 'success',
        title: 'Payment Cancelled',
        message: 'The payment has been cancelled successfully and the outstanding balance has been updated.'
      });

      setIsCancelPaymentModalOpen(false);
      setSelectedPayment(null);
      setCancellationReason('');
    } catch (error) {
      console.error('Error cancelling payment:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to cancel the payment'
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className={`text-sm ${getThemeStyle(theme, 'text', 'muted')}`}>Order not found.</p>
        <Link
          to="/dashboard/orders"
          className={`mt-4 inline-flex items-center text-blue-600 hover:text-blue-800 text-sm`}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Orders
        </Link>
      </div>
    );
  }

  const StatusIcon = STATUS_ICONS[order.status];

  return (
    <div className={`p-4 ${getThemeStyle(theme, 'background', 'primary')} min-h-screen`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <Link
            to="/dashboard/orders"
            className={`${getThemeStyle(theme, 'text', 'muted')} hover:${getThemeStyle(theme, 'text', 'secondary')}`}
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h2 className={`text-xl font-bold ${order.status === 'cancelled' ? 'text-gray-400 line-through' : getThemeStyle(theme, 'text', 'primary')}`}>
              Order {order.order_number}
            </h2>
            <p className={`text-xs ${getThemeStyle(theme, 'text', 'muted')} mt-1`}>
              Created on {format(new Date(order.created_at), 'MMM d, yyyy HH:mm')}
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          {/* <div className={`px-4 py-2 rounded-full border ${ORDER_STATUS_COLORS[order.status]} flex items-center space-x-2`}>
            <StatusIcon className="h-4 w-4" />
            <span className="text-xs font-medium">{ORDER_STATUS_LABELS[order.status]}</span>
          </div> */}
          <div className="flex gap-3 w-full sm:w-auto">
            <button
              onClick={() => setIsReceiptOpen(true)}
              className={`flex-1 sm:flex-none inline-flex items-center justify-center px-3 py-1.5 border ${getThemeStyle(theme, 'border', 'primary')} rounded-md shadow-sm text-xs font-medium ${getThemeStyle(theme, 'text', 'secondary')} ${getThemeStyle(theme, 'background', 'primary')} ${getThemeStyle(theme, 'interactive', 'hover', 'background')}`}
            >
              <Printer className="h-4 w-4 mr-2" />
              Print Receipt
            </button>
            {order.status !== 'cancelled' && (
              <div className="relative flex-1 sm:flex-none">
                <select
                  value={order.status}
                  onChange={(e) => handleUpdateStatus(e.target.value as Order['status'])}
                  className={`w-full appearance-none ${getThemeStyle(theme, 'background', 'primary')} border ${getThemeStyle(theme, 'border', 'primary')} rounded-lg py-2 pl-3 pr-10 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  {order.payment_status === 'paid' && <option value="closed">Closed</option>}
                  <option value="cancelled">Cancelled</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Order Info */}
        <div className="lg:col-span-2 space-y-4">
          {/* Order Details Card - Consolidated */}
          <div className={`${getThemeStyle(theme, 'background', 'primary')} shadow-sm rounded-lg overflow-hidden ${order.status === 'cancelled' ? 'opacity-75' : ''}`}>
            <div className={`px-3 py-2 border-b ${getThemeStyle(theme, 'border', 'primary')} flex items-center justify-between`}>
              <h3 className={`text-sm font-medium ${getThemeStyle(theme, 'text', 'primary')}`}>Order Details</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full ${ORDER_STATUS_COLORS[order.status]}`}>
                {ORDER_STATUS_LABELS[order.status]}
              </span>
            </div>
            <div className="p-3 space-y-3">
              {/* Client Info & Due Date Row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <User className={`h-4 w-4 ${getThemeStyle(theme, 'text', 'accent')}`} />
                  <span className={`text-xs font-medium ${order.status === 'cancelled' ? 'line-through text-gray-400' : getThemeStyle(theme, 'text', 'primary')}`}>
                    {order.client.name}
                  </span>
                </div>
                {order.due_date && (
                  <div className="flex items-center space-x-2">
                    <Calendar className={`h-4 w-4 ${getThemeStyle(theme, 'text', 'accent')}`} />
                    <span className={`text-xs ${order.status === 'cancelled' ? 'line-through text-gray-400' : getThemeStyle(theme, 'text', 'muted')}`}>
                      Due: {format(new Date(order.due_date), 'MMM d, yyyy')}
                    </span>
                  </div>
                )}
              </div>

              {/* Description */}
              {order.description && (
                <div className="text-xs text-gray-600 border-l-2 border-gray-200 pl-2">
                  {order.description}
                </div>
              )}

              {/* Services */}
              <div className="space-y-2">
                <h4 className={`text-sm mt-8 font-medium ${getThemeStyle(theme, 'text', 'primary')}`}>Services</h4>
                <div className="space-y-1">
                  {order.services.map((service) => (
                    <div
                      key={service.id}
                      className={`flex items-center justify-between p-2 ${getThemeStyle(theme, 'background', 'secondary')} rounded ${order.status === 'cancelled' ? 'line-through text-gray-400' : ''}`}
                    >
                      <div className="flex items-center space-x-2">
                        <Package className={`h-4 w-4 ${getThemeStyle(theme, 'text', 'accent')}`} />
                        <div>
                          <p className={`text-xs font-medium ${getThemeStyle(theme, 'text', 'primary')}`}>
                            {service.service.name}
                          </p>
                          <p className={`text-xs ${getThemeStyle(theme, 'text', 'muted')}`}>
                            Qty: {service.quantity}
                          </p>
                        </div>
                      </div>
                      <div className={`text-xs font-medium ${getThemeStyle(theme, 'text', 'primary')}`}>
                        {currencySymbol} {service.cost.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
                <div className={`pt-2 border-t ${getThemeStyle(theme, 'border', 'primary')} flex justify-between text-xs`}>
                  <span className={`font-medium ${getThemeStyle(theme, 'text', 'primary')}`}>Total Amount</span>
                  <span className={`font-bold ${order.status === 'cancelled' ? 'line-through text-gray-400' : getThemeStyle(theme, 'text', 'primary')}`}>
                    {currencySymbol} {order.total_amount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Custom Fields */}
          {order.custom_fields?.length > 0 && (
            <div className={`${getThemeStyle(theme, 'background', 'primary')} shadow-sm rounded-lg overflow-hidden`}>
              <div className={`px-3 py-2 border-b ${getThemeStyle(theme, 'border', 'primary')}`}>
                <h3 className={`text-sm font-medium ${getThemeStyle(theme, 'text', 'primary')}`}>Custom Information</h3>
              </div>
              <div className="p-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {order.custom_fields.map((field) => (
                    <div key={field.id} className="flex items-start space-x-2">
                      <FileText className={`h-4 w-4 mt-0.5 ${getThemeStyle(theme, 'text', 'accent')}`} />
                      <div className="min-w-0">
                        <p className={`text-xs font-medium ${getThemeStyle(theme, 'text', 'primary')}`}>
                          {field.field.title}
                        </p>
                        <p className={`text-xs ${getThemeStyle(theme, 'text', 'muted')}`}>
                          {field.field.value}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Workers Info */}
          <div className={`${getThemeStyle(theme, 'background', 'primary')} shadow-sm rounded-lg overflow-hidden`}>
            <div className={`px-3 py-2 border-b ${getThemeStyle(theme, 'border', 'primary')} flex items-center justify-between`}>
              <h3 className={`text-sm font-medium ${getThemeStyle(theme, 'text', 'primary')}`}>Assigned Workers</h3>
              {order.status !== 'cancelled' && (
                <button
                  onClick={() => setIsAddWorkersModalOpen(true)}
                  className={`inline-flex items-center px-2 py-1 border ${getThemeStyle(theme, 'border', 'primary')} rounded-md text-xs font-medium ${getThemeStyle(theme, 'text', 'primary')} ${getThemeStyle(theme, 'background', 'secondary')} hover:${getThemeStyle(theme, 'background', 'accent')}`}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Workers
                </button>
              )}
            </div>
            <div className="p-3">
              {order.workers?.length ? (
                <div className="space-y-3">
                  {order.workers.map(worker => {
                    const workerId = (worker as any).worker_id;
                    const workerTasks = order.tasks?.filter(task => task.worker_id === workerId) || [];

                    return (
                      <div key={worker.id} className={`${getThemeStyle(theme, 'background', 'primary')} border-l-2 border-blue-500 pl-3`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center">
                              <User className="h-3 w-3 text-blue-600" />
                            </div>
                            <div>
                              <h4 className={`text-xs font-medium ${getThemeStyle(theme, 'text', 'primary')}`}>
                                {worker.worker.name}
                              </h4>
                              <p className={`text-xs ${getThemeStyle(theme, 'text', 'muted')}`}>
                                {worker.project.name}
                              </p>
                            </div>
                          </div>
                          {workerId && (
                            <Link
                              to={`/dashboard/workers/${workerId}`}
                              className={`text-xs ${getThemeStyle(theme, 'text', 'accent')} hover:${getThemeStyle(theme, 'text', 'secondary')}`}
                            >
                              View Profile
                            </Link>
                          )}
                        </div>

                        {worker.task_description && (
                          <p className={`mt-1 text-xs ${getThemeStyle(theme, 'text', 'tertiary')} line-clamp-1`}>
                            {worker.task_description}
                          </p>
                        )}

                        {/* Task Status Section */}
                        {workerTasks.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {workerTasks.map(task => (
                              <div key={task.id} className={`${task.status === 'cancelled' ? 'opacity-75' : ''}`}>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium
                                      ${task.status === 'completed' ? 'bg-green-100 text-green-800' :
                                        task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                          task.status === 'delayed' ? 'bg-red-100 text-red-800' :
                                            task.status === 'cancelled' ? 'bg-gray-100 text-gray-800' :
                                              'bg-yellow-100 text-yellow-800'}`}>
                                      {TASK_STATUS_LABELS[task.status]}
                                    </span>
                                    <span className={`text-xs ${task.status === 'cancelled' ? 'line-through text-gray-400' : getThemeStyle(theme, 'text', 'muted')}`}>
                                      {format(new Date(task.created_at), 'MMM d')}
                                    </span>
                                  </div>
                                  {task.status !== 'cancelled' && (
                                    <select
                                      value={task.status}
                                      onChange={(e) => {
                                        const newStatus = e.target.value as TaskStatus;
                                        handleStatusChange(task, newStatus);
                                      }}
                                      className={`text-xs appearance-none ${getThemeStyle(theme, 'background', 'primary')} border ${getThemeStyle(theme, 'border', 'primary')} rounded py-0.5 pl-1 pr-6 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500`}
                                    >
                                      <option value="pending">Pending</option>
                                      <option value="in_progress">In Progress</option>
                                      <option value="delayed">Delayed</option>
                                      <option value="completed">Completed</option>
                                    </select>
                                  )}
                                </div>
                                {task.delay_reason && (
                                  <p className="mt-0.5 text-xs text-red-600">Delay: {task.delay_reason}</p>
                                )}
                                {task.completed_at && (
                                  <p className={`mt-0.5 text-xs ${task.status === 'cancelled' ? 'line-through text-gray-400' : getThemeStyle(theme, 'text', 'muted')}`}>
                                    Completed: {format(new Date(task.completed_at), 'MMM d, HH:mm')}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                          {worker.start_date && (
                            <div className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              <span>Start: {format(new Date(worker.start_date), 'MMM d')}</span>
                            </div>
                          )}
                          {worker.end_date && (
                            <div className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              <span>End: {format(new Date(worker.end_date), 'MMM d')}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className={`text-xs ${getThemeStyle(theme, 'text', 'muted')}`}>No workers assigned</p>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          
          {/* Payment Details Section */}
          <div className={`${getThemeStyle(theme, 'background', 'primary')} shadow rounded-lg overflow-hidden ${order.status === 'cancelled' ? 'opacity-75' : ''}`}>
            <div className={`px-4 py-3 border-b ${getThemeStyle(theme, 'border', 'primary')}`}>
              <div className="flex flex-col space-y-2">
                <h3 className={`text-sm font-medium ${getThemeStyle(theme, 'text', 'primary')} flex items-center`}>
                  <DollarSign className={`h-4 w-4 mr-2 ${getThemeStyle(theme, 'text', 'muted')}`} />
                  Payment Details
                </h3>
                <span className={`w-fit inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                  ${order?.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                    order?.payment_status === 'partially_paid' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'}`}>
                  {order?.payment_status === 'paid' ? 'Paid' :
                    order?.payment_status === 'partially_paid' ? 'Partially Paid' :
                      'Unpaid'}
                </span>
              </div>
            </div>
            <div className="p-3 space-y-4">
              {/* Payment Summary */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <p className="text-xs text-blue-600 font-medium">Total Amount</p>
                  <p className={`text-sm font-bold ${order.status === 'cancelled' ? 'line-through text-gray-400' : 'text-blue-900'}`}>
                    {currencySymbol} {order?.total_amount.toFixed(2)}
                  </p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-xs text-green-600 font-medium">Amount Paid</p>
                  <p className={`text-sm font-bold ${order.status === 'cancelled' ? 'line-through text-gray-400' : 'text-green-900'}`}>
                    {currencySymbol} {(order?.total_amount - (order?.outstanding_balance || 0)).toFixed(2)}
                  </p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-xs text-orange-600 font-medium">Outstanding Balance</p>
                  <p className={`text-sm font-bold ${order.status === 'cancelled' ? 'line-through text-gray-400' : 'text-orange-900'}`}>
                    {currencySymbol} {(order?.outstanding_balance || 0).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Payment Actions */}
              <div className="space-y-2">
                {order.payment_status !== 'paid' && order.status !== 'cancelled' && (
                  <RecordPayment
                    orderId={order.id}
                    orderType="service_order"
                    orderNumber={order.order_number}
                    clientName={order.client.name}
                    outstandingBalance={order.outstanding_balance}
                    onPaymentRecorded={loadOrderDetails}
                  />
                )}
                {order.status !== 'cancelled' && (
                  <button
                    onClick={() => setIsRecordPaymentOpen(true)}
                    className={`w-full inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                  >
                    <DollarSign className="h-4 w-4 mr-1" />
                    Record Payment
                  </button>
                )}
              </div>

              {/* Payment History */}
              <div>
                <h4 className={`text-xs font-medium ${getThemeStyle(theme, 'text', 'primary')} mb-2`}>Payment History</h4>
                {order?.payments && order.payments.length > 0 ? (
                  <div className={`divide-y ${getThemeStyle(theme, 'border', 'primary')} max-h-40 overflow-y-auto`}>
                    {order.payments.map(payment => (
                      <div key={payment.id} className={`py-2 flex flex-col space-y-1 ${payment.status === 'cancelled' ? 'opacity-75' : ''}`}>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center space-x-2">
                            <p className={`text-xs font-medium ${payment.status === 'cancelled' ? 'line-through text-gray-400' : getThemeStyle(theme, 'text', 'primary')}`}>
                              {currencySymbol} {payment.amount.toFixed(2)}
                            </p>
                            {payment.status === 'cancelled' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                Cancelled
                              </span>
                            )}
                          </div>
                          <p className={`text-xs ${payment.status === 'cancelled' ? 'line-through text-gray-400' : getThemeStyle(theme, 'text', 'muted')}`}>
                            {format(new Date(payment.created_at), 'MMM d, yyyy HH:mm')}
                          </p>
                        </div>
                        <div className="flex justify-between items-center">
                          <p className={`text-xs ${payment.status === 'cancelled' ? 'line-through text-gray-400' : getThemeStyle(theme, 'text', 'muted')} truncate`}>
                            {payment.payment_method} • {payment.payment_reference}
                          </p>
                          {payment.status !== 'cancelled' && (
                            <button
                              onClick={() => {
                                setSelectedPayment(payment);
                                setIsCancelPaymentModalOpen(true);
                              }}
                              className="text-xs text-red-600 hover:text-red-800"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                        {payment.status === 'cancelled' && payment.cancellation_reason && (
                          <p className="text-xs text-red-600 mt-1">
                            Reason: {payment.cancellation_reason}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={`text-xs ${getThemeStyle(theme, 'text', 'muted')} italic`}>No payments recorded yet</p>
                )}
              </div>
            </div>
          </div>

          {/* Cancel Order Button - Only show if order is not cancelled */}
          {order.status !== 'cancelled' && (
            <div className={`${getThemeStyle(theme, 'background', 'primary')} shadow rounded-lg overflow-hidden`}>
              <div className={`px-4 py-5 sm:px-6 border-b ${getThemeStyle(theme, 'border', 'primary')}`}>
                <h3 className={`text-base font-medium ${getThemeStyle(theme, 'text', 'primary')}`}>Danger Zone</h3>
              </div>
              <div className="px-4 py-5 sm:p-6">
                <button
                  onClick={() => setIsCancelModalOpen(true)}
                  className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Cancel Order
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Order Receipt Modal */}
      {isReceiptOpen && (
        <div className={`fixed inset-0 ${getThemeStyle(theme, 'modal', 'overlay')} flex items-center justify-center z-50 p-4`}>
          <div className="relative w-full max-w-2xl">
            <OrderReceipt
              orderId={order.id}
              onClose={() => setIsReceiptOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {isRecordPaymentOpen && (
        <RecordPayment
          orderId={order.id}
          outstandingBalance={order.outstanding_balance}
          onPaymentRecorded={() => {
            loadOrderDetails();
            setIsRecordPaymentOpen(false);
          }}
          isOpen={isRecordPaymentOpen}
          onClose={() => setIsRecordPaymentOpen(false)}
          currencySymbol={currencySymbol}
        />
      )}

      <CancelOrderModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        onConfirm={(reason: string, cancelWorkerTasks: boolean) => handleDeleteOrder(reason, cancelWorkerTasks)}
      />

      {/* Delay Reason Modal */}
      {isDelayModalOpen && (
        <div className={`fixed inset-0 ${getThemeStyle(theme, 'modal', 'overlay')} flex items-center justify-center z-50 p-4`}>
          <div className={`${getThemeStyle(theme, 'modal', 'background')} rounded-lg p-6 max-w-md w-full mx-4`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className={`text-base font-medium ${getThemeStyle(theme, 'text', 'primary')}`}>Add Delay Reason</h3>
              <button
                onClick={() => {
                  setIsDelayModalOpen(false);
                  setDelayReason('');
                  setSelectedTask(null);
                }}
                className={`${getThemeStyle(theme, 'text', 'accent')} hover:${getThemeStyle(theme, 'text', 'muted')}`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mb-4">
              <label htmlFor="delay-reason" className={`block text-xs font-medium ${getThemeStyle(theme, 'text', 'secondary')} mb-1`}>
                Reason for Delay
              </label>
              <textarea
                id="delay-reason"
                value={delayReason}
                onChange={(e) => setDelayReason(e.target.value)}
                className={`w-full px-3 py-2 border ${getThemeStyle(theme, 'border', 'primary')} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-xs`}
                rows={3}
                placeholder="Please provide a reason for the delay..."
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setIsDelayModalOpen(false);
                  setDelayReason('');
                  setSelectedTask(null);
                }}
                className={`px-4 py-2 text-xs font-medium ${getThemeStyle(theme, 'text', 'secondary')} ${getThemeStyle(theme, 'background', 'primary')} border ${getThemeStyle(theme, 'border', 'primary')} rounded-md ${getThemeStyle(theme, 'interactive', 'hover', 'background')} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
              >
                Cancel
              </button>
              <button
                onClick={handleDelaySubmit}
                disabled={!delayReason.trim()}
                className="px-4 py-2 text-xs font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Workers Modal */}
      {isAddWorkersModalOpen && (
        <AddWorkersModal
          isOpen={isAddWorkersModalOpen}
          onClose={() => setIsAddWorkersModalOpen(false)}
          onAddWorkers={handleAddWorkers}
          existingWorkerIds={order?.workers?.map(w => (w as any).worker_id) || []}
        />
      )}

      {/* Cancel Payment Modal */}
      {isCancelPaymentModalOpen && selectedPayment && (
        <div className={`fixed inset-0 ${getThemeStyle(theme, 'modal', 'overlay')} flex items-center justify-center z-50 p-4`}>
          <div className={`${getThemeStyle(theme, 'modal', 'background')} rounded-lg p-6 max-w-md w-full mx-4`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className={`text-base font-medium ${getThemeStyle(theme, 'text', 'primary')}`}>Cancel Payment</h3>
              <button
                onClick={() => {
                  setIsCancelPaymentModalOpen(false);
                  setSelectedPayment(null);
                  setCancellationReason('');
                }}
                className={`${getThemeStyle(theme, 'text', 'accent')} hover:${getThemeStyle(theme, 'text', 'muted')}`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mb-4">
              <label htmlFor="cancellation-reason" className={`block text-xs font-medium ${getThemeStyle(theme, 'text', 'secondary')} mb-1`}>
                Reason for Cancellation
              </label>
              <textarea
                id="cancellation-reason"
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                className={`w-full px-3 py-2 border ${getThemeStyle(theme, 'border', 'primary')} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-xs`}
                rows={3}
                placeholder="Please provide a reason for cancelling this payment..."
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setIsCancelPaymentModalOpen(false);
                  setSelectedPayment(null);
                  setCancellationReason('');
                }}
                className={`px-4 py-2 text-xs font-medium ${getThemeStyle(theme, 'text', 'secondary')} ${getThemeStyle(theme, 'background', 'primary')} border ${getThemeStyle(theme, 'border', 'primary')} rounded-md ${getThemeStyle(theme, 'interactive', 'hover', 'background')} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
              >
                Cancel
              </button>
              <button
                onClick={() => handleCancelPayment(selectedPayment.id, cancellationReason)}
                disabled={!cancellationReason.trim()}
                className="px-4 py-2 text-xs font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}