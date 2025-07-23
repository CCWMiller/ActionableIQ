import { AnalyticsQueryResponse, AnalyticsProperty, AnalyticsMultiQueryResponse } from '../types/analytics.types';

// Default TOS benchmark value (can be overridden by data if available)
const DEFAULT_TOS_BENCHMARK_VALUE = 30;
const USER_PERCENT_BENCHMARK_VALUE = 60; // Added
const TOTAL_USER_BENCHMARK_VALUE = 5;   // Added

/**
 * Formats column headers for display
 * @param name The original header name
 * @returns Formatted header name
 */
export const formatColumnHeader = (name: string): string => {
  switch (name) {
    case 'newUsers': return 'New Users';
    case 'activeUsers': return 'Active Users';
    case 'totalUsers': return 'Total Users';
    case 'userEngagementDuration': return 'Average Session Duration Per Active User (s)';
    case 'averageSessionDurationPerUser': return 'Average Session Duration Per Active User (s)';
    case 'region': return 'Region';
    case 'sourceMedium': return 'Source / Medium';
    case 'firstUserSourceMedium': return 'Source / Medium';
    case 'New User %': return 'Total User %'; // Consistent with UI
    case 'TOS Benchmark': return 'TOS Benchmark';
    case 'Passed Benchmark': return 'Passed TOS Benchmark'; // Consistent with UI
    case 'User % Benchmark': return 'User % Benchmark'; // New
    case 'Passed Geo Benchmark': return 'Passed Geo Benchmark'; // New
    case 'Total User Benchmark': return 'Total User Benchmark'; // New
    case 'Passed Total User Benchmark': return 'Passed Total User Benchmark'; // New
    default: return name.charAt(0).toUpperCase() + name.slice(1).replace(/([A-Z])/g, ' $1');
  }
};

/**
 * Formats a value for display based on the column type for CSV reports
 * @param value The value to format
 * @param columnName The name of the column (this should be the *display name* after formatColumnHeader)
 * @returns Formatted value for CSV
 */
export const formatCsvColumnValue = (value: string, columnName: string): string => {
  if (value === null || value === undefined) return '';
  console.log("Column Name: ", columnName);
  const stringValue = String(value);

  // Using display names for checks here
  if (columnName === 'Total User %' || columnName === 'User % Benchmark') { // Modified for new column
    return `${stringValue}%`;
  }
  if (columnName === 'TOS Benchmark') {
    return `${stringValue}s`;
  }
  if (columnName === 'Passed TOS Benchmark' || columnName === 'Passed Geo Benchmark' || columnName === 'Passed Total User Benchmark') { // Modified for new columns
    return stringValue.toUpperCase(); // Output "TRUE" or "FALSE"
  }
  if (columnName === 'Total User Benchmark') { // New
    return stringValue; // No special formatting
  }
  return stringValue;
};


/**
 * Defines the order and type of columns for the CSV report.
 * @param dimensionHeaders Headers for dimension values from the API.
 * @param metricHeaders Headers for metric values from the API.
 * @param effectiveDateRange The date range string (e.g., "YYYY-MM-DD - YYYY-MM-DD").
 * @returns An array of column definitions.
 */
