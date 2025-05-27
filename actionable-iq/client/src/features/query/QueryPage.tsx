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

// SharePoint link for property IDs list
const PROPERTY_IDS_LINK = "https://srppm.sharepoint.com/:x:/r/sites/SamWFiles/Shared%20Documents/Ad%20Hoc/GA4%20Property%20IDs%20for%20Dealers.xlsx?d=wf47932fd3e4841378e1c1298ffcb15a2&csf=1&web=1&e=IgrXp4";

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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Query Page</h1>
        <a
          href={PROPERTY_IDS_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded focus:outline-none focus:ring-2 focus:ring-blue-400 whitespace-nowrap"
        >
          Property IDs List
        </a>
      </div>
      
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