import React from 'react';
import { ShoppingCart, DollarSign, Package, CheckCircle, Clock, CreditCard, TrendingUp, TrendingDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CURRENCIES } from '../../utils/constants';
import { useTheme } from '../../context/ThemeContext';

interface StatCard {
  name: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  link?: string;
  key: string;
  breakdown?: {
    sales: number;
    service: number;
  };
}

interface StatCardsProps {
  stats: {
    activeOrders: number;
    revenueToday: number;
    outstandingAmount: number;
    currentMonthRevenue: number;
    ordersToday: number;
    salesToday: number;
    outstandingSales?: number;
    outstandingOrders?: number;
    completedOrdersToday: number;
    completedTasksToday: number;
    ordersDueToday: number;
  };
  loadedStats: string[];
  currencySymbol: string;
}

const formatNumber = (num: number) => {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

export const StatCards: React.FC<StatCardsProps> = ({ stats, loadedStats, currencySymbol }) => {
  const { theme, getThemeStyle } = useTheme();

  const getColorClasses = (color: string) => {
    const colorMap: { [key: string]: { border: string; text: string; bg: string } } = {
      indigo: {
        border: 'border-indigo-600',
        text: 'text-indigo-600',
        bg: 'bg-indigo-100'
      },
      blue: {
        border: 'border-blue-600',
        text: 'text-blue-600',
        bg: 'bg-blue-100'
      },
      emerald: {
        border: 'border-emerald-600',
        text: 'text-emerald-600',
        bg: 'bg-emerald-100'
      },
      amber: {
        border: 'border-amber-600',
        text: 'text-amber-600',
        bg: 'bg-amber-100'
      },
      teal: {
        border: 'border-teal-600',
        text: 'text-teal-600',
        bg: 'bg-teal-100'
      },
      purple: {
        border: 'border-purple-600',
        text: 'text-purple-600',
        bg: 'bg-purple-100'
      },
      rose: {
        border: 'border-rose-600',
        text: 'text-rose-600',
        bg: 'bg-rose-100'
      },
      cyan: {
        border: 'border-cyan-600',
        text: 'text-cyan-600',
        bg: 'bg-cyan-100'
      },
      red: {
        border: 'border-red-600',
        text: 'text-red-600',
        bg: 'bg-red-100'
      }
    };
    return colorMap[color] || colorMap.indigo;
  };

  const colorVariants = {
    primary: 'indigo',
    blue: 'blue',
    emerald: 'emerald',
    amber: 'amber',
    teal: 'teal',
    purple: 'purple',
    rose: 'rose',
    cyan: 'cyan',
    red: 'red'
  };

  const mainRevenueCard = {
    name: 'Revenue Today',
    value: stats.revenueToday,
    icon: DollarSign,
    color: colorVariants.primary,
    key: 'revenueToday',
    link: '/dashboard/finances'
  };

  const compactStatCards: StatCard[] = [
    {
      name: 'Active Orders',
      value: stats.activeOrders,
      icon: ShoppingCart,
      color: colorVariants.blue,
      link: undefined,
      key: 'activeOrders'
    },
    {
      name: 'Orders Today',
      value: stats.ordersToday,
      icon: ShoppingCart,
      color: colorVariants.emerald,
      link: undefined,
      key: 'ordersToday'
    },
    {
      name: 'Orders Due Today',
      value: stats.ordersDueToday,
      icon: Clock,
      color: colorVariants.amber,
      link: undefined,
      key: 'ordersDueToday'
    },
    {
      name: 'Completed Orders',
      value: stats.completedOrdersToday,
      icon: CheckCircle,
      color: colorVariants.teal,
      link: undefined,
      key: 'completedOrdersToday'
    },
    {
      name: 'Tasks Done',
      value: stats.completedTasksToday,
      icon: CheckCircle,
      color: colorVariants.purple,
      link: undefined,
      key: 'completedTasksToday'
    },
    {
      name: 'Sales Today',
      value: stats.salesToday,
      icon: Package,
      color: colorVariants.rose,
      link: undefined,
      key: 'salesToday'
    },
    {
      name: `Revenue for ${new Date().toLocaleString('default', { month: 'long' })}`,
      value: `${currencySymbol}${formatNumber(stats.currentMonthRevenue)}`,
      icon: DollarSign,
      color: colorVariants.cyan,
      link: undefined,
      key: 'currentMonthRevenue'
    },
    {
      name: 'Outstanding',
      value: `${currencySymbol}${formatNumber(stats.outstandingAmount)}`,
      icon: DollarSign,
      color: colorVariants.red,
      link: undefined,
      key: 'outstandingAmount'
    }
  ];

  const isMainRevenueLoaded = loadedStats.includes('revenueToday');
  const mainRevenueColors = getColorClasses(mainRevenueCard.color);

  return (
    <div className="space-y-4 w-full flex-shrink-0">
      {/* Large Revenue Today Display */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <mainRevenueCard.icon className={`h-4 w-4 ${mainRevenueColors.text}`} />
          <p className={`text-xs font-medium ${getThemeStyle(theme, 'text', 'primary')} truncate`}>{mainRevenueCard.name}</p>
        </div>
        <div className="mt-1">
          {isMainRevenueLoaded ? (
            <p className={`text-4xl font-semibold ${getThemeStyle(theme, 'text', 'primary')} truncate`}>
              {currencySymbol}{formatNumber(mainRevenueCard.value)}
            </p>
          ) : (
            <div className={`h-8 ${getThemeStyle(theme, 'background', 'accent')} rounded w-1/3 animate-pulse`}></div>
          )}
        </div>
      </div>

      {/* Grid Stats Layout */}
      <div className="grid grid-cols-1 gap-3">
        {compactStatCards.map((stat) => {
          const isLoaded = loadedStats.includes(stat.key);
          const colors = getColorClasses(stat.color);
          const content = (
            <div className={`rounded-md p-3 py-5 transition-all duration-200 hover:shadow-md border-l-4 ${colors.border} ${
              isLoaded ? 'opacity-100' : 'opacity-50'
            } bg-gradient-to-br from-${theme === 'dark' ? 'gray-800' : 'white'} to-${theme === 'dark' ? 'gray-900' : 'gray-100'} shadow-sm`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className={`rounded-md flex-shrink-0`}>
                    <stat.icon className={`h-4 w-4 ${colors.text}`} />
                  </div>
                  <p className={`text-xs font-medium ${getThemeStyle(theme, 'text', 'tertiary')} truncate`}>
                    {stat.name}
                  </p>
                </div>
                <p className={`text-xs font-semibold ${getThemeStyle(theme, 'text', 'primary')} ml-2 flex-shrink-0 whitespace-nowrap`}>
                  {stat.value}
                </p>



              </div>
              {stat.breakdown && (
                <div className={`mt-2 text-xs ${getThemeStyle(theme, 'text', 'muted')} flex items-center gap-2`}>
                  <span className="truncate">Sales: {currencySymbol}{formatNumber(stat.breakdown.sales)}</span>
                  <span className={`w-1 h-1 rounded-full ${getThemeStyle(theme, 'background', 'accent')} flex-shrink-0`}></span>
                  <span className="truncate">Service: {currencySymbol}{formatNumber(stat.breakdown.service)}</span>
                </div>
              )}
            </div>
          );

          return stat.link ? (
            <Link key={stat.name} to={stat.link} className={`block hover:scale-[1.01] transition-transform ${getThemeStyle(theme, 'interactive', 'hover', 'background')}`}>
              {content}
            </Link>
          ) : (
            <div key={stat.name}>{content}</div>
          );
        })}
      </div>
    </div>
  );
};

export default StatCards;