export const getReportColumns = (
    dimensionHeaders: Array<{ name: string }>,
    metricHeaders: Array<{ name: string }>, // These are allProcessedMetricHeaders from processQueryData
    effectiveDateRange: string
) => {
    const columns: Array<{
        name: string; // This will be the display name
        type: 'dimension' | 'metric' | 'added';
        originalIndex?: number;
        internalName: string; // Store the internal name for lookups
        value?: string; // For 'added' columns
        metricHeaders?: Array<{ name: string }>; // For context in getCsvCellValue
    }> = [];

    const addDimension = (internalName: string, displayName?: string, props?: object) => {
      const index = dimensionHeaders.findIndex(h => h.name === internalName);
      if (index !== -1) {
        columns.push({ 
          name: formatColumnHeader(displayName || internalName), 
          type: 'dimension', 
          originalIndex: index, 
          internalName,
          ...props 
        });
      }
    };

    // Order: Property ID and Property Name are prepended in generateStandardCsvReportData.
    // Then Region, Date Range, Source/Medium, followed by Metrics.

    // 1. Region
    addDimension('region');

    // 2. Date Range
    columns.push({ name: formatColumnHeader('Date Range'), type: 'added', value: effectiveDateRange, internalName: 'dateRange' });

    // 3. Source / Medium
    const sourceMediumInternalName = dimensionHeaders.some(h => h.name === 'firstUserSourceMedium') ? 'firstUserSourceMedium' : 'sourceMedium';
    addDimension(sourceMediumInternalName, 'Source / Medium');
    
    // 4. Metrics - strictly from orderedMetricsSpec
    const availableMetricsMap = new Map(metricHeaders.map(h => [h.name, h]));
    
    const orderedMetricsSpec = [
        // --- Query Results Section ---
        { internalName: 'totalUsers', displayName: 'Total Users' },
        { internalName: 'newUsers', displayName: 'New Users' },
        { internalName: 'activeUsers', displayName: 'Active Users' },
        { internalName: 'New User %', displayName: 'Total User %' }, // processQueryData adds 'New User %' which is displayed as 'Total User %'
        { internalName: 'averageSessionDurationPerUser', displayName: 'Average Session Duration Per Active User (s)' },
        
        // --- Actionable Data Section ---
        { internalName: 'TOS Benchmark', displayName: 'TOS Benchmark' },
        { internalName: 'Passed Benchmark', displayName: 'Passed TOS Benchmark' }, // processQueryData adds 'Passed Benchmark' for this
        { internalName: 'User % Benchmark', displayName: 'User % Benchmark' }, 
        { internalName: 'Passed Geo Benchmark', displayName: 'Passed Geo Benchmark' }, 
        { internalName: 'Total User Benchmark', displayName: 'Total User Benchmark' }, 
        { internalName: 'Passed Total User Benchmark', displayName: 'Passed Total User Benchmark' } 
    ];

    orderedMetricsSpec.forEach(metricSpec => {
        if (availableMetricsMap.has(metricSpec.internalName)) {
            columns.push({
                name: metricSpec.displayName || formatColumnHeader(metricSpec.internalName),
                type: 'metric',
                // Ensure originalIndex points to the metric's position in the input metricHeaders array for correct value lookup
                originalIndex: metricHeaders.findIndex(h => h.name === metricSpec.internalName),
                internalName: metricSpec.internalName,
                metricHeaders // Pass the full metricHeaders for context if getCsvCellValue needs it
            });
        } else {
            // Metric from orderedMetricsSpec not found in availableHeaders. It will be omitted.
            // console.warn(`[csvUtils] Metric "${metricSpec.internalName}" from orderedMetricsSpec was not found in available metricHeaders.`);
        }
    });
    
    // Fallback for any other DIMENSION headers not already included explicitly
    dimensionHeaders.forEach((header, index) => {
        if (!columns.some(c => c.internalName === header.name && c.type === 'dimension')) {
            // Call addDimension to maintain consistency, ensuring originalIndex is set correctly.
            addDimension(header.name, header.name, { originalIndex: index });
        }
    });

    // NO FALLBACK FOR METRICS. Only metrics in orderedMetricsSpec are included.

    return columns;
};

/**
 * Retrieves and formats the value for a specific cell in the CSV.
 * @param row The data for the current row.
 * @param column The column definition from getReportColumns.
 * @param allMetricHeaders All metric headers for the current property from singleResult.metricHeaders.
 * @param propertyTotalTotalUsers Total users for the property (used for 'Total User %' calculation for the row if needed, though processQueryData should pre-calculate it).
 * @param currentPropertyTosBenchmark Property-specific TOS benchmark.
 * @returns The string value for the cell.
 */
