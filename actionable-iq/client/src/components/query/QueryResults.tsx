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
    case 'userEngagementDuration': return 'Average Session Duration Per Active User (s)';
    case 'averageSessionDurationPerUser': return 'Average Session Duration Per Active User (s)';
    case 'region': return 'Region';
    case 'sourceMedium': return 'Source / Medium';
    case 'firstUserSourceMedium': return 'Source / Medium';
    case 'New User %': return 'Total User %';
    case 'TOS Benchmark': return 'TOS Benchmark';
    case 'Passed Benchmark': return 'Passed TOS Benchmark';
    case 'User % Benchmark': return 'User % Benchmark';
    case 'Passed Geo Benchmark': return 'Passed Geo Benchmark';
    case 'Total User Benchmark': return 'Total User Benchmark';
    case 'Passed Total User Benchmark': return 'Passed Total User Benchmark';
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
  // The (s) is now part of the columnName for Average Session Duration (from formatColumnHeader).
  // Actual UI display of duration is handled by formatDurationForDisplay in getCellValueForDisplay.

  if (columnName === 'New User %' || columnName === 'User % Benchmark') {
    return `${value}%`;
  }
  if (columnName === 'TOS Benchmark') {
    // Always add 's' suffix for TOS Benchmark, regardless of report or display
    return `${value}s`;
  }
  if (columnName === 'Passed TOS Benchmark' || columnName === 'Passed Geo Benchmark' || columnName === 'Passed Total User Benchmark') {
    // For reports, use TRUE/FALSE format
    if (forReport) {
      return value.toUpperCase();
    }
    // For display, use TRUE/FALSE format
    return value === 'true' ? 'TRUE' : 'FALSE';
  }
  if (columnName === 'Total User Benchmark') {
    return value;
  }
  return value;
};

