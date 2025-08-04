import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ORDER_STATUS_COLORS } from '../../utils/constants';

interface OrderStatusData {
  name: string;
  value: number;
  status: string;
}

interface OrderStatusChartProps {
  data: OrderStatusData[];
}

export default function OrderStatusChart({ data }: OrderStatusChartProps) {
  // Convert Tailwind color classes to hex colors
  const getColorFromStatus = (status: string) => {
    const colorClass = ORDER_STATUS_COLORS[status as keyof typeof ORDER_STATUS_COLORS]?.bg || 'bg-gray-100';
    // Map Tailwind color classes to hex colors
    const colorMap: Record<string, string> = {
      'bg-yellow-100': '#fef9c3',
      'bg-blue-100': '#dbeafe',
      'bg-green-100': '#dcfce7',
      'bg-red-100': '#fee2e2',
      'bg-gray-100': '#f3f4f6'
    };
    return colorMap[colorClass] || '#f3f4f6';
  };

  return (
    <div>
      <h4 className="text-sm font-medium text-gray-900 mb-2">Order Status Distribution</h4>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={130}
              innerRadius={70}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColorFromStatus(entry.status)} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
} 