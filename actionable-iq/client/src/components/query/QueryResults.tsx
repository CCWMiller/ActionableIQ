import React, { useState, useEffect, useMemo } from 'react';
// Import Redux hooks and selector
import { useSelector } from 'react-redux';
import { selectProperties, selectActiveQuery } from '../../store/slices/analyticsQuerySlice';
// Import the types
// Removed AnalyticsQueryError as it's not directly used here now
import { AnalyticsProperty, AnalyticsMultiQueryResponse, AnalyticsQueryResponse } from '../../types/analytics.types';
// import ReportResults from '../report/ReportResults'; // Commented out for now
import EmailReportModal from '../common/EmailReportModal';

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
    default: return name.charAt(0).toUpperCase() + name.slice(1).replace(/([A-Z])/g, ' $1');
  }
};

/**
 * Formats a value for display based on the column type
 * @param value The value to format
 * @param columnName The name of the column
 * @returns Formatted value
 */
const formatColumnValue = (value: string, columnName: string): string => {
  if (columnName === 'userEngagementDuration') {
    return `${value}s`;
  }
  return value;
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
      const map = allProperties.reduce((acc, prop) => {
        // Ensure both ID and DisplayName exist
        if (prop.propertyId && prop.displayName) {
           // Get the ID part after 'properties/' if it exists, otherwise use the ID as is
           const keyId = prop.propertyId.includes('/') ? prop.propertyId.split('/')[1] : prop.propertyId;
           if (keyId) { // Ensure we have a valid key
             acc[keyId] = prop.displayName;
           } else {
             console.warn(`[QueryResults] Could not determine key ID for property:`, prop);
           }
        } else {
            console.warn(`[QueryResults] Property missing ID or DisplayName:`, prop);
        }
        return acc;
      }, {} as Record<string, string>);
      setPropertyMap(map);
    } else {
      console.log('[QueryResults] No properties found in state to build map.');
    }
  }, [allProperties]); // Dependency array ensures this runs when properties load

  // const [showReportView, setShowReportView] = useState(false); // Commented out for now
  
  useEffect(() => {
    // Log component props on mount or when results change
    console.log('[QueryResults] Component rendered with:', {
      hasMultiResults: !!results,
      isLoading,
      hasError: !!error
    });
    
    // if (results) {
    //   console.log('[QueryResults] Query results object:', results); // Log the full results object
    //   console.log('[QueryResults] Multi-results structure:', {
    //     successCount: results.results?.length ?? 0,
    //     errorCount: results.errors?.length ?? 0,
    //     firstSuccessResult: results.results?.[0] ? {
    //        propertyId: results.results[0].propertyId, // Log the ID format here
    //        rowCount: results.results[0].rowCount,
    //        hasRows: !!results.results[0].rows && results.results[0].rows.length > 0,
    //     } : 'No successful results'
    //   });
    // }
  }, [results, isLoading, error]);
  
  // Get query date range from active query or use fallback
  const effectiveDateRange = useMemo(() => {
    // First check if dateRange prop is provided
    if (dateRange) {
      // Format with line break between dates
      return dateRange.replace(' to ', '\n');
    }
    
    // Then try to get date range from activeQuery
    if (activeQuery) {
      return `${activeQuery.startDate}\n${activeQuery.endDate}`;
    }
    
    // Fallback: check if there's a date range in the results metadata
    if (results?.results && results.results.length > 0) {
      // There might be metadata with date info
      const metadata = results.results[0].metadata;
      if (metadata) {
        // Check if there's a custom dataLastRefreshed or queryTime property that might have date info
        if (metadata.dataLastRefreshed) {
          const date = new Date(metadata.dataLastRefreshed);
          if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0]; // Return just the date part
          }
        }
      }
    }
    
    // Last resort - use current date range (last 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);
    
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    return `${formatDate(startDate)}\n${formatDate(endDate)}`;
  }, [dateRange, activeQuery, results]);
  
  // Handle downloading results as CSV (combined)
  const downloadCsv = () => {
    if (!results || !results.results || results.results.length === 0) return;

    let csvContent = '';
    let headersWritten = false;

    results.results.forEach(singleResult => {
      if (!singleResult || !singleResult.rows || singleResult.rows.length === 0) return; // Skip properties with no rows

      // Get headers and calculate totals
      const currentDimensionHeaders = singleResult.dimensionHeaders.map(h => h.name);
      const currentMetricHeaders = singleResult.metricHeaders.map(h => h.name);
      const totals = calculatePropertyTotals(singleResult); // Use the helper function

      // Define column order (ensure consistency with getOrderedColumns if possible, but tailored for CSV)
      type CsvColumn = {
        name: string;
        type: 'dimension' | 'metric' | 'added';
        originalIndex?: number;
        originalMetricName?: string; // Added for metrics
        value?: string; // Added for 'added' columns or hardcoded values
      };
      
      const csvColumns: CsvColumn[] = [];
      const regionIndex = currentDimensionHeaders.indexOf('region');
      if (regionIndex !== -1) csvColumns.push({ name: 'Region', type: 'dimension', originalIndex: regionIndex });
      csvColumns.push({ name: 'Date Range', type: 'added', value: effectiveDateRange.replace(/\n/g, ' - ') });
      const sourceMediumIndex = currentDimensionHeaders.findIndex(h => h === 'sourceMedium' || h === 'firstUserSourceMedium');
      if (sourceMediumIndex !== -1) csvColumns.push({ name: 'Source / Medium', type: 'dimension', originalIndex: sourceMediumIndex, value: 'client-command / email' }); // Hardcoded value for CSV
      
      const orderedMetrics = ['totalUsers', 'newUsers', 'activeUsers', 'userEngagementDuration'];
      orderedMetrics.forEach(metricName => {
        const metricIndex = currentMetricHeaders.indexOf(metricName);
        if (metricIndex !== -1) csvColumns.push({ name: formatColumnHeader(metricName), type: 'metric', originalMetricName: metricName, originalIndex: metricIndex });
      });
      
      // Add remaining dimension headers (excluding handled ones)
      currentDimensionHeaders.forEach((header, index) => {
        if (index !== regionIndex && index !== sourceMediumIndex) {
          csvColumns.push({ name: formatColumnHeader(header), type: 'dimension', originalIndex: index });
        }
      });
      
      // Add remaining metric headers (excluding handled ones)
      currentMetricHeaders.forEach((header, index) => {
        if (!orderedMetrics.includes(header)) {
          csvColumns.push({ name: formatColumnHeader(header), type: 'metric', originalMetricName: header, originalIndex: index });
        }
      });

      // Write headers if not already written
      if (!headersWritten) {
        const headerRow = ['PropertyID', 'PropertyName', ...csvColumns.map(col => col.name)];
        csvContent += headerRow.map(h => `"${h.replace(/"/g, '""')}"`).join(',') + '\n';
        headersWritten = true;
      }

      const propertyId = singleResult.propertyId;
      const propertyName = propertyMap[propertyId] || 'N/A';

      // --- Add Total Row to CSV --- 
      const totalRowData = [ 
        `"${propertyId}"`, 
        `"${propertyName.replace(/"/g, '""')}"`
      ];
      csvColumns.forEach(column => {
        let value = '';
        if (column.name === 'Region') { // Specific column for the 'Total' label
          value = 'Total';
        } else if (column.type === 'metric') {
            switch (column.originalMetricName) {
                case 'totalUsers': value = totals.totalUsers.toString(); break;
                case 'newUsers': value = totals.newUsers.toString(); break;
                case 'activeUsers': value = totals.activeUsers.toString(); break;
                case 'userEngagementDuration': value = formatColumnValue(totals.averageEngagementDuration.toString(), 'userEngagementDuration'); break;
                default: value = ''; // Leave other metrics blank in total row if any
            }
        }
        // Keep other dimensions/added columns blank for total row
        totalRowData.push(`"${value.replace(/"/g, '""')}"`);
      });
      csvContent += totalRowData.join(',') + '\n';
      // --- End Add Total Row to CSV ---

      // Add individual data rows
      const rows = singleResult.rows.map(row => {
        const rowData = [
          `"${propertyId}"`, 
          `"${propertyName.replace(/"/g, '""')}"`
        ];
        
        const dimensionValues = row.dimensionValues.map(d => d.value);
        const metricValues = row.metricValues.map(m => m.value);

        csvColumns.forEach(column => {
            let value = '';
            if (column.type === 'dimension') {
                if(column.name === 'Source / Medium') { // Use hardcoded value for consistency
                    value = column.value || '';
                } else if (typeof column.originalIndex === 'number') { // Check if index is valid
                    value = dimensionValues[column.originalIndex] || '';
                }
            } else if (column.type === 'added') {
                value = column.value || '';
            } else if (column.type === 'metric' && typeof column.originalIndex === 'number') { // Check if index is valid
                // Special calculation for Average Session Duration Per Active User for individual rows
                if (column.originalMetricName === 'userEngagementDuration') {
                    const engagementDurationIndex = column.originalIndex;
                    // Find the index of activeUsers within the *current* result's metric headers
                    const activeUsersIndex = singleResult.metricHeaders.findIndex(h => h.name === 'activeUsers'); 
                    
                    if (engagementDurationIndex !== -1 && activeUsersIndex !== -1 && activeUsersIndex < metricValues.length) {
                        const engagementDuration = Number(metricValues[engagementDurationIndex] || 0);
                        const activeUsers = Number(metricValues[activeUsersIndex] || 0);
                        const avgDurationPerUser = activeUsers > 0 ? (engagementDuration / activeUsers) : 0;
                        value = formatColumnValue(Math.round(avgDurationPerUser).toString(), 'userEngagementDuration');
                    } else {
                        value = '0s'; // Default if metrics not found
                    }
                } else {
                     // For other metrics, just get the value
                     value = metricValues[column.originalIndex] || '';
                     // We can optionally apply formatColumnValue here too if other metrics need formatting
                     // value = formatColumnValue(value, column.originalMetricName || ''); 
                }
            }
            rowData.push(`"${value.replace(/"/g, '""')}"`);
        });
        return rowData;
      });
      
      csvContent += rows.map(row => row.join(',')).join('\n') + '\n';
    });

    if (!csvContent) return; // No data rows were added
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `multi_analytics_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Commented out report view toggle
  // const toggleReportView = () => {
  //   setShowReportView(!showReportView);
  // };
  
  // Handle sending emails
  const handleSendEmails = async (emails: string[]) => {
    
    try {
      // --- Generate CSV data from current results FIRST ---
      console.log("[handleSendEmails] Generating CSV data from current results..."); // Use console.log
      const csvData = generateCombinedCsv(); 
      if (!csvData) {
        console.warn("[handleSendEmails] generateCombinedCsv returned empty data. Cannot send email."); // Use console.warn
        throw new Error('Could not generate report data to send.');
      }
       console.log(`[handleSendEmails] CSV data generated (Length: ${csvData.length})`); // Use console.log
      // --- End CSV Generation ---

      // Get the auth token from local storage
      const token = localStorage.getItem('auth_token');
      if (!token) {
        console.error("[handleSendEmails] Authentication token not found."); // Use console.error
        throw new Error('Authentication required to send email');
      }

      // --- Determine Report Name (simplified) ---
      // Use the name passed to the modal, which should be based on current view
      // Assuming 'reportName' prop passed to EmailReportModal is suitable
      const finalReportName = `GA4 Analytics Report ${new Date().toLocaleDateString()}`;
       console.log(`[handleSendEmails] Using report name: ${finalReportName}`); // Use console.log
      // --- End Report Name ---

      // Create the request payload for the /api/report/email endpoint
      const emailRequestPayload = {
        recipients: emails,
        reportName: finalReportName, // Use the determined name
        csvData: csvData // Send the generated CSV string
      };

      // Use the dedicated email endpoint
      console.log("[handleSendEmails] Preparing to send email"); // Use console.log
      const endpointUrl = '/api/report/email'; // Changed to relative path
      const requestOptions = {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailRequestPayload) // Send the correct payload
      };

      // Avoid logging the full Authorization header in production
      console.log('[handleSendEmails] Fetch Headers:', { 
          'Content-Type': requestOptions.headers['Content-Type'],
          'Authorization': requestOptions.headers.Authorization ? 'Bearer PRESENT' : 'Bearer MISSING' 
      });
      console.log('[handleSendEmails] Fetch Body:', requestOptions.body);

      const response = await fetch(endpointUrl, requestOptions);
      
      console.log(`[handleSendEmails] Response Status: ${response.status}`);
      console.log(`[handleSendEmails] Response Status Text: ${response.statusText}`);

      if (!response.ok) {
        let errorData = { message: `Request failed with status ${response.status}` };
        try {
           // Try to parse backend error message if available
           errorData = await response.json();
           console.error('[handleSendEmails] Received error response body:', errorData);
        } catch (parseError) {
           console.error('[handleSendEmails] Could not parse error response body. Status text:', response.statusText);
        }
        throw new Error(errorData.message || 'Failed to send email');
      }
      
      // Log success response data if needed
       try {
           const responseData = await response.json();
           console.log('[handleSendEmails] Received success response body:', responseData);
           return responseData; // Return the parsed success response
       } catch (parseError) {
           console.log('[handleSendEmails] Could not parse success response body, assuming success based on status code.');
           return { success: true, message: 'Email sent successfully (no JSON body)' }; // Indicate success
       }

    } catch (error) {
      console.error('[handleSendEmails] Error caught in catch block:', error);
      throw error;
    }
  };
  
  // Generate combined CSV string
  const generateCombinedCsv = () => {
    if (!results || !results.results || results.results.length === 0) {
      return '';
    }
    
    let csvContent = '';
    let headersWritten = false; // Track if headers have been added

    // Define column order (should match the display order)
    const firstResult = results.results[0];
    const orderedColumns = getOrderedColumns(
      firstResult.dimensionHeaders,
      firstResult.metricHeaders
    );

    // Add the header row if not already written
    if (!headersWritten) {
        const headerRow = ['Property ID', 'Property Name', ...orderedColumns.map(col => col.name)];
        csvContent += headerRow.map(h => `"${h.replace(/"/g, '""')}"`).join(',') + '\n';
        headersWritten = true;
    }
    
    // Add the data rows for each property
    results.results.forEach(result => {
      // Skip properties with no rows
      if (!result || !result.rows || result.rows.length === 0) return; 

      const propertyId = result.propertyId;
      const propertyName = propertyMap[propertyId] || propertyId;
      const totals = calculatePropertyTotals(result); // Calculate totals for this property

      // --- Add Total Row --- 
      const totalRowData = [
        `"${propertyId}"`,
        `"${propertyName.replace(/"/g, '""')}"`
      ];
      orderedColumns.forEach(column => {
          let value = '';
          if (column.name === 'Region') { // Use the first column for 'Total' label
              value = 'Total';
          } else if (column.type === 'metric') {
              // Map display name back to original metric name if needed, or rely on formatColumnHeader logic
              // This assumes column.name matches the keys in totals or requires mapping
              switch (column.name) {
                  case 'Total Users': value = totals.totalUsers.toString(); break;
                  case 'New Users': value = totals.newUsers.toString(); break;
                  case 'Active Users': value = totals.activeUsers.toString(); break;
                  case 'Average Session Duration Per Active User': value = formatColumnValue(totals.averageEngagementDuration.toString(), 'userEngagementDuration'); break;
                  default: value = '';
              }
          } 
          // Keep other dimension/added columns blank
          totalRowData.push(`"${value.replace(/"/g, '""')}"`);
      });
      csvContent += totalRowData.join(',') + '\n';
      // --- End Total Row ---

      // Add individual data rows
      result.rows.forEach(row => {
        const rowData = [
          `"${propertyId}"`,
          `"${propertyName.replace(/"/g, '""')}"`
        ];
        rowData.push(...orderedColumns.map(column => {
          const value = getCellValue(row, column); // Use existing getCellValue for individual rows
          return `"${value.replace(/"/g, '""')}"`;
        }));
        csvContent += rowData.join(',') + '\n';
      });
    });
    
    return csvContent;
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
  
  // Function to reorder columns for display
  const getOrderedColumns = (dimensionHeaders: any[], metricHeaders: any[]) => {
    // Create arrays to hold column information
    const columns: any[] = []; // Define type for columns array
    
    // Keep track of the indexes of special columns
    const regionIndex = dimensionHeaders.findIndex(h => h.name === 'region');
    const sourceMediumIndex = dimensionHeaders.findIndex(h => h.name === 'sourceMedium');
    const firstUserSourceMediumIndex = dimensionHeaders.findIndex(h => h.name === 'firstUserSourceMedium');
    const mediumIndex = sourceMediumIndex !== -1 ? sourceMediumIndex : firstUserSourceMediumIndex;
    
    const totalUsersIndex = metricHeaders.findIndex(h => h.name === 'totalUsers');
    const newUsersIndex = metricHeaders.findIndex(h => h.name === 'newUsers');
    const activeUsersIndex = metricHeaders.findIndex(h => h.name === 'activeUsers');
    const engagementDurationIndex = metricHeaders.findIndex(h => h.name === 'userEngagementDuration');
    
    // Region column (if exists)
    if (regionIndex !== -1) {
      columns.push({
        name: 'Region',
        type: 'dimension',
        originalIndex: regionIndex
      });
    }
    
    // Date Range column (added)
    columns.push({
      name: 'Date Range',
      type: 'added',
      value: effectiveDateRange,
      className: 'w-1/8 whitespace-pre' // Adjusted width and preserve whitespace
    });
    
    // Source/Medium column (if exists)
    if (mediumIndex !== -1) {
      columns.push({
        name: 'Source / Medium',
        type: 'dimension',
        originalIndex: mediumIndex,
        className: 'w-1/3' // Increased width for Source/Medium
      });
    }
    
    // Total Users (if exists)
    if (totalUsersIndex !== -1) {
      columns.push({
        name: 'Total Users',
        type: 'metric',
        originalIndex: totalUsersIndex
      });
    }
    
    // New Users (if exists)
    if (newUsersIndex !== -1) {
      columns.push({
        name: 'New Users',
        type: 'metric',
        originalIndex: newUsersIndex
      });
    }
    
    // Active Users (if exists)
    if (activeUsersIndex !== -1) {
      columns.push({
        name: 'Active Users',
        type: 'metric',
        originalIndex: activeUsersIndex
      });
    }
    
    // Engagement Duration (if exists)
    if (engagementDurationIndex !== -1) {
      columns.push({
        name: 'Average Session Duration Per Active User',
        type: 'metric',
        originalIndex: engagementDurationIndex,
        originalMetricName: 'userEngagementDuration', // Pass original name
        metricHeaders: metricHeaders, // Pass metric headers to getCellValue
        className: 'w-1/8' // Slightly increased width
      });
    }
    
    // Add remaining dimension headers
    dimensionHeaders.forEach((header, index) => {
      if (index !== regionIndex && index !== mediumIndex) {
        columns.push({
          name: formatColumnHeader(header.name),
          type: 'dimension',
          originalIndex: index
        });
      }
    });
    
    // Add remaining metric headers
    metricHeaders.forEach((header, index) => {
      if (index !== totalUsersIndex && index !== newUsersIndex && 
          index !== activeUsersIndex && index !== engagementDurationIndex) {
        columns.push({
          name: formatColumnHeader(header.name),
          type: 'metric',
          originalIndex: index,
          originalMetricName: header.name // Pass original name
        });
      }
    });
    
    return columns;
  };
  
  // Function to get cell value based on column information
  const getCellValue = (row: any, column: any) => {
    if (column.type === 'added') {
      return column.value;
    }
    
    if (column.type === 'dimension') {
      // Check if originalIndex exists and is valid before accessing
      if (typeof column.originalIndex === 'number' && column.originalIndex >= 0 && column.originalIndex < row.dimensionValues.length) {
        return row.dimensionValues[column.originalIndex].value;
      }
      return ''; // Return empty string if index is invalid
    }
    
    if (column.type === 'metric') {
        // Check if originalIndex exists and is valid
        if (typeof column.originalIndex !== 'number' || column.originalIndex < 0 || column.originalIndex >= row.metricValues.length) {
            return ''; // Return empty string if index is invalid
        }
        
        const metricName = column.name; // Use the formatted name for the switch
        let value = row.metricValues[column.originalIndex].value;
      
        // Special calculation for Average Session Duration Per Active User
        if (metricName === 'Average Session Duration Per Active User') {
            const engagementDurationIndex = column.originalIndex; // Already have this index
            const activeUsersIndex = column.metricHeaders.findIndex((h: any) => h.name === 'activeUsers'); // Find index for activeUsers
            
            if (engagementDurationIndex !== -1 && activeUsersIndex !== -1 && activeUsersIndex < row.metricValues.length) {
                const engagementDuration = Number(row.metricValues[engagementDurationIndex]?.value || 0);
                const activeUsers = Number(row.metricValues[activeUsersIndex]?.value || 0);
                
                const avgDurationPerUser = activeUsers > 0 ? (engagementDuration / activeUsers) : 0;
                // Format the calculated value (e.g., add 's') using the existing formatter
                return formatColumnValue(Math.round(avgDurationPerUser).toString(), 'userEngagementDuration'); 
            } else {
                return '0s'; // Return default if needed metrics aren't available
            }
        }
        
        // For other metrics, just return the formatted value
        // Find original metric name if needed for formatting (though formatColumnValue currently only checks for userEngagementDuration)
        const originalMetricName = column.originalMetricName || ''; // Assuming originalMetricName is passed if needed
        return formatColumnValue(value, originalMetricName);
    }
    
    return '';
  };
  
  /**
   * Calculates totals for metrics within a single property result.
   * @param singleResult The analytics response for a single property.
   * @returns An object containing the calculated totals.
   */
  const calculatePropertyTotals = (singleResult: AnalyticsQueryResponse) => {
    let totals = {
      totalUsers: 0,
      newUsers: 0,
      activeUsers: 0,
      engagementDurationSum: 0,
      rowCount: 0,
      averageEngagementDuration: 0,
    };

    if (!singleResult || !singleResult.rows || singleResult.rows.length === 0) {
      return totals; // Return zero totals if no rows
    }

    const metricIndices = {
      totalUsers: singleResult.metricHeaders.findIndex(h => h.name === 'totalUsers'),
      newUsers: singleResult.metricHeaders.findIndex(h => h.name === 'newUsers'),
      activeUsers: singleResult.metricHeaders.findIndex(h => h.name === 'activeUsers'),
      userEngagementDuration: singleResult.metricHeaders.findIndex(h => h.name === 'userEngagementDuration'),
    };

    totals.rowCount = singleResult.rows.length;
    singleResult.rows.forEach(row => {
      if (metricIndices.totalUsers !== -1) totals.totalUsers += Number(row.metricValues[metricIndices.totalUsers]?.value || 0);
      if (metricIndices.newUsers !== -1) totals.newUsers += Number(row.metricValues[metricIndices.newUsers]?.value || 0);
      if (metricIndices.activeUsers !== -1) totals.activeUsers += Number(row.metricValues[metricIndices.activeUsers]?.value || 0);
      if (metricIndices.userEngagementDuration !== -1) totals.engagementDurationSum += Number(row.metricValues[metricIndices.userEngagementDuration]?.value || 0);
    });

    // Calculate Average Engagement Duration Per Active User for the total
    const rawAvgDuration = totals.activeUsers > 0 
      ? (totals.engagementDurationSum / totals.activeUsers) 
      : 0;
    totals.averageEngagementDuration = Math.round(rawAvgDuration); // Round to nearest second

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
        // --- Calculate Totals ---
        const totals = calculatePropertyTotals(singleResult);
        // --- End Calculate Totals ---

        const orderedColumns = getOrderedColumns(singleResult.dimensionHeaders, singleResult.metricHeaders); // Get columns once

        return (
          <div key={`result-${index}`} className="border rounded p-4">
            <h3 className="text-lg font-semibold mb-2">
              Property: {propertyMap[singleResult.propertyId] || singleResult.propertyId}
              <span className="text-sm text-gray-500 ml-2">({singleResult.propertyId})</span>
            </h3>
            {singleResult.rows && singleResult.rows.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        {orderedColumns.map((column, i) => (
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
                      {/* --- Total Row --- */}
                      <tr className="bg-gray-200 font-semibold">
                        {orderedColumns.map((column, colIndex) => {
                          let cellValue = '';
                          if (colIndex === 0) { // Assuming first column is 'Region' or similar identifier
                            cellValue = 'Total';
                          } else {
                            switch (column.name) {
                              case 'Total Users':
                                cellValue = totals.totalUsers.toString();
                                break;
                              case 'New Users':
                                cellValue = totals.newUsers.toString();
                                break;
                              case 'Active Users':
                                cellValue = totals.activeUsers.toString();
                                break;
                              case 'Average Session Duration Per Active User':
                                // Format the average duration, potentially adding 's'
                                cellValue = formatColumnValue(totals.averageEngagementDuration.toString(), 'userEngagementDuration');
                                break;
                              // Add cases for other potential aggregated columns if needed
                              // case 'Date Range': // Keep blank
                              // case 'Source / Medium': // Keep blank
                              //   cellValue = ''; 
                              //   break;
                              default:
                                cellValue = ''; // Keep other dimension/added columns blank
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
                      {/* --- End Total Row --- */}
                      {singleResult.rows.map((row, rowIndex) => (
                        <tr key={`row-${index}-${rowIndex}`} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          {orderedColumns.map((column, colIndex) => (
                            <td 
                              key={`cell-${index}-${rowIndex}-${colIndex}`} 
                              className={`py-2 px-4 border text-sm text-gray-700 ${column.className || ''}`}
                            >
                              {getCellValue(row, column)}
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