import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useUI } from '../../context/UIContext';
import { useAuthStore } from '../../stores/authStore';
import { PAYMENT_METHODS } from '../../utils/inventory-constants';
import { PaymentMethod } from '../../types/inventory';
import { CreditCard, X } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface OrderData {
    order_number: string;
    outstanding_balance: number;
    client: {
        name: string;
    };
}

export interface RecordPaymentProps {
    orderId: string;
    orderNumber?: string;
    clientName?: string;
    outstandingBalance?: number;
    onPaymentRecorded: () => void;
    isOpen?: boolean;
    onClose?: () => void;
    currencySymbol?: string;
    orderType?: 'service_order' | 'sales_order';
}

export const RecordPayment = ({
    orderId,
    orderNumber: initialOrderNumber,
    clientName: initialClientName,
    outstandingBalance: initialOutstandingBalance,
    onPaymentRecorded,
    isOpen: externalIsOpen,
    onClose: externalOnClose,
    currencySymbol = '₵',
    orderType = 'service_order'
}: RecordPaymentProps) => {
    const { addToast } = useUI();
    const { organization } = useAuthStore();
    const { theme, getThemeStyle } = useTheme();
    
    const [orderDetails, setOrderDetails] = useState({
        orderNumber: initialOrderNumber || '',
        clientName: initialClientName || '',
        outstandingBalance: initialOutstandingBalance || 0
    });
    const [amount, setAmount] = useState<string>('');
    const [paymentMethod, setPaymentMethod] = useState<string>('');
    const [paymentReference, setPaymentReference] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(!initialOrderNumber || !initialClientName || !initialOutstandingBalance);
    const [amountError, setAmountError] = useState<string>('');

    useEffect(() => {
        const fetchOrderDetails = async () => {
            if (initialOrderNumber && initialClientName && initialOutstandingBalance !== undefined) {
                return;
            }
            console.log(initialOrderNumber, initialClientName, initialOutstandingBalance);

            try {
                const table = orderType === 'service_order' ? 'orders' : 'sales_orders';
                const { data, error } = await supabase
                    .from(table)
                    .select(`
                        order_number,
                        outstanding_balance,
                        client:clients!inner(
                            name
                        )
                    `)
                    .eq('id', orderId)
                    .single();

                if (error) throw error;

                setOrderDetails({
                    orderNumber: data.order_number,
                    clientName: data.client.name,
                    outstandingBalance: data.outstanding_balance
                });
            } catch (error: any) {
                console.error('Error fetching order details:', error);
                addToast({
                    type: 'error',
                    title: 'Error',
                    message: 'Failed to load order details'
                });
            } finally {
                setIsLoading(false);
            }
        };

        if (isLoading) {
            fetchOrderDetails();
        }
    }, [orderId, initialOrderNumber, initialClientName, initialOutstandingBalance, orderType, addToast, isLoading]);

    const validateAmount = (value: string) => {
        const numericAmount = parseFloat(value);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            setAmountError('Please enter a valid payment amount');
            return false;
        }
        if (numericAmount > orderDetails.outstandingBalance) {
            setAmountError(`Amount cannot exceed outstanding balance of ${currencySymbol}${orderDetails.outstandingBalance.toFixed(2)}`);
            return false;
        }
        setAmountError('');
        return true;
    };

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setAmount(value);
        validateAmount(value);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!amount || !paymentMethod) {
            addToast({
                type: 'error',
                title: 'Error',
                message: 'Please fill in all required fields'
            });
            return;
        }

        setIsSubmitting(true);

        try {
            const { data: { user }, error: userError } = await supabase.auth.getUser();

            if (userError) throw userError;
            if (!user) throw new Error('User not authenticated');

            const { error } = await supabase.rpc('record_payment', {
                p_organization_id: organization?.id,
                p_order_id: orderId,
                p_amount: parseFloat(amount),
                p_payment_method: paymentMethod as PaymentMethod,
                p_payment_reference: paymentReference || null,
                p_recorded_by: user.id
            });

            if (error) throw error;

            addToast({
                type: 'success',
                title: 'Success',
                message: 'Payment recorded successfully'
            });

            setAmount('');
            setPaymentMethod('');
            setPaymentReference('');

            if (externalOnClose) {
                externalOnClose();
            }

            onPaymentRecorded();
        } catch (error: any) {
            addToast({
                type: 'error',
                title: 'Error',
                message: error.message || 'Failed to record payment'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!externalIsOpen) return null;

    if (isLoading) {
        return (
            <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50">
                <div className="flex items-center justify-center min-h-screen px-4">
                    <div className={`${getThemeStyle(theme, 'modal', 'background')} rounded-lg shadow-xl w-full max-w-md p-6`}>
                        <div className="flex justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50">
            <div className="flex items-center justify-center min-h-screen px-4">
                <div className={`${getThemeStyle(theme, 'modal', 'background')} rounded-lg shadow-xl w-full max-w-md`}>
                    <div className={`flex items-center justify-between px-6 py-4 border-b ${getThemeStyle(theme, 'border', 'primary')}`}>
                        <div className="flex items-center">
                            <CreditCard className={`h-6 w-6 mr-3 ${getThemeStyle(theme, 'text', 'accent')}`} />
                            <h3 className={`text-lg font-medium ${getThemeStyle(theme, 'text', 'primary')}`}>Record Payment</h3>
                        </div>
                        <button onClick={externalOnClose} className={`${getThemeStyle(theme, 'text', 'secondary')} hover:${getThemeStyle(theme, 'interactive', 'hover', 'text')}`}>
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className={`${getThemeStyle(theme, 'background', 'secondary')} p-4 mx-4 mt-2 rounded-lg`}>
                        <div className="flex justify-between items-center mb-2">
                            <span className={`text-sm ${getThemeStyle(theme, 'text', 'secondary')} font-medium`}>Order Number</span>
                            <span className={`text-sm font-medium ${getThemeStyle(theme, 'text', 'primary')}`}>{orderDetails.orderNumber}</span>
                        </div>
                        <div className="flex justify-between items-center mb-2">
                            <span className={`text-sm ${getThemeStyle(theme, 'text', 'secondary')} font-medium`}>Client</span>
                            <span className={`text-sm font-medium ${getThemeStyle(theme, 'text', 'primary')}`}>{orderDetails.clientName}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className={`text-sm text-red-600 font-medium`}>Outstanding Balance</span>
                            <span className={`text-sm font-medium text-red-600`}>{currencySymbol} {orderDetails.outstandingBalance.toFixed(2)}</span>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        <div>
                            <label className={`block text-sm font-medium ${getThemeStyle(theme, 'text', 'primary')} mb-1`}>
                                Amount*
                            </label>
                            <div className="relative rounded-md">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <span className={getThemeStyle(theme, 'text', 'secondary')}>{currencySymbol}</span>
                                </div>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={amount}
                                    onChange={handleAmountChange}
                                    className={`block w-full pl-7 pr-12 sm:text-sm ${getThemeStyle(theme, 'background', 'secondary')}   ${getThemeStyle(theme, 'border', 'primary')} rounded-md h-[35px] shadow-md ${amountError ? 'border-red-500' : ''}`}
                                    placeholder="0.00"
                                    required
                                />
                            </div>
                            {amountError && (
                                <p className="mt-1 text-sm text-red-600">{amountError}</p>
                            )}
                        </div>

                        <div>
                            <label className={`block text-sm font-medium ${getThemeStyle(theme, 'text', 'primary')} mb-1`}>
                                Payment Method*
                            </label>
                            <select
                                value={paymentMethod}
                                onChange={(e) => setPaymentMethod(e.target.value)}
                                className={`block w-full px-3 py-2 text-base ${getThemeStyle(theme, 'background', 'secondary')} ${getThemeStyle(theme, 'border', 'primary')} focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md`}
                                required
                            >
                                <option value="">Select a payment method</option>
                                {Object.entries(PAYMENT_METHODS).map(([value, label]) => (
                                    <option key={value} value={value}>{label}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className={`block text-sm font-medium ${getThemeStyle(theme, 'text', 'primary')} mb-1`}>
                                Payment Reference
                            </label>
                            <input
                                type="text"
                                value={paymentReference}
                                onChange={(e) => setPaymentReference(e.target.value)}
                                className={`block w-full sm:text-sm ${getThemeStyle(theme, 'background', 'secondary')} ${getThemeStyle(theme, 'border', 'primary')} rounded-md h-[35px] shadow-md pl-2`}
                                placeholder="e.g., Check number, Transaction ID"
                            />
                        </div>

                        <div className="mt-6 flex justify-end space-x-3">
                            <button
                                type="button"
                                onClick={externalOnClose}
                                className={`px-4 py-2 text-sm font-medium ${getThemeStyle(theme, 'text', 'primary')} hover:${getThemeStyle(theme, 'interactive', 'hover', 'background')} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded-md`}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting || !!amountError || !amount || !paymentMethod}
                                className={`px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded-md disabled:opacity-50`}
                            >
                                Record Payment
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}; 