import React from 'react';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  className?: string;
}

/**
 * Date Range Picker Component
 * Reusable component for selecting a date range
 */
const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  className = '',
}) => {
  // Predefined date ranges
  const selectDateRange = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    
    onStartDateChange(formatDate(start));
    onEndDateChange(formatDate(end));
  };
  
  // Format date to YYYY-MM-DD
  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex flex-wrap gap-2 mb-2">
        <button
          type="button"
          onClick={() => selectDateRange(7)}
          className="px-3 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded"
        >
          Last 7 days
        </button>
        <button
          type="button"
          onClick={() => selectDateRange(30)}
          className="px-3 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded"
        >
          Last 30 days
        </button>
        <button
          type="button"
          onClick={() => selectDateRange(90)}
          className="px-3 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded"
        >
          Last 90 days
        </button>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
            From Date
          </label>
          <input
            type="date"
            id="startDate"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
            To Date
          </label>
          <input
            type="date"
            id="endDate"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>
    </div>
  );
};

export default DateRangePicker; 