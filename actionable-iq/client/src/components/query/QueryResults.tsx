import React, { useState, useEffect, useMemo } from 'react';
// Import Redux hooks and selector
import { useSelector } from 'react-redux';
import { selectProperties, selectActiveQuery } from '../../store/slices/analyticsQuerySlice';
// Import the types
import { AnalyticsProperty, AnalyticsMultiQueryResponse, AnalyticsQueryResponse } from '../../types/analytics.types';
import EmailReportModal from '../common/EmailReportModal';
import { apiClient } from '../../services/api/apiClient';
import { generateStandardCsvReportData, formatColumnHeader as formatDisplayColumnHeader, formatCsvColumnValue as formatDisplayColumnValue } from '../../utils/csvUtils';

interface QueryResultsProps {
  results: AnalyticsMultiQueryResponse | null; // Updated prop type
  isLoading: boolean;
  error: string | null;
  dateRange?: string; // Optional prop from parent component
  className?: string;
}

/**
 * Formats column headers for display
 * @param name The original header name
 * @returns Formatted header name
 */
const formatColumnHeader = (name: string): string => {
  switch (name) {
    case 'newUsers': return 'New Users';
    case 'activeUsers': return 'Active Users';
    case 'totalUsers': return 'Total Users';
    case 'userEngagementDuration': return 'Average Session Duration Per Active User';
    case 'region': return 'Region';
    case 'sourceMedium': return 'Source / Medium';
    case 'firstUserSourceMedium': return 'Source / Medium';
    case 'Total User %': return 'Total User %';
    case 'TOS Benchmark': return 'TOS Benchmark';
    case 'Passed Benchmark': return 'Passed Benchmark';
    default: return name.charAt(0).toUpperCase() + name.slice(1).replace(/([A-Z])/g, ' $1');
  }
};

/**
 * Formats a value for display based on the column type
 * @param value The value to format
 * @param columnName The name of the column
 * @param forReport Whether this is for a report (CSV/email) or for display
 * @returns Formatted value
 */
const formatColumnValue = (value: string, columnName: string, forReport: boolean = false): string => {
  if (columnName === 'userEngagementDuration') {
    // Formatting for this will be handled by formatDurationForDisplay for UI,
    // and raw seconds with 's' for reports (handled by formatCsvColumnValue in csvUtils)
    return `${value}s`; // Keep for other uses or as fallback if needed by formatCsvColumnValue
  }
  if (columnName === 'Total User %') {
    return `${value}%`;
  }
  if (columnName === 'TOS Benchmark') {
    // Always add 's' suffix for TOS Benchmark, regardless of report or display
    return `${value}s`;
  }
  if (columnName === 'Passed Benchmark') {
    // For reports, use TRUE/FALSE format
    if (forReport) {
      return value.toUpperCase();
    }
    // For display, use Yes/No format
    return value === 'true' ? 'TRUE' : 'FALSE';
  }
  return value;
};