export const getCsvCellValue = (
    row: { dimensionValues: Array<{ value: string }>, metricValues: Array<{ value: string }> },
    column: {
        name: string; // Display Name
        type: 'dimension' | 'metric' | 'added';
        originalIndex?: number;
        internalName: string; // Internal Name
        value?: string; 
        metricHeaders?: Array<{ name: string }>;
    },
    allMetricHeaders: Array<{ name: string }>,
    propertyTotalTotalUsers: number, // For context, though New User % should be pre-calculated
    currentPropertyTosBenchmark: number
): string => {
    if (column.type === 'added') {
        return column.value !== undefined && column.value !== null ? String(column.value) : '';
    }

    if (column.type === 'dimension') {
        if (typeof column.originalIndex === 'number' && column.originalIndex >= 0 && column.originalIndex < row.dimensionValues.length) {
            return row.dimensionValues[column.originalIndex].value || '';
        }
        return '';
    }

    if (column.type === 'metric') {
        // Find the metric value by its internalName in the row's metricValues
        // This assumes processQueryData has added all necessary metrics (original and calculated) to metricValues
        // and their headers (with internalName) to allMetricHeaders.
        const headerIndexInAll = allMetricHeaders.findIndex(h => h.name === column.internalName);
        let rawValue: string | undefined = undefined;

        if (headerIndexInAll !== -1 && headerIndexInAll < row.metricValues.length) {
            rawValue = row.metricValues[headerIndexInAll].value;
        } else {
            // Fallback for metrics that might need on-the-fly calculation if not found directly (e.g. Avg Session Duration)
            if (column.internalName === 'averageSessionDurationPerUser') { // This refers to the request for Avg Session Duration
                const engagementSumIndex = allMetricHeaders.findIndex(h => h.name === 'averageSessionDurationPerUser'); // Actual sum
                const activeUsersIdx = allMetricHeaders.findIndex(h => h.name === 'activeUsers');
                if (engagementSumIndex !== -1 && activeUsersIdx !== -1 && 
                    engagementSumIndex < row.metricValues.length && activeUsersIdx < row.metricValues.length) {
                    const engagementDurationSum = Number(row.metricValues[engagementSumIndex].value || 0);
                    const activeUsers = Number(row.metricValues[activeUsersIdx].value || 0);
                    const avgDuration = activeUsers > 0 ? (engagementDurationSum / activeUsers) : 0;
                    return formatCsvColumnValue(Math.round(avgDuration).toString(), column.name); // Format with display name
                }
                return formatCsvColumnValue('0', column.name);
            }
            // For 'New User %', 'Passed Benchmark', 'User % Benchmark', 'Passed Geo Benchmark', 
            // 'Total User Benchmark', 'Passed Total User Benchmark', 'TOS Benchmark'
            // processQueryData should have already put these values into row.metricValues.
            // If they are not found by internalName, it implies an issue or they weren't added, so default to '0' or empty.
        }
        
        return formatCsvColumnValue(rawValue || '0', column.name); // Format with display name
    }
    return '';
};

/**
 * Calculates totals for a single property's results for CSV reporting.
 * @param singleResult The analytics response for a single property.
 * @param propertyTosBenchmark Optional property-specific TOS benchmark.
 * @returns An object containing calculated totals.
 */
export const calculateCsvRowTotals = (singleResult: AnalyticsQueryResponse, propertyTosBenchmark?: number) => {
    const totals = {
        totalUsers: singleResult.totalUsers || 0,
        newUsers: singleResult.totalNewUsers || 0,
        activeUsers: singleResult.totalActiveUsers || 0,
        averageEngagementDuration: singleResult.totalAverageSessionDurationPerUser || 0,
        totalUserPercent: '', // For CSV total row, this should be blank
        tosBenchmark: propertyTosBenchmark !== undefined ? propertyTosBenchmark : DEFAULT_TOS_BENCHMARK_VALUE,
        passedTosBenchmark: false, // Will be calculated below
        userPercentBenchmark: USER_PERCENT_BENCHMARK_VALUE, // New
        passedGeoBenchmark: false, // New
        totalUserBenchmark: TOTAL_USER_BENCHMARK_VALUE, // New
        passedTotalUserBenchmark: false, // New
    };

    if (!singleResult) {
        return {
            totalUsers: 0, newUsers: 0, activeUsers: 0, averageEngagementDuration: 0,
            totalUserPercent: '', // Blank for CSV total row
            tosBenchmark: DEFAULT_TOS_BENCHMARK_VALUE, passedTosBenchmark: false,
            userPercentBenchmark: USER_PERCENT_BENCHMARK_VALUE, passedGeoBenchmark: false,
            totalUserBenchmark: TOTAL_USER_BENCHMARK_VALUE, passedTotalUserBenchmark: false,
        };
    }

    // Determine if total average passes TOS benchmark
    totals.passedTosBenchmark = totals.averageEngagementDuration >= totals.tosBenchmark;
    // For the CSV total row, 'Passed Geo Benchmark' should reflect the property-wide new user percentage.
    const propertyOverallNewUserPercent = singleResult.totalPercentageOfNewUsers || 0;
    totals.passedGeoBenchmark = propertyOverallNewUserPercent >= totals.userPercentBenchmark;
    totals.passedTotalUserBenchmark = totals.totalUsers >= totals.totalUserBenchmark;

    // No need to recalculate weighted average; server already provides property-wide average.

    return totals;
};


