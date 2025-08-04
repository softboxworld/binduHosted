import { utils, writeFile } from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Task, Worker } from '../types';
import { format } from 'date-fns';

export function exportToExcel(tasks: Task[], worker: Worker) {
  const workbook = utils.book_new();
  
  // Format tasks for Excel
  const data = tasks.map(task => ({
    Date: format(new Date(task.due_date), 'yyyy-MM-dd'),
    Project: task.projectType,
    Description: task.description || '',
    Amount: task.amount,
    Status: task.status
  }));

  const worksheet = utils.json_to_sheet(data);
  utils.book_append_sheet(workbook, worksheet, 'Tasks');

  // Save the file
  writeFile(workbook, `${worker.name}_tasks_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
}

export function generateWhatsAppMessage(tasks: Task[], worker: Worker, startDate: Date, endDate: Date): string {
  const totalEarnings = tasks.reduce((sum, task) => sum + task.amount, 0);

  const message = `
*Weekly Work Report for ${worker.name}*
Period: ${format(startDate, 'MMM dd, yyyy')} - ${format(endDate, 'MMM dd, yyyy')}

*Summary*
Total Tasks: ${tasks.length}
Completed Tasks: ${tasks.filter(t => t.status === 'completed').length}
Total Earnings: GHS ${totalEarnings.toFixed(2)}

Your detailed report has been attached as a PDF.
`;

  return encodeURIComponent(message);
}