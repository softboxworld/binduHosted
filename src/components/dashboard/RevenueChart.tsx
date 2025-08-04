import React from 'react';
import { ResponsiveLine } from '@nivo/line';
import { useTheme } from '../../context/ThemeContext';

interface DailyRevenue {
  date: string;
  total: number;
  sales: number;
  service: number;
}

interface RevenueChartProps {
  dailyRevenue: DailyRevenue[];
  isLoading: boolean;
  currencySymbol: string;
  screenWidth: number;
}

const formatNumber = (num: number) => {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

export const RevenueChart: React.FC<RevenueChartProps> = ({ 
  dailyRevenue, 
  isLoading, 
  currencySymbol,
  screenWidth 
}) => {
  const { theme, getThemeStyle } = useTheme();

  // Determine if we're on a mobile screen
  const isMobile = screenWidth < 640;

  if (isLoading) {
    return (
      <div className={`${getThemeStyle(theme, 'background', 'primary')} rounded-lg shadow-sm animate-pulse`}>
        <div className="px-4 py-4">
          <div className={`h-4 ${getThemeStyle(theme, 'background', 'accent')} rounded w-1/4 mb-4`}></div>
          <div className={`h-[250px] ${getThemeStyle(theme, 'background', 'accent')} rounded`}></div>
        </div>
      </div>
    );
  }

  // Transform data for Nivo format
  const transformedData = [
    {
      id: 'Total Revenue',
      color: '#8B5CF6',
      data: dailyRevenue.map(item => ({
        x: new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' }),
        y: item.total
      }))
    },
    {
      id: 'Sales Orders',
      color: '#3B82F6',
      data: dailyRevenue.map(item => ({
        x: new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' }),
        y: item.sales
      }))
    },
    {
      id: 'Service Orders',
      color: '#10B981',
      data: dailyRevenue.map(item => ({
        x: new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' }),
        y: item.service
      }))
    }
  ];

  // Adjust margins based on screen size
  const chartMargins = isMobile
    ? { top: 20, right: 20, left: 60, bottom: 60 }
    : { top: 30, right: 40, left: 80, bottom: 60 };

  return (
    <div className="w-full px-2 sm:px-6">
      <div className="w-full">
        <h3 className={`text-lg font-medium ${getThemeStyle(theme, 'text', 'primary')} mb-2`}>
          Revenue for {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
        </h3>
        <div className="h-[350px] w-full" style={{ 
          background: theme === 'dark' 
            ? 'linear-gradient(to bottom,rgb(22, 31, 44), #111827)' 
            : 'linear-gradient(to bottom, white, #efeff1)',
          borderRadius: '0.5rem',
          padding: '1rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <ResponsiveLine
            data={transformedData}
            margin={chartMargins}
            xScale={{
              type: 'point'
            }}
            yScale={{
              type: 'linear',
              min: 0,
              max: 'auto',
              stacked: false,
              reverse: false
            }}
            curve="monotoneX"
            axisLeft={{
              tickSize: 0,
              tickPadding: 10,
              format: value => `${currencySymbol}${formatNumber(value as number)}`,
              tickRotation: 0,
            }}
            axisBottom={{
              tickSize: 0,
              tickPadding: 10,
              tickRotation: -45,
              // Show every 4th tick on mobile screens
              tickValues: isMobile 
                ? dailyRevenue
                    .filter((_, index) => index % 4 === 0)
                    .map(item => new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' }))
                : undefined
            }}
            enableGridX={false}
            enableGridY={true}
            pointSize={0}
            pointColor={{ theme: 'background' }}
            pointBorderWidth={2}
            pointBorderColor={{ from: 'serieColor' }}
            pointLabelYOffset={-12}
            enableArea={true}
            areaOpacity={0.1}
            useMesh={true}
            enableSlices="x"
            crosshairType="x"
            colors={{ datum: 'color' }}
            theme={{
              grid: {
                line: {
                  stroke: theme === 'dark' ? '#374151' : '#f0f0f0',
                  strokeWidth: 1,
                }
              },
              axis: {
                ticks: {
                  text: {
                    fontSize: isMobile ? 9 : 10,
                    fill: theme === 'dark' ? '#9CA3AF' : '#6B7280',
                  }
                }
              },
              crosshair: {
                line: {
                  stroke: theme === 'dark' ? '#9CA3AF' : '#6B7280',
                  strokeWidth: 1,
                  strokeOpacity: 0.5,
                }
              },
              tooltip: {
                container: {
                  background: theme === 'dark' ? '#374151' : '#ffffff',
                  color: theme === 'dark' ? '#e5e7eb' : '#1f2937',
                  fontSize: 12,
                  borderRadius: 6,
                  boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
                  padding: '8px 12px',
                }
              }
            }}
            lineWidth={2}
            enablePoints={false}
          />
        </div>
      </div>
    </div>
  );
}; 