/**
 * Generates a CSV string from analytics data.
 * @param analyticsResults An array of AnalyticsQueryResponse or a single AnalyticsMultiQueryResponse.
 * @param propertyMap A map of propertyId to propertyName.
 * @param effectiveDateRangeString The date range for the report (e.g., "YYYY-MM-DD - YYYY-MM-DD").
 * @param globalTosBenchmark Optional global TOS benchmark to use if not specified per property.
 * @returns A string containing the CSV data.
 */
export const generateStandardCsvReportData = (
    analyticsResults: AnalyticsQueryResponse[] | AnalyticsMultiQueryResponse,
    propertyMap: Record<string, string>,
    effectiveDateRangeString: string, 
    globalTosBenchmark?: number 
): string => {
    let csvContent = '';
    const resultsArray: AnalyticsQueryResponse[] = Array.isArray(analyticsResults)
        ? analyticsResults
        : (analyticsResults as AnalyticsMultiQueryResponse).results || [];

    if (!resultsArray || resultsArray.length === 0) {
        // Create a header row even for empty data, including new columns
        const tempDimensionHeaders: Array<{ name: string }> = [{name: 'region'}, {name: 'firstUserSourceMedium'}];
        const tempMetricHeaders: Array<{ name: string }> = [
            {name: 'totalUsers'}, {name: 'newUsers'}, {name: 'activeUsers'}, 
            {name: 'userEngagementDuration'}, {name: 'New User %'}, 
            {name: 'TOS Benchmark'}, {name: 'Passed Benchmark'},
            {name: 'User % Benchmark'}, {name: 'Passed Geo Benchmark'}, // New
            {name: 'Total User Benchmark'}, {name: 'Passed Total User Benchmark'} // New
        ];
        const orderedCols = getReportColumns(tempDimensionHeaders, tempMetricHeaders, effectiveDateRangeString);
        const headerRowForEmpty = ["Property ID", "Property Name", ...orderedCols.map(col => col.name)];
        csvContent = headerRowForEmpty.map(h => `"${String(h || '').replace(/"/g, '""')}"`).join(',') + '\r\n';
        const noDataCells = Array(headerRowForEmpty.length).fill('"No Data"').join(',');
        csvContent += noDataCells + '\r\n';
        return csvContent;
    }

    const firstResult = resultsArray[0];
    // Use all metric headers from the first result, assuming processQueryData made them consistent
    const allProcessedMetricHeaders = firstResult.metricHeaders || []; 
    const reportColumns = getReportColumns(firstResult.dimensionHeaders, allProcessedMetricHeaders, effectiveDateRangeString);
    const headerRow = ["Property ID", "Property Name", ...reportColumns.map(c => c.name)];
    csvContent = headerRow.map(h => `"${String(h || '').replace(/"/g, '""')}"`).join(',') + '\r\n';

    resultsArray.forEach(singleResult => {
        if (!singleResult || !singleResult.rows) return;

        const propertyId = singleResult.propertyId;
        const propertyName = propertyMap[propertyId] || propertyMap[propertyId.replace(/^properties\//, '')] || singleResult.propertyName || propertyId;
        let currentPropertyTosBenchmark = globalTosBenchmark !== undefined ? globalTosBenchmark : DEFAULT_TOS_BENCHMARK_VALUE;
        
        // For currentPropertyTosBenchmark, check if 'TOS Benchmark' value exists in the first row's metrics.
        // This assumes 'TOS Benchmark' was added by processQueryData consistently if it exists.
        const tosBenchmarkHeaderIndex = singleResult.metricHeaders.findIndex(h => h.name === 'TOS Benchmark');
        if (singleResult.rows.length > 0 && tosBenchmarkHeaderIndex !== -1 && 
            singleResult.rows[0].metricValues[tosBenchmarkHeaderIndex]?.value !== undefined) {
            currentPropertyTosBenchmark = Number(singleResult.rows[0].metricValues[tosBenchmarkHeaderIndex].value || currentPropertyTosBenchmark);
        }

        const totals = calculateCsvRowTotals(singleResult, currentPropertyTosBenchmark);

        const totalRowData: string[] = [
            `"${propertyId}"`,
            `"${propertyName.replace(/"/g, '""')}"`
        ];
        reportColumns.forEach(column => {
            let valueStr = '';
            if (column.internalName === 'region') { 
                valueStr = 'Total';
            } else if (column.internalName === 'dateRange') {
                valueStr = column.value || effectiveDateRangeString;
            } else if (column.type === 'metric') {
                // Use column.internalName for reliable lookup in totals object keys
                switch (column.internalName) { 
                    case 'totalUsers': valueStr = totals.totalUsers.toString(); break;
                    case 'newUsers': valueStr = totals.newUsers.toString(); break;
                    case 'activeUsers': valueStr = totals.activeUsers.toString(); break;
                    case 'averageSessionDurationPerUser': // This is for 'Average Session Duration Per User'
                        valueStr = formatCsvColumnValue(totals.averageEngagementDuration.toFixed(2), column.name); // Use display name for formatting context
                        break;
                    case 'New User %': // This is for 'Total User %' in the CSV total row
                        valueStr = totals.totalUserPercent; // This is now an empty string from calculateCsvRowTotals
                        break;
                    case 'TOS Benchmark': 
                        valueStr = formatCsvColumnValue(String(totals.tosBenchmark), column.name);
                        break;
                    case 'Passed Benchmark': // This is for 'Passed TOS Benchmark'
                        valueStr = formatCsvColumnValue(totals.passedTosBenchmark.toString(), column.name);
                        break;
                    // New columns for the total row
                    case 'User % Benchmark':
                        valueStr = formatCsvColumnValue(totals.userPercentBenchmark.toString(), column.name);
                        break;
                    case 'Passed Geo Benchmark':
                        valueStr = formatCsvColumnValue(totals.passedGeoBenchmark.toString(), column.name);
                        break;
                    case 'Total User Benchmark':
                        valueStr = formatCsvColumnValue(totals.totalUserBenchmark.toString(), column.name);
                        break;
                    case 'Passed Total User Benchmark':
                        valueStr = formatCsvColumnValue(totals.passedTotalUserBenchmark.toString(), column.name);
                        break;
                    default: valueStr = '0';
                }
            }
            totalRowData.push(`"${String(valueStr || '').replace(/"/g, '""')}"`);
        });
        csvContent += totalRowData.join(',') + '\r\n';

        if (singleResult.rows.length > 0) {
            singleResult.rows.forEach(row => {
                const rowData: string[] = [
                    `"${propertyId}"`,
                    `"${propertyName.replace(/"/g, '""')}"`
                ];
                reportColumns.forEach(column => {
                    // Pass allMetricHeaders from singleResult for context in getCsvCellValue
                    const cellVal = getCsvCellValue(row, column, singleResult.metricHeaders, totals.totalUsers, currentPropertyTosBenchmark);
                    rowData.push(`"${String(cellVal || '').replace(/"/g, '""')}"`);
                });
                csvContent += rowData.join(',') + '\r\n';
            });
        }
    });
    return csvContent;
}; 