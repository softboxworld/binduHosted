import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useTheme } from '../../context/ThemeContext';
import { Upload, X, FileText } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import Pagination from '../common/Pagination';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';

// Add ProgressPopup component
interface ProgressPopupProps {
    isOpen: boolean;
    totalOrders: number;
    currentOrder: number;
    currentOperation: string;
    logs: string[];
    onClose: () => void;
}

const ProgressPopup: React.FC<ProgressPopupProps> = ({
    isOpen,
    totalOrders,
    currentOrder,
    currentOperation,
    logs,
    onClose
}) => {
    const { theme, getThemeStyle } = useTheme();
    const progress = (currentOrder / totalOrders) * 100;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`w-full max-w-2xl max-h-[80vh] rounded-lg shadow-xl ${getThemeStyle(theme, 'background', 'primary')} p-6`}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className={`text-lg font-semibold ${getThemeStyle(theme, 'text', 'primary')}`}>
                        Updating Orders
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
                            Progress: {currentOrder} of {totalOrders} orders
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

interface PreviewOrder {
    order_number: string | null;
    amount: string | null;
    [key: string]: string | null;
}

const DB_COLUMNS = [
    { value: 'order_number', label: 'Order Number', match: 'Order Number' },
    { value: 'amount', label: 'Amount', match: 'Amount' },
];

export default function OrderDataImport() {
    const [file, setFile] = useState<File | null>(null);
    const [importData, setImportData] = useState<ImportData | null>(null);
    const [selectedRows, setSelectedRows] = useState<number[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 50;
    const { organization } = useAuthStore();
    const { theme, getThemeStyle } = useTheme();

    // Add progress state
    const [isProgressOpen, setIsProgressOpen] = useState(false);
    const [progressState, setProgressState] = useState({
        totalOrders: 0,
        currentOrder: 0,
        currentOperation: '',
        logs: [] as string[]
    });

    const addLog = (message: string) => {
        setProgressState(prev => ({
            ...prev,
            logs: [...prev.logs, message]
        }));
    };

    const updateProgress = (currentOrder: number, operation: string) => {
        setProgressState(prev => ({
            ...prev,
            currentOrder,
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
                    
                    // Find matching DB column
                    const matchingColumn = DB_COLUMNS.find(col => 
                        col.match.toLowerCase() === header.toLowerCase()
                    );
                    
                    return {
                        name: uniqueHeader,
                        mappedTo: matchingColumn?.value || ''
                    };
                });

                setImportData({
                    headers,
                    previewData: results.data as PreviewRow[]
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
                    
                    // Find matching DB column
                    const matchingColumn = DB_COLUMNS.find(col => 
                        col.match.toLowerCase() === header.toLowerCase()
                    );
                    
                    return {
                        name: uniqueHeader,
                        mappedTo: matchingColumn?.value || ''
                    };
                });

                const previewData = jsonData.slice(1).map((row: any) => {
                    const rowData: PreviewRow = {};
                    headers.forEach((header, index) => {
                        rowData[header.name] = row[index]?.toString() || '';
                    });
                    return rowData;
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

    const getPreviewData = (): PreviewOrder[] => {
        if (!importData) return [];

        return importData.previewData.map(row => {
            const orderData: Partial<PreviewOrder> = {
                order_number: null,
                amount: null
            };

            importData.headers.forEach(header => {
                if (header.mappedTo) {
                    const value = row[header.name];
                    orderData[header.mappedTo as keyof PreviewOrder] = value;
                }
            });

            return orderData as PreviewOrder;
        });
    };

    const getAvailableColumns = (currentHeader: string) => {
        if (!importData) return DB_COLUMNS;

        const mappedColumns = importData.headers
            .filter(header => header.name !== currentHeader && header.mappedTo)
            .map(header => header.mappedTo);

        return DB_COLUMNS.filter(column =>
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
        return value.toString();
    };

    const handleImport = () => {
        setTimeout(async () => {
            if (!importData) return;

            // Initialize progress
            setProgressState({
                totalOrders: importData.previewData.length,
                currentOrder: 0,
                currentOperation: 'Starting update process...',
                logs: []
            });
            setIsProgressOpen(true);

            const mappedHeaders = importData.headers.filter(h => h.mappedTo);

            // Validate required fields
            if (!mappedHeaders.some(h => h.mappedTo === 'order_number') || !mappedHeaders.some(h => h.mappedTo === 'amount')) {
                addLog('Error: Both Order Number and Amount fields are required');
                return;
            }

            // Prepare all order data
            const orders = importData.previewData.map((row, index) => {
                const orderData: any = {};

                mappedHeaders.forEach(header => {
                    const value = row[header.name];
                    if (header.mappedTo === 'amount') {
                        // Convert amount to number and handle any currency formatting
                        const cleanAmount = value.replace(/[^0-9.-]+/g, '');
                        orderData[header.mappedTo] = parseFloat(cleanAmount) || 0;
                    } else {
                        orderData[header.mappedTo] = value;
                    }
                });

                // Add organization_id to each order
                orderData.organization_id = organization?.id;

                return orderData;
            });

            addLog(`Processing ${orders.length} orders...`);

            // Update orders in batches
            const BATCH_SIZE = 100; // Increased batch size since we're using RPC
            let successCount = 0;

            for (let i = 0; i < orders.length; i += BATCH_SIZE) {
                const batch = orders.slice(i, i + BATCH_SIZE);
                updateProgress(i + 1, `Updating batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(orders.length / BATCH_SIZE)}`);

                try {
                    const { error } = await supabase
                        .rpc('batch_update_order_amounts', {
                            orders: batch
                        });

                    if (error) {
                        addLog(`Error updating batch: ${error.message}`);
                    } else {
                        successCount += batch.length;
                    }
                } catch (error) {
                    addLog(`Error in batch update: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            }

            addLog(`\nUpdate process completed. Successfully updated ${successCount} out of ${orders.length} orders.`);
            updateProgress(orders.length, `Update completed. Updated ${successCount} orders.`);
        }, 0);
    };

    return (
        <div className={`min-h-screen p-6 ${getThemeStyle(theme, 'background', 'primary')}`}>
            {/* Add ProgressPopup component */}
            <ProgressPopup
                isOpen={isProgressOpen}
                totalOrders={progressState.totalOrders}
                currentOrder={progressState.currentOrder}
                currentOperation={progressState.currentOperation}
                logs={progressState.logs}
                onClose={() => setIsProgressOpen(false)}
            />

            <div className="">
                {/* Header */}
                <div className="flex items-center mb-8">
                    <Upload className={`h-8 w-8 mr-3 ${getThemeStyle(theme, 'text', 'accent')}`} />
                    <h1 className={`text-2xl font-bold ${getThemeStyle(theme, 'text', 'primary')}`}>
                        Update Orders
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
                                    Update Orders
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
                                        Preview Data | {importData.previewData.length} row{importData.previewData.length > 1 ? 's' : ''} of orders
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
                                        const order = getPreviewData()[actualIndex];
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
                                                    {Object.entries(order).map(([key, value]) => (
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
                                                    Order
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
                                                const order = getPreviewData()[actualIndex];
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
                                                        {Object.entries(order).map(([key, value]) => (
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