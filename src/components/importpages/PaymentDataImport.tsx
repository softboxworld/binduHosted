import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useTheme } from '../../context/ThemeContext';
import { Upload, X, FileText } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import Pagination from '../common/Pagination';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { PaymentMethod } from '../../types/inventory';

// Add ProgressPopup component
interface ProgressPopupProps {
    isOpen: boolean;
    totalPayments: number;
    currentPayment: number;
    currentOperation: string;
    logs: string[];
    onClose: () => void;
}

const ProgressPopup: React.FC<ProgressPopupProps> = ({
    isOpen,
    totalPayments,
    currentPayment,
    currentOperation,
    logs,
    onClose
}) => {
    const { theme, getThemeStyle } = useTheme();
    const progress = (currentPayment / totalPayments) * 100;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`w-full max-w-2xl max-h-[80vh] rounded-lg shadow-xl ${getThemeStyle(theme, 'background', 'primary')} p-6`}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className={`text-lg font-semibold ${getThemeStyle(theme, 'text', 'primary')}`}>
                        Importing Payments
                    </h3>
                    <button
                        onClick={onClose}
                        className={`p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 ${getThemeStyle(theme, 'text', 'primary')}`}
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                        <span className={getThemeStyle(theme, 'text', 'secondary')}>
                            Progress: {currentPayment} of {totalPayments} payments
                        </span>
                        <span className={getThemeStyle(theme, 'text', 'secondary')}>
                            {Math.round(progress)}%
                        </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                        <div
                            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                </div>

                {/* Current Operation */}
                <div className={`mb-4 p-3 rounded-lg ${getThemeStyle(theme, 'background', 'secondary')}`}>
                    <p className={`text-sm font-medium ${getThemeStyle(theme, 'text', 'primary')}`}>
                        {currentOperation}
                    </p>
                </div>

                {/* Logs */}
                <div className={`h-64 overflow-y-auto rounded-lg ${getThemeStyle(theme, 'background', 'secondary')} p-4`}>
                    {logs.map((log, index) => (
                        <p
                            key={index}
                            className={`text-sm mb-1 ${
                                log.toLowerCase().includes('error')
                                    ? 'text-red-500'
                                    : getThemeStyle(theme, 'text', 'secondary')
                            }`}
                        >
                            {log}
                        </p>
                    ))}
                </div>
            </div>
        </div>
    );
};

interface CSVHeader {
    name: string;
    mappedTo: string;
}

interface PreviewRow {
    [key: string]: string;
}

interface ImportData {
    headers: CSVHeader[];
    previewData: PreviewRow[];
}

interface PreviewPayment {
    created_at: string | null;
    transaction_reference: string | null;
    order_number: string | null;
    amount: string | null;
    [key: string]: string | null;
}

const DB_COLUMNS = [
    { value: 'created_at', label: 'Created At', match: 'Date and time' },
    { value: 'transaction_reference', label: 'Transaction Reference', match: 'Client' },
    { value: 'order_number', label: 'Order Number', match: 'Comment' },
    { value: 'amount', label: 'Amount', match: 'Amount' }
];

