import React, { useEffect, useState } from 'react';
import { ResponsivePie } from '@nivo/pie';
import { ResponsiveLine } from '@nivo/line';
import { ORDER_STATUS_LABELS } from '../../utils/constants';
import { ArrowRight } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface OrderStatusData {
  name: string;
  value: number;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
}

interface DailyOrderStats {
  date: string;
  orders: number;
}

// Add interface for the line chart data point
interface LineDataPoint {
  x: string;
  y: number;
  fullDate: string;
}

interface OrderStatsProps {
  monthlyOrderData: OrderStatusData[];
  dailyOrderStats: DailyOrderStats[];
}

// Updated colors to be more solid and 2D looking
const COLORS = ['#F4C430', '#3498DB', '#2ECC71', '#E74C3C'];

export const OrderStats: React.FC<OrderStatsProps> = ({ 
  monthlyOrderData, 
  dailyOrderStats 
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Transform data for Nivo pie chart
  const totalOrders = monthlyOrderData.reduce((sum, item) => sum + item.value, 0);
  const pieData = monthlyOrderData.map(item => ({
    id: item.name,
    label: item.name,
    value: Math.round((item.value / totalOrders) * 100),
    color: COLORS[monthlyOrderData.indexOf(item)]
  }));

  // Get the last 30 days of data
  const lastThirtyDays = dailyOrderStats.slice(-30);

  // For mobile, show fewer data points
  const filteredDays = windowWidth < 640 
    ? lastThirtyDays.filter((_, i) => i % 3 === 0 || i === lastThirtyDays.length - 1)
    : lastThirtyDays;

  // Transform data for Nivo line chart with proper date formatting
  const lineData = [{
    id: 'Orders',
    color: '#60A5FA',
    data: filteredDays.map(item => ({
      x: new Date(item.date).getDate().toString(),
      y: item.orders
    }))
  }];

  // Create a map of x values to full dates for tooltip
  const dateMap = new Map(
    filteredDays.map(item => [
      new Date(item.date).getDate().toString(),
      item.date
    ])
  );

  const currentMonthOrders = lastThirtyDays.reduce((sum, item) => sum + item.orders, 0);

  // Responsive settings based on screen size
  const isMobile = windowWidth < 640;
  const isTablet = windowWidth >= 640 && windowWidth < 1024;
  
  // Adjust margins based on screen size
  const pieMargins = isMobile 
    ? { top: 5, right: 5, bottom: 30, left: 5 } 
    : { top: 10, right: 10, bottom: 40, left: 10 };
    
  const lineMargins = isMobile
    ? { top: 10, right: 10, left: 30, bottom: 40 }
    : isTablet
      ? { top: 15, right: 15, left: 35, bottom: 50 }
      : { top: 20, right: 20, left: 40, bottom: 60 };

  return (
    <div className={`w-full overflow-hidden ${isDark ? 'text-white' : 'text-gray-900'}`}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-5 lg:gap-8">
        <div className={`rounded-lg overflow-hidden ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border shadow-sm hover:shadow-md transition-shadow`}>
          <div className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4 lg:mb-6">
              <div className="min-w-0 flex-1">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold mb-0.5 sm:mb-1 truncate">
                  {String(totalOrders)}
                </h2>
                <p className={`text-xs lg:text-sm truncate ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Total Orders for {new Date().toLocaleString('default', { month: 'long' })}
                </p>
              </div>
            </div>
            <div className={`h-[200px] xs:h-[220px] sm:h-[250px] lg:h-[300px] w-full overflow-hidden`}
            style={{ 
              background: theme === 'dark' 
                ? 'linear-gradient(to bottom, #1f2937, #111827)' 
                : 'linear-gradient(to bottom, white,#efeff1)',
              borderRadius: '0.5rem',
              padding: '1rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}
            >
              <ResponsivePie
                data={pieData}
                margin={pieMargins}
                innerRadius={isMobile ? 0.6 : 0.65}
                padAngle={0.5}
                cornerRadius={1}
                colors={d => d.data.color}
                borderWidth={0}
                enableArcLinkLabels={false}
                arcLabelsSkipAngle={isMobile ? 15 : 10}
                arcLabelsTextColor="#ffffff"
                arcLabel={d => isMobile && d.value < 10 ? '' : `${d.value}%`}
                legends={[
                  {
                    anchor: 'bottom',
                    direction: 'row',
                    justify: false,
                    translateY: isMobile ? 20 : 30,
                    itemsSpacing: 2,
                    itemWidth: isMobile ? 70 : 80,
                    itemHeight: isMobile ? 18 : 20,
                    itemTextColor: isDark ? '#e5e7eb' : '#6B7280',
                    itemDirection: 'left-to-right',
                    itemOpacity: 1,
                    symbolSize: isMobile ? 8 : 10,
                    symbolShape: 'circle',
                  }
                ]}
                theme={{
                  labels: {
                    text: {
                      fontSize: isMobile ? 10 : 12,
                      fontWeight: 'bold',
                    }
                  },
                  legends: {
                    text: {
                      fontSize: isMobile ? 8 : 10,
                    }
                  },
                  tooltip: {
                    container: {
                      background: isDark ? '#374151' : '#ffffff',
                      color: isDark ? '#e5e7eb' : '#1f2937',
                      fontSize: 12,
                      borderRadius: 6,
                      boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
                      padding: '8px 12px',
                    }
                  },
                  axis: {
                    ticks: {
                      text: {
                        fill: isDark ? '#9ca3af' : '#6B7280',
                      }
                    },
                    legend: {
                      text: {
                        fill: isDark ? '#9ca3af' : '#6B7280',
                      }
                    }
                  }
                }}
              />
            </div>
            
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {monthlyOrderData.map((status, index) => (
                <div 
                  key={status.name} 
                  className={`rounded p-2 text-center ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}
                >
                  <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'} truncate`}>
                    {status.name}
                  </p>
                  <p className="font-medium mt-1" style={{ color: COLORS[index] }}>
                    {status.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className={`rounded-lg overflow-hidden ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border shadow-sm hover:shadow-md transition-shadow`}>
          <div className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4 lg:mb-6">
              <div className="min-w-0 flex-1">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold mb-0.5 sm:mb-1 truncate">
                  {String(currentMonthOrders)}
                </h2>
                <p className={`text-xs lg:text-sm truncate ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Orders Over The Past Month
                </p>
              </div>
            </div>
            <div className={`h-[200px] xs:h-[220px] sm:h-[250px] lg:h-[300px] w-full overflow-hidden`}
            style={{ 
              background: theme === 'dark' 
                ? 'linear-gradient(to bottom, #1f2937, #111827)' 
                : 'linear-gradient(to bottom, white, #efeff1)'
            }} >
              <ResponsiveLine
                data={lineData}
                margin={lineMargins}
                xScale={{
                  type: 'point'
                }}
                yScale={{
                  type: 'linear',
                  min: 0,
                  max: 'auto',
                  stacked: false,
                }}
                curve="monotoneX"
                enableSlices="x"
                crosshairType="x"
                axisLeft={{
                  tickSize: 0,
                  tickPadding: isMobile ? 5 : 10,
                  tickRotation: 0,
                  format: value => String(value),
                  legend: isMobile ? '' : 'Number of Orders',
                  legendOffset: -35,
                  legendPosition: 'middle'
                }}
                axisBottom={{
                  tickSize: 0,
                  tickPadding: isMobile ? 8 : 15,
                  tickRotation: isMobile ? -30 : -45,
                  format: value => String(value),
                  legend: isMobile ? '' : 'Day of Month',
                  legendOffset: isMobile ? 30 : 45,
                  legendPosition: 'middle'
                }}
                enableGridX={false}
                enableGridY={true}
                pointSize={isMobile ? 3 : 4}
                pointColor={theme === 'dark' ? '#60A5FA' : '#3b82f6'}
                pointBorderWidth={0}
                enableArea={true}
                areaOpacity={0.1}
                areaBaselineValue={0}
                lineWidth={isMobile ? 1.5 : 2}
                useMesh={true}
                colors={[theme === 'dark' ? '#60A5FA' : '#3b82f6']}
                theme={{
                  grid: {
                    line: {
                      stroke: theme === 'dark' ? '#374151' : '#f0f0f0',
                      strokeWidth: 1,
                    }
                  },
                  axis: {
                    legend: {
                      text: {
                        fontSize: isMobile ? 7 : 8,
                        fill: theme === 'dark' ? '#9ca3af' : '#6B7280',
                      }
                    },
                    ticks: {
                      text: {
                        fontSize: isMobile ? 7 : 8,
                        fill: theme === 'dark' ? '#9ca3af' : '#6B7280',
                      }
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
                tooltip={({ point }) => {
                  const fullDate = dateMap.get(point.data.x.toString());
                  return (
                    <div
                      style={{
                        background: theme === 'dark' ? '#374151' : 'white',
                        padding: isMobile ? '6px 10px' : '8px 12px',
                        border: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`,
                        borderRadius: '6px',
                        fontSize: isMobile ? '10px' : '12px',
                        boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
                        color: theme === 'dark' ? '#e5e7eb' : 'inherit'
                      }}
                    >
                      <strong>{String(point.data.y)}</strong> orders
                      <br />
                      <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                        {fullDate ? new Date(fullDate).toLocaleDateString() : `Day ${point.data.x}`}
                      </span>
                    </div>
                  );
                }}
              />
            </div>
            
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className={`rounded p-2 text-center ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
                <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Daily Avg</p>
                <p className={`font-medium mt-1 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                  {(currentMonthOrders / lastThirtyDays.length).toFixed(1)}
                </p>
              </div>
              <div className={`rounded p-2 text-center ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
                <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Weekly Avg</p>
                <p className={`font-medium mt-1 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                  {(currentMonthOrders / 4).toFixed(1)}
                </p>
              </div>
              <div className={`rounded p-2 text-center ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
                <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Highest</p>
                <p className={`font-medium mt-1 ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                  {Math.max(...lastThirtyDays.map(day => day.orders))}
                </p>
              </div>
              <div className={`rounded p-2 text-center ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
                <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Lowest</p>
                <p className={`font-medium mt-1 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}>
                  {Math.min(...lastThirtyDays.map(day => day.orders))}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 