import React, { useState } from 'react';
import { AnalyticsProperty, AnalyticsQueryRequest } from '../../types/analytics.types';
import PropertySelect from '../common/PropertySelect';
import DateRangePicker from '../common/DateRangePicker';

interface QueryFormProps {
  properties: AnalyticsProperty[];
  propertiesLoading: boolean;
  propertiesError: string | null;
  onSubmit: (query: AnalyticsQueryRequest) => void;
  isSubmitting: boolean;
  className?: string;
}

/**
 * Query Form Component
 * Handles user input for Google Analytics queries
 */
const QueryForm: React.FC<QueryFormProps> = ({
  properties,
  propertiesLoading,
  propertiesError,
  onSubmit,
  isSubmitting,
  className = '',
}) => {
  // Form state
  const [propertyIds, setPropertyIds] = useState<string>('');
  const [sourceFilter, setSourceFilter] = useState<string>('client-command / email');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [topStatesCount, setTopStatesCount] = useState<number>(10);
  
  // Set default date range on component load (last 30 days)
  React.useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);
    
    setStartDate(formatDate(start));
    setEndDate(formatDate(end));
  }, []);
  
  // Format date to YYYY-MM-DD
  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Auto-fill the Source/Medium with the common value
  const setDefaultSourceMedium = () => {
    setSourceFilter('client-command/email');
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const propertyIdList = propertyIds
      .split(',')
      .map(id => id.trim())
      .filter(id => id.length > 0);

    if (propertyIdList.length === 0) {
      alert('Please select at least one property ID');
      return;
    }
    if (!sourceFilter) {
        alert('Please enter a Source/Medium filter (e.g., client-command / email)');
        return;
    }
    if (topStatesCount < 1 || topStatesCount > 100) {
        alert('Top states count must be between 1 and 100');
        return;
    }

    // Create query object with all necessary fields
    const query: AnalyticsQueryRequest = {
      propertyIds: propertyIdList,
      metrics: ["activeUsers", "newUsers", "totalUsers", "userEngagementDuration"],
      dimensions: ["region", "firstUserSourceMedium"],
      startDate,
      endDate,
      sourceMediumFilter: sourceFilter,
      topStatesCount: topStatesCount,
      limit: 10000,
      offset: 0,
      filterExpression: ''
    };
    
    onSubmit(query);
  };

  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Property IDs */}
          <PropertySelect 
            properties={properties}
            selectedIds={propertyIds}
            onChange={setPropertyIds}
            isLoading={propertiesLoading}
            error={propertiesError}
          />
          
          {/* Source/Medium */}
          <div>
            <label htmlFor="sourceFilter" className="block text-sm font-medium text-gray-700 mb-1">
              Source / Medium <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="sourceFilter"
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="source / medium (e.g., client-command / email)"
              required
            />
          </div>
          
          {/* Date Range */}
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
          />
          
          {/* Top States Count */}
          <div>
            <label htmlFor="topStatesCount" className="block text-sm font-medium text-gray-700 mb-1">
              Number of Top States <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="topStatesCount"
              min="1"
              max="100"
              value={topStatesCount}
              onChange={(e) => setTopStatesCount(Number(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
          
          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-indigo-400"
            >
              {isSubmitting ? 'Loading...' : 'Submit Query'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default QueryForm; 