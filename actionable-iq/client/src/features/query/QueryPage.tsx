import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch } from '../../store';
import { 
  selectQueryLoading, 
  selectQueryResponse,
  selectQueryError,
} from '../../store/slices/analyticsQuerySlice';
import { executeQuery } from '../../store/actions/analyticsActions';
import { AnalyticsQueryRequest } from '../../types/analytics.types';
import QueryForm from '../../components/query/QueryForm';
import QueryResults from '../../components/query/QueryResults';
import { useAnalyticsProperties } from '../../hooks/useAnalyticsProperties';

/**
 * Query Page Component
 * Main page for querying Google Analytics data
 */
const QueryPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { properties, loading: propertiesLoading, error: propertiesError } = useAnalyticsProperties();
  const loading = useSelector(selectQueryLoading);
  const results = useSelector(selectQueryResponse);
  const error = useSelector(selectQueryError);
  const [lastQuery, setLastQuery] = useState<AnalyticsQueryRequest | null>(null);

  // Handle form submission
  const handleSubmitQuery = (query: AnalyticsQueryRequest) => {
    setLastQuery(query); // Save the query for use in the results component
    dispatch(executeQuery(query));
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Query Page</h1>
      
      <QueryForm
        properties={properties}
        propertiesLoading={propertiesLoading}
        propertiesError={propertiesError}
        onSubmit={handleSubmitQuery}
        isSubmitting={loading}
        className="mb-6"
      />
      
      {/* Results Section */}
      {(loading || results || error) && (
        <QueryResults 
          results={results}
          isLoading={loading}
          error={error}
          dateRange={lastQuery ? `${lastQuery.startDate} to ${lastQuery.endDate}` : undefined}
          className="mt-6"
        />
      )}
    </div>
  );
};

export default QueryPage; 