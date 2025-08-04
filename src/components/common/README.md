# Common Components

This directory contains reusable components that can be used across the application.

## DateRangeSelector

A flexible date range selector component that allows users to navigate between different time periods (day, week, month, year).

### Usage

```tsx
import DateRangeSelector, { DateFilterType } from '../common/DateRangeSelector';

// In your component:
const [currentDate, setCurrentDate] = useState(new Date());
const [dateFilterType, setDateFilterType] = useState<DateFilterType>('week');

const handleDateChange = (direction: 'prev' | 'next') => {
  setCurrentDate(prevDate => {
    const newDate = new Date(prevDate);
    switch (dateFilterType) {
      case 'day':
        return direction === 'prev' ? addDays(newDate, -1) : addDays(newDate, 1);
      case 'week':
        return direction === 'prev' ? addWeeks(newDate, -1) : addWeeks(newDate, 1);
      case 'month':
        return direction === 'prev' ? addMonths(newDate, -1) : addMonths(newDate, 1);
      case 'year':
        return direction === 'prev' ? addYears(newDate, -1) : addYears(newDate, 1);
    }
  });
};

const handleFilterTypeChange = (type: DateFilterType) => {
  setDateFilterType(type);
};

// In your JSX:
<DateRangeSelector
  currentDate={currentDate}
  dateFilterType={dateFilterType}
  onDateChange={handleDateChange}
  onFilterTypeChange={handleFilterTypeChange}
  itemCount={items.length}
  itemLabel="items"
/>
```

### Props

| Prop | Type | Description | Default |
|------|------|-------------|---------|
| `currentDate` | `Date` | The current date being displayed | Required |
| `dateFilterType` | `'day' \| 'week' \| 'month' \| 'year'` | The type of date range filter | Required |
| `onDateChange` | `(direction: 'prev' \| 'next') => void` | Function called when navigating between dates | Required |
| `onFilterTypeChange` | `(type: DateFilterType) => void` | Function called when changing the filter type | Required |
| `itemCount` | `number` | Number of items to display in the badge | `0` |
| `itemLabel` | `string` | Label for the item count badge | `'items'` |
| `className` | `string` | Additional CSS classes to apply | `''` |

### Example Implementation

See `src/components/orders/OrdersList.tsx` for a complete example of how to use this component. 