import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useUI } from '../../context/UIContext';
import { useTheme } from '../../context/ThemeContext';
import { Upload, X, Check, AlertTriangle, FileText, Download, StopCircle } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import Pagination from '../common/Pagination';

interface CSVHeader {
  name: string;
  mappedTo: string;
  isCustomField: boolean;
}

interface PreviewRow {
  [key: string]: string;
}

interface ImportData {
  headers: CSVHeader[];
  previewData: PreviewRow[];
}

interface PreviewClient {
  name: string | null;
  phone: string | null;
  address: string | null;
  date_of_birth: string | null;
  email: string | null;
  created_at: string | null;
  custom_fields: Array<{
    title: string;
    value: string;
    type: string;
  }>;
  [key: string]: string | null | Array<{
    title: string;
    value: string;
    type: string;
  }>;
}

interface ImportError {
  rowIndex: number;
  clientData: PreviewClient;
  error: string;
}

const DB_COLUMNS = [
  { value: 'name', label: 'Name' },
  { value: 'phone', label: 'Phone' },
  { value: 'address', label: 'Address' },
  { value: 'date_of_birth', label: 'Date of Birth' },
  { value: 'email', label: 'Email' },
  { value: 'custom_field', label: 'Custom Field' }
];

export default function ClientDataImport() {
  const [file, setFile] = useState<File | null>(null);
  const [importData, setImportData] = useState<ImportData | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [errors, setErrors] = useState<ImportError[]>([]);
  const [showErrors, setShowErrors] = useState(false);
  const [batchSize, setBatchSize] = useState(50);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [filterDuplicateNames, setFilterDuplicateNames] = useState(false);
  const [filterDuplicatePhones, setFilterDuplicatePhones] = useState(false);
  const rowsPerPage = 50;
  const { organization } = useAuthStore();
  const { addToast } = useUI();
  const { theme, getThemeStyle } = useTheme();
  const [showImportProgress, setShowImportProgress] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [totalToProcess, setTotalToProcess] = useState(0);
  const [isImportCancelled, setIsImportCancelled] = useState(false);
  const [currentBatch, setCurrentBatch] = useState(1);
  const [totalBatches, setTotalBatches] = useState(0);

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
        const headers = Object.keys(results.data[0] || {}).map(header => ({
          name: header,
          mappedTo: '',
          isCustomField: false
        }));

        setImportData({
          headers,
          previewData: results.data as PreviewRow[]
        });
      },
      error: (error) => {
        addToast({
          type: 'error',
          title: 'Error',
          message: 'Failed to parse CSV file'
        });
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

        const headers = (jsonData[0] as string[]).map(header => ({
          name: header,
          mappedTo: '',
          isCustomField: false
        }));

        // Skip the first row (header) when creating preview data
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
        addToast({
          type: 'error',
          title: 'Error',
          message: 'Failed to parse Excel file'
        });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleHeaderMapping = (headerName: string, mappedTo: string) => {
    if (!importData) return;

    const isCustomField = mappedTo === 'custom_field';
    const updatedHeaders = importData.headers.map(header => {
      if (header.name === headerName) {
        return { ...header, mappedTo, isCustomField };
      }
      return header;
    });

    setImportData({
      ...importData,
      headers: updatedHeaders
    });
  };

  const formatDate = (dateStr: string | null): string | null => {
    if (!dateStr) return null;
    
    // Try different date formats
    const formats = [
      { regex: /^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?$/, // DD/MM/YYYY HH:mm
        format: (match: RegExpMatchArray) => {
          const [_, day, month, year, hours, minutes] = match;
          const time = hours && minutes ? ` ${hours}:${minutes}:00` : '';
          return `${year}-${month}-${day}${time}`;
        }
      },
      { regex: /^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{2}):(\d{2}))?$/, // YYYY-MM-DD HH:mm
        format: (match: RegExpMatchArray) => {
          const [_, year, month, day, hours, minutes] = match;
          const time = hours && minutes ? ` ${hours}:${minutes}:00` : '';
          return `${year}-${month}-${day}${time}`;
        }
      }
    ];

    for (const format of formats) {
      const match = dateStr.match(format.regex);
      if (match) {
        return format.format(match);
      }
    }

    // If no format matches, return null
    return null;
  };

  const processBatch = async (
    data: any[],
    startIndex: number
  ): Promise<{ success: boolean; errors: ImportError[]; processedCount: number }> => {
    if (isImportCancelled) return { success: false, errors: [], processedCount: 0 };
    if (data.length === 0) return { success: true, errors: [], processedCount: 0 };

    try {
      // Validate client data before insert
      const invalidClients = data.filter(client => 
        !client.name || !client.organization_id
      );

      if (invalidClients.length > 0) {
        return {
          success: false,
          errors: invalidClients.map((client, index) => ({
            rowIndex: startIndex + index,
            clientData: getPreviewData()[startIndex + index],
            error: 'Client is missing required fields (name, organization_id)'
          })),
          processedCount: 0
        };
      }

      // Remove custom_fields and _originalIndex from client data before insert
      const clientDataWithoutCustomFields = data.map(client => {
        const { custom_fields, _originalIndex, ...clientData } = client;
        return clientData;
      });

      // Insert clients without custom fields
      const { data: clients, error } = await supabase
        .from('clients')
        .insert(clientDataWithoutCustomFields)
        .select();

      if (error) {
        // Handle specific error cases
        if (error.code === '23505') { // Unique constraint violation
          return {
            success: false,
            errors: data.map((client, index) => ({
              rowIndex: startIndex + index,
              clientData: getPreviewData()[startIndex + index],
              error: 'A client with this name already exists in the organization'
            })),
            processedCount: 0
          };
        }

        if (error.code === '23503') { // Foreign key violation
          return {
            success: false,
            errors: data.map((client, index) => ({
              rowIndex: startIndex + index,
              clientData: getPreviewData()[startIndex + index],
              error: 'Invalid organization ID'
            })),
            processedCount: 0
          };
        }
        
        return {
          success: false,
          errors: data.map((client, index) => ({
            rowIndex: startIndex + index,
            clientData: getPreviewData()[startIndex + index],
            error: error.message
          })),
          processedCount: 0
        };
      }

      // If we have inserted clients successfully
      if (clients && clients.length > 0) {
        const allCustomFieldsErrors: ImportError[] = [];
        const allCustomFields: Array<{ client_id: string; title: string; value: string; type: string }> = [];
        const errorRowMap: Record<number, boolean> = {}; // Track rows with invalid custom fields

        // Collect custom fields for all clients and validate them
        for (let i = 0; i < data.length; i++) {
          const client = clients[i];
          const originalData = data[i];
          
          // Process custom fields if any
          if (originalData.custom_fields && originalData.custom_fields.length > 0) {
            // Validate custom fields
            const invalidFields = originalData.custom_fields.filter((field: any) => 
              !field.title
            );

            if (invalidFields.length > 0) {
              console.log(originalData.custom_fields, invalidFields);
              allCustomFieldsErrors.push({
                rowIndex: startIndex + i,
                clientData: getPreviewData()[startIndex + i],
                error: 'Custom field is missing required fields (title, value, type) or has invalid type'
              });
              errorRowMap[startIndex + i] = true;
              continue;
            }

            // Collect valid custom fields for batch insertion
            const fieldsWithClientId = originalData.custom_fields.map((field: any) => ({
              ...field,
              client_id: client.id
            }));
            
            allCustomFields.push(...fieldsWithClientId);
          }
        }

        // Insert all custom fields in a single batch if there are any
        if (allCustomFields.length > 0) {
          const { error: customFieldsError } = await supabase
            .from('client_custom_fields')
            .insert(allCustomFields);

          if (customFieldsError) {
            // If there's a general error with the batch, add it to all clients that had custom fields
            for (let i = 0; i < data.length; i++) {
              const rowIndex = startIndex + i;
              if (!errorRowMap[rowIndex] && data[i].custom_fields?.length > 0) {
                allCustomFieldsErrors.push({
                  rowIndex,
                  clientData: getPreviewData()[rowIndex],
                  error: `Error adding custom fields: ${customFieldsError.message}`
                });
              }
            }
          }
        }

        return { 
          success: allCustomFieldsErrors.length === 0, 
          errors: allCustomFieldsErrors,
          processedCount: clients.length
        };
      }

      return { success: false, errors: [], processedCount: 0 };
    } catch (error) {
      return {
        success: false,
        errors: data.map((client, index) => ({
          rowIndex: startIndex + index,
          clientData: getPreviewData()[startIndex + index],
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        })),
        processedCount: 0
      };
    }
  };

  

  const handleImport = async () => {
    if (!importData || !organization) return;

    setIsImporting(true);
    setShowImportProgress(true);
    setErrors([]);
    setProcessedCount(0);
    setTotalToProcess(importData.previewData.length);
    setIsImportCancelled(false);
    setCurrentBatch(1);

    try {
      const mappedHeaders = importData.headers.filter(h => h.mappedTo);
      
      // Validate required fields
      if (!mappedHeaders.some(h => h.mappedTo === 'name')) {
        throw new Error('Name field is required');
      }

      // Prepare all client data with name sanitization
      const clientNames = new Set<string>();
      const clientPhones = new Set<string>();
      const clientData = importData.previewData.map((row, index) => {
        const clientData: any = {};
        const customFields: { title: string; value: string; type: string }[] = [];

        mappedHeaders.forEach(header => {
          const value = row[header.name];
          if (header.isCustomField) {
            customFields.push({
              title: header.name,
              value,
              type: 'text'
            });
          } else {
            if (header.mappedTo === 'date_of_birth' || header.mappedTo === 'created_at') {
              clientData[header.mappedTo] = formatDate(value);
            } else {
              clientData[header.mappedTo] = value;
            }
          }
        });

        clientData.organization_id = organization.id;
        clientData.status = 'active';
        // Add original index to track which rows were processed
        clientData._originalIndex = index;
        if (customFields.length > 0) {
          clientData.custom_fields = customFields;
        }

        return clientData;
      });

      // Filter out duplicates if enabled
      const duplicates: ImportError[] = [];
      const uniqueClients = clientData.filter((client, index) => {
        let isDuplicate = false;
        
        if (filterDuplicateNames && client.name) {
          const normalizedName = client.name.trim().toLowerCase();
          if (clientNames.has(normalizedName)) {
            duplicates.push({
              rowIndex: client._originalIndex,
              clientData: getPreviewData()[client._originalIndex],
              error: 'Duplicate client name in import batch'
            });
            isDuplicate = true;
          } else {
            clientNames.add(normalizedName);
          }
        }

        if (filterDuplicatePhones && client.phone) {
          const normalizedPhone = client.phone.trim().toLowerCase();
          if (clientPhones.has(normalizedPhone)) {
            duplicates.push({
              rowIndex: client._originalIndex,
              clientData: getPreviewData()[client._originalIndex],
              error: 'Duplicate phone number in import batch'
            });
            isDuplicate = true;
          } else {
            clientPhones.add(normalizedPhone);
          }
        }

        return !isDuplicate;
      });

      // Update errors UI immediately if we have duplicates
      if (duplicates.length > 0) {
        setErrors(duplicates);
      }
      
      let totalProcessed = 0;
      const totalBatches = Math.ceil(uniqueClients.length / batchSize);
      setTotalBatches(totalBatches);

      for (let i = 0; i < uniqueClients.length && !isImportCancelled; i += batchSize) {
        setCurrentBatch(Math.floor(i / batchSize) + 1);
        
        const batch = uniqueClients.slice(i, i + batchSize);
        const startIndex = batch[0]._originalIndex;
        
        const { success, errors, processedCount } = await processBatch(
          batch,
          startIndex
        );

        totalProcessed += processedCount;
        setProcessedCount(totalProcessed);
        
        if (!success && errors.length > 0) {
          setErrors([...errors]);
        }

        // Check if import was cancelled after each batch
        if (isImportCancelled) {
          addToast({
            type: 'warning',
            title: 'Import Cancelled',
            message: `Import was cancelled. ${totalProcessed} clients were imported successfully.`
          });
          return;
        }
      }

      if (duplicates.length > 0) {
        addToast({
          type: 'warning',
          title: 'Partial Success',
          message: `${totalProcessed} clients imported successfully, ${duplicates.length} duplicates`
        });
      } else {
        addToast({
          type: 'success',
          title: 'Success',
          message: 'All clients imported successfully'
        });
        
        // Reset form if all imports were successful
        setFile(null);
        setImportData(null);
      }
    } catch (error) {
      console.error('Error importing clients:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to import clients'
      });
    }
  };

  const handleCancelImport = () => {
    setIsImportCancelled(true);
    setShowImportProgress(false);
    setIsImporting(false);
    setErrors([]);
    setProcessedCount(0);
    setTotalToProcess(0);
    setCurrentBatch(1);
    setTotalBatches(0);
  };

  const getPreviewData = (): PreviewClient[] => {
    if (!importData) return [];

    return importData.previewData.map(row => {
      const clientData: Partial<PreviewClient> = {
        name: null,
        phone: null,
        address: null,
        date_of_birth: null,
        email: null,
        created_at: null,
        custom_fields: []
      };

      importData.headers.forEach(header => {
        if (header.mappedTo) {
          const value = row[header.name];
          if (header.isCustomField) {
            clientData.custom_fields!.push({
              title: header.name,
              value,
              type: 'text'
            });
          } else {
            clientData[header.mappedTo as keyof PreviewClient] = value;
          }
        }
      });

      return clientData as PreviewClient;
    });
  };

  const getAvailableColumns = (currentHeader: string) => {
    if (!importData) return DB_COLUMNS;
    
    // Get all currently mapped columns except the current one
    const mappedColumns = importData.headers
      .filter(header => header.name !== currentHeader && header.mappedTo && header.mappedTo !== 'custom_field')
      .map(header => header.mappedTo);

    // Filter out already mapped columns, but allow multiple custom fields
    return DB_COLUMNS.filter(column => 
      !mappedColumns.includes(column.value) || 
      importData.headers.find(h => h.name === currentHeader)?.mappedTo === column.value ||
      column.value === 'custom_field'
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

  return (
    <div className={`min-h-screen p-6 ${getThemeStyle(theme, 'background', 'primary')}`}>
      <div className="">
        {/* Header */}
        <div className="flex items-center mb-8">
          <Download className={`h-8 w-8 mr-3 ${getThemeStyle(theme, 'text', 'accent')}`} />
          <h1 className={`text-2xl font-bold ${getThemeStyle(theme, 'text', 'primary')}`}>
            Import Clients
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

                {/* Import Button */}
                <button
                  onClick={handleImport}
                  disabled={isImporting}
                  className={`mt-6 w-full py-3 px-4 rounded-lg font-medium text-xs text-white bg-blue-600 hover:bg-blue-700 
                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-colors duration-200`}
                >
                  {isImporting ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Importing...</span>
                    </div>
                  ) : (
                    'Import Clients'
                  )}
                </button>

                {/* Advanced Settings */}
                <div className="mt-4">
                  <button
                    onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                    className={`text-xs font-medium ${getThemeStyle(theme, 'text', 'secondary')} hover:${getThemeStyle(theme, 'text', 'primary')} transition-colors duration-200`}
                  >
                    {showAdvancedSettings ? 'Hide Advanced Settings' : 'Show Advanced Settings'}
                  </button>
                  
                  {showAdvancedSettings && (
                    <div className="mt-4 space-y-4">
                      <div className="space-y-2">
                        <label className={`block text-xs font-medium ${getThemeStyle(theme, 'text', 'secondary')}`}>
                          Batch Size
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={batchSize}
                          onChange={(e) => setBatchSize(Math.min(Math.max(1, parseInt(e.target.value) || 1), 100))}
                          className={`w-full px-3 py-2 rounded-lg border text-sm ${getThemeStyle(theme, 'border', 'primary')} 
                            ${getThemeStyle(theme, 'background', 'primary')} 
                            ${getThemeStyle(theme, 'text', 'primary')}
                            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                            transition-colors duration-200`}
                        />
                        <p className={`text-xs ${getThemeStyle(theme, 'text', 'muted')}`}>
                          Number of records to process in each batch (1-100)
                        </p>
                      </div>

                      <div className="space-y-2">
                        <label className={`block text-xs font-medium ${getThemeStyle(theme, 'text', 'secondary')}`}>
                          Filter Duplicates
                        </label>
                        <div className="space-y-2">
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={filterDuplicateNames}
                              onChange={(e) => setFilterDuplicateNames(e.target.checked)}
                              className={`h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ${getThemeStyle(theme, 'background', 'primary')}`}
                            />
                            <label className={`ml-2 text-xs ${getThemeStyle(theme, 'text', 'primary')}`}>
                              Filter out duplicate names
                            </label>
                          </div>
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={filterDuplicatePhones}
                              onChange={(e) => setFilterDuplicatePhones(e.target.checked)}
                              className={`h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ${getThemeStyle(theme, 'background', 'primary')}`}
                            />
                            <label className={`ml-2 text-xs ${getThemeStyle(theme, 'text', 'primary')}`}>
                              Filter out duplicate phone numbers
                            </label>
                          </div>
                        </div>
                        <p className={`text-xs ${getThemeStyle(theme, 'text', 'muted')}`}>
                          When enabled, only the first occurrence of a duplicate name or phone number will be imported
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - Preview Data */}
          {importData && (
            <div className="flex-1 overflow-x-auto">
              <div className={`p-6 rounded-xl ${getThemeStyle(theme, 'background', 'secondary')} shadow-sm`}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className={`text-sm font-medium ${getThemeStyle(theme, 'text', 'primary')}`}>
                    Preview Data | {importData.previewData.length} row{importData.previewData.length > 1 ? 's' : ''} of clients
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
                    const client = getPreviewData()[actualIndex];
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
                          {Object.entries(client)
                            .filter(([key]) => key !== 'custom_fields')
                            .map(([key, value]) => (
                              <div key={key} className="flex justify-between">
                                <span className={`text-xs font-medium ${getThemeStyle(theme, 'text', 'secondary')}`}>
                                  {key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')}
                                </span>
                                <span className={`text-xs ${getThemeStyle(theme, 'text', 'primary')}`}>
                                  {value === null || value === '' || !value ? (
                                    <span className="text-gray-400">(empty)</span>
                                  ) : (
                                    value.toString()
                                  )}
                                </span>
                              </div>
                            ))}
                          {client.custom_fields && client.custom_fields.length > 0 && (
                            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                              <div className="space-y-2">
                                {client.custom_fields.map((field: { title: string; value: string; type: string }, fieldIndex: number) => (
                                  <div key={fieldIndex} className="flex justify-between text-xs">
                                    <span className={`font-medium ${getThemeStyle(theme, 'text', 'tertiary')}`}>
                                      {field.title}
                                    </span>
                                    <span className={getThemeStyle(theme, 'text', 'primary')}>
                                      {field.value === null || field.value === '' ? (
                                        <span className="text-gray-400">(empty)</span>
                                      ) : (
                                        field.value
                                      )}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
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
                          Client
                        </th>
                        {Object.keys(getPreviewData()[0] || {})
                          .filter(key => key !== 'custom_fields')
                          .map(key => (
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
                        const client = getPreviewData()[actualIndex];
                        return (
                          <React.Fragment key={actualIndex}>
                            <tr className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-150`}>
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
                              {Object.entries(client)
                                .filter(([key]) => key !== 'custom_fields')
                                .map(([key, value]) => (
                                  <td
                                    key={key}
                                    className={`px-6 py-4 whitespace-nowrap text-xs ${getThemeStyle(theme, 'text', 'primary')}`}
                                  >
                                    {value === null || value === '' || !value ? (
                                      <span className="text-gray-400">(empty)</span>
                                    ) : (
                                      value.toString()
                                    )}
                                  </td>
                                ))}
                            </tr>
                            {client.custom_fields && client.custom_fields.length > 0 && (
                              <tr className="bg-gray-50/50 dark:bg-gray-800/30">
                                <td colSpan={Object.keys(client).filter(key => key !== 'custom_fields').length + 1} className="px-6 py-3">
                                  <div className="space-y-2">
                                    {client.custom_fields.map((field: { title: string; value: string; type: string }, fieldIndex: number) => (
                                      <div key={fieldIndex} className="flex items-center space-x-3 text-xs">
                                        <span className={`font-medium ${getThemeStyle(theme, 'text', 'tertiary')}`}>
                                          {field.title}:
                                        </span>
                                        <span className={getThemeStyle(theme, 'text', 'primary')}>
                                          {field.value === null || field.value === '' ? (
                                            <span className="text-gray-400">(empty)</span>
                                          ) : (
                                            field.value
                                          )}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
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

        {/* Import Progress Modal */}
        {showImportProgress && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`w-full max-w-4xl max-h-[80vh] overflow-hidden rounded-xl ${getThemeStyle(theme, 'background', 'primary')} shadow-xl`}>
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className={`text-sm font-semibold ${getThemeStyle(theme, 'text', 'primary')}`}>
                    Importing Clients
                  </h3>
                  <button
                    onClick={handleCancelImport}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <X className="h-6 w-6 text-red-500" />
                  </button>
                </div>

                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="flex justify-between text-xs mb-2">
                    <span className={getThemeStyle(theme, 'text', 'secondary')}>
                      Progress: {processedCount} of {totalToProcess} clients
                    </span>
                    <span className={getThemeStyle(theme, 'text', 'secondary')}>
                      {Math.round((processedCount / totalToProcess) * 100)}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${(processedCount / totalToProcess) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Status Information */}
                <div className="mb-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className={`p-4 rounded-lg ${getThemeStyle(theme, 'background', 'secondary')}`}>
                      <div className={`text-xs font-medium ${getThemeStyle(theme, 'text', 'secondary')}`}>
                        Failed Imports
                      </div>
                      <div className={`text-sm font-semibold ${getThemeStyle(theme, 'text', 'primary')}`}>
                        {errors.length}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Error List */}
                {errors.length > 0 && (
                  <div className="mt-6">
                    <h4 className={`text-xs font-medium mb-3 ${getThemeStyle(theme, 'text', 'secondary')}`}>
                      Failed Imports ({errors.length})
                    </h4>
                    <div className="overflow-y-auto max-h-[40vh]">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="sticky top-0 bg-inherit">
                          <tr>
                            <th className={`px-4 py-2 text-left text-xs font-medium ${getThemeStyle(theme, 'text', 'tertiary')} uppercase tracking-wider`}>
                              Row
                            </th>
                            <th className={`px-4 py-2 text-left text-xs font-medium ${getThemeStyle(theme, 'text', 'tertiary')} uppercase tracking-wider`}>
                              Client Name
                            </th>
                            <th className={`px-4 py-2 text-left text-xs font-medium ${getThemeStyle(theme, 'text', 'tertiary')} uppercase tracking-wider`}>
                              Error
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {errors.map((error, index) => (
                            <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                              <td className={`px-4 py-2 whitespace-nowrap text-xs ${getThemeStyle(theme, 'text', 'primary')}`}>
                                {error.rowIndex + 1}
                              </td>
                              <td className={`px-4 py-2 text-xs ${getThemeStyle(theme, 'text', 'primary')}`}>
                                {error.clientData.name || '(No name)'}
                              </td>
                              <td className={`px-4 py-2 text-xs ${getThemeStyle(theme, 'text', 'primary')}`}>
                                <div className="flex items-center">
                                  <AlertTriangle className="h-4 w-4 text-red-500 mr-2" />
                                  {error.error}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
