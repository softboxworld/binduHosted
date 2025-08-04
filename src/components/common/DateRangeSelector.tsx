import React, { useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfWeek, endOfWeek, getWeek, getYear, isAfter, startOfMonth, endOfMonth, addMonths, addWeeks, addYears, startOfYear, endOfYear, addDays } from 'date-fns';
import { useTheme } from '../../context/ThemeContext';

export type DateFilterType = 'day' | 'week' | 'month' | 'year';

interface DateRangeSelectorProps {
  currentDate: Date;
  dateFilterType: DateFilterType;
  onDateChange: (direction: 'prev' | 'next') => void;
  onFilterTypeChange: (type: DateFilterType) => void;
  itemCount?: number;
  itemLabel?: string;
  className?: string;
}

const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({
  currentDate,
  dateFilterType,
  onDateChange,
  onFilterTypeChange,
  itemCount = 0,
  itemLabel = 'items',
  className = '',
}) => {
  const { theme, getThemeStyle } = useTheme();

  // Handle localStorage for dateFilterType
  useEffect(() => {
    const storageKey = `dateFilterType_${window.location.pathname}`;
    const savedFilterType = localStorage.getItem(storageKey) as DateFilterType | null;
    
    if (savedFilterType && ['day', 'week', 'month', 'year'].includes(savedFilterType)) {
      onFilterTypeChange(savedFilterType);
    }
  }, []);

  // Save to localStorage when filter type changes
  const handleFilterTypeChange = (type: DateFilterType) => {
    const storageKey = `dateFilterType_${window.location.pathname}`;
    localStorage.setItem(storageKey, type);
    onFilterTypeChange(type);
  };

  // Calculate date range based on filter type
  const getDateRange = () => {
    switch (dateFilterType) {
      case 'day':
        return {
          start: new Date(currentDate.setHours(0, 0, 0, 0)),
          end: new Date(currentDate.setHours(23, 59, 59, 999))
        };
      case 'week':
        return {
          start: startOfWeek(currentDate, { weekStartsOn: 1 }),
          end: endOfWeek(currentDate, { weekStartsOn: 1 })
        };
      case 'month':
        return {
          start: startOfMonth(currentDate),
          end: endOfMonth(currentDate)
        };
      case 'year':
        return {
          start: startOfYear(currentDate),
          end: endOfYear(currentDate)
        };
    }
  };

  const { start: dateRangeStart, end: dateRangeEnd } = getDateRange();

  const getDateRangeLabel = () => {
    switch (dateFilterType) {
      case 'day':
        return format(currentDate, 'MMMM d, yyyy');
      case 'week':
        return `Week ${getWeek(currentDate, { weekStartsOn: 1 })}, ${getYear(currentDate)}`;
      case 'month':
        return format(currentDate, 'MMMM yyyy');
      case 'year':
        return format(currentDate, 'yyyy');
    }
  };

  const getDateRangeSubtitle = () => {
    switch (dateFilterType) {
      case 'day':
        return format(currentDate, 'EEEE'); // Returns the full day name
      case 'week':
        return `${format(dateRangeStart, 'MMM d')} - ${format(dateRangeEnd, 'MMM d')}`;
      case 'month':
        return `${format(dateRangeStart, 'MMM d')} - ${format(dateRangeEnd, 'MMM d')}`;
      case 'year':
        return `${format(dateRangeStart, 'MMM d, yyyy')} - ${format(dateRangeEnd, 'MMM d, yyyy')}`;
    }
  };

  return (
    <div className={`mb-4 ${className}`}>
      <div className="flex items-center  flex-col sm:flex-row">
        <div className="flex items-center space-x-2  flex-col sm:flex-row">
          <div className={`flex items-center ${getThemeStyle(theme, 'background', 'primary')} rounded-md border ${getThemeStyle(theme, 'border', 'primary')} shadow-sm`}>
            <button
              onClick={() => onDateChange('prev')}
              className={`p-1 ${getThemeStyle(theme, 'interactive', 'hover', 'background')} rounded-l-md transition-colors duration-200 border-r ${getThemeStyle(theme, 'border', 'primary')}`}
              aria-label="Previous period"
            >
              <ChevronLeft className={`h-3.5 w-3.5 ${getThemeStyle(theme, 'text', 'tertiary')}`} />
            </button>
            
            <div className="px-2 py-1 flex items-center">
              <span className={`font-medium text-xs ${getThemeStyle(theme, 'text', 'primary')}`}>{getDateRangeLabel()}</span>
              <div className={`ml-1.5 border-l ${getThemeStyle(theme, 'border', 'primary')} pl-1.5 mt-[-3px] `}>
                <select
                  value={dateFilterType}
                  onChange={(e) => handleFilterTypeChange(e.target.value as DateFilterType)}
                  className={`text-xs ${getThemeStyle(theme, 'background', 'primary')} outline-none ${getThemeStyle(theme, 'text', 'primary')}`}
                >
                  <option value="day">Day</option>
                  <option value="week">Week</option>
                  <option value="month">Month</option>
                  <option value="year">Year</option>
                </select>
              </div>
            </div>
            
            <button
              onClick={() => onDateChange('next')}
              className={`p-1 ${getThemeStyle(theme, 'interactive', 'hover', 'background')} rounded-r-md transition-colors duration-200 border-l ${getThemeStyle(theme, 'border', 'primary')}`}
              disabled={isAfter(dateRangeEnd, new Date())}
              aria-label="Next period"
            >
              <ChevronRight className={`h-3.5 w-3.5 ${getThemeStyle(theme, 'text', 'tertiary')}`} />
            </button>
          </div>
          
          <div className={`text-[10px] ${getThemeStyle(theme, 'text', 'muted')} ml-1.5`}>
            {getDateRangeSubtitle()}
          </div>
        </div>
        
        {itemCount !== undefined && (
          <div className={`ml-2 text-[10px] font-medium px-1.5 py-0.5 rounded-md ${getThemeStyle(theme, 'background', 'accent')} ${getThemeStyle(theme, 'text', 'tertiary')}`}>
            {itemCount} {itemLabel}
          </div>
        )}
      </div>
    </div>
  );
};

export default DateRangeSelector; 