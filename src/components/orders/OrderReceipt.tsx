import React, { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Printer, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { CURRENCIES } from '../../utils/constants';
import { useUI } from '../../context/UIContext';
import { useTheme } from '../../context/ThemeContext';

interface Client {
    id: string;
    name: string;
    phone?: string;
    custom_fields?: {
        id: string;
        title: string;
        value: string;
        type: string;
    }[];
}

interface Worker {
    id: string;
    name: string;
}

interface Service {
    id: string;
    name: string;
    cost: number;
}

interface OrderService {
    service: Service;
    quantity: number;
}

interface OrderWorker {
    worker: {
        id: string;
        name: string;
    };
    workerProject: {
        id: string;
        name: string;
        price: number;
    };
}

interface OrderReceiptProps {
    orderId: string;
    onClose: () => void;
}

const generateReceiptHTML = (
    organizationName: string,
    organizationAddress: string | undefined,
    selectedClient: Client,
    orderData: any,
    selectedServices: OrderService[],
    payments: any[],
    currencySymbol: string,
    totalAmount: number
) => `
  <!DOCTYPE html>
  <html>
    <head>
      <title>Receipt</title>
      <style>
        @page {
          size: 57mm auto;
          margin: 8px;
        }
        body {
          width: 57mm;
          margin: 0;
          padding: 0;
          font-family: Arial, sans-serif;
        }
        .receipt {
          width: 57mm;
          padding: 8px;
          background: white;
        }
        .header {
          text-align: center;
          margin-bottom: 4mm;
        }
        .title {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 1mm;
        }
        .subtitle {
          font-size: 12px;
          font-weight: bold;
          margin-bottom: 2mm;
        }
        .text {
          font-size: 12px;
          margin: 1mm 0;
        }
        .text-small {
          font-size: 10px;
        }
        .flex {
          display: flex;
          justify-content: space-between;
        }
        .border-top {
          border-top: 1px solid #000;
          padding-top: 2mm;
          margin-top: 2mm;
        }
        .section {
          margin-bottom: 3mm;
        }
        .section-title {
          font-weight: bold;
          margin-bottom: 1mm;
        }
        .item-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 1mm;
        }
        .item-details {
          flex: 1;
        }
        .item-quantity {
          font-size: 10px;
          color: #666;
        }
        .payment-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 1mm;
        }
        .payment-details {
          flex: 1;
        }
        .payment-date {
          font-size: 12px;
        }
        .payment-method {
          font-size: 10px;
          color: #666;
        }
        .footer {
          text-align: center;
          margin-top: 6mm;
        }
      </style>
    </head>
    <body>
      <div class="receipt">
        <div class="header">
          <div class="title">${organizationName}</div>
          ${organizationAddress ? `<div class="text">${organizationAddress}</div>` : ''}
          <div class="subtitle">SERVICE RECEIPT</div>
        </div>
        
        <div class="section">
          <div class="section-title">Order For:</div>
          <div class="text">${selectedClient.name}</div>
          ${selectedClient.phone ? `<div class="text">${selectedClient.phone}</div>` : ''}
        </div>

        <div class="section">
          <div class="section-title">Order Date:</div>
          <div class="text">${format(new Date(orderData.created_at), 'dd/MM/yyyy HH:mm')}</div>
        </div>

        <div class="section">
          <div class="section-title">Order Number:</div>
          <div class="text">${orderData.order_number}</div>
        </div>

        <div class="section">
          <div class="section-title">Services:</div>
          ${selectedServices.map(({ service, quantity }) => `
            <div class="item-row">
              <div class="item-details">
                <div>${service.name}</div>
                <div class="item-quantity">x${quantity}</div>
              </div>
              <div>${currencySymbol}${service.cost.toFixed(2)}</div>
            </div>
          `).join('')}
        </div>

        <div class="border-top">
          <div class="flex">
            <div class="section-title">Total Amount:</div>
            <div class="section-title">${currencySymbol}${totalAmount.toFixed(2)}</div>
          </div>
        </div>

        ${payments.length > 0 ? `
          <div class="section">
            <div class="section-title">Payments:</div>
            ${payments.map(payment => `
              <div class="payment-row">
                <div class="payment-details">
                  <div class="payment-date">${format(new Date(payment.created_at), 'dd/MM/yyyy')}</div>
                  <div class="payment-method">${payment.payment_method.charAt(0).toUpperCase() + payment.payment_method.slice(1).replace('_', ' ')}</div>
                </div>
                <div>${currencySymbol}${payment.amount.toFixed(2)}</div>
              </div>
            `).join('')}
          </div>
        ` : ''}
        
        ${orderData.outstanding_balance > 0 ? `
          <div class="border-top">
            <div class="flex">
              <div class="section-title">Outstanding Balance:</div>
              <div class="section-title">${currencySymbol}${orderData.outstanding_balance.toFixed(2)}</div>
            </div>
          </div>
        ` : ''}

        <div class="footer">
          <div class="text">Thank you for doing business with us :)</div>
        </div>
      </div>
    </body>
  </html>
`;

export default function OrderReceipt({ orderId, onClose }: OrderReceiptProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [orderData, setOrderData] = useState<any>(null);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [selectedServices, setSelectedServices] = useState<OrderService[]>([]);
    const [selectedWorkers, setSelectedWorkers] = useState<OrderWorker[]>([]);
    const [payments, setPayments] = useState<any[]>([]);
    const { organization } = useAuthStore();
    const { addToast } = useUI();
    const { theme, getThemeStyle } = useTheme();
    const currencySymbol = organization?.currency ? CURRENCIES[organization.currency]?.symbol || organization.currency : CURRENCIES['USD'].symbol;

    useEffect(() => {
        const fetchOrderData = async () => {
            try {
                // Fetch order details
                const { data: orderData, error: orderError } = await supabase
                    .from('orders')
                    .select(`
                        *,
                        client:clients(name, phone),
                        workers:order_workers(
                            id,
                            worker_id,
                            status,
                            worker:workers(name),
                            worker_project:worker_projects(name, price)
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
                            field:client_custom_fields(title, value, type)
                        )
                    `)
                    .eq('id', orderId)
                    .single();

                if (orderError) throw orderError;

                // Fetch payments
                const { data: paymentsData, error: paymentsError } = await supabase
                    .from('payments')
                    .select('*')
                    .eq('reference_type', 'service_order')
                    .eq('reference_id', orderData.id)
                    .not('status', 'eq', 'cancelled');

                if (paymentsError) throw paymentsError;

                // Transform the data
                const client: Client = {
                    id: orderData.client_id,
                    name: orderData.client.name,
                    phone: orderData.client.phone,
                    custom_fields: orderData.custom_fields?.map((field: any) => ({
                        id: field.id,
                        title: field.field.title,
                        value: field.field.value,
                        type: field.field.type
                    }))
                };

                const services: OrderService[] = orderData.services.map((service: any) => ({
                    service: {
                        id: service.service_id,
                        name: service.service.name,
                        cost: service.cost
                    },
                    quantity: service.quantity
                }));

                const workers: OrderWorker[] = orderData.workers.map((worker: any) => ({
                    worker: {
                        id: worker.worker_id,
                        name: worker.worker.name
                    },
                    workerProject: {
                        id: worker.worker_project_id,
                        name: worker.worker_project.name,
                        price: worker.worker_project.price
                    }
                }));

                setOrderData(orderData);
                setSelectedClient(client);
                setSelectedServices(services);
                setSelectedWorkers(workers);
                setPayments(paymentsData || []);
            } catch (error) {
                console.error('Error fetching order data:', error);
                addToast({
                    type: 'error',
                    title: 'Error',
                    message: 'Failed to load order details'
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchOrderData();
    }, [orderId, addToast]);

    const totalAmount = selectedServices.reduce(
        (sum, { service }) => sum + (service.cost),
        0
    );

    const handlePrint = useCallback(() => {
        if (!selectedClient || !orderData) return;

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(
                generateReceiptHTML(
                    organization?.name || '',
                    organization?.address,
                    selectedClient,
                    orderData,
                    selectedServices,
                    payments,
                    currencySymbol,
                    totalAmount
                )
            );
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
            printWindow.close();
        }
    }, [
        organization,
        selectedClient,
        orderData,
        selectedServices,
        payments,
        currencySymbol,
        totalAmount
    ]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!orderData || !selectedClient) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500">Order not found.</p>
            </div>
        );
    }

    return (
        <div className={`rounded-lg shadow-xl max-w-[57mm] w-full mx-auto overflow-y-auto max-h-[90vh] border ${getThemeStyle(theme, 'border', 'primary')} ${getThemeStyle(theme, 'background', 'primary')}`}>
            <div className="px-4 py-6">
                <div className="flex items-center justify-between mb-4">
                    <button
                        onClick={handlePrint}
                        className={`inline-flex items-center px-3 py-1.5 border ${getThemeStyle(theme, 'border', 'primary')} rounded-md shadow-sm text-sm font-medium ${getThemeStyle(theme, 'text', 'secondary')} ${getThemeStyle(theme, 'background', 'primary')} ${getThemeStyle(theme, 'interactive', 'hover', 'background')}`}
                    >
                        <Printer className="h-4 w-4 mr-2" />
                        Print
                    </button>
                    <button
                        onClick={onClose}
                        className={`p-2 ${getThemeStyle(theme, 'text', 'muted')} ${getThemeStyle(theme, 'interactive', 'hover', 'text')} ${getThemeStyle(theme, 'interactive', 'hover', 'background')} rounded-full transition-colors duration-200`}
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="receipt-content">
                    {/* Organization Header */}
                    <div className="text-center mb-4">
                        <h1 className={`text-[18px] font-bold ${getThemeStyle(theme, 'text', 'primary')}`}>{organization?.name}</h1>
                        {organization?.address && (
                            <p className={`text-[12px] mb-2 ${getThemeStyle(theme, 'text', 'secondary')}`}>{organization.address}</p>
                        )}
                        <h2 className={`text-[12px] font-bold ${getThemeStyle(theme, 'text', 'primary')}`}>SERVICE RECEIPT</h2>
                    </div>

                    {/* Order Details */}
                    <div className="space-y-3">
                        <div>
                            <p className={`text-[12px] font-bold ${getThemeStyle(theme, 'text', 'primary')}`}>Order For:</p>
                            <div className="pl-2">
                                <p className={`text-[12px] ${getThemeStyle(theme, 'text', 'secondary')}`}>{selectedClient.name}</p>
                                {selectedClient.phone && (
                                    <p className={`text-[12px] ${getThemeStyle(theme, 'text', 'secondary')}`}>{selectedClient.phone}</p>
                                )}
                            </div>
                        </div>

                        <div>
                            <p className={`text-[12px] font-bold ${getThemeStyle(theme, 'text', 'primary')}`}>Order Date:</p>
                            <p className={`text-[12px] pl-2 ${getThemeStyle(theme, 'text', 'secondary')}`}>{format(new Date(orderData.created_at), 'dd/MM/yyyy HH:mm')}</p>
                        </div>

                        <div>
                            <p className={`text-[12px] font-bold ${getThemeStyle(theme, 'text', 'primary')}`}>Order Number:</p>
                            <p className={`text-[12px] pl-2 ${getThemeStyle(theme, 'text', 'secondary')}`}>{orderData.order_number}</p>
                        </div>

                        {/* Services */}
                        <div>
                            <p className={`text-[12px] font-bold mb-2 ${getThemeStyle(theme, 'text', 'primary')}`}>Services:</p>
                            <div className="space-y-1">
                                {selectedServices.map(({ service, quantity }) => (
                                    <div key={service.id} className="flex justify-between pl-2">
                                        <div>
                                            <p className={`text-[12px] ${getThemeStyle(theme, 'text', 'secondary')}`}>{service.name}</p>
                                            <p className={`text-[10px] ${getThemeStyle(theme, 'text', 'muted')}`}>x{quantity}</p>
                                        </div>
                                        <p className={`text-[12px] ${getThemeStyle(theme, 'text', 'secondary')}`}>
                                            {currencySymbol} {service.cost.toFixed(2)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Total Amount */}
                        <div className={`border-t ${getThemeStyle(theme, 'border', 'primary')} pt-2`}>
                            <div className="flex justify-between">
                                <p className={`text-[12px] font-bold ${getThemeStyle(theme, 'text', 'primary')}`}>Total Amount:</p>
                                <p className={`text-[12px] font-bold ${getThemeStyle(theme, 'text', 'primary')}`}>
                                    {currencySymbol} {totalAmount.toFixed(2)}
                                </p>
                            </div>
                            
                            {/* Payments - Only show if there are payments */}
                            {payments.length > 0 && (
                                <div className="mt-2">
                                    <p className={`text-[12px] font-bold ${getThemeStyle(theme, 'text', 'primary')}`}>Payments:</p>
                                    <div className="space-y-1">
                                        {payments.map((payment) => (
                                            <div key={payment.id} className="flex justify-between pl-2">
                                                <div>
                                                    <p className={`text-[12px] ${getThemeStyle(theme, 'text', 'secondary')}`}>{format(new Date(payment.created_at), 'dd/MM/yyyy')}</p>
                                                    <p className={`text-[10px] ${getThemeStyle(theme, 'text', 'muted')}`}>
                                                        {payment.payment_method.charAt(0).toUpperCase() + payment.payment_method.slice(1).replace('_', ' ')}
                                                    </p>
                                                </div>
                                                <p className={`text-[12px] ${getThemeStyle(theme, 'text', 'secondary')}`}>
                                                    {currencySymbol} {payment.amount.toFixed(2)}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            {/* Outstanding Balance - Only show if greater than 0 */}
                            {orderData.outstanding_balance > 0 && (
                                <div className={`flex justify-between border-t ${getThemeStyle(theme, 'border', 'primary')} pt-1 mt-2`}>
                                    <p className={`text-[12px] font-bold ${getThemeStyle(theme, 'text', 'primary')}`}>Outstanding Bal:</p>
                                    <p className={`text-[12px] font-bold ${getThemeStyle(theme, 'text', 'primary')}`}>
                                        {currencySymbol} {orderData.outstanding_balance.toFixed(2)}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-6 text-center">
                        <p className={`text-[12px] ${getThemeStyle(theme, 'text', 'secondary')}`}>Thank you for doing business with us :)</p>
                    </div>
                </div>
            </div>
        </div>
    );
} 