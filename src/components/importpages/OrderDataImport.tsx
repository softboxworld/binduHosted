import React, { useState, useCallback, useEffect } from 'react';
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
                        Importing Orders
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
    client_name: string | null;
    client_phone: string | null;
    description: string | null;
    due_date: string | null;
    status: string | null;
    total_amount: string | null;
    payment_status: string | null;
    created_at: string | null;
    [key: string]: string | null;
}

interface Client {
    id: string;
    name: string;
    phone: string;
}

interface Service {
    id: string;
    name: string;
    cost: number;
}

interface Worker {
    id: string;
    name: string;
}

interface WorkerProject {
    id: string;
    worker_id: string;
    name: string;
}

interface ServiceData {
    name: string;
    quantity: number;
    price: number;
}

const parseServiceString = (serviceString: string): ServiceData[] => {
    // Split the string by 'GH₵' to separate each service
    const services = serviceString.split('GH₵')
        .filter(service => service.trim()) // Remove empty strings
        .map(service => service.trim()); // Trim whitespace

    return services.map(service => {
        // Split by '-' to get the parts
        const parts = service.split('-').map(part => part.trim());

        // Extract service name (first part)
        const name = parts[0].trim();

        // Extract quantity (second part)
        const quantityMatch = parts[1].match(/(\d+)\s*pcs/);
        const quantity = quantityMatch ? parseInt(quantityMatch[1]) : 0;

        // Extract price (third part)
        const priceMatch = parts[2].match(/([\d,]+)/);
        const price = priceMatch ? parseFloat(priceMatch[1].replace(/,/g, '')) : 0;

        return {
            name,
            quantity,
            price
        };
    });
};

const DB_COLUMNS = [
    { value: 'order_created_at', label: 'Order Created At', match: 'Created at' },
    { value: 'order_number', label: 'Order Number', match: 'Order #' },
    { value: 'status', label: 'Status', match: 'Status' },
    { value: 'client_name', label: 'Client Name', match: 'Client name' },
    { value: 'client_phone', label: 'Client Phone', match: 'Client phone number' },
    { value: 'client_email', label: 'Client Email', match: 'Email' },
    { value: 'client_address', label: 'Client Address', match: 'Address' },
    { value: 'due_date', label: 'Due Date', match: 'Due date' },
    { value: 'service', label: 'Service', match: 'Services/Labors' },
    { value: 'product', label: 'Product', match: 'Products' },
    { value: 'description', label: 'Description', match: 'Order description' },
    { value: 'assigned_top_worker', label: 'Assigned Top Tailor', match: 'Assigned Top Tailor' },
    { value: 'assigned_bottom_worker', label: 'Assigned Down Tailor', match: 'Assigned Down Tailor' },
    { value: 'client_top_measurment', label: 'Client Top Measurment', match: 'Top Measurements' },
    { value: 'client_bottom_measurment', label: 'Client Bottom Measurment', match: 'Down Measurements' },
];

