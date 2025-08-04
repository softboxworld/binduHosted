import React from 'react';
import { ResponsiveBar, BarDatum } from '@nivo/bar';

interface DailyRevenue extends BarDatum {
  date: string;
  total: number;
  sales: number;
  service: number;
  [key: string]: string | number; // Add index signature for BarDatum compatibility
}

interface RevenueChartProps {
  data: DailyRevenue[];
  currencySymbol: string;
  screenWidth: number;
}

const formatNumber = (num: number) => {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

export default function RevenueChart({ data, currencySymbol, screenWidth }: RevenueChartProps) {
  return (
    <div className="h-[300px] sm:h-[400px] lg:h-[500px] w-full">
      <ResponsiveBar
        data={data}
        keys={['total', 'sales', 'service']}
        indexBy="date"
        margin={{ top: 10, right: 20, left: 80, bottom: 80 }}
        padding={0.3}
        groupMode="grouped"
        valueScale={{ type: 'linear' }}
        indexScale={{ type: 'band', round: true }}
        colors={['#8B5CF6', '#10B981', '#3B82F6']}
        borderRadius={6}
        borderWidth={0}
        borderColor={{
          from: 'color',
          modifiers: [['darker', 1.6]]
        }}
        axisTop={null}
        axisRight={null}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: -45,
          format: (value) => {
            const d = new Date(value);
            return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear().toString().slice(-2)}`;
          }
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          format: value => `${currencySymbol}${formatNumber(value as number)}`
        }}
        enableGridY={false}
        enableGridX={false}
        enableLabel={false}
        theme={{
          background: 'transparent',
          axis: {
            ticks: {
              text: {
                fontSize: 12,
                fill: '#6B7280'
              }
            }
          }
        }}
        legends={[
          {
            dataFrom: 'keys',
            anchor: 'bottom',
            direction: 'row',
            justify: false,
            translateX: 0,
            translateY: 70,
            itemsSpacing: 2,
            itemWidth: 100,
            itemHeight: 20,
            itemDirection: 'left-to-right',
            itemOpacity: 0.85,
            symbolSize: 10,
            effects: [
              {
                on: 'hover',
                style: {
                  itemOpacity: 1
                }
              }
            ]
          }
        ]}
        tooltip={({ id, value, color }) => (
          <div
            style={{
              padding: '4px 8px',
              background: 'white',
              border: '1px solid #000',
              borderRadius: '0.375rem',
              color: '#374151',
              fontSize: '11px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}
          >
            <strong style={{ color }}>{id}</strong>
            <br />
            {`${currencySymbol}${formatNumber(value)}`}
          </div>
        )}
      />
    </div>
  );
} 