export default function PaymentDataImport() {
    const [file, setFile] = useState<File | null>(null);
    const [importData, setImportData] = useState<ImportData | null>(null);
    const [selectedRows, setSelectedRows] = useState<number[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('cash');
    const [orders, setOrders] = useState<any[]>([]);
    const rowsPerPage = 50;
    const { organization } = useAuthStore();
    const { theme, getThemeStyle } = useTheme();

    // Fetch orders when component mounts
    React.useEffect(() => {
        const fetchOrders = async () => {
            if (!organization?.id) return;

            try {
                const { data, error } = await supabase
                    .from('orders')
                    .select('*')
                    .eq('organization_id', organization.id)

                if (error) {
                    console.error('Error fetching orders:', error);
                    return;
                }

                if (data) {
                    setOrders(data);
                }
            } catch (error) {
                console.error('Error in fetchOrders:', error);
            }
        };

        fetchOrders();
    }, [organization?.id]);

    // Get currency symbol from organization
    const currencySymbol = organization?.currency || 'GHS';

    // Update DB_COLUMNS with dynamic currency symbol
    const getDbColumns = () => [
        { value: 'created_at', label: 'Created At', match: 'Date and time' },
        { value: 'transaction_reference', label: 'Transaction Reference', match: 'Client' },
        { value: 'order_number', label: 'Order Number', match: 'Comment' },
        { value: 'amount', label: 'Amount', match: `Amount, GH₵` }
    ];

    // Add progress state
    const [isProgressOpen, setIsProgressOpen] = useState(false);
    const [progressState, setProgressState] = useState({
        totalPayments: 0,
        currentPayment: 0,
        currentOperation: '',
        logs: [] as string[]
    });

    const extractOrderNumber = (comment: string): string | null => {
        if (!comment) return null;
        
        // Look for patterns like KGK-ORD-000877
        const orderNumberMatch = comment.match(/[A-Z]+-ORD-\d+/);
        if (orderNumberMatch) {
            return orderNumberMatch[0];
        }
        
        return null;
    };

    const addLog = (message: string) => {
        setProgressState(prev => ({
            ...prev,
            logs: [...prev.logs, message]
        }));
    };

    const updateProgress = (currentPayment: number, operation: string) => {
        setProgressState(prev => ({
            ...prev,
            currentPayment,
            currentOperation: operation
        }));
    };

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (file) {
            setFile(file);
            if (file.name.endsWith('.csv')) {
                parseCSV(file);
            } else if (file.name.endsWith('.xls') || file.name.endsWith('.xlsx')) {
                parseExcel(file);
            }
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'text/csv': ['.csv'],
            'application/vnd.ms-excel': ['.xls'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
        },
        maxFiles: 1
    });

    const parseCSV = (file: File) => {
        Papa.parse(file, {
            header: true,
            complete: (results) => {
                // Handle duplicate headers by appending an index
                const headerCounts: { [key: string]: number } = {};
                const headers = Object.keys(results.data[0] || {}).map(header => {
                    const count = (headerCounts[header] || 0) + 1;
                    headerCounts[header] = count;
                    const uniqueHeader = count > 1 ? `${header}_${count}` : header;
                    
                    // Find matching DB column using dynamic DB_COLUMNS
                    const matchingColumn = getDbColumns().find(col => 
                        col.match.toLowerCase() === header.toLowerCase()
                    );
                    
                    return {
                        name: uniqueHeader,
                        mappedTo: matchingColumn?.value || ''
                    };
                });

                // Filter out rows without valid order numbers
                const filteredData = (results.data as PreviewRow[]).filter(row => {
                    const commentField = headers.find(h => h.mappedTo === 'order_number');
                    if (!commentField) return false;
                    
                    const orderNumber = extractOrderNumber(row[commentField.name]);
                    if (!orderNumber) {
                        addLog(`Skipping row: No valid order number found in "${row[commentField.name]}"`);
                    }
                    return orderNumber !== null;
                });

                setImportData({
                    headers,
                    previewData: filteredData
                });
            },
            error: (error) => {
                console.error('Error parsing CSV:', error);
            }
        });
    };

    const parseExcel = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                if (jsonData.length < 2) {
                    throw new Error('Excel file must contain at least one row of data');
                }

                // Handle duplicate headers by appending an index
                const headerCounts: { [key: string]: number } = {};
                const headers = (jsonData[0] as string[]).map(header => {
                    const count = (headerCounts[header] || 0) + 1;
                    headerCounts[header] = count;
                    const uniqueHeader = count > 1 ? `${header}_${count}` : header;
                    
                    // Find matching DB column using dynamic DB_COLUMNS
                    const matchingColumn = getDbColumns().find(col => 
                        col.match.toLowerCase() === header.toLowerCase()
                    );
                    
                    return {
                        name: uniqueHeader,
                        mappedTo: matchingColumn?.value || ''
                    };
                });

                // Convert data rows to objects and filter out invalid rows
                const previewData = jsonData.slice(1)
                    .map((row: any) => {
                        const rowData: PreviewRow = {};
                        headers.forEach((header, index) => {
                            rowData[header.name] = row[index]?.toString() || '';
                        });
                        return rowData;
                    })
                    .filter(row => {
                        const commentField = headers.find(h => h.mappedTo === 'order_number');
                        if (!commentField) return false;
                        
                        const orderNumber = extractOrderNumber(row[commentField.name]);
                        if (!orderNumber) {
                            addLog(`Skipping row: No valid order number found in "${row[commentField.name]}"`);
                        }
                        return orderNumber !== null;
                    });

                setImportData({
                    headers,
                    previewData
                });
            } catch (error) {
                console.error('Error parsing Excel file:', error);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleHeaderMapping = (headerName: string, mappedTo: string) => {
        if (!importData) return;

        const updatedHeaders = importData.headers.map(header => {
            if (header.name === headerName) {
                return { ...header, mappedTo };
            }
            return header;
        });

        setImportData({
            ...importData,
            headers: updatedHeaders
        });
    };

    const getPreviewData = (): PreviewPayment[] => {
        if (!importData) return [];

        return importData.previewData.map(row => {
            const paymentData: Partial<PreviewPayment> = {
                created_at: null,
                transaction_reference: null,
                order_number: null,
                amount: null
            };

            importData.headers.forEach(header => {
                if (header.mappedTo) {
                    const value = row[header.name];
                    if (header.mappedTo === 'order_number') {
                        // Extract and show the order number in preview
                        const extractedOrderNumber = extractOrderNumber(value);
                        paymentData[header.mappedTo] = extractedOrderNumber || value;
                    } else {
                        paymentData[header.mappedTo] = value;
                    }
                }
            });

            return paymentData as PreviewPayment;
        });
    };

    const getAvailableColumns = (currentHeader: string) => {
        if (!importData) return getDbColumns();

        const mappedColumns = importData.headers
            .filter(header => header.name !== currentHeader && header.mappedTo)
            .map(header => header.mappedTo);

        return getDbColumns().filter(column =>
            !mappedColumns.includes(column.value) ||
            importData.headers.find(h => h.name === currentHeader)?.mappedTo === column.value
        );
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedRows(importData?.previewData.map((_, index) => index) || []);
        } else {
            setSelectedRows([]);
        }
    };

    const handleRowSelect = (index: number, checked: boolean) => {
        if (checked) {
            setSelectedRows([...selectedRows, index]);
        } else {
            setSelectedRows(selectedRows.filter(i => i !== index));
        }
    };

    const handleRemoveSelected = () => {
        if (!importData) return;

        const newPreviewData = importData.previewData.filter((_, index) => !selectedRows.includes(index));
        const newHeaders = importData.headers;

        setImportData({
            headers: newHeaders,
            previewData: newPreviewData
        });
        setSelectedRows([]);
    };

    const getPaginatedData = () => {
        if (!importData) return [];
        const startIndex = (currentPage - 1) * rowsPerPage;
        const endIndex = startIndex + rowsPerPage;
        return importData.previewData.slice(startIndex, endIndex);
    };

    const totalPages = importData ? Math.ceil(importData.previewData.length / rowsPerPage) : 0;

    const formatExcelDate = (value: string | number | null): string => {
        if (!value) return '(empty)';

        // Check if it's an Excel date number
        if (typeof value === 'string' && /^\d+\.\d+$/.test(value) || typeof value === 'number') {
            const numDate = typeof value === 'string' ? parseFloat(value) : value;
            const excelEpoch = new Date(1900, 0, 1);
            const millisecondsPerDay = 24 * 60 * 60 * 1000;
            const date = new Date(excelEpoch.getTime() + (numDate - 2) * millisecondsPerDay);

            // Format as YYYY-MM-DD HH:mm
            return date.toISOString().replace('T', ' ').substring(0, 16);
        }

        return value.toString();
    };

    const handleImport = () => {
        setTimeout(async () => {
            if (!importData) return;

            // Initialize progress
            setProgressState({
                totalPayments: importData.previewData.length,
                currentPayment: 0,
                currentOperation: 'Starting import process...',
                logs: []
            });
            setIsProgressOpen(true);

            const mappedHeaders = importData.headers.filter(h => h.mappedTo);

            // Validate required fields
            if (!mappedHeaders.some(h => h.mappedTo === 'amount')) {
                addLog('Error: Amount field is required');
                return;
            }

            // Prepare all payment data
            const paymentsToCreate = importData.previewData.map((row, index) => {
                const paymentData: any = {};

                mappedHeaders.forEach(header => {
                    const value = row[header.name];
                    if (header.mappedTo === 'created_at') {
                        paymentData[header.mappedTo] = formatExcelDate(value);
                    } else if (header.mappedTo === 'amount') {
                        // Remove currency symbol and convert to number
                        const amountStr = value.replace(/[^0-9.-]+/g, '');
                        paymentData[header.mappedTo] = parseFloat(amountStr);
                    } else if (header.mappedTo === 'order_number') {
                        // Extract order number from comment field
                        const extractedOrderNumber = extractOrderNumber(value);
                        if (extractedOrderNumber) {
                            paymentData[header.mappedTo] = extractedOrderNumber;
                            addLog(`Extracted order number ${extractedOrderNumber} from comment: ${value}`);
                        } else {
                            addLog(`Warning: Could not extract order number from comment: ${value}`);
                            return;
                        }
                    } else {
                        paymentData[header.mappedTo] = value;
                    }
                });

                return paymentData;
            });


            // Find corresponding orders and prepare final payment batch
            const finalPayments = paymentsToCreate.map((payment, index) => {
                const orderNumber = payment.order_number;
                const order = orders.find(o => o.order_number.toLowerCase() === orderNumber?.toLowerCase());
                

                if (!order) {
                    addLog(`Warning: No matching order found for order number: ${orderNumber}`);
                    return null;
                }

                // Create payment with order reference
                return {
                    reference_id: order.id,
                    reference_type: 'service_order',
                    organization_id: organization?.id,
                    transaction_reference: payment.transaction_reference,
                    amount: payment.amount,
                    currency: organization?.currency || 'GHS',
                    payment_method: selectedPaymentMethod,
                    created_at: payment.created_at,
                    status: 'active',
                    order // Include the order object for balance updates
                };
            }).filter((payment): payment is NonNullable<typeof payment> => payment !== null); // Type guard to remove nulls

            addLog(`Processing ${finalPayments.length} valid payments...`);

            // Create payments in batches
            const PAYMENTS_BATCH_SIZE = 20;
            let successfulPayments = 0;
            
            // Create a map to track the latest balance for each order
            const orderBalances = new Map<string, number>();
            
            // Initialize the map with current order balances
            finalPayments.forEach(payment => {
                if (!orderBalances.has(payment.order.id)) {
                    orderBalances.set(payment.order.id, payment.order.outstanding_balance);
                }
            });

            for (let i = 0; i < finalPayments.length; i += PAYMENTS_BATCH_SIZE) {
                const currentBatch = finalPayments.slice(i, i + PAYMENTS_BATCH_SIZE);
                updateProgress(i + 1, `Creating payments batch ${Math.floor(i / PAYMENTS_BATCH_SIZE) + 1} of ${Math.ceil(finalPayments.length / PAYMENTS_BATCH_SIZE)}`);

                try {
                    addLog(`Creating batch of ${currentBatch.length} payments...`);
                    
                    // Create payments
                    const { data: createdPayments, error: batchError } = await supabase
                        .from('payments')
                        .insert(currentBatch.map(({ order, ...payment }) => payment)) // Remove order object before insert
                        .select();

                    if (batchError) {
                        addLog(`Error creating payment batch: ${batchError.message}`);
                        continue;
                    }

                    if (createdPayments) {
                        // Update order balances using the tracked balances
                        for (const payment of currentBatch) {
                            try {
                                const currentBalance = orderBalances.get(payment.order.id) || payment.order.outstanding_balance;
                                const newBalance = currentBalance - payment.amount;
                                
                                // Update the tracked balance
                                orderBalances.set(payment.order.id, newBalance);
                                
                                const { error: updateError } = await supabase
                                    .from('orders')
                                    .update({ 
                                        outstanding_balance: newBalance,
                                        payment_status: newBalance <= 0 ? 'paid' : 'partially_paid'
                                    })
                                    .eq('id', payment.order.id);

                                if (updateError) {
                                    addLog(`Error updating order balance for order ${payment.order.order_number}: ${updateError.message}`);
                                } else {
                                    addLog(`Updated balance for order ${payment.order.order_number}: ${newBalance}`);
                                }
                            } catch (error) {
                                addLog(`Error updating order balance: ${error instanceof Error ? error.message : 'Unknown error'}`);
                            }
                        }

                        successfulPayments += createdPayments.length;
                        addLog(`Successfully created ${createdPayments.length} payments`);
                    }
                } catch (error) {
                    addLog(`Error in batch creation: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            }

            addLog('\nImport process completed');
            updateProgress(finalPayments.length, `Import completed. Created ${successfulPayments} payments.`);
        }, 0);
    };

    return (
        <div className={`min-h-screen p-6 ${getThemeStyle(theme, 'background', 'primary')}`}>
            {/* Add ProgressPopup component */}
            <ProgressPopup
                isOpen={isProgressOpen}
                totalPayments={progressState.totalPayments}
                currentPayment={progressState.currentPayment}
                currentOperation={progressState.currentOperation}
                logs={progressState.logs}
                onClose={() => setIsProgressOpen(false)}
            />

            <div className="">
                {/* Header */}
                <div className="flex items-center mb-8">
                    <Upload className={`h-8 w-8 mr-3 ${getThemeStyle(theme, 'text', 'accent')}`} />
                    <h1 className={`text-2xl font-bold ${getThemeStyle(theme, 'text', 'primary')}`}>
                        Import Payments
                    </h1>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Left Panel - File Upload and Mapping */}
                    <div className="space-y-6 w-full lg:w-[350px] flex-shrink-0">
                        {/* File Upload Area */}
                        <div
                            {...getRootProps()}
                            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200
                ${isDragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : getThemeStyle(theme, 'border', 'primary')}
                ${getThemeStyle(theme, 'background', 'secondary')}
                hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10`}
                        >
                            <input {...getInputProps()} />
                            {file ? (
                                <div className="flex flex-col items-center space-y-4">
                                    <div className="flex items-center space-x-3 p-3 rounded-lg bg-white dark:bg-gray-800 shadow-sm">
                                        <FileText className="h-6 w-6 text-blue-500" />
                                        <span className={`text-sm font-medium ${getThemeStyle(theme, 'text', 'primary')}`}>
                                            {file.name}
                                        </span>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setFile(null);
                                                setImportData(null);
                                            }}
                                            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                        >
                                            <X className="h-4 w-4 text-gray-500" />
                                        </button>
                                    </div>
                                    <p className={`text-xs ${getThemeStyle(theme, 'text', 'muted')}`}>
                                        Drop another file to replace
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex justify-center">
                                        <div className="p-4 rounded-full bg-blue-50 dark:bg-blue-900/20">
                                            <Upload className="h-8 w-8 text-blue-500" />
                                        </div>
                                    </div>
                                    <div>
                                        <p className={`text-sm font-medium ${getThemeStyle(theme, 'text', 'primary')}`}>
                                            {isDragActive ? 'Drop your file here' : 'Upload your CSV or Excel file'}
                                        </p>
                                        <p className={`mt-1 text-xs ${getThemeStyle(theme, 'text', 'muted')}`}>
                                            Drag and drop your file here, or click to browse
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Payment Method Selection */}
                        {importData && (
                            <div className={`p-6 rounded-xl ${getThemeStyle(theme, 'background', 'secondary')} shadow-sm`}>
                                <h3 className={`text-sm font-medium mb-4 ${getThemeStyle(theme, 'text', 'primary')}`}>
                                    Payment Method
                                </h3>
                                <select
                                    value={selectedPaymentMethod}
                                    onChange={(e) => setSelectedPaymentMethod(e.target.value as PaymentMethod)}
                                    className={`w-full px-3 py-2 rounded-lg border text-sm ${getThemeStyle(theme, 'border', 'primary')} 
                                    ${getThemeStyle(theme, 'background', 'primary')} 
                                    ${getThemeStyle(theme, 'text', 'primary')}
                                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                                    transition-colors duration-200`}
                                >
                                    <option value="cash">Cash</option>
                                    <option value="mobile_money">Mobile Money</option>
                                    <option value="bank_transfer">Bank Transfer</option>
                                    <option value="check">Check</option>
                                    <option value="card_payment">Card Payment</option>
                                </select>
                            </div>
                        )}

                        {/* Header Mapping */}
                        {importData && (
                            <div className={`p-6 rounded-xl ${getThemeStyle(theme, 'background', 'secondary')} shadow-sm`}>
                                <h3 className={`text-sm font-medium mb-4 ${getThemeStyle(theme, 'text', 'primary')}`}>
                                    Map File Headers
                                </h3>

                                <div className="space-y-4">
                                    {importData.headers.map((header) => (
                                        <div key={header.name} className="space-y-2">
                                            <label className={`block text-xs font-medium ${getThemeStyle(theme, 'text', 'secondary')}`}>
                                                {header.name}
                                            </label>
                                            <select
                                                value={header.mappedTo}
                                                onChange={(e) => handleHeaderMapping(header.name, e.target.value)}
                                                className={`w-full px-3 py-2 rounded-lg border text-sm ${getThemeStyle(theme, 'border', 'primary')} 
                          ${getThemeStyle(theme, 'background', 'primary')} 
                          ${getThemeStyle(theme, 'text', 'primary')}
                          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                          transition-colors duration-200`}
                                            >
                                                <option value="">Select column</option>
                                                {getAvailableColumns(header.name).map((column) => (
                                                    <option key={column.value} value={column.value}>
                                                        {column.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    ))}
                                </div>

                                <button
                                    onClick={handleImport}
                                    className={`mt-6 w-full py-3 px-4 rounded-lg font-medium text-xs text-white bg-blue-600 hover:bg-blue-700 
                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 
                    transition-colors duration-200`}
                                >
                                    Import Payments
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Right Panel - Preview Data */}
                    {importData && (
                        <div className="flex-1 overflow-x-auto">
                            <div className={`p-6 rounded-xl ${getThemeStyle(theme, 'background', 'secondary')} shadow-sm`}>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className={`text-sm font-medium ${getThemeStyle(theme, 'text', 'primary')}`}>
                                        Preview Data | {importData.previewData.length} row{importData.previewData.length > 1 ? 's' : ''} of payments
                                    </h3>
                                    {selectedRows.length > 0 && (
                                        <button
                                            onClick={handleRemoveSelected}
                                            className={`px-4 py-2 rounded-lg text-xs font-medium text-white bg-red-600 hover:bg-red-700 
                        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 
                        transition-colors duration-200`}
                                        >
                                            Remove Selected ({selectedRows.length})
                                        </button>
                                    )}
                                </div>

                                {/* Pagination - Top */}
                                <Pagination
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    onPageChange={setCurrentPage}
                                    className="mb-4"
                                />

                                {/* Mobile Card View */}
                                <div className="lg:hidden space-y-4">
                                    {getPaginatedData().map((row, index) => {
                                        const actualIndex = (currentPage - 1) * rowsPerPage + index;
                                        const payment = getPreviewData()[actualIndex];
                                        return (
                                            <div key={actualIndex} className={`p-4 rounded-lg ${getThemeStyle(theme, 'background', 'primary')} shadow-sm`}>
                                                <div className="flex items-center mb-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedRows.includes(actualIndex)}
                                                        onChange={(e) => handleRowSelect(actualIndex, e.target.checked)}
                                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                    />
                                                </div>
                                                <div className="space-y-3">
                                                    {Object.entries(payment).map(([key, value]) => (
                                                        <div key={key} className="flex justify-between">
                                                            <span className={`text-xs font-medium ${getThemeStyle(theme, 'text', 'secondary')}`}>
                                                                {key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')}
                                                            </span>
                                                            <span className={`text-xs ${getThemeStyle(theme, 'text', 'primary')}`}>
                                                                {value === null || value === '' || !value ? (
                                                                    <span className="text-gray-400">(empty)</span>
                                                                ) : (
                                                                    formatExcelDate(value)
                                                                )}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Desktop Table View */}
                                <div className="hidden lg:block overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                        <thead>
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedRows.length === importData.previewData.length}
                                                        onChange={(e) => handleSelectAll(e.target.checked)}
                                                        className={`h-4 w-4 text-blue-600 focus:ring-blue-500 ${getThemeStyle(theme, 'background', 'primary')} border-gray-300 rounded`}
                                                    />
                                                </th>
                                                <th className={`px-6 py-3 text-left text-xs font-medium ${getThemeStyle(theme, 'text', 'tertiary')} uppercase tracking-wider sticky left-0 bg-inherit`}>
                                                    Payment
                                                </th>
                                                {Object.keys(getPreviewData()[0] || {}).map(key => (
                                                    <th
                                                        key={key}
                                                        className={`px-6 py-3 text-left text-xs font-medium ${getThemeStyle(theme, 'text', 'tertiary')} uppercase tracking-wider`}
                                                    >
                                                        {key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                            {getPaginatedData().map((row, index) => {
                                                const actualIndex = (currentPage - 1) * rowsPerPage + index;
                                                const payment = getPreviewData()[actualIndex];
                                                return (
                                                    <tr key={actualIndex} className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-150`}>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedRows.includes(actualIndex)}
                                                                onChange={(e) => handleRowSelect(actualIndex, e.target.checked)}
                                                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                            />
                                                        </td>
                                                        <td className={`px-6 py-4 whitespace-nowrap text-xs font-medium ${getThemeStyle(theme, 'text', 'primary')} sticky left-0 bg-inherit`}>
                                                            {actualIndex + 1}
                                                        </td>
                                                        {Object.entries(payment).map(([key, value]) => (
                                                            <td
                                                                key={key}
                                                                className={`px-6 py-4 whitespace-nowrap text-xs ${getThemeStyle(theme, 'text', 'primary')}`}
                                                            >
                                                                {value === null || value === '' || !value ? (
                                                                    <span className="text-gray-400">(empty)</span>
                                                                ) : (
                                                                    formatExcelDate(value)
                                                                )}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination - Bottom */}
                                <Pagination
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    onPageChange={setCurrentPage}
                                    className="mt-4"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
