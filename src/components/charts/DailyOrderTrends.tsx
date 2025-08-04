import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DailyOrderStats {
  date: string;
  orders: number;
}

interface DailyOrderTrendsProps {
  data: DailyOrderStats[];
}

export default function DailyOrderTrends({ data }: DailyOrderTrendsProps) {
  return (
    <div className="lg:border-l lg:border-gray-200 lg:pl-6">
      <h4 className="text-sm font-medium text-gray-900 mb-2">Daily Order Trends (30 Days)</h4>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              tickFormatter={(date) => new Date(date).getDate().toString()}
              tick={{ fontSize: 10 }}
              interval={4}
            />
            <YAxis 
              tick={{ fontSize: 10 }}
              width={30}
            />
            <Tooltip 
              formatter={(value) => [value, 'Orders']}
              labelFormatter={(date) => new Date(date).toLocaleDateString()}
              contentStyle={{ 
                backgroundColor: 'white', 
                border: '1px solid #e5e7eb', 
                borderRadius: '0.5rem',
                fontSize: '12px',
                padding: '4px 8px'
              }}
            />
            <Line 
              type="monotone" 
              dataKey="orders" 
              stroke="#3B82F6" 
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
} 