// Helper function to format duration for UI display
const formatDurationForDisplay = (totalSeconds: number): string => {
  if (isNaN(totalSeconds) || totalSeconds < 0) return '0s';
  
  // Sticking to seconds with up to two decimal places for precision.
  // The 's' is appended at the end.
  const roundedSeconds = parseFloat(totalSeconds.toFixed(2));

  return `${roundedSeconds}s`;
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
    const columnsForDisplay: Array<{ 
      name: string, 
      internalName: string, 
      type: 'dimension' | 'metric' | 'added', 
      originalIndex?: number,
      value?: any, 
      props?: any, 
      className?: string,
      metricHeaders?: any[]
    }> = [];

    const findAndAddDimension = (internalName: string, displayName?: string, props?: object) => {
      const index = dimensionHeaders.findIndex(h => h.name === internalName);
      if (index !== -1) {
        columnsForDisplay.push({ 
          name: formatDisplayColumnHeader(displayName || internalName), 
          type: 'dimension', 
          originalIndex: index, 
          internalName, 
          ...props 
        });
      }
      return index !== -1;
    };

    const findAndAddMetric = (internalName: string, displayName?: string, props?: object) => {
      // Check if metric exists (either original GA metric or one added by processQueryData)
      const metricExists = metricHeaders.some(h => h.name === internalName);
      if (metricExists) {
        const originalIndex = metricHeaders.findIndex(h => h.name === internalName); // Will be -1 if not an original GA metric but added by processQueryData
        columnsForDisplay.push({ 
          name: formatDisplayColumnHeader(displayName || internalName), 
          type: 'metric', 
          // Use originalIndex if found, otherwise use its index in the (possibly augmented) metricHeaders.
          // This helps getCellValueForDisplay find the correct metricValue.
          originalIndex: originalIndex !== -1 ? originalIndex : metricHeaders.findIndex(h => h.name === internalName),
          internalName, 
          // metricHeaders, // Removed to avoid potential circular references if logged, and likely not needed by getCellValueForDisplay directly
          ...props 
        });
        return true;
      }
      return false;
    };
    
    // Property ID and Name are handled by the main render loop using propertyMap

    // --- Dimensions Section ---
    // 1. Region
    findAndAddDimension('region');
    // 2. Date Range (Added as a special column)
    columnsForDisplay.push({
      name: formatDisplayColumnHeader('Date Range'), // Use the renamed imported util
      internalName: 'dateRange',
      type: 'added',
      value: effectiveDateRange, // This is already newline formatted for UI
      props: { className: 'whitespace-pre-line' } // Apply whitespace-pre-line for newline
    });
    // 3. Source / Medium
    findAndAddDimension('firstUserSourceMedium', 'Source / Medium');

    // --- Query Results Section ---
    // 4. Total Users
    findAndAddMetric('totalUsers');
    // 5. New Users
    findAndAddMetric('newUsers');
    // 6. Active Users
    findAndAddMetric('activeUsers');
    // 7. Total User % (internally 'New User %')
    findAndAddMetric('New User %', 'Total User %');
    // 8. Average Session Duration per User
    findAndAddMetric('averageSessionDurationPerUser', 'Average Session Duration Per Active User (s)', { className: 'w-1/8' });
    
    // --- Actionable Data Section ---
    // 9. TOS Benchmark
    findAndAddMetric('TOS Benchmark');
    // 10. Passed TOS Benchmark (internally 'Passed Benchmark' after processing)
    findAndAddMetric('Passed Benchmark', 'Passed TOS Benchmark');
    // 11. User % Benchmark
    findAndAddMetric('User % Benchmark');
    // 12. Passed Geo Benchmark
    findAndAddMetric('Passed Geo Benchmark');
    // 13. Total User Benchmark
    findAndAddMetric('Total User Benchmark');
    // 14. Passed Total User Benchmark
    findAndAddMetric('Passed Total User Benchmark');

    // Fallback for any other dimensions/metrics not explicitly handled
    // This ensures all data is shown, but ideally all expected columns are explicitly placed above.
    dimensionHeaders.forEach((header, index) => {
      if (!columnsForDisplay.some(c => c.internalName === header.name && c.type === 'dimension')) {
        columnsForDisplay.push({ name: formatDisplayColumnHeader(header.name), type: 'dimension', originalIndex: index, internalName: header.name });
      }
    });
    metricHeaders.forEach((header, index) => {
      if (!columnsForDisplay.some(c => c.internalName === header.name && c.type === 'metric')) {
        // Pass the full metricHeaders array for context if getCellValueForDisplay needs it for unhandled metrics
        columnsForDisplay.push({ name: formatDisplayColumnHeader(header.name), type: 'metric', originalIndex: index, internalName: header.name, metricHeaders });
      }
    });
    
    return columnsForDisplay;
  };

  // Function to get cell value for display (UI specific)
  const getCellValueForDisplay = (row: any, column: any, currentPropertyTosBenchmark?: number, propertyTotalTotalUsers?: number) => {
    if (column.type === 'added') {
      return column.value;
    }
    if (column.type === 'dimension') {
      if (typeof column.originalIndex === 'number' && column.originalIndex >= 0 && column.originalIndex < row.dimensionValues.length) {
        return row.dimensionValues[column.originalIndex].value;
      }
      return '';
    }
    if (column.type === 'metric') {
        // The originalIndex for metrics added by processQueryData will point to their position in the *extended* metricValues array.
        // analyticsActions.ts ensures values are pushed in the same order as headers are added.
        const metricValueObject = (typeof column.originalIndex === 'number' && column.originalIndex >= 0 && column.originalIndex < row.metricValues.length)
                                 ? row.metricValues[column.originalIndex]
                                 : undefined;
        let value = metricValueObject ? metricValueObject.value : undefined;

        // const metricDisplayName = column.name; // This is the display name from getOrderedColumnsForDisplay
        // Use column.internalName for logic, column.name for display formatting switch if needed
        const internalMetricName = column.internalName;

        // Handle specific column formatting or calculations for display
        if (internalMetricName === 'averageSessionDurationPerUser') {
            // The 'value' here is already the pre-calculated average session duration per user (as a string)
            // from row.metricValues[column.originalIndex].value, where originalIndex now correctly points to 
            // the 'averageSessionDurationPerUser' metric header from the server/processQueryData.
            if (value !== undefined && !isNaN(Number(value))) {
                 return formatDurationForDisplay(Number(value)); // Format the direct value
            }
            return '0s'; // Fallback if value is not a number
        }
        
        if (internalMetricName === 'New User %') { // internal name for 'Total User %'
             if (value !== undefined) {
                return formatColumnValue(String(value), internalMetricName); // Use internalMetricName for formatColumnValue logic switch
             }
             return formatColumnValue('0', internalMetricName);
        }

        if (internalMetricName === 'Passed Benchmark' || internalMetricName === 'Passed Geo Benchmark' || internalMetricName === 'Passed Total User Benchmark') {
            const passed = value === 'TRUE'; // Adjusted to check for uppercase 'TRUE' string
            const uiText = passed ? 'TRUE' : 'FALSE';
            return (
                <span className={`px-2 py-1 rounded ${passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`} style={{float: 'right'}}>
                    {uiText}
                </span>
            );
        }
        
        if (value !== undefined) {
             // For 'TOS Benchmark', 'User % Benchmark', 'Total User Benchmark' and other direct metrics
             return formatColumnValue(String(value), internalMetricName);
        }
        return '';
    }
    return '';
  };

  // Calculates totals for display (UI specific)
  const calculatePropertyTotalsForDisplay = (singleResult: AnalyticsQueryResponse) => {
    const USER_PERCENT_BENCHMARK_VALUE_CONST = 60; // Defined here for UI totals
    const TOTAL_USER_BENCHMARK_VALUE_CONST = 5;   // Defined here for UI totals
    const DEFAULT_TOS_BENCHMARK_DISPLAY = 30;

    // Value for the "Total User %" column in the total row display
    const totalUserPercentDisplayForTotalRow = '-'; // Or empty string ''

    // Property's overall new user percentage, used for "Passed Geo Benchmark" in the total row
    const propertyOverallNewUserPercent = singleResult.totalPercentageOfNewUsers || 0;

    // Get the source/medium from the first row, if available.
    // It's assumed to be consistent for the entire property result set.
    const sourceMedium = singleResult.rows?.[0]?.dimensionValues?.[1]?.value || 'client-command / email';


    let totals = {
      totalUsers: singleResult.totalUsers || 0,
      newUsers: singleResult.totalNewUsers || 0,
      activeUsers: singleResult.totalActiveUsers || 0,
      averageEngagementDuration: 0, // will compute below
      totalUserPercentForDisplayInTotalRow: totalUserPercentDisplayForTotalRow,
      tosBenchmark: DEFAULT_TOS_BENCHMARK_DISPLAY,
      passedBenchmark: false, // For "Passed TOS Benchmark"
      userPercentBenchmark: USER_PERCENT_BENCHMARK_VALUE_CONST, // New
      passedGeoBenchmark: false, // New, will be calculated below
      totalUserBenchmark: TOTAL_USER_BENCHMARK_VALUE_CONST, // New
      passedTotalUserBenchmark: false, // New
      sourceMedium: sourceMedium, // Added for total row display
    };

    // --- Recalculate averageEngagementDuration using row-level data ---
    try {
      const metricNames = singleResult.metricHeaders.map(h => h.name);
      const activeUsersIdx = metricNames.indexOf('activeUsers');
      const avgDurationIdx = metricNames.indexOf('averageSessionDurationPerUser');

      if (activeUsersIdx !== -1 && avgDurationIdx !== -1) {
        let weightedDurationSum = 0;
        let totalActiveUsersForCalc = 0;

        singleResult.rows.forEach(row => {
          const activeVal = parseFloat(row.metricValues[activeUsersIdx]?.value || '0');
          const avgDurVal = parseFloat(row.metricValues[avgDurationIdx]?.value || '0');

          weightedDurationSum += avgDurVal * activeVal;
          totalActiveUsersForCalc += activeVal;
        });

        if (totalActiveUsersForCalc > 0) {
          totals.averageEngagementDuration = weightedDurationSum / totalActiveUsersForCalc; // seconds already
        }
      }
    } catch (err) {
      console.error('[QueryResults] Error recalculating averageEngagementDuration:', err);
    }

    // Correctly calculate "Passed TOS Benchmark" for the total row
    totals.passedBenchmark = totals.averageEngagementDuration >= totals.tosBenchmark;
    // Calculate "Passed Geo Benchmark" for the total row using the property's overall new user percentage
    totals.passedGeoBenchmark = propertyOverallNewUserPercent >= totals.userPercentBenchmark;
    totals.passedTotalUserBenchmark = totals.totalUsers >= totals.totalUserBenchmark; // New

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
        console.log('[QueryResults] Processing singleResult for display:', JSON.parse(JSON.stringify(singleResult))); // Deep copy for logging
        const totals = calculatePropertyTotalsForDisplay(singleResult);
        const orderedDisplayColumns = getOrderedColumnsForDisplay(singleResult.dimensionHeaders, singleResult.metricHeaders);

        return (
          <div key={`result-${index}`} className="border rounded p-4">
            <h3 className="text-lg font-semibold mb-2 flex items-center">
              <span>Property: {propertyMap[singleResult.propertyId] || propertyMap[singleResult.propertyId.replace('properties/', '')] || singleResult.propertyName || singleResult.propertyId}</span>
              <span className="text-sm text-gray-500 ml-2">({singleResult.propertyId})</span>
              <span className={`ml-4 text-sm px-2 py-1 rounded-full ${totals.passedBenchmark ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {totals.passedBenchmark ? 'PASSED TOS BENCHMARK' : 'FAILED TOS BENCHMARK'}
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
                          let cellValue: React.ReactNode = '';
                          if (colIndex === 0) { 
                            cellValue = 'Total';
                          } else if (column.name === formatDisplayColumnHeader('Date Range')) {
                            cellValue = column.value || effectiveDateRange.replace(/\n/g, ' - ');
                          } else if (column.internalName === 'firstUserSourceMedium') {
                            cellValue = totals.sourceMedium;
                          } else if (column.internalName === 'averageSessionDurationPerUser') {
                            cellValue = formatDurationForDisplay(totals.averageEngagementDuration);
                          } else if (column.internalName === 'Passed Benchmark') {
                            const passedStatus = totals.passedBenchmark;
                            return (
                              <td 
                                key={`total-cell-${index}-${colIndex}`} 
                                className={`py-2 px-4 border text-sm text-right ${column.className || ''}`}
                              >
                                <span className={`px-2 py-1 rounded ${passedStatus ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                  {passedStatus ? 'TRUE' : 'FALSE'}
                                </span>
                              </td>
                            );
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
                              case formatDisplayColumnHeader('averageSessionDurationPerUser'):
                                // Use the property-wide average engagement duration already calculated in totals
                                cellValue = formatDurationForDisplay(totals.averageEngagementDuration);
                                break;
                              case formatDisplayColumnHeader('TOS Benchmark'):
                                cellValue = formatDisplayColumnValue(totals.tosBenchmark.toString(), 'TOS Benchmark');
                                break;
                              case formatDisplayColumnHeader('Passed Benchmark'):
                                const passedStatus = totals.passedBenchmark;
                                return (
                                  <td 
                                    key={`total-cell-${index}-${colIndex}`} 
                                    className={`py-2 px-4 border text-sm text-right ${column.className || ''}`}
                                  >
                                    <span className={`px-2 py-1 rounded ${passedStatus ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                      {passedStatus ? 'TRUE' : 'FALSE'}
                                    </span>
                                  </td>
                                );
                              case formatDisplayColumnHeader('User % Benchmark'):
                                cellValue = formatColumnValue(totals.userPercentBenchmark.toString(), 'User % Benchmark');
                                break;
                              case formatDisplayColumnHeader('Passed Geo Benchmark'):
                                const isGeoPassed = totals.passedGeoBenchmark;
                                return (
                                  <td 
                                    key={`total-cell-${index}-${colIndex}`} 
                                    className={`py-2 px-4 border text-sm text-right ${column.className || ''}`}
                                  >
                                    <span className={`px-2 py-1 rounded ${isGeoPassed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                      {isGeoPassed ? 'TRUE' : 'FALSE'}
                                    </span>
                                  </td>
                                );
                              case formatDisplayColumnHeader('Total User Benchmark'):
                                cellValue = formatColumnValue(totals.totalUserBenchmark.toString(), 'Total User Benchmark');
                                break;
                              case formatDisplayColumnHeader('Passed Total User Benchmark'):
                                const isTotalUserPassed = totals.passedTotalUserBenchmark;
                                return (
                                  <td 
                                    key={`total-cell-${index}-${colIndex}`} 
                                    className={`py-2 px-4 border text-sm text-right ${column.className || ''}`}
                                  >
                                    <span className={`px-2 py-1 rounded ${isTotalUserPassed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                      {isTotalUserPassed ? 'TRUE' : 'FALSE'}
                                    </span>
                                  </td>
                                );
                              default:
                                // For "Total User %" in the total row, set to empty or N/A
                                if (column.name === formatDisplayColumnHeader('New User %')) { // 'New User %' is internal name for 'Total User %'
                                   cellValue = totals.totalUserPercentForDisplayInTotalRow;
                                } else {
                                   cellValue = '';
                                }
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