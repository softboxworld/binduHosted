import { format } from 'date-fns';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { CURRENCIES } from './constants';

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

interface Worker {
  id: string;
  name: string;
  whatsapp: string | null;
}

interface WorkerProject {
  id: string;
  worker_id: string;
  project_id: string;
  project: {
    id: string;
    name: string;
  };
}

export const generateWorkerReport = (
  worker: any,
  tasks: any[],
  dateRange: { start: Date; end: Date },
  currencySymbol: string
) => {
  const pdf = new jsPDF();
  
  // Add title
  pdf.setFontSize(20);
  pdf.text('Worker Report', 20, 20);
  
  // Add worker details
  pdf.setFontSize(8);
  pdf.text(`Worker: ${worker.name}`, 20, 35);
  pdf.text(`Period: ${format(dateRange.start, 'MMM d, yyyy')} - ${format(dateRange.end, 'MMM d, yyyy')}`, 20, 45);
  
  // Add summary statistics
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const totalEarnings = completedTasks.reduce((sum, task) => sum + task.amount, 0);
  
  // Add tasks table
  const tableData = tasks.map(task => {
    const project = task.project || { name: 'N/A' };
    
    return [
      format(new Date(task.created_at), 'MMM d, yyyy'),
      project.name,
      task.description,
      task.status,
      `${currencySymbol}${task.amount.toFixed(2)}`
    ];
  });
  
  autoTable(pdf, {
    head: [['Date', 'Project', 'Description', 'Status', 'Amount']],
    body: tableData,
    startY: 90,
    theme: 'grid',
    headStyles: { fillColor: [66, 139, 202] },
    styles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 40 },
      2: { cellWidth: 50 },
      3: { cellWidth: 25 },
      4: { cellWidth: 25 }
    }
  });
  
  return pdf;
};

interface FinancialData {
  date: string;
  totalTasks: number;
  totalAmount: number;
  totalDeductions: number;
  netAmount: number;
}

export const generateFinancialReport = (data: FinancialData[], period: { start: Date; end: Date }, currency: string = 'GHS') => {
  const currencySymbol = CURRENCIES[currency]?.symbol || currency;

  // Generate Excel Report
  const workbook = XLSX.utils.book_new();
  
  // Format data for Excel
  const formattedData = data.map(record => ({
    Date: format(new Date(record.date), 'MMM dd, yyyy'),
    'Total Tasks': record.totalTasks,
    'Total Amount': `${currencySymbol} ${record.totalAmount.toFixed(2)}`,
    'Total Deductions': `${currencySymbol} ${record.totalDeductions.toFixed(2)}`,
    'Net Amount': `${currencySymbol} ${record.netAmount.toFixed(2)}`
  }));

  const worksheet = XLSX.utils.json_to_sheet(formattedData);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Financial Report');

  // Generate PDF Report
  const pdf = new jsPDF();
  
  pdf.setFontSize(20);
  pdf.text('Financial Report', 14, 20);
  pdf.setFontSize(12);
  pdf.text(`Period: ${format(period.start, 'MMM dd, yyyy')} - ${format(period.end, 'MMM dd, yyyy')}`, 14, 30);

  // Calculate totals
  const totals = data.reduce((acc, record) => ({
    tasks: acc.tasks + record.totalTasks,
    amount: acc.amount + record.totalAmount,
    deductions: acc.deductions + record.totalDeductions,
    net: acc.net + record.netAmount
  }), { tasks: 0, amount: 0, deductions: 0, net: 0 });

  // Add summary
  pdf.text('Summary:', 14, 40);
  pdf.text(`Total Tasks: ${totals.tasks}`, 20, 48);
  pdf.text(`Total Amount: ${currencySymbol} ${totals.amount.toFixed(2)}`, 20, 56);
  pdf.text(`Total Deductions: ${currencySymbol} ${totals.deductions.toFixed(2)}`, 20, 64);
  pdf.text(`Net Amount: ${currencySymbol} ${totals.net.toFixed(2)}`, 20, 72);

  // Add data table
  const tableData = data.map(record => [
    format(new Date(record.date), 'MMM dd, yyyy'),
    record.totalTasks.toString(),
    `${currencySymbol} ${record.totalAmount.toFixed(2)}`,
    `${currencySymbol} ${record.totalDeductions.toFixed(2)}`,
    `${currencySymbol} ${record.netAmount.toFixed(2)}`
  ]);

  autoTable(pdf, {
    startY: 80,
    head: [['Date', 'Tasks', 'Amount', 'Deductions', 'Net Amount']],
    body: tableData,
    theme: 'striped',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [59, 130, 246] }
  });

  return { workbook, pdf };
};