export default function OrderDataImport() {
    const [file, setFile] = useState<File | null>(null);
    const [importData, setImportData] = useState<ImportData | null>(null);
    const [selectedRows, setSelectedRows] = useState<number[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [clients, setClients] = useState<Client[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [workerProjects, setWorkerProjects] = useState<WorkerProject[]>([]);
    // Cache for worker lookups
    const workerCache = new Map<string, {workerId: string, projectId: string}>();
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

    // Fetch all clients when component mounts
    useEffect(() => {
        const fetchAllClients = async () => {
            let allClients: Client[] = [];
            let from = 0;
            const chunkSize = 1000;
            let done = false;

            while (!done) {
            const { data, error } = await supabase
                .from('clients')
                .select('id, name, phone')
                    .eq('organization_id', organization?.id)
                    .range(from, from + chunkSize - 1);

            if (error) {
                console.error('Error fetching clients:', error);
                return;
            }

            if (data) {
                    allClients = allClients.concat(data);
                    if (data.length < chunkSize) {
                        done = true; // No more data to fetch
                    } else {
                        from += chunkSize;
                    }
                }
            }

            console.log(`Loaded ${allClients.length} clients`);
            setClients(allClients);
        };

        const fetchAllServices = async () => {
            let allServices: Service[] = [];
            let from = 0;
            const chunkSize = 1000;
            let done = false;

            while (!done) {
                const { data, error } = await supabase
                    .from('services')
                    .select('id, name, cost')
                    .eq('organization_id', organization?.id)
                    .range(from, from + chunkSize - 1);

                if (error) {
                    console.error('Error fetching services:', error);
                    return;
                }

                if (data) {
                    allServices = allServices.concat(data);
                    if (data.length < chunkSize) {
                        done = true; // No more data to fetch
                    } else {
                        from += chunkSize;
                    }
                }
            }

            console.log(`Loaded ${allServices.length} services`);
            setServices(allServices);
        };
        
        const fetchAllWorkers = async () => {
            let allWorkers: Worker[] = [];
            let from = 0;
            const chunkSize = 1000;
            let done = false;

            while (!done) {
                const { data, error } = await supabase
                    .from('workers')
                    .select('id, name')
                    .eq('organization_id', organization?.id)
                    .range(from, from + chunkSize - 1);

                if (error) {
                    console.error('Error fetching workers:', error);
                    return;
                }

                if (data) {
                    allWorkers = allWorkers.concat(data);
                    if (data.length < chunkSize) {
                        done = true; // No more data to fetch
                    } else {
                        from += chunkSize;
                    }
                }
            }

            console.log(`Loaded ${allWorkers.length} workers`);
            setWorkers(allWorkers);
        };
        
        const fetchAllWorkerProjects = async () => {
            let allProjects: WorkerProject[] = [];
            let from = 0;
            const chunkSize = 1000;
            let done = false;

            while (!done) {
                const { data, error } = await supabase
                    .from('worker_projects')
                    .select('id, worker_id, name')
                    .eq('organization_id', organization?.id)
                    .eq('name', 'base') // Only fetch base projects which we use for orders
                    .range(from, from + chunkSize - 1);

                if (error) {
                    console.error('Error fetching worker projects:', error);
                    return;
                }

                if (data) {
                    allProjects = allProjects.concat(data);
                    if (data.length < chunkSize) {
                        done = true; // No more data to fetch
                    } else {
                        from += chunkSize;
                    }
                }
            }

            console.log(`Loaded ${allProjects.length} worker projects`);
            setWorkerProjects(allProjects);
        };

        if (organization?.id) {
            fetchAllClients();
            fetchAllServices();
            fetchAllWorkers();
            fetchAllWorkerProjects();
        }
    }, [organization?.id]);

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
                client_name: null,
                client_phone: null,
                description: null,
                due_date: null,
                status: null,
                total_amount: null,
                payment_status: null,
                created_at: null
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
                totalOrders: importData.previewData.length,
                currentOrder: 0,
                currentOperation: 'Starting import process...',
                logs: []
            });
            setIsProgressOpen(true);

            const mappedHeaders = importData.headers.filter(h => h.mappedTo);

            // Validate required fields
            if (!mappedHeaders.some(h => h.mappedTo === 'order_number')) {
                addLog('Error: Order Number field is required');
                return;
            }
            
            // Create a working copy of clients that we'll update as we add new ones
            let workingClients = [...clients];
            
            // Create a working copy of services that we'll update as we add new ones
            let workingServices = [...services];
            
            // Create working copies of workers and their projects
            let workingWorkers = [...workers];
            let workingWorkerProjects = [...workerProjects];

            // Prepare all order data
            const orders = importData.previewData.map((row, index) => {
                const orderData: any = {};

                mappedHeaders.forEach(header => {
                    const value = row[header.name];
                    if (header.mappedTo === 'due_date' || header.mappedTo === 'order_created_at') {
                        orderData[header.mappedTo] = formatExcelDate(value);
                    } else {
                        orderData[header.mappedTo] = value;
                    }
                });

                // Map the order status
                if (orderData.status) {
                    if (orderData.status.toLowerCase() === 'new') {
                        orderData.status = 'pending';
                    } else if (orderData.status.toLowerCase() === 'done') {
                        orderData.status = 'completed';
                    } else {
                        orderData.status = 'in_progress';
                    }
                }

                // Add default values for required fields
                orderData.status = orderData.status || 'pending';
                orderData.order_type = 'service_order';

                return orderData;
            });

            addLog(`Processing ${orders.length} orders...`);

            // Step 1: Process all clients first
            updateProgress(0, 'Identifying new clients...');
            addLog('Step 1: Identifying clients to create...');

            // Track clients that need to be created
            const newClientsMap = new Map<string, { name: string; phone: string; topMeasurement?: string; bottomMeasurement?: string }>();
            
            // First pass - identify all new clients
            orders.forEach(order => {
                if (!order.client_name && !order.client_phone) {
                    return; // Skip orders without client info
                }
                
                const clientKey = `${order.client_name.trim().toLowerCase()}|${order.client_phone.trim()}`;
                
                // Check if client exists in current state (case-insensitive)
                const clientExists = workingClients.some(
                    client => client.name.toLowerCase() === order.client_name.trim().toLowerCase() && 
                              client.phone === order.client_phone.trim()
                );
                
                if (!clientExists && !newClientsMap.has(clientKey)) {
                    // Add to map of clients to create
                    newClientsMap.set(clientKey, {
                                    name: order.client_name.trim(),
                                    phone: order.client_phone.trim(),
                        topMeasurement: order.client_top_measurment?.trim(),
                        bottomMeasurement: order.client_bottom_measurment?.trim()
                    });
                }
            });
            
            addLog(`Found ${newClientsMap.size} new clients to create`);
            
            // Step 2: Bulk create new clients
            if (newClientsMap.size > 0) {
                updateProgress(0, 'Creating new clients in bulk...');
                addLog('Step 2: Creating new clients in bulk...');
                
                // Prepare client data for bulk insert
                const clientsToCreate = Array.from(newClientsMap.values()).map(client => ({
                    organization_id: organization?.id,
                    name: client.name,
                    phone: client.phone,
                                    status: 'active'
                }));
                
                // Bulk insert clients
                const { data: createdClients, error: clientsError } = await supabase
                    .from('clients')
                    .insert(clientsToCreate)
                    .select();
                
                if (clientsError) {
                    addLog(`Error creating clients: ${clientsError.message}`);
                    return;
                }
                
                addLog(`Successfully created ${createdClients.length} clients`);
                
                // Add new clients to local state
                const newClientsList = createdClients.map(client => ({
                    id: client.id,
                    name: client.name,
                    phone: client.phone
                }));
                
                // log the new clients
                addLog(`New clients: ${JSON.stringify(newClientsList)}`);
                
                // Update both the React state and our working copy
                setClients(prev => [...prev, ...newClientsList]);
                workingClients = [...workingClients, ...newClientsList];
                
                // Create client-measurements mapping for later use
                const clientMeasurements = new Map<string, { 
                    clientId: string; 
                    topMeasurement?: string; 
                    bottomMeasurement?: string 
                }>();
                
                // Associate created clients with their measurements
                createdClients.forEach(client => {
                    const clientKey = `${client.name.toLowerCase()}|${client.phone}`;
                    const clientData = newClientsMap.get(clientKey);
                    
                    if (clientData && (clientData.topMeasurement || clientData.bottomMeasurement)) {
                        clientMeasurements.set(client.id, {
                            clientId: client.id,
                            topMeasurement: clientData.topMeasurement,
                            bottomMeasurement: clientData.bottomMeasurement
                        });
                    }
                });
                
                // Step 3: Bulk create client measurements if needed
                if (clientMeasurements.size > 0) {
                    updateProgress(0, 'Adding client measurements...');
                    addLog('Step 3: Adding client measurements...');
                    
                    const customFieldsToCreate = [];
                    
                    // Gather all client custom fields for bulk insert
                    for (const [clientId, data] of clientMeasurements.entries()) {
                        if (data.topMeasurement) {
                            customFieldsToCreate.push({
                                client_id: clientId,
                                        title: 'Top Measurment',
                                value: data.topMeasurement,
                                        type: 'text'
                                    });
                        }
                        
                        if (data.bottomMeasurement) {
                            customFieldsToCreate.push({
                                client_id: clientId,
                                        title: 'Bottom Measurment',
                                value: data.bottomMeasurement,
                                        type: 'text'
                                    });
                        }
                    }
                    
                    if (customFieldsToCreate.length > 0) {
                        const { error: fieldsError } = await supabase
                            .from('client_custom_fields')
                            .insert(customFieldsToCreate);
                        
                        if (fieldsError) {
                            addLog(`Warning: Error adding client measurements: ${fieldsError.message}`);
                            // Continue processing even if measurements fail
                        } else {
                            addLog(`Added ${customFieldsToCreate.length} client measurements`);
                        }
                    }
                }
            }

            // Step 4: Identify and process all services
            updateProgress(0, 'Identifying services to create...');
            addLog('Step 4: Identifying services to create...');
            
            // Track services that need to be created
            const newServicesMap = new Map<string, { name: string; cost: number }>();
            
            // First pass - identify all services that need to be created
            for (const order of orders) {
                        if (order.service) {
                    const parsedServices = parseServiceString(order.service);
                    for (const service of parsedServices) {
                        const serviceKey = `${service.name}|${service.price}`;
                        
                        // Check if service exists in current state
                        const serviceExists = workingServices.some(
                            existingService => existingService.name.toLowerCase() === service.name.toLowerCase() && 
                                               parseFloat(existingService.cost.toString()) === service.price
                        );
                        
                        if (!serviceExists && !newServicesMap.has(serviceKey)) {
                            // Add to map of services to create
                            newServicesMap.set(serviceKey, {
                                name: service.name,
                                cost: service.price
                            });
                        }
                    }
                }
            }
            
            addLog(`Found ${newServicesMap.size} new services to create`);
            
            // Step 5: Bulk create new services
            if (newServicesMap.size > 0) {
                updateProgress(0, 'Creating services in bulk...');
                addLog('Step 5: Creating services in bulk...');
                
                // Prepare service data for bulk insert
                const servicesToCreate = Array.from(newServicesMap.values()).map(service => ({
                    organization_id: organization?.id,
                    name: service.name,
                    cost: service.cost
                }));
                
                // Bulk insert services
                const { data: createdServices, error: servicesError } = await supabase
                                        .from('services')
                    .upsert(servicesToCreate, {
                        onConflict: 'name,cost'
                    })
                    .select();
                
                if (servicesError) {
                    addLog(`Error creating services: ${servicesError.message}`);
                    // Continue processing even if service creation fails
                                    } else {
                    addLog(`Successfully created ${createdServices.length} services`);
                    
                    // Add new services to local state
                    const newServicesList = createdServices.map(service => ({
                        id: service.id,
                        name: service.name,
                        cost: service.cost
                    }));
                    
                    // log the new services
                    addLog(`New services: ${JSON.stringify(newServicesList)}`);
                    
                    // Update both the React state and our working copy
                    setServices(prev => [...prev, ...newServicesList]);
                    workingServices = [...workingServices, ...newServicesList];
                }
            }

            // Step 6: Identify all workers that need to be created
            updateProgress(0, 'Identifying workers to create...');
            addLog('Step 6: Identifying workers to create...');
            
            // Track workers that need to be created
            const newWorkersMap = new Map<string, { name: string }>();
            
            // First pass - identify all workers that need to be created
            for (const order of orders) {
                if (order.assigned_top_worker) {
                    const workerName = order.assigned_top_worker.trim();
                    
                    // Check if worker exists in current state
                    const workerExists = workingWorkers.some(worker => worker.name.toLowerCase() === workerName.toLowerCase());
                    
                    if (!workerExists && !newWorkersMap.has(workerName)) {
                        // Add to map of workers to create
                        newWorkersMap.set(workerName, { name: workerName });
                    }
                }
                
                if (order.assigned_bottom_worker) {
                    const workerName = order.assigned_bottom_worker.trim();
                    
                    // Check if worker exists in current state
                    const workerExists = workingWorkers.some(worker => worker.name.toLowerCase() === workerName.toLowerCase());
                    
                    if (!workerExists && !newWorkersMap.has(workerName)) {
                        // Add to map of workers to create
                        newWorkersMap.set(workerName, { name: workerName });
                    }
                }
            }
            
            addLog(`Found ${newWorkersMap.size} new workers to create`);
            
            // Step 7: Bulk create new workers
            let createdWorkersMap = new Map<string, string>(); // Map worker name to ID
            
            if (newWorkersMap.size > 0) {
                updateProgress(0, 'Creating workers in bulk...');
                addLog('Step 7: Creating workers in bulk...');
                
                // Prepare worker data for bulk insert
                const workersToCreate = Array.from(newWorkersMap.values()).map(worker => ({
                    organization_id: organization?.id,
                    name: worker.name,
                    status: 'active'
                }));
                
                // Bulk insert workers
                const { data: createdWorkers, error: workersError } = await supabase
                    .from('workers')
                    .insert(workersToCreate)
                    .select();
                
                if (workersError) {
                    addLog(`Error creating workers: ${workersError.message}`);
                    // Continue processing, we'll create workers one by one as fallback
                                } else {
                    addLog(`Successfully created ${createdWorkers.length} workers`);
                    
                    // Add new workers to local state
                    const newWorkersList = createdWorkers.map(worker => ({
                        id: worker.id,
                        name: worker.name
                    }));
                    
                    // log the new workers
                    addLog(`New workers: ${JSON.stringify(newWorkersList)}`);
                    
                    // Update both the React state and our working copy
                    setWorkers(prev => [...prev, ...newWorkersList]);
                    workingWorkers = [...workingWorkers, ...newWorkersList];
                    
                    // Create a map for easy lookup by name
                    createdWorkers.forEach(worker => {
                        createdWorkersMap.set(worker.name, worker.id);
                    });
                    
                    // Step 8: Create base projects for all new workers
                    updateProgress(0, 'Creating worker projects...');
                    addLog('Step 8: Creating worker projects in bulk...');
                    
                    // Prepare worker project data for bulk insert
                    const projectsToCreate = createdWorkers.map(worker => ({
                        organization_id: organization?.id,
                        worker_id: worker.id,
                        name: 'base',
                        description: 'Base project for worker',
                        price: 0,
                        status: 'active'
                    }));
                    
                    if (projectsToCreate.length > 0) {
                        const { data: createdProjects, error: projectsError } = await supabase
                            .from('worker_projects')
                            .insert(projectsToCreate)
                            .select();
                        
                        if (projectsError) {
                            addLog(`Error creating worker projects: ${projectsError.message}`);
                            // Continue processing, we'll create projects one by one as fallback
                        } else {
                            addLog(`Successfully created ${createdProjects.length} worker projects`);
                            
                            // Add new worker projects to local state
                            const newProjectsList = createdProjects.map(project => ({
                                id: project.id,
                                worker_id: project.worker_id,
                                name: project.name
                            }));
                            
                            // Update both the React state and our working copy
                            setWorkerProjects(prev => [...prev, ...newProjectsList]);
                            workingWorkerProjects = [...workingWorkerProjects, ...newProjectsList];
                        }
                    }
                }
            }

            // Step 9: Process orders - prepare all order data first
            addLog('Step 9: Preparing order data...');
            
            // Helper function to update progress less frequently
            let lastProgressUpdate = Date.now();
            const updateProgressBatched = (currentOrder: number, operation: string) => {
                const now = Date.now();
                if (now - lastProgressUpdate > 200) { // Update UI at most every 200ms
                    updateProgress(currentOrder, operation);
                    lastProgressUpdate = now;
                }
            };

            // Arrays to store all the data to be created in bulk
            type PreparedOrder = {
                order: any;
                services: Array<{service_id: string; quantity: number; cost: number}>;
                workers: Array<{worker_id: string; project_id: string}>;
            };
            
            const preparedOrders: PreparedOrder[] = [];
            
            // Prepare all orders first without creating them
            for (let i = 0; i < orders.length; i++) {
                const order = orders[i];
                updateProgressBatched(i + 1, `Preparing order: ${order.order_number || 'No order number'}`);
                addLog(`\nPreparing order: ${i + 1} of ${orders.length}`);

                // Look up client from our working copy of clients
                const existingClient = workingClients.find(
                    client => client.name.toLowerCase() === order.client_name?.trim().toLowerCase() && 
                              client.phone === order.client_phone?.trim()
                );

                if (!existingClient) {
                    addLog(`Warning: Client not found for order ${order.order_number}. Client name: "${order.client_name}", phone: "${order.client_phone}"`);
                    continue; // Skip this order
                }
                
                // Set client ID
                order.client_id = existingClient.id;
                
                // Prepare services
                const orderServices: Array<{service_id: string; quantity: number; cost: number}> = [];
                if (order.service) {
                    const parsedServices = parseServiceString(order.service);
                    for (const service of parsedServices) {
                        // Look up service from our working copy of services
                        const existingService = workingServices.find(
                            s => s.name.toLowerCase() === service.name.toLowerCase() && 
                                 parseFloat(s.cost.toString()) === service.price
                        );
                        
                        if (existingService) {
                            orderServices.push({
                                service_id: existingService.id,
                                quantity: service.quantity,
                                cost: service.price * service.quantity
                            });
                        if (service.price * service.quantity === 0) {
                            console.log(`Order ${order.order_number} service cost: ${service.price * service.quantity}`)
                        }
                    } else {
                            addLog(`Warning: Service not found for "${service.name}" with cost ${service.price}`);
                        }
                    }
                }
                
                // Prepare workers
                const orderWorkers: Array<{worker_id: string; project_id: string}> = [];
                    
                    // Process top worker
                    if (order.assigned_top_worker) {
                    try {
                        await processWorkerForOrder(
                            order.assigned_top_worker.trim(), 
                            orderWorkers, 
                            createdWorkersMap,
                            workingWorkers,
                            workingWorkerProjects
                        );
                    } catch (err) {
                        addLog(`Error processing top worker: ${err instanceof Error ? err.message : 'Unknown error'}`);
                    }
                    }

                    // Process bottom worker
                    if (order.assigned_bottom_worker) {
                    try {
                        await processWorkerForOrder(
                            order.assigned_bottom_worker.trim(), 
                            orderWorkers, 
                            createdWorkersMap,
                            workingWorkers,
                            workingWorkerProjects
                        );
                    } catch (err) {
                        addLog(`Error processing bottom worker: ${err instanceof Error ? err.message : 'Unknown error'}`);
                    }
                }
                
                // Calculate total amount
                const totalAmount = orderServices.reduce((total, service) => total + service.cost, 0);
                
                // Add this order to the prepared orders array
                preparedOrders.push({
                    order: {
                                organization_id: organization?.id,
                                order_number: order.order_number,
                                client_id: order.client_id,
                                description: order.description || null,
                                due_date: order.due_date || null,
                                status: order.status,
                                total_amount: totalAmount,
                                outstanding_balance: totalAmount,
                                payment_status: 'unpaid',
                                created_at: order.order_created_at || new Date().toISOString()
                    },
                    services: orderServices,
                    workers: orderWorkers
                });
            }
            
            addLog(`Prepared ${preparedOrders.length} orders for bulk creation`);
            
            // Step 10: Create orders in batches
            addLog('Step 10: Creating orders in batches...');
            
            // Track the successfully created orders for later use
            type CreatedOrderData = {
                id: string;
                order_number: string;
                services: Array<{service_id: string; quantity: number; cost: number}>;
                workers: Array<{worker_id: string; project_id: string}>;
                description?: string;
                created_at?: string;
            };
            
            const createdOrders: CreatedOrderData[] = [];
            const ORDERS_BATCH_SIZE = 20;
            
            // Create orders in batches
            for (let i = 0; i < preparedOrders.length; i += ORDERS_BATCH_SIZE) {
                const currentBatch = preparedOrders.slice(i, i + ORDERS_BATCH_SIZE);
                updateProgress(i + 1, `Creating orders batch ${Math.floor(i / ORDERS_BATCH_SIZE) + 1} of ${Math.ceil(preparedOrders.length / ORDERS_BATCH_SIZE)}`);
                
                // Extract just the order objects for insertion
                const orderBatch = currentBatch.map(item => item.order);
                
                try {
                    addLog(`Creating batch of ${orderBatch.length} orders...`);
                    const { data: createdOrdersData, error: batchError } = await supabase
                        .from('orders')
                        .insert(orderBatch)
                        .select();
                    
                    if (batchError) {
                        addLog(`Error creating order batch: ${batchError.message}`);
                        continue; // Skip to next batch
                    }
                    
                    if (!createdOrdersData || createdOrdersData.length === 0) {
                        addLog('No orders were created in this batch');
                        continue;
                    }
                    
                    addLog(`Successfully created ${createdOrdersData.length} orders`);
                    
                    // Match created orders with their prepared data
                    for (const createdOrder of createdOrdersData) {
                        const matchingPrepared = currentBatch.find(item => 
                            item.order.order_number === createdOrder.order_number
                        );
                        
                        if (matchingPrepared) {
                            createdOrders.push({
                                id: createdOrder.id,
                                order_number: createdOrder.order_number,
                                services: matchingPrepared.services,
                                workers: matchingPrepared.workers,
                                description: matchingPrepared.order.description,
                                created_at: matchingPrepared.order.order_created_at
                            });
                        }
                    }
                } catch (error) {
                    addLog(`Error in batch creation: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            }
            
            addLog(`Successfully created ${createdOrders.length} orders out of ${preparedOrders.length} prepared`);
            
            // Step 11: Create order services in batches
            if (createdOrders.some(order => order.services.length > 0)) {
                addLog('Step 11: Creating order services in batches...');
                
                const allOrderServices = createdOrders.flatMap(order => 
                    order.services.map(service => ({
                        order_id: order.id,
                                    service_id: service.service_id,
                                    quantity: service.quantity,
                                    cost: service.cost
                    }))
                );
                
                if (allOrderServices.length > 0) {
                    const SERVICES_BATCH_SIZE = 50;
                    for (let i = 0; i < allOrderServices.length; i += SERVICES_BATCH_SIZE) {
                        const serviceBatch = allOrderServices.slice(i, i + SERVICES_BATCH_SIZE);
                        try {
                            addLog(`Creating batch of ${serviceBatch.length} order services...`);
                            const { error: servicesError } = await supabase
                                .from('order_services')
                                .insert(serviceBatch);

                            if (servicesError) {
                                addLog(`Error creating order services batch: ${servicesError.message}`);
                            } else {
                                addLog(`Successfully created ${serviceBatch.length} order services`);
                            }
                        } catch (error) {
                            addLog(`Error in service batch creation: ${error instanceof Error ? error.message : 'Unknown error'}`);
                        }
                    }
                }
            }
            
            // Step 12: Create order workers in batches
            if (createdOrders.some(order => order.workers.length > 0)) {
                addLog('Step 12: Creating order workers in batches...');
                
                const allOrderWorkers = createdOrders.flatMap(order => {
                    // Deduplicate workers for this order using a Set
                    const uniqueWorkers = new Set<string>();
                    return order.workers
                        .filter(worker => {
                            const key = `${worker.worker_id}-${worker.project_id}`;
                            if (uniqueWorkers.has(key)) {
                                addLog(`Skipping duplicate worker assignment for order ${order.order_number}: worker ${worker.worker_id}, project ${worker.project_id}`);
                                return false;
                            }
                            uniqueWorkers.add(key);
                            return true;
                        })
                        .map(worker => ({
                            order_id: order.id,
                            worker_id: worker.worker_id,
                            project_id: worker.project_id,
                            status: 'assigned'
                        }));
                });
                
                if (allOrderWorkers.length > 0) {
                    const WORKERS_BATCH_SIZE = 50;
                    for (let i = 0; i < allOrderWorkers.length; i += WORKERS_BATCH_SIZE) {
                        const workerBatch = allOrderWorkers.slice(i, i + WORKERS_BATCH_SIZE);
                        try {
                            addLog(`Creating batch of ${workerBatch.length} order workers...`);
                            const { error: workersError } = await supabase
                                .from('order_workers')
                                .insert(workerBatch);
                            
                            if (workersError) {
                                addLog(`Error creating order workers batch: ${workersError.message}`);
                            } else {
                                addLog(`Successfully created ${workerBatch.length} order workers`);
                            }
                    } catch (error) {
                            addLog(`Error in worker batch creation: ${error instanceof Error ? error.message : 'Unknown error'}`);
                        }
                    }
                }
            }
            
            
            addLog('\nImport process completed');
            updateProgress(orders.length, `Import completed. Created ${createdOrders.length} orders.`);
        }, 0);
    };
    
    // Helper function to process a worker for order preparation
    async function processWorkerForOrder(
        workerName: string, 
        orderWorkers: Array<{worker_id: string; project_id: string}>, 
        createdWorkersMap: Map<string, string>,
        workingWorkers: Array<{id: string; name: string}>,
        workingWorkerProjects: Array<{id: string; worker_id: string; name: string}>
    ) {
            // Check worker cache first
            if (workerCache.has(workerName)) {
                const cachedWorker = workerCache.get(workerName)!;
            orderWorkers.push({
                    worker_id: cachedWorker.workerId,
                    project_id: cachedWorker.projectId
                });
                return;
            }
            
        // Check if this worker was part of our bulk creation
        if (createdWorkersMap.has(workerName)) {
            const workerId = createdWorkersMap.get(workerName)!;
            
            // Find the corresponding worker project
            const workerProject = workingWorkerProjects.find(project => 
                project.worker_id === workerId && project.name === 'base'
            );
            
            if (workerProject) {
                orderWorkers.push({
                    worker_id: workerId,
                    project_id: workerProject.id
                });
                
                // Add to cache
                workerCache.set(workerName, {
                    workerId: workerId,
                    projectId: workerProject.id
                });
                return;
            }
        }
        
        // Check if worker exists in our working copy
        const existingWorker = workingWorkers.find(worker => 
            worker.name.toLowerCase() === workerName.toLowerCase()
        );
        
        if (existingWorker) {
            // Find the worker's base project
            const existingProject = workingWorkerProjects.find(project => 
                project.worker_id === existingWorker.id && project.name === 'base'
            );
            
            if (existingProject) {
                orderWorkers.push({
                    worker_id: existingWorker.id,
                    project_id: existingProject.id
                });
                
                // Add to cache
                workerCache.set(workerName, {
                    workerId: existingWorker.id,
                    projectId: existingProject.id
                });
                return;
            } else {
                // Create base project for existing worker (should be rare)
                        const { data: createdProject, error: createProjectError } = await supabase
                            .from('worker_projects')
                            .insert([{
                                organization_id: organization?.id,
                        worker_id: existingWorker.id,
                                name: 'base',
                                description: 'Base project for worker',
                                price: 0,
                                status: 'active'
                            }])
                            .select()
                            .single();

                        if (createProjectError) {
                    throw new Error(`Error creating base project: ${createProjectError.message}`);
                }
                
                orderWorkers.push({
                    worker_id: existingWorker.id,
                                project_id: createdProject.id
                            });
                            
                // Update both the React state and our working copy
                setWorkerProjects(prev => [...prev, {
                    id: createdProject.id,
                    worker_id: existingWorker.id,
                    name: 'base'
                }]);
                workingWorkerProjects.push({
                    id: createdProject.id,
                    worker_id: existingWorker.id,
                    name: 'base'
                        });
                        
                        // Add to cache
                        workerCache.set(workerName, {
                    workerId: existingWorker.id,
                    projectId: createdProject.id
                });
                return;
            }
        }
        
        // If we reach here, we need to create the worker and project (fallback for any missed workers)
        const { data: newWorker, error: newWorkerError } = await supabase
            .from('workers')
            .insert([{ organization_id: organization?.id, name: workerName }])
            .select()
            .single();
            
        if (newWorkerError) {
            throw new Error(`Error creating fallback worker: ${newWorkerError.message}`);
        }
        
        // Create base project
                    const { data: createdProject, error: createProjectError } = await supabase
                        .from('worker_projects')
                        .insert([{
                            organization_id: organization?.id,
                worker_id: newWorker.id,
                            name: 'base',
                            description: 'Base project for worker',
                            price: 0,
                            status: 'active'
                        }])
                        .select()
                        .single();

                    if (createProjectError) {
            throw new Error(`Error creating fallback project: ${createProjectError.message}`);
        }
        
        orderWorkers.push({
            worker_id: newWorker.id,
                            project_id: createdProject.id
                        });
                        
        // Update both the React state and our working copy
        setWorkers(prev => [...prev, {
            id: newWorker.id,
            name: workerName
        }]);
        workingWorkers.push({
            id: newWorker.id,
            name: workerName
        });
        
        setWorkerProjects(prev => [...prev, {
            id: createdProject.id,
            worker_id: newWorker.id,
            name: 'base'
        }]);
        workingWorkerProjects.push({
            id: createdProject.id,
            worker_id: newWorker.id,
            name: 'base'
                    });
                    
                    // Add to cache
                    workerCache.set(workerName, {
            workerId: newWorker.id,
            projectId: createdProject.id
                    });
                }

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
                        Import Orders
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
                                    Generate Orders
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