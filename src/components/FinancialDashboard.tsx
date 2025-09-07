import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { useUI } from '../context/UIContext';
import { useTheme } from '../context/ThemeContext';
import { ResponsivePie } from '@nivo/pie';
import { 
  format, 
  startOfDay, 
  endOfDay,
} from 'date-fns';
import { Calendar, FileText, Download, DollarSign, CreditCard, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { CURRENCIES } from '../utils/constants';
import jsPDF from 'jspdf';
import { PaymentMethod } from '../types/inventory';

interface PaymentMethodStats {
  method: string;
  amount: number;
  count: number;
}

interface Payment {
  id: number;
  reference_id: string;
  reference_type: 'sales_order' | 'service_order';
  amount: number;
  payment_method: string;
  transaction_reference: string | null;
  created_at: string;
  status: string;
  order_details?: {
    order_number: string;
    client_name: string;
    status?: string;
  };
}

// Add type for payment method keys
type PaymentMethodKey = PaymentMethod;


const CARD_COLORS: Record<PaymentMethodKey, { bg: string; text: string; border: string }> = {
  'mobile_money': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  'bank_transfer': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' }, 
  'card_payment': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  'check': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  'cash': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
};

// Helper function to get color safely
const getMethodColor = (method: string): { bg: string; text: string; border: string } => {
  const key = method.toLowerCase().replace(/ /g, '_') as PaymentMethodKey;
  return CARD_COLORS[key] || { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' }; // Default gray color for unknown payment methods
};

// Helper function to get hex color for chart
const getMethodHexColor = (method: string): string => {
  const key = method.toLowerCase().replace(/ /g, '_') as PaymentMethodKey;
  const colorMap: Record<PaymentMethodKey, string> = {
   'mobile_money': '#FFE45E',
  'bank_transfer': '#A855F7',
  'card_payment': '#3B82F6',
  'check': '#34D399',
  'cash': '#4ADE80',
  };
  return colorMap[key] || '#9CA3AF'; // Default gray color for unknown payment methods
};

const generateCSV = (payments: Payment[], paymentStats: PaymentMethodStats[], currencySymbol: string) => {
  // Generate CSV for transactions
  const transactionHeaders = ['Order Number', 'Client Name', 'Amount', 'Payment Method', 'Date'];
  const transactionRows = payments.map(payment => [
    payment.order_details?.order_number || 'N/A',
    payment.order_details?.client_name || 'N/A',
    `${currencySymbol}${payment.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    payment.payment_method,
    format(new Date(payment.created_at), 'MMM d, yyyy')
  ]);

  // Generate CSV for payment method statistics
  const statsHeaders = ['Payment Method', 'Total Amount', 'Transaction Count'];
  const statsRows = paymentStats.map(stat => [
    stat.method,
    `${currencySymbol}${stat.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    stat.count.toString()
  ]);

  // Combine all data
  const csvContent = [
    ['Financial Report'],
    ['Date Range:', format(new Date(), 'MMM d, yyyy')],
    [],
    ['Transaction Details'],
    transactionHeaders,
    ...transactionRows,
    [],
    ['Payment Method Statistics'],
    statsHeaders,
    ...statsRows
  ]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');

  return csvContent;
};

const downloadCSV = (csvContent: string, filename: string) => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export default function FinancialDashboard() {
  const [paymentStats, setPaymentStats] = useState<PaymentMethodStats[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [startDate, endDate] = dateRange;
  const { organization } = useAuthStore();
  const { addToast } = useUI();
  const { theme, getThemeStyle } = useTheme();
  const currencySymbol = organization?.currency ? CURRENCIES[organization.currency]?.symbol || organization.currency : CURRENCIES['USD'].symbol;
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [totalAmount, setTotalAmount] = useState(0);
  const [transactionCount, setTransactionCount] = useState(0);
  const [mostPopularMethod, setMostPopularMethod] = useState<string>('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Update isMobile state on window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getDateRange = () => {
    if (!startDate || !endDate) {
      // Default to current day if no dates selected
      const now = new Date();
      return {
        start: startOfDay(now),
        end: endOfDay(now)
      };
    }
    return {
      start: startOfDay(startDate),
      end: endOfDay(endDate)
    };
  };

  const fetchPaymentData = async () => {
    if (!organization) return;

    const { start, end } = getDateRange();

    try {
      // Initialize arrays to store all data
      let allStatsData: any[] = [];
      let allPaymentsData: any[] = [];
      let hasMore = true;
      let page = 0;
      const pageSize = 1000; // Supabase's limit

      // Fetch all payment statistics with pagination
      while (hasMore) {
        const { data: statsData, error: statsError } = await supabase
          .from('payments')
          .select('payment_method, amount, reference_id, reference_type, status')
          .eq('organization_id', organization.id)
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString())
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (statsError) throw statsError;

        if (statsData && statsData.length > 0) {
          allStatsData = [...allStatsData, ...statsData];
          page++;
        } else {
          hasMore = false;
        }
      }

      // Reset pagination for detailed payment records
      hasMore = true;
      page = 0;

      // Fetch all detailed payment records with pagination
      while (hasMore) {
        const { data: paymentsData, error: paymentsError } = await supabase
          .from('payments')
          .select('*')
          .eq('organization_id', organization.id)
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString())
          .order('created_at', { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (paymentsError) throw paymentsError;

        if (paymentsData && paymentsData.length > 0) {
          allPaymentsData = [...allPaymentsData, ...paymentsData];
          page++;
        } else {
          hasMore = false;
        }
      }

      // Fetch order statuses for all payments
      const orderStatuses = await Promise.all(
        allStatsData.map(async (payment) => {
          if (payment.reference_type === 'service_order') {
            const { data: orderData } = await supabase
              .from('orders')
              .select('status')
              .eq('id', payment.reference_id)
              .single();
            return { id: payment.reference_id, status: orderData?.status };
          } else if (payment.reference_type === 'sales_order') {
            const { data: salesOrderData } = await supabase
              .from('sales_orders')
              .select('status')
              .eq('id', payment.reference_id)
              .single();
            return { id: payment.reference_id, status: salesOrderData?.status };
          }
          return { id: payment.reference_id, status: null };
        })
      );

      // Create a map of order statuses
      const orderStatusMap = orderStatuses.reduce((acc, { id, status }) => {
        acc[id] = status;
        return acc;
      }, {} as Record<string, string | null>);

      // Calculate payment method statistics (excluding cancelled orders)
      const stats = allStatsData.reduce((acc: PaymentMethodStats[], payment) => {
        const orderStatus = orderStatusMap[payment.reference_id];
        // Skip cancelled orders in statistics
        if (orderStatus === 'cancelled') return acc;

        const existingMethod = acc.find(s => s.method === payment.payment_method);
        if (existingMethod) {
          existingMethod.amount += payment.amount;
          existingMethod.count += 1;
        } else {
          acc.push({
            method: payment.payment_method,
            amount: payment.amount,
            count: 1
          });
        }
        return acc;
      }, []);

      setPaymentStats(stats);
      
      // Calculate total amount and find most popular method
      const total = stats.reduce((sum, stat) => sum + stat.amount, 0);
      setTotalAmount(total);
      
      const mostPopular = stats.reduce((prev, current) => 
        (current.count > prev.count) ? current : prev, 
        { method: '', amount: 0, count: 0 }
      );
      setMostPopularMethod(mostPopular.method);
      setTransactionCount(stats.reduce((sum, stat) => sum + stat.count, 0));

      // Fetch reference items separately for all payments
      const transformedPayments = await Promise.all(
        allPaymentsData.map(async (payment) => {
          let orderDetails = {
            order_number: 'N/A',
            client_name: 'N/A',
            status: null
          };

          if (payment.reference_type === 'sales_order') {
            const { data: salesOrderData, error: salesOrderError } = await supabase
              .from('sales_orders')
              .select(`
                order_number,
                status,
                client_id,
                clients (
                  name
                )
              `)
              .eq('id', payment.reference_id)
              .single();

            if (!salesOrderError && salesOrderData) {
              orderDetails = {
                order_number: salesOrderData.order_number,
                client_name: (salesOrderData.clients as any)?.name || 'N/A',
                status: salesOrderData.status
              };
            }
          } else if (payment.reference_type === 'service_order') {
            const { data: orderData, error: orderError } = await supabase
              .from('orders')
              .select(`
                order_number,
                status,
                client_id,
                clients (
                  name
                )
              `)
              .eq('id', payment.reference_id)
              .single();

            if (!orderError && orderData) {
              orderDetails = {
                order_number: orderData.order_number,
                client_name: (orderData.clients as any)?.name || 'N/A',
                status: orderData.status
              };
            }
          }

          return {
            ...payment,
            order_details: orderDetails
          };
        })
      );

      setPayments(transformedPayments);
    } catch (error) {
      console.error('Error fetching payment data:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to fetch payment data'
      });
    }
  };

  const handleExport = () => {
    const dateRange = startDate && endDate 
      ? `${format(startDate, 'MMM d, yyyy')}-${format(endDate, 'MMM d, yyyy')}`
      : format(new Date(), 'MMM d, yyyy');
    
    const filename = `financial-report-${dateRange}.csv`;
    const csvContent = generateCSV(payments, paymentStats, currencySymbol);
    downloadCSV(csvContent, filename);
  };

  const handleExportPDF = async () => {
    try {
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const tableWidth = pageWidth - (2 * margin);
      
      // Header
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Financial Report', margin, margin + 10);
      
      // Date range
      const dateRange = startDate && endDate 
        ? `${format(startDate, 'MMM d, yyyy')} - ${format(endDate, 'MMM d, yyyy')}`
        : format(new Date(), 'MMM d, yyyy');
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Date Range: ${dateRange}`, margin, margin + 20);
      
      // Summary stats
      const currencyName = organization?.currency || 'USD';
      pdf.setFontSize(10);
      pdf.text(`Total Revenue: ${currencyName} ${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, margin, margin + 30);
      pdf.text(`Total Transactions: ${transactionCount}`, margin + 80, margin + 30);
      pdf.text(`Most Popular Method: ${mostPopularMethod ? mostPopularMethod.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') : 'N/A'}`, margin + 160, margin + 30);
      
      // Table headers
      const tableStartY = margin + 45;
      const rowHeight = 8;
      const colWidths = [35, 25, 30, 25, 40]; // Order, Amount, Method, Date, Customer
      const colPositions = [margin, margin + colWidths[0], margin + colWidths[0] + colWidths[1], margin + colWidths[0] + colWidths[1] + colWidths[2], margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3]];
      
      // Header row background
      pdf.setFillColor(240, 240, 240);
      pdf.rect(margin, tableStartY, tableWidth, rowHeight, 'F');
      
      // Header text
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Order', colPositions[0] + 2, tableStartY + 6);
      pdf.text(`Amount (${currencyName})`, colPositions[1] + 2, tableStartY + 6);
      pdf.text('Method', colPositions[2] + 2, tableStartY + 6);
      pdf.text('Date', colPositions[3] + 2, tableStartY + 6);
      pdf.text('Customer', colPositions[4] + 2, tableStartY + 6);
      
      // Table rows
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      
      let currentY = tableStartY + rowHeight;
      let pageNumber = 1;
      const maxRowsPerPage = Math.floor((pageHeight - currentY - 20) / rowHeight);
      let rowCount = 0;
      
      // Filter out cancelled payments for the table
      const activePayments = payments.filter(p => p.status !== 'cancelled' && p.order_details?.status !== 'cancelled');
      
      for (let i = 0; i < activePayments.length; i++) {
        const payment = activePayments[i];
        
        // Check if we need a new page
        if (rowCount >= maxRowsPerPage) {
          pdf.addPage();
          pageNumber++;
          currentY = margin + 20;
          rowCount = 0;
          
          // Add header to new page
          pdf.setFontSize(20);
          pdf.setFont('helvetica', 'bold');
          pdf.text('Financial Report (continued)', margin, margin + 10);
          
          // Header row background
          pdf.setFillColor(240, 240, 240);
          pdf.rect(margin, currentY, tableWidth, rowHeight, 'F');
          
          // Header text
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'bold');
          pdf.text('Order', colPositions[0] + 2, currentY + 6);
          pdf.text(`Amount (${currencyName})`, colPositions[1] + 2, currentY + 6);
          pdf.text('Method', colPositions[2] + 2, currentY + 6);
          pdf.text('Date', colPositions[3] + 2, currentY + 6);
          pdf.text('Customer', colPositions[4] + 2, currentY + 6);
          
          currentY += rowHeight;
          rowCount++;
        }
        
        // Alternate row background
        if (rowCount % 2 === 0) {
          pdf.setFillColor(250, 250, 250);
          pdf.rect(margin, currentY, tableWidth, rowHeight, 'F');
        }
        
        // Row data
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        
        // Order number (truncate if too long)
        const orderNumber = payment.order_details?.order_number || 'N/A';
        pdf.text(orderNumber.length > 15 ? orderNumber.substring(0, 12) + '...' : orderNumber, colPositions[0] + 2, currentY + 6);
        
        // Amount
        pdf.text(payment.amount.toLocaleString(undefined, { minimumFractionDigits: 2 }), colPositions[1] + 2, currentY + 6);
        
        // Payment method (truncate if too long)
        const method = payment.payment_method.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        pdf.text(method.length > 12 ? method.substring(0, 9) + '...' : method, colPositions[2] + 2, currentY + 6);
        
        // Date
        pdf.text(format(new Date(payment.created_at), 'MMM d, yyyy'), colPositions[3] + 2, currentY + 6);
        
        // Customer name (truncate if too long)
        const customerName = payment.order_details?.client_name || 'N/A';
        pdf.text(customerName.length > 18 ? customerName.substring(0, 15) + '...' : customerName, colPositions[4] + 2, currentY + 6);
        
        currentY += rowHeight;
        rowCount++;
      }
      
      // Add total row
      currentY += 5;
      pdf.setFillColor(220, 220, 220);
      pdf.rect(margin, currentY, tableWidth, rowHeight, 'F');
      
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.text('TOTAL', colPositions[0] + 2, currentY + 6);
      pdf.text(`${activePayments.reduce((sum, p) => sum + p.amount, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, colPositions[1] + 2, currentY + 6);
      pdf.text(`${activePayments.length} transactions`, colPositions[2] + 2, currentY + 6);
      
      // Footer with page numbers
      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Page ${i} of ${totalPages}`, pageWidth - 30, pageHeight - 10);
        pdf.text(`Generated on ${format(new Date(), 'MMM d, yyyy h:mm a')}`, margin, pageHeight - 10);
      }
      
      const filename = `financial-report-${dateRange.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`;
      pdf.save(filename);
      
      addToast({
        type: 'success',
        title: 'Success',
        message: 'PDF report generated successfully'
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to generate PDF'
      });
    }
  };

  useEffect(() => {
    fetchPaymentData();
  }, [dateRange, organization]);

  return (
    <div className={`min-h-screen ${getThemeStyle(theme, 'background', 'primary')} p-4 sm:p-6`} ref={dashboardRef}>
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-6">
          <h1 className={`text-xl font-semibold ${getThemeStyle(theme, 'text', 'primary')}`}>Financial Dashboard</h1>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-auto">
              <DatePicker
                selectsRange={true}
                startDate={startDate}
                endDate={endDate}
                onChange={(update) => setDateRange(update)}
                className={`w-full sm:w-auto px-3 py-2 border ${getThemeStyle(theme, 'border', 'primary')} rounded-lg text-sm ${getThemeStyle(theme, 'background', 'primary')} ${getThemeStyle(theme, 'text', 'primary')} shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                placeholderText="Select date range"
                dateFormat="MMM d, yyyy"
              />
              <Calendar className={`absolute right-3 top-2.5 h-4 w-4 ${getThemeStyle(theme, 'text', 'muted')}`} />
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={handleExportPDF}
                className={`flex-1 sm:flex-none inline-flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium ${getThemeStyle(theme, 'text', 'primary')} ${getThemeStyle(theme, 'background', 'primary')} border ${getThemeStyle(theme, 'border', 'primary')} ${getThemeStyle(theme, 'interactive', 'hover', 'background')} transition-colors`}
              >
                <FileText className="h-4 w-4 mr-1.5" />
                Export PDF
              </button>
              <button
                onClick={handleExport}
                className={`flex-1 sm:flex-none inline-flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium ${getThemeStyle(theme, 'text', 'primary')} ${getThemeStyle(theme, 'background', 'primary')} border ${getThemeStyle(theme, 'border', 'primary')} ${getThemeStyle(theme, 'interactive', 'hover', 'background')} transition-colors`}
              >
                <Download className="h-4 w-4 mr-1.5" />
                Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">

        <div className={`${getThemeStyle(theme, 'background', 'primary')} rounded-xl shadow-sm p-4 border ${getThemeStyle(theme, 'border', 'primary')}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${getThemeStyle(theme, 'text', 'muted')}`}>Date Range</p>
                <p className={`text-2xl font-bold ${getThemeStyle(theme, 'text', 'primary')} mt-1`}>
                  {startDate && endDate 
                    ? `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d')}`
                    : format(new Date(), 'MMM d, yyyy')}
                </p>
              </div>
              <div className="bg-amber-50 p-3 rounded-full">
                <Calendar className="h-6 w-6 text-amber-500" />
              </div>
            </div>
            <div className="mt-3 flex items-center text-sm text-gray-500">
              <span className="flex items-center">
                {startDate && endDate 
                  ? `${Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1} days`
                  : 'Today'}
              </span>
            </div>
          </div>

          <div className={`${getThemeStyle(theme, 'background', 'primary')} rounded-xl shadow-sm p-4 border ${getThemeStyle(theme, 'border', 'primary')}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${getThemeStyle(theme, 'text', 'muted')}`}>Total Revenue</p>
                <p className={`text-2xl font-bold ${getThemeStyle(theme, 'text', 'primary')} mt-1`}>
                  {currencySymbol}{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-blue-50 p-3 rounded-full">
                <DollarSign className="h-6 w-6 text-blue-500" />
              </div>
            </div>
            <div className="mt-3 flex items-center text-sm text-gray-500">
              <span className="flex items-center text-green-500">
                <ArrowUpRight className="h-4 w-4 mr-1" />
                {transactionCount} transactions
              </span>
            </div>
          </div>
          
          <div className={`${getThemeStyle(theme, 'background', 'primary')} rounded-xl shadow-sm p-4 border ${getThemeStyle(theme, 'border', 'primary')}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${getThemeStyle(theme, 'text', 'muted')}`}>Most Popular Method</p>
                <p className={`text-2xl font-bold ${getThemeStyle(theme, 'text', 'primary')} mt-1`}>
                  {mostPopularMethod ? mostPopularMethod.split('_').map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1)
                  ).join(' ') : 'N/A'}
                </p>
              </div>
              <div className="bg-purple-50 p-3 rounded-full">
                <CreditCard className="h-6 w-6 text-purple-500" />
              </div>
            </div>
            <div className="mt-3 flex items-center text-sm text-gray-500">
              <span className="flex items-center">
                {paymentStats.find(s => s.method === mostPopularMethod)?.count || 0} transactions
              </span>
            </div>
          </div>
          
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Payment Methods Section */}
          <div className="lg:col-span-4">
            <div className={`${getThemeStyle(theme, 'background', 'primary')} rounded-xl shadow-sm p-5 border ${getThemeStyle(theme, 'border', 'primary')}`}>
              <h2 className={`text-base font-semibold ${getThemeStyle(theme, 'text', 'primary')} mb-4`}>Payment Methods Distribution</h2>
              
              {/* Pie Chart */}
              <div className="relative h-64 mb-6">
                <ResponsivePie
                  data={paymentStats.map(stat => ({
                    id: stat.method,
                    label: stat.method,
                    value: stat.amount.toFixed(2),
                    color: getMethodHexColor(stat.method)
                  }))}
                  margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
                  innerRadius={0.5}
                  padAngle={0.7}
                  cornerRadius={0}
                  colors={{ datum: 'data.color' }}
                  borderWidth={1}
                  borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
                  enableArcLinkLabels={false}
                  enableArcLabels={false}
                  theme={{
                    tooltip: {
                      container: {
                        background: theme === 'dark' ? '#1f2937' : '#ffffff',
                        fontSize: '12px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                        borderRadius: '0.5rem',
                        padding: '0.5rem'
                      }
                    }
                  }}
                  tooltip={({ datum }) => {
                    const methodName = typeof datum.label === 'string' 
                      ? datum.label.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
                      : '';
                    
                    return (
                      <div className={`p-2 ${getThemeStyle(theme, 'background', 'primary')} rounded-lg`}>
                        <div className={`font-medium ${getThemeStyle(theme, 'text', 'primary')}`}>{methodName}</div>
                        <div className={`text-sm ${getThemeStyle(theme, 'text', 'secondary')}`}>
                          {currencySymbol}{datum.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          <span className={`${getThemeStyle(theme, 'text', 'muted')} ml-1`}>
                            ({((datum.value / totalAmount) * 100).toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                    );
                  }}
                />
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                  <div className={`${getThemeStyle(theme, 'text', 'primary')} font-bold text-sm`}>
                    {currencySymbol}{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                  </div>
                  <div className={`${getThemeStyle(theme, 'text', 'muted')} text-xs`}>
                    Total
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                {paymentStats.map((stat) => {
                  const methodColor = getMethodColor(stat.method);
                  return (
                    <div key={stat.method} className={`flex items-center space-x-3 p-2 rounded-lg ${getThemeStyle(theme, 'interactive', 'hover', 'background')} transition-colors`}>
                      <div 
                        className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${methodColor.bg} ${methodColor.border} border`}
                      >
                        <span className={`${methodColor.text} text-sm font-medium`}>
                          {stat.method.split('_').map(word => word[0]).join('').toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <div className="truncate">
                            <p className={`text-sm font-medium ${getThemeStyle(theme, 'text', 'secondary')} truncate`}>
                              {stat.method.split('_').map(word => 
                                word.charAt(0).toUpperCase() + word.slice(1)
                              ).join(' ')}
                            </p>
                          </div>
                          <p className={`text-sm font-semibold ${getThemeStyle(theme, 'text', 'primary')} ml-2`}>
                            {currencySymbol}{stat.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <div className={`text-xs ${getThemeStyle(theme, 'text', 'muted')}`}>
                            {stat.count} transaction{stat.count !== 1 ? 's' : ''}
                          </div>
                          <div className={`text-xs ${getThemeStyle(theme, 'text', 'muted')}`}>
                            {((stat.amount / totalAmount) * 100).toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Payment Records Table */}
          <div className="lg:col-span-8">
            <div className={`hidden sm:block ${getThemeStyle(theme, 'background', 'primary')} rounded-xl shadow-sm border ${getThemeStyle(theme, 'border', 'primary')} overflow-hidden`}>
              <div className={`p-5 border-b ${getThemeStyle(theme, 'border', 'primary')}`}>
                <h2 className={`text-base font-semibold ${getThemeStyle(theme, 'text', 'primary')}`}>Transaction History</h2>
              </div>
              
              <div className="overflow-x-auto">
                <div className="min-w-[600px]">
                  <div className={`sticky top-0 ${getThemeStyle(theme, 'background', 'secondary')} z-10`}>
                    <div className={`grid grid-cols-4 gap-4 p-4 text-sm font-medium ${getThemeStyle(theme, 'text', 'muted')} border-b ${getThemeStyle(theme, 'border', 'primary')}`}>
                      <div>Order</div>
                      <div>Amount</div>
                      <div>Method</div>
                      <div>Date</div>
                    </div>
                  </div>
                  
                  <div className={`divide-y ${getThemeStyle(theme, 'border', 'primary')}`}>
                    {payments.map((payment) => {
                      const methodColor = getMethodColor(payment.payment_method);
                      return (
                        <div 
                          key={payment.id} 
                          className={`grid grid-cols-4 gap-4 items-center p-4 text-sm ${getThemeStyle(theme, 'interactive', 'hover', 'background')} transition-colors ${payment.status === 'cancelled' ? 'opacity-75' : ''}`}
                        >
                          <div className="truncate">
                            <Link 
                              to={`/dashboard/${payment.reference_type === 'sales_order' ? 'sales' : 'orders'}/${payment.reference_id}`}
                              className={`${payment.status === 'cancelled' ? `line-through ${getThemeStyle(theme, 'text', 'muted')}` : 'text-blue-600'} hover:underline font-medium truncate block`}
                            >
                              {payment.order_details?.order_number || 'N/A'}
                            </Link>
                            <div className={`text-xs ${getThemeStyle(theme, 'text', 'muted')} truncate`}>
                              {payment.order_details?.client_name || 'N/A'}
                            </div>
                          </div>
                          <div className={`font-medium ${payment.status === 'cancelled' ? `line-through ${getThemeStyle(theme, 'text', 'muted')}` : getThemeStyle(theme, 'text', 'primary')}`}>
                            {currencySymbol}{payment.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </div>
                          <div>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${methodColor.bg} ${methodColor.text} ${methodColor.border} border`}>
                              {payment.payment_method.split('_').map(word => 
                                word.charAt(0).toUpperCase() + word.slice(1)
                              ).join(' ')}
                            </span>
                          </div>
                          <div className={`truncate ${payment.status === 'cancelled' ? `line-through ${getThemeStyle(theme, 'text', 'muted')}` : getThemeStyle(theme, 'text', 'muted')}`}>
                            {format(new Date(payment.created_at), 'MMM d, yyyy')}
                            <div className="text-xs">
                              {format(new Date(payment.created_at), 'h:mm a')}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Total Row */}
                  <div className={`grid grid-cols-4 gap-4 items-center p-4 text-sm ${getThemeStyle(theme, 'background', 'secondary')} border-t ${getThemeStyle(theme, 'border', 'primary')}`}>
                    <div className={`font-medium ${getThemeStyle(theme, 'text', 'secondary')}`}>Total</div>
                    <div className={`font-medium ${getThemeStyle(theme, 'text', 'primary')}`}>
                      {currencySymbol}{payments
                        .filter(p => p.status !== 'cancelled' && p.order_details?.status !== 'cancelled')
                        .reduce((sum, p) => sum + p.amount, 0)
                        .toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                    <div className={`font-medium ${getThemeStyle(theme, 'text', 'secondary')}`}>
                      {payments.filter(p => p.status !== 'cancelled' && p.order_details?.status !== 'cancelled').length} transactions
                    </div>
                    <div className={`font-medium ${getThemeStyle(theme, 'text', 'secondary')}`}>
                      {startDate && endDate 
                        ? `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`
                        : format(new Date(), 'MMM d, yyyy')}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Add a mobile-friendly view for the transaction table */}
            {isMobile && (
              <div className="sm:hidden mt-4">
                <div className={`${getThemeStyle(theme, 'background', 'primary')} rounded-xl shadow-sm border ${getThemeStyle(theme, 'border', 'primary')} overflow-hidden`}>
                  <div className={`p-4 border-b ${getThemeStyle(theme, 'border', 'primary')} flex justify-between items-center`}>
                    <h3 className={`text-base font-semibold ${getThemeStyle(theme, 'text', 'primary')}`}>Transaction History</h3>
                    <div className={`text-xs ${getThemeStyle(theme, 'text', 'muted')}`}>
                      {payments.filter(p => p.status !== 'cancelled' && p.order_details?.status !== 'cancelled').length} transactions
                    </div>
                  </div>
                  
                  <div className="p-4 space-y-4">
                    {payments.map((payment) => {
                      const methodColor = getMethodColor(payment.payment_method);
                      return (
                        <div 
                          key={payment.id} 
                          className={`${getThemeStyle(theme, 'background', 'primary')} rounded-lg p-4 border ${getThemeStyle(theme, 'border', 'primary')} ${payment.status === 'cancelled' ? 'opacity-75' : ''}`}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1 min-w-0">
                              <Link 
                                to={`/dashboard/${payment.reference_type === 'sales_order' ? 'sales' : 'orders'}/${payment.reference_id}`}
                                className={`${payment.status === 'cancelled' ? `line-through ${getThemeStyle(theme, 'text', 'muted')}` : 'text-blue-600'} hover:underline font-medium block truncate`}
                              >
                                {payment.order_details?.order_number || 'N/A'}
                              </Link>
                              <div className={`text-xs ${getThemeStyle(theme, 'text', 'muted')} truncate`}>
                                {payment.order_details?.client_name || 'N/A'}
                              </div>
                            </div>
                            <div className={`font-medium ml-2 ${payment.status === 'cancelled' ? `line-through ${getThemeStyle(theme, 'text', 'muted')}` : getThemeStyle(theme, 'text', 'primary')}`}>
                              {currencySymbol}{payment.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${methodColor.bg} ${methodColor.text} ${methodColor.border} border`}>
                              {payment.payment_method.split('_').map(word => 
                                word.charAt(0).toUpperCase() + word.slice(1)
                              ).join(' ')}
                            </span>
                            <div className={`text-xs ${payment.status === 'cancelled' ? `line-through ${getThemeStyle(theme, 'text', 'muted')}` : getThemeStyle(theme, 'text', 'muted')}`}>
                              {format(new Date(payment.created_at), 'MMM d, yyyy')}
                              <div className="text-[10px]">
                                {format(new Date(payment.created_at), 'h:mm a')}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Total Row */}
                  <div className={`p-4 border-t ${getThemeStyle(theme, 'border', 'primary')} ${getThemeStyle(theme, 'background', 'secondary')}`}>
                    <div className="flex justify-between items-center">
                      <div className={`font-medium ${getThemeStyle(theme, 'text', 'secondary')}`}>Total</div>
                      <div className={`font-medium ${getThemeStyle(theme, 'text', 'primary')}`}>
                        {currencySymbol}{payments
                          .filter(p => p.status !== 'cancelled' && p.order_details?.status !== 'cancelled')
                          .reduce((sum, p) => sum + p.amount, 0)
                          .toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div className={`text-xs ${getThemeStyle(theme, 'text', 'muted')} mt-1 text-right`}>
                      {startDate && endDate 
                        ? `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`
                        : format(new Date(), 'MMM d, yyyy')}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}