// Helper function to format duration for UI display
const formatDurationForDisplay = (totalSeconds: number): string => {
  if (isNaN(totalSeconds) || totalSeconds < 0) return '0s';
  if (totalSeconds >= 60) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}s`;
  }
  return `${totalSeconds}s`;
};

/**
 * Query Results Component
 * Displays the results of a Google Analytics query in a table
 */
const QueryResults: React.FC<QueryResultsProps> = ({
  results,
  isLoading,
  error,
  dateRange,
  className = '',
}) => {
  // Fetch the properties list from Redux state
  const allProperties = useSelector(selectProperties);
  const activeQuery = useSelector(selectActiveQuery);
  const [propertyMap, setPropertyMap] = useState<Record<string, string>>({});
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

  // Create a map for easy lookup when properties load
  useEffect(() => {
    if (allProperties && allProperties.length > 0) {
      console.log('[QueryResults] Creating property map from', allProperties.length, 'properties');
      
      const map = allProperties.reduce((acc, prop) => {
        // Ensure both ID and DisplayName exist
        if (prop.propertyId && prop.displayName) {
          // First try the ID as is
          acc[prop.propertyId] = prop.displayName;
          
          // Also try with 'properties/' prefix removed if it exists
          if (prop.propertyId.includes('/')) {
            const keyId = prop.propertyId.split('/')[1];
            if (keyId) {
              acc[keyId] = prop.displayName;
            }
          }
          
        } else {
          console.warn(`[QueryResults] Property missing ID or DisplayName:`, prop);
        }
        return acc;
      }, {} as Record<string, string>);
      
      console.log('[QueryResults] Final property map:', map);
      setPropertyMap(map);
    } else {
      console.log('[QueryResults] No properties found in state to build map.');
    }
  }, [allProperties]); // Dependency array ensures this runs when properties load
  
  useEffect(() => {
    // Log component props on mount or when results change
    console.log('[QueryResults] Component rendered with:', {
      hasMultiResults: !!results,
      isLoading,
      hasError: !!error
    });
  }, [results, isLoading, error]);
  
  // Get query date range from active query or use fallback
  const effectiveDateRange = useMemo(() => {
    if (dateRange) {
      return dateRange.replace(' to ', '\n'); // For UI display with line break
    }
    if (activeQuery) {
      return `${activeQuery.startDate}\n${activeQuery.endDate}`;
    }
    // ... rest of fallback logic ...
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);
    
    const formatDate = (dateToFormat: Date): string => {
      const year = dateToFormat.getFullYear();
      const month = String(dateToFormat.getMonth() + 1).padStart(2, '0');
      const day = String(dateToFormat.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    return `${formatDate(startDate)}\n${formatDate(endDate)}`;
  }, [dateRange, activeQuery, results]);

  const effectiveDateRangeForCsv = useMemo(() => {
    if (dateRange) { // Prop from parent, likely already "YYYY-MM-DD to YYYY-MM-DD"
        return dateRange;
    }
    if (activeQuery) {
      return `${activeQuery.startDate} - ${activeQuery.endDate}`;
    }
    // Fallback from effectiveDateRange (which is \n separated)
    return effectiveDateRange.replace('\n', ' - ');
  }, [dateRange, activeQuery, effectiveDateRange]);
  
  // Handle downloading results as CSV (combined)
  const downloadCsv = () => {
    if (!results || !results.results || results.results.length === 0) {
        console.warn('[QueryResults] No results to download.');
        return;
    }

    try {
        const csvData = generateStandardCsvReportData(
            results, // This is AnalyticsMultiQueryResponse, util expects AnalyticsQueryResponse[] or AnalyticsMultiQueryResponse
            propertyMap,
            effectiveDateRangeForCsv
            // globalTosBenchmark can be omitted to use default from csvUtils or per-property if in data
        );

        if (!csvData) {
            console.error('[QueryResults] CSV generation failed or returned empty.');
            alert('Failed to generate CSV data.');
            return;
        }
        
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `AnalyticsReport_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (e) {
        console.error('[QueryResults] Error downloading CSV:', e);
        alert('An error occurred while generating the CSV file.');
    }
  };
  
  // Handle sending emails
  const handleSendEmails = async (emails: string[]) => {
    if (!results || !results.results || results.results.length === 0) {
        console.warn("[handleSendEmails] No results to send.");
        throw new Error('No report data available to send.');
    }
    
    try {
      console.log("[handleSendEmails] Generating CSV data from current results...");
      const csvData = generateStandardCsvReportData(
        results, // This is AnalyticsMultiQueryResponse
        propertyMap,
        effectiveDateRangeForCsv
        // globalTosBenchmark can be omitted here as well
      );

      if (!csvData) {
        console.warn("[handleSendEmails] generateStandardCsvReportData returned empty data. Cannot send email.");
        throw new Error('Could not generate report data to send.');
      }
      console.log(`[handleSendEmails] CSV data generated (Length: ${csvData.length})`); 

      const token = localStorage.getItem('auth_token');
      if (!token) {
        console.error("[handleSendEmails] Authentication token not found.");
        throw new Error('Authentication required to send email');
      }

      const finalReportName = `GA4 Analytics Report ${new Date().toLocaleDateString()}`;
      console.log(`[handleSendEmails] Using report name: ${finalReportName}`);

      const emailRequestPayload = {
        recipients: emails,
        reportName: finalReportName,
        csvData: csvData 
      };
      console.log("[handleSendEmails] Preparing to send email via apiClient");
          
      const responseData = await apiClient.post<any>('/report/email', emailRequestPayload, { token });

      console.log('[handleSendEmails] Received success response body from apiClient:', responseData);
      return responseData;

    } catch (error) {
      console.error('[handleSendEmails] Error caught in catch block:', error);
      // Make sure to re-throw or handle the error appropriately for the EmailReportModal
      if (error instanceof Error) {
        throw new Error(error.message || 'Failed to send email report.');
      }
      throw new Error('An unknown error occurred while sending the email report.');
    }
  };
  
  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className={`bg-red-50 rounded-lg shadow p-6 ${className}`}>
        <h2 className="text-xl font-bold text-red-700 mb-2">Error</h2>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }
  
  if (!results || ((!results.results || results.results.length === 0) && (!results.errors || results.errors.length === 0))) {
    console.warn('[QueryResults] No successful results or errors available to display');
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <p className="text-gray-600">No data available. Try changing your query parameters or check property access.</p>
      </div>
    );
  }
  
  console.log('[QueryResults] Rendering results...');
  
  // Function to reorder columns for display (UI specific)
  const getOrderedColumnsForDisplay = (dimensionHeaders: any[], metricHeaders: any[]) => {
    // ... this is the original getOrderedColumns logic from QueryResults.tsx ...
    // Uses formatDisplayColumnHeader for names
    const columns: any[] = [];
    
    const regionIndex = dimensionHeaders.findIndex(h => h.name === 'region');
    const sourceMediumIndex = dimensionHeaders.findIndex(h => h.name === 'sourceMedium');
    const firstUserSourceMediumIndex = dimensionHeaders.findIndex(h => h.name === 'firstUserSourceMedium');
    const mediumIndex = sourceMediumIndex !== -1 ? sourceMediumIndex : firstUserSourceMediumIndex;
    
    const totalUsersIndex = metricHeaders.findIndex(h => h.name === 'totalUsers');
    const newUsersIndex = metricHeaders.findIndex(h => h.name === 'newUsers');
    const activeUsersIndex = metricHeaders.findIndex(h => h.name === 'activeUsers');
    const engagementDurationIndex = metricHeaders.findIndex(h => h.name === 'userEngagementDuration');
    const tosBenchmarkIndex = metricHeaders.findIndex(h => h.name === 'TOS Benchmark');
    const passedBenchmarkIndex = metricHeaders.findIndex(h => h.name === 'Passed Benchmark');
    
    if (regionIndex !== -1) {
      columns.push({
        name: formatDisplayColumnHeader('region'),
        type: 'dimension',
        originalIndex: regionIndex
      });
    }
    columns.push({
      name: formatDisplayColumnHeader('Date Range'),
      type: 'added',
      value: effectiveDateRange, // UI version with newline
      className: 'w-1/8 whitespace-pre'
    });
    if (mediumIndex !== -1) {
      columns.push({
        name: formatDisplayColumnHeader('firstUserSourceMedium'), // Or 'sourceMedium'
        type: 'dimension',
        originalIndex: mediumIndex,
        className: 'w-1/3'
      });
    }
    if (totalUsersIndex !== -1) {
      columns.push({ name: formatDisplayColumnHeader('totalUsers'), type: 'metric', originalIndex: totalUsersIndex });
    }
    if (newUsersIndex !== -1) {
      columns.push({ name: formatDisplayColumnHeader('newUsers'), type: 'metric', originalIndex: newUsersIndex });
    }
    if (activeUsersIndex !== -1) {
      columns.push({ name: formatDisplayColumnHeader('activeUsers'), type: 'metric', originalIndex: activeUsersIndex });
    }
    
    if (engagementDurationIndex !== -1) {
      columns.push({
        name: formatDisplayColumnHeader('userEngagementDuration'), 
        type: 'metric',
        originalIndex: engagementDurationIndex,
        originalMetricName: 'userEngagementDuration',
        metricHeaders: metricHeaders, 
        className: 'w-1/8'
      });
    }

    // Add Total User % if 'totalUsers' metric is available for calculation
    if (metricHeaders.some(h => h.name === 'totalUsers')) {
        columns.push({ 
            name: formatDisplayColumnHeader('Total User %'), 
            type: 'metric', 
            // originalIndex is not directly applicable as it's calculated from totalUsers / propertyTotalUsers
            metricHeaders: metricHeaders 
        });
    }
    
    if (metricHeaders.some(h => h.name === 'TOS Benchmark')) {
        columns.push({ name: formatDisplayColumnHeader('TOS Benchmark'), type: 'metric', originalIndex: metricHeaders.findIndex(h => h.name === 'TOS Benchmark') });
    }
    if (metricHeaders.some(h => h.name === 'Passed Benchmark')) {
        columns.push({ 
            name: formatDisplayColumnHeader('Passed Benchmark'), 
            type: 'metric', 
            originalIndex: metricHeaders.findIndex(h => h.name === 'Passed Benchmark'),
            metricHeaders: metricHeaders
        });
    }

    // Add remaining dimension/metric headers not explicitly handled
    dimensionHeaders.forEach((header, index) => {
      if (index !== regionIndex && index !== mediumIndex && !columns.some(c => c.originalIndex === index && c.type === 'dimension')) {
        columns.push({ name: formatDisplayColumnHeader(header.name), type: 'dimension', originalIndex: index });
      }
    });
    metricHeaders.forEach((header, index) => {
      const formattedName = formatDisplayColumnHeader(header.name);
      // Ensure we don't re-add columns already defined or the old "New User %" related headers by name
      if (!columns.some(c => (c.originalIndex === index || c.originalMetricName === header.name || c.name === formattedName) && c.type === 'metric') &&
          header.name !== 'newUsers' && formattedName !== 'New User %' && header.name !== 'New User %') { // Explicitly skip 'newUsers' and its formatted versions
        columns.push({ name: formattedName, type: 'metric', originalIndex: index, originalMetricName: header.name });
      }
    });
    return columns;
  };

  // Function to get cell value for display (UI specific)
  const getCellValueForDisplay = (row: any, column: any, currentPropertyTosBenchmark?: number, propertyTotalTotalUsers?: number) => {
    // ... this is the original getCellValue logic from QueryResults.tsx ...
    // It uses formatDisplayColumnValue and handles JSX for 'Passed Benchmark'
    if (column.type === 'added') {
      return column.value; // Already formatted for display (e.g. date with newline)
    }
    if (column.type === 'dimension') {
      if (typeof column.originalIndex === 'number' && column.originalIndex >= 0 && column.originalIndex < row.dimensionValues.length) {
        return row.dimensionValues[column.originalIndex].value;
      }
      return '';
    }
    if (column.type === 'metric') {
        if (typeof column.originalIndex !== 'number' || column.originalIndex < 0 || column.originalIndex >= row.metricValues.length) {
            // Exception for calculated metrics that don't have an originalIndex from source data but are defined in getOrderedColumnsForDisplay
            if (column.name === formatDisplayColumnHeader('Total User %')) { /* calc below */ }
            else if (column.name === formatDisplayColumnHeader('Passed Benchmark')) { /* calc below */ }
            else if (column.name === formatDisplayColumnHeader('TOS Benchmark')) { /* calc below */ }
            else { return ''; }
        }
        
        const metricDisplayName = column.name;
        let value = (typeof column.originalIndex === 'number' && row.metricValues[column.originalIndex]) ? row.metricValues[column.originalIndex].value : undefined;

        if (metricDisplayName === formatDisplayColumnHeader('userEngagementDuration')) {
            const engagementDurationSumIndex = column.metricHeaders?.findIndex((h: { name: string }) => h.name === 'userEngagementDuration');
            const activeUsersIndex = column.metricHeaders?.findIndex((h: { name: string }) => h.name === 'activeUsers');
            if (engagementDurationSumIndex !== -1 && activeUsersIndex !== -1 && 
                engagementDurationSumIndex < row.metricValues.length && activeUsersIndex < row.metricValues.length) {
                const engagementDuration = Number(row.metricValues[engagementDurationSumIndex]?.value || 0);
                const activeUsers = Number(row.metricValues[activeUsersIndex]?.value || 0);
                const avgDurationPerUser = activeUsers > 0 ? Math.round(engagementDuration / activeUsers) : 0;
                return formatDurationForDisplay(avgDurationPerUser); 
            }
            return formatDurationForDisplay(0);
        }
        if (metricDisplayName === formatDisplayColumnHeader('Total User %')) {
            const totalUsersIdx = column.metricHeaders?.findIndex((h: { name: string }) => h.name === 'totalUsers');
            
            if (totalUsersIdx !== -1 && totalUsersIdx < row.metricValues.length && propertyTotalTotalUsers !== undefined && propertyTotalTotalUsers > 0) {
                const rowTotalUsers = Number(row.metricValues[totalUsersIdx]?.value || 0);
                const perc = (rowTotalUsers / propertyTotalTotalUsers) * 100;
                return formatDisplayColumnValue(perc.toFixed(2), 'Total User %');
            }
            return formatDisplayColumnValue('0', 'Total User %');
        }
        if (metricDisplayName === formatDisplayColumnHeader('TOS Benchmark')) {
            // For UI display in individual rows, always show 30s as per user request.
            // The currentPropertyTosBenchmark is for the entire property, used by total row and passed for context.
            // If a row itself had a specific benchmark in its data, column.originalIndex would be used.
            // Otherwise, for UI consistency in rows for this column, we show the fixed 30s.
            let benchmarkValueToShow = '30'; // Default fixed benchmark for UI row display
            // If the column has an originalIndex and data for TOS Benchmark exists for the row, prefer that for display
            if (typeof column.originalIndex === 'number' && 
                column.originalIndex >= 0 && 
                column.originalIndex < row.metricValues.length && 
                row.metricValues[column.originalIndex]?.value !== undefined) {
                benchmarkValueToShow = row.metricValues[column.originalIndex].value;
            } else if (value !== undefined && column.name === formatDisplayColumnHeader('TOS Benchmark')){
                // Fallback if value was derived some other way for this metric (less likely for this specific column)
                 benchmarkValueToShow = value;
            } else {
                // If no specific row data for TOS Benchmark, and UI needs fixed 30s
                // this ensures "30s" is shown for the TOS Benchmark cell in rows.
                // The `currentPropertyTosBenchmark` is more for calculating `Passed Benchmark` consistently.
            }
            return formatDisplayColumnValue(benchmarkValueToShow, 'TOS Benchmark');
        }
        if (metricDisplayName === formatDisplayColumnHeader('Passed Benchmark')) {
            let avgEng = 0;
            const engagementDurationSumIndex = column.metricHeaders?.findIndex((h: { name: string }) => h.name === 'userEngagementDuration');
            const activeUsersForEngIndex = column.metricHeaders?.findIndex((h: { name: string }) => h.name === 'activeUsers');

            if (engagementDurationSumIndex !== undefined && engagementDurationSumIndex !== -1 && 
                activeUsersForEngIndex !== undefined && activeUsersForEngIndex !== -1 && 
                engagementDurationSumIndex < row.metricValues.length && activeUsersForEngIndex < row.metricValues.length) {
                
                const engagementDuration = Number(row.metricValues[engagementDurationSumIndex]?.value || 0);
                const activeUsersVal = Number(row.metricValues[activeUsersForEngIndex]?.value || 0);
                console.log(`[Passed Benchmark Cell] Calculated engagementDuration: ${engagementDuration}, activeUsersVal: ${activeUsersVal}`); // Log parsed numbers
                avgEng = activeUsersVal > 0 ? Math.round(engagementDuration / activeUsersVal) : 0;
            }
            
            const uiTosBenchmarkStandard = 30;
            console.log("[Passed Benchmark Cell] TESTING CONSOLE LOG FOR TOS PASS", avgEng, uiTosBenchmarkStandard); // Your existing log
            const passed = avgEng > uiTosBenchmarkStandard;
            const uiText = passed ? 'TRUE' : 'FALSE'; // Display TRUE/FALSE
            return (
                <span className={`px-2 py-1 rounded ${passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`} style={{float: 'right'}}>
                    {uiText}
                </span>
            );
        }
        if (value !== undefined) {
             return formatDisplayColumnValue(String(value), column.originalMetricName || metricDisplayName);
        }
        return '';
    }
    return '';
  };

  // Calculates totals for display (UI specific)
  const calculatePropertyTotalsForDisplay = (singleResult: AnalyticsQueryResponse) => {
    // ... this is the original calculatePropertyTotals logic ...
    // It should now define its own default TOS benchmark or get it appropriately for display
    const DEFAULT_TOS_BENCHMARK_DISPLAY = 30;
    let totals = {
      totalUsers: 0,
      newUsers: 0,
      activeUsers: 0,
      engagementDurationSum: 0,
      rowCount: 0,
      averageEngagementDuration: 0,
      newUserPercent: 0,
      totalUserPercentAgg: 0,
      tosBenchmark: DEFAULT_TOS_BENCHMARK_DISPLAY, 
      passedBenchmark: false
    };
    if (!singleResult || !singleResult.rows || singleResult.rows.length === 0) return totals;

    const metricIndices = {
      totalUsers: singleResult.metricHeaders.findIndex(h => h.name === 'totalUsers'),
      newUsers: singleResult.metricHeaders.findIndex(h => h.name === 'newUsers'),
      activeUsers: singleResult.metricHeaders.findIndex(h => h.name === 'activeUsers'),
      userEngagementDuration: singleResult.metricHeaders.findIndex(h => h.name === 'userEngagementDuration'),
      // If 'TOS Benchmark' comes from data for display, find its index
      tosBenchmarkData: singleResult.metricHeaders.findIndex(h => h.name === 'TOS Benchmark') 
    };
    totals.rowCount = singleResult.rows.length;
    singleResult.rows.forEach(row => {
      if (metricIndices.totalUsers !== -1) totals.totalUsers += Number(row.metricValues[metricIndices.totalUsers]?.value || 0);
      if (metricIndices.newUsers !== -1) totals.newUsers += Number(row.metricValues[metricIndices.newUsers]?.value || 0);
      if (metricIndices.activeUsers !== -1) totals.activeUsers += Number(row.metricValues[metricIndices.activeUsers]?.value || 0);
      if (metricIndices.userEngagementDuration !== -1) totals.engagementDurationSum += Number(row.metricValues[metricIndices.userEngagementDuration]?.value || 0);
      
      if (metricIndices.tosBenchmarkData !== -1 && row.metricValues[metricIndices.tosBenchmarkData]?.value !== undefined && totals.tosBenchmark === DEFAULT_TOS_BENCHMARK_DISPLAY) {
        totals.tosBenchmark = Number(row.metricValues[metricIndices.tosBenchmarkData].value || DEFAULT_TOS_BENCHMARK_DISPLAY);
      }
    });
    totals.averageEngagementDuration = totals.activeUsers > 0 ? Math.round(totals.engagementDurationSum / totals.activeUsers) : 0;
    totals.newUserPercent = totals.activeUsers > 0 ? (totals.newUsers / totals.activeUsers) * 100 : 0;
    totals.passedBenchmark = totals.averageEngagementDuration > totals.tosBenchmark;
    return totals;
  };

  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className} space-y-6`}>
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Query Results</h2>
        {results.results && results.results.length > 0 && (
          <div className="flex gap-2">
            <button
              onClick={() => setIsEmailModalOpen(true)}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm flex items-center"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Email Report
            </button>
            <button
              onClick={downloadCsv}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm"
            >
              Download Combined CSV
            </button>
          </div>
        )}
      </div>
      
      {results.results && results.results.map((singleResult, index) => {
        const totals = calculatePropertyTotalsForDisplay(singleResult);
        const orderedDisplayColumns = getOrderedColumnsForDisplay(singleResult.dimensionHeaders, singleResult.metricHeaders);

        return (
          <div key={`result-${index}`} className="border rounded p-4">
            <h3 className="text-lg font-semibold mb-2 flex items-center">
              <span>Property: {propertyMap[singleResult.propertyId] || propertyMap[singleResult.propertyId.replace('properties/', '')] || singleResult.propertyId}</span>
              <span className="text-sm text-gray-500 ml-2">({singleResult.propertyId})</span>
              <span className={`ml-4 text-sm px-2 py-1 rounded-full ${totals.passedBenchmark ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {totals.passedBenchmark ? 'PASSED BENCHMARK' : 'FAILED BENCHMARK'}
              </span>
            </h3>
            {singleResult.rows && singleResult.rows.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        {orderedDisplayColumns.map((column, i) => (
                          <th 
                            key={`col-${index}-${i}`} 
                            className={`py-2 px-4 border text-left text-sm font-medium text-gray-700 ${column.className || ''}`}
                          >
                            {column.name} 
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="bg-gray-200 font-semibold">
                        {orderedDisplayColumns.map((column, colIndex) => {
                          let cellValue = '';
                          if (colIndex === 0) { 
                            cellValue = 'Total';
                          } else if (column.name === formatDisplayColumnHeader('Date Range')) {
                            cellValue = column.value || effectiveDateRange.replace(/\n/g, ' - ');
                          } else {
                            switch (column.name) {
                              case formatDisplayColumnHeader('totalUsers'):
                                cellValue = totals.totalUsers.toString();
                                break;
                              case formatDisplayColumnHeader('newUsers'):
                                cellValue = totals.newUsers.toString();
                                break;
                              case formatDisplayColumnHeader('activeUsers'):
                                cellValue = totals.activeUsers.toString();
                                break;
                              case formatDisplayColumnHeader('userEngagementDuration'):
                                cellValue = formatDurationForDisplay(totals.averageEngagementDuration);
                                break;
                              case formatDisplayColumnHeader('TOS Benchmark'):
                                cellValue = formatDisplayColumnValue(totals.tosBenchmark.toString(), 'TOS Benchmark');
                                break;
                              case formatDisplayColumnHeader('Passed Benchmark'):
                                const passedStatus = totals.passedBenchmark.toString();
                                const formattedValue = formatDisplayColumnValue(passedStatus, 'Passed Benchmark');
                                const isPassed = formattedValue === 'TRUE';
                                return (
                                  <td 
                                    key={`total-cell-${index}-${colIndex}`} 
                                    className={`py-2 px-4 border text-sm text-right ${column.className || ''}`}
                                  >
                                    <span className={`px-2 py-1 rounded ${isPassed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                      {isPassed ? 'TRUE' : 'FALSE'}
                                    </span>
                                  </td>
                                );
                              default:
                                cellValue = '';
                            }
                          }
                          return (
                            <td 
                              key={`total-cell-${index}-${colIndex}`} 
                              className={`py-2 px-4 border text-sm text-gray-900 ${column.className || ''}`}
                            >
                              {cellValue}
                            </td>
                          );
                        })}
                      </tr>
                      {singleResult.rows.map((row, rowIndex) => (
                        <tr key={`row-${index}-${rowIndex}`} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          {orderedDisplayColumns.map((column, colIndex) => (
                            <td 
                              key={`cell-${index}-${rowIndex}-${colIndex}`} 
                              className={`py-2 px-4 border text-sm text-gray-700 ${column.className || ''}`}
                            >
                              {getCellValueForDisplay(row, column, totals.tosBenchmark, totals.totalUsers)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-2 text-sm text-gray-500">
                  Total rows (states) for this property: {singleResult.rowCount}
                </div>
              </>
            ) : (
              <p className="text-gray-500 italic">No data returned for this property.</p>
            )}
          </div>
        );
      })}
      
      {((!results.results || results.results.length === 0) && (!results.errors || results.errors.length === 0)) && (
         <p className="text-gray-600 italic">No successful results or errors to display.</p>
      )}
      
      {/* Email Modal */}
      <EmailReportModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        onSendEmails={handleSendEmails}
        reportName={`GA4 Analytics Report ${new Date().toLocaleDateString()}`}
      />
      
      {results.errors && results.errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded p-4">
              <h3 className="text-lg font-semibold text-red-800 mb-2">Query Errors</h3>
              <ul className="list-disc pl-5 space-y-1">
                  {results.errors.map((err, index) => (
                      <li key={`error-${index}`} className="text-sm text-red-700">
                          <strong>Property {propertyMap[err.propertyId] || err.propertyId || 'N/A'}:</strong> {err.errorMessage}
                      </li>
                  ))}
              </ul>
          </div>
      )}
    </div>
  );
};

export default QueryResults; 