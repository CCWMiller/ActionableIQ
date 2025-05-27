import { AnalyticsQueryResponse, AnalyticsProperty, AnalyticsMultiQueryResponse } from '../types/analytics.types';

// Default TOS benchmark value (can be overridden by data if available)
const DEFAULT_TOS_BENCHMARK_VALUE = 30;

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
 * Formats a value for display based on the column type for CSV reports
 * @param value The value to format
 * @param columnName The name of the column
 * @returns Formatted value for CSV
 */
export const formatCsvColumnValue = (value: string, columnName: string): string => {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);

  if (columnName === 'userEngagementDuration') {
    return `${stringValue}s`;
  }
  if (columnName === 'Total User %') {
    return `${stringValue}%`;
  }
  if (columnName === 'TOS Benchmark') {
    return `${stringValue}s`;
  }
  if (columnName === 'Passed Benchmark') {
    return stringValue.toUpperCase(); // Output "TRUE" or "FALSE"
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
    metricHeaders: Array<{ name: string }>,
    effectiveDateRange: string
) => {
    const columns: Array<{
        name: string;
        type: 'dimension' | 'metric' | 'added';
        originalIndex?: number;
        originalMetricName?: string;
        value?: string; // For 'added' columns
        metricHeaders?: Array<{ name: string }>; // For complex calculations like avg engagement in getCellValue
    }> = [];

    const regionIndex = dimensionHeaders.findIndex(h => h.name === 'region');
    const sourceMediumIndex = dimensionHeaders.findIndex(h => h.name === 'sourceMedium' || h.name === 'firstUserSourceMedium');

    // Order: Region, Date Range, Source/Medium, Metrics, then other dimensions
    // Columns are added according to the user-specified order.

    // 1. Region (from dimensionHeaders, becomes 3rd in CSV after Property ID, Property Name)
    if (regionIndex !== -1) {
        columns.push({ name: formatColumnHeader('region'), type: 'dimension', originalIndex: regionIndex });
    }

    // 2. Date Range (added, becomes 4th)
    columns.push({ name: 'Date Range', type: 'added', value: effectiveDateRange });

    // 3. Source / Medium (from dimensionHeaders, becomes 5th)
    if (sourceMediumIndex !== -1) {
        columns.push({ name: formatColumnHeader('firstUserSourceMedium'), type: 'dimension', originalIndex: sourceMediumIndex });
    }
    
    // 4. Metrics in specified order (become 6th to 12th)
    const orderedMetricsSpec = [
        { apiName: 'totalUsers', displayName: 'Total Users' },
        { apiName: 'newUsers', displayName: 'New Users' },
        { apiName: 'activeUsers', displayName: 'Active Users' },
        { apiName: 'userEngagementDuration', displayName: 'Average Session Duration Per Active User' }, // Will be calculated as average
        { apiName: 'Total User %', displayName: 'Total User %' }, // Calculated, needs 'totalUsers'
        { apiName: 'TOS Benchmark', displayName: 'TOS Benchmark' }, // Default or from data
        { apiName: 'Passed Benchmark', displayName: 'Passed Benchmark' } // Calculated
    ];

    orderedMetricsSpec.forEach(metricSpec => {
        const metricIndex = metricHeaders.findIndex(h => h.name === metricSpec.apiName || h.name === metricSpec.displayName);
        const isCalculatedOrAlwaysAdded = metricSpec.apiName === 'Total User %' || metricSpec.apiName === 'TOS Benchmark' || metricSpec.apiName === 'Passed Benchmark';
        const baseMetricExistsForCalc = metricSpec.apiName === 'Total User %' && metricHeaders.some(h => h.name === 'totalUsers');

        if (metricIndex !== -1 || isCalculatedOrAlwaysAdded || baseMetricExistsForCalc) {
            columns.push({
                name: metricSpec.displayName, // Use the exact display name specified
                type: 'metric',
                originalIndex: metricIndex !== -1 ? metricIndex : undefined,
                originalMetricName: metricSpec.apiName, // Store the API name for lookups in getCsvCellValue
                metricHeaders: metricHeaders 
            });
        }
    });
    
    // Add any other dimension headers not already included (these will appear after the specified columns)
    dimensionHeaders.forEach((header, index) => {
        if (!columns.some(c => c.type === 'dimension' && c.originalIndex === index)) {
            columns.push({ name: formatColumnHeader(header.name), type: 'dimension', originalIndex: index });
        }
    });

    // Add any other metric headers not already included (these will appear after the specified columns)
    metricHeaders.forEach((header) => {
        const formattedName = formatColumnHeader(header.name);
        // Ensure we don't re-add columns already defined or the old "New User %" related headers
        if (!columns.some(c => c.type === 'metric' && (c.originalMetricName === header.name || c.name === formattedName)) &&
            header.name !== 'newUsers' && formattedName !== 'New User %' && header.name !== 'New User %') { // Explicitly skip 'newUsers' and its formatted versions
            columns.push({ 
                name: formattedName, 
                type: 'metric', 
                originalIndex: metricHeaders.findIndex(h => h.name === header.name),
                originalMetricName: header.name,
                metricHeaders: metricHeaders
            });
        }
    });

    return columns;
};

/**
 * Retrieves and formats the value for a specific cell in the CSV.
 * @param row The data for the current row.
 * @param column The column definition.
 * @param metricHeadersFromSingleResult All metric headers for context (e.g., for calculating averages).
 * @param propertyTotalTotalUsers Total users for the property.
 * @param currentPropertyTosBenchmark Optional property-specific TOS benchmark.
 * @returns The string value for the cell.
 */
export const getCsvCellValue = (
    row: { dimensionValues: Array<{ value: string }>, metricValues: Array<{ value: string }> },
    column: {
        name: string;
        type: 'dimension' | 'metric' | 'added';
        originalIndex?: number;
        originalMetricName?: string;
        value?: string; // For 'added' columns
        metricHeaders?: Array<{ name: string }>; // All metric headers for context
    },
    metricHeadersFromSingleResult: Array<{ name: string }>,
    propertyTotalTotalUsers: number,
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
        let rawValue: string | undefined = undefined;

        if (typeof column.originalIndex === 'number' && column.originalIndex >= 0 && column.originalIndex < row.metricValues.length) {
            rawValue = row.metricValues[column.originalIndex].value;
        }

        // Handle calculated metrics
        if (column.name === 'Average Session Duration Per Active User') {
            const engagementDurationSumIndex = column.metricHeaders?.findIndex(h => h.name === 'userEngagementDuration');
            const activeUsersIndex = column.metricHeaders?.findIndex(h => h.name === 'activeUsers');

            if (engagementDurationSumIndex !== undefined && engagementDurationSumIndex !== -1 && activeUsersIndex !== undefined && activeUsersIndex !== -1 &&
                engagementDurationSumIndex < row.metricValues.length && activeUsersIndex < row.metricValues.length) {
                const engagementDurationSum = Number(row.metricValues[engagementDurationSumIndex].value || 0);
                const activeUsers = Number(row.metricValues[activeUsersIndex].value || 0);
                const avgDuration = activeUsers > 0 ? (engagementDurationSum / activeUsers) : 0;
                return formatCsvColumnValue(Math.round(avgDuration).toString(), 'userEngagementDuration');
            }
            return formatCsvColumnValue('0', 'userEngagementDuration');
        }

        if (column.name === 'Total User %') {
            const rowTotalUsersIndex = metricHeadersFromSingleResult.findIndex(h => h.name === 'totalUsers');
            if (rowTotalUsersIndex !== -1 && rowTotalUsersIndex < row.metricValues.length && propertyTotalTotalUsers > 0) {
                const rowTotalUsers = Number(row.metricValues[rowTotalUsersIndex].value || 0);
                const totalUserPerc = (rowTotalUsers / propertyTotalTotalUsers) * 100;
                return formatCsvColumnValue(totalUserPerc.toFixed(2), 'Total User %');
            }
            return formatCsvColumnValue('0', 'Total User %');
        }
        
        if (column.name === 'TOS Benchmark') {
            // If TOS Benchmark data is directly in metricValues (e.g., from QueryForm results for the total row)
            // or if it needs to be consistently applied from a property-level or global benchmark for rows.
            // The currentPropertyTosBenchmark parameter now handles this consistency for rows.
            if (rawValue !== undefined && column.originalMetricName === 'TOS Benchmark') {
                 return formatCsvColumnValue(rawValue, 'TOS Benchmark');
            }
            // Otherwise, use the passed currentPropertyTosBenchmark for rows or default for totals if not passed.
            return formatCsvColumnValue(String(currentPropertyTosBenchmark !== undefined ? currentPropertyTosBenchmark : DEFAULT_TOS_BENCHMARK_VALUE), 'TOS Benchmark');
        }

        if (column.name === 'Passed Benchmark') {
            // This calculation is for individual data rows in the CSV.
            // It uses metricHeadersFromSingleResult to find necessary indices for the current row's data.
            const engagementDurationSumIndex = metricHeadersFromSingleResult?.findIndex(h => h.name === 'userEngagementDuration');
            const activeUsersIndex = metricHeadersFromSingleResult?.findIndex(h => h.name === 'activeUsers');
            
            let avgEngForRow = 0;
            if (engagementDurationSumIndex !== undefined && engagementDurationSumIndex !== -1 && 
                activeUsersIndex !== undefined && activeUsersIndex !== -1 &&
                engagementDurationSumIndex < row.metricValues.length && activeUsersIndex < row.metricValues.length) {
                
                const engagementDurationSum = Number(row.metricValues[engagementDurationSumIndex].value || 0);
                const activeUsers = Number(row.metricValues[activeUsersIndex].value || 0);
                avgEngForRow = activeUsers > 0 ? Math.round(engagementDurationSum / activeUsers) : 0;
            }
            
            const benchmarkToCompare = currentPropertyTosBenchmark !== undefined ? currentPropertyTosBenchmark : DEFAULT_TOS_BENCHMARK_VALUE;
            const passed = avgEngForRow > benchmarkToCompare;
            return formatCsvColumnValue(String(passed).toUpperCase(), 'Passed Benchmark');
        }

        return formatCsvColumnValue(rawValue || '0', column.originalMetricName || column.name);
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
        totalUsers: 0,
        newUsers: 0,
        activeUsers: 0,
        engagementDurationSum: 0,
        averageEngagementDuration: 0,
        tosBenchmark: propertyTosBenchmark !== undefined ? propertyTosBenchmark : DEFAULT_TOS_BENCHMARK_VALUE,
        passedBenchmark: false,
    };

    if (!singleResult || !singleResult.rows || singleResult.rows.length === 0) {
        return totals;
    }

    const metricIndices = {
        totalUsers: singleResult.metricHeaders.findIndex(h => h.name === 'totalUsers'),
        newUsers: singleResult.metricHeaders.findIndex(h => h.name === 'newUsers'),
        activeUsers: singleResult.metricHeaders.findIndex(h => h.name === 'activeUsers'),
        userEngagementDuration: singleResult.metricHeaders.findIndex(h => h.name === 'userEngagementDuration'),
        // 'Total User %', 'TOS Benchmark', 'Passed Benchmark' are calculated or use default/passed value
    };
    
    // If a TOS Benchmark value is provided in the *metric data itself* (e.g. from QueryForm flow), use it for this property.
    // This assumes it might be present in metricHeaders and metricValues for each row.
    const dataTosBenchmarkIndex = singleResult.metricHeaders.findIndex(h => h.name === 'TOS Benchmark');
    if (dataTosBenchmarkIndex !== -1 && singleResult.rows[0]?.metricValues[dataTosBenchmarkIndex]?.value !== undefined) {
        totals.tosBenchmark = Number(singleResult.rows[0].metricValues[dataTosBenchmarkIndex].value || totals.tosBenchmark);
    }


    singleResult.rows.forEach(row => {
        if (metricIndices.totalUsers !== -1) totals.totalUsers += Number(row.metricValues[metricIndices.totalUsers]?.value || 0);
        if (metricIndices.newUsers !== -1) totals.newUsers += Number(row.metricValues[metricIndices.newUsers]?.value || 0);
        if (metricIndices.activeUsers !== -1) totals.activeUsers += Number(row.metricValues[metricIndices.activeUsers]?.value || 0);
        if (metricIndices.userEngagementDuration !== -1) totals.engagementDurationSum += Number(row.metricValues[metricIndices.userEngagementDuration]?.value || 0);
    });

    totals.averageEngagementDuration = totals.activeUsers > 0 ? Math.round(totals.engagementDurationSum / totals.activeUsers) : 0;
    totals.passedBenchmark = totals.averageEngagementDuration > totals.tosBenchmark;

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
    effectiveDateRangeString: string, // Expects "YYYY-MM-DD - YYYY-MM-DD"
    globalTosBenchmark?: number 
): string => {
    let csvContent = '';

    // Extract the actual results array, whether it's a direct array or nested
    const resultsArray: AnalyticsQueryResponse[] = Array.isArray(analyticsResults)
        ? analyticsResults
        : (analyticsResults as AnalyticsMultiQueryResponse).results || [];

    if (!resultsArray || resultsArray.length === 0) {
        console.warn("[generateStandardCsvReportData] No results to process for CSV.");
        // Return a CSV with headers and a "No Data" message if results are empty
        // To form headers correctly, we need a typical structure.
        const tempDimensionHeaders: Array<{ name: string }> = [{name: 'region'}, {name: 'firstUserSourceMedium'}];
        const tempMetricHeaders: Array<{ name: string }> = [
            {name: 'totalUsers'}, {name: 'newUsers'}, {name: 'activeUsers'}, 
            {name: 'userEngagementDuration'}, {name: 'Total User %'}, // Placeholder name, will be updated soon
            {name: 'TOS Benchmark'}, {name: 'Passed Benchmark'}
        ];
        const orderedCols = getReportColumns(tempDimensionHeaders, tempMetricHeaders, effectiveDateRangeString);
        const headerRowForEmpty = ["Property Name", ...orderedCols.map(col => col.name)];
        csvContent = headerRowForEmpty.map(h => `"${String(h || '').replace(/"/g, '""')}"`).join(',') + '\r\n';
        const noDataCells = Array(headerRowForEmpty.length).fill('"No Data"').join(',');
        csvContent += noDataCells + '\r\n';
        return csvContent;
    }

    // Use the first result to determine headers structure (assuming consistent headers)
    const firstResult = resultsArray[0];
    // No early return for !firstResult here, as resultsArray is checked for length > 0

    const reportColumns = getReportColumns(firstResult.dimensionHeaders, firstResult.metricHeaders, effectiveDateRangeString);
    const headerRow = ["Property ID", "Property Name", ...reportColumns.map(c => c.name)];
    csvContent = headerRow.map(h => `"${String(h || '').replace(/"/g, '""')}"`).join(',') + '\r\n'; // Headers written here

    resultsArray.forEach(singleResult => {
        if (!singleResult || !singleResult.rows) return; // Skip if a result is malformed

        const propertyId = singleResult.propertyId;
        const propertyName = 
            propertyMap[propertyId] || 
            propertyMap[propertyId.replace(/^properties\//, '')] || 
            propertyId; 

        // Determine TOS benchmark for this specific property
        let currentPropertyTosBenchmark = globalTosBenchmark !== undefined ? globalTosBenchmark : DEFAULT_TOS_BENCHMARK_VALUE;
        const dataTosBenchmarkIndex = singleResult.metricHeaders.findIndex(h => h.name === 'TOS Benchmark');
        
        // Check if rows exist and the first row has metricValues before accessing them
        if (singleResult.rows && singleResult.rows.length > 0 && singleResult.rows[0].metricValues && 
            dataTosBenchmarkIndex !== -1 && singleResult.rows[0].metricValues[dataTosBenchmarkIndex]?.value !== undefined) {
            currentPropertyTosBenchmark = Number(singleResult.rows[0].metricValues[dataTosBenchmarkIndex].value || currentPropertyTosBenchmark);
        }

        const totals = calculateCsvRowTotals(singleResult, currentPropertyTosBenchmark);

        // Add total row for this property
        const totalRowData = [
            `"${propertyId}"`,
            `"${propertyName.replace(/"/g, '""')}"`
        ];
        reportColumns.forEach(column => {
            let valueStr = '';
            if (column.name === 'Region') { // Or whatever the first dimension column is named by getReportColumns
                valueStr = 'Total';
            } else if (column.type === 'added' && column.name === 'Date Range') {
                valueStr = column.value || effectiveDateRangeString;
            } else if (column.type === 'metric') {
                switch (column.name) { // column.name is the display name from getReportColumns
                    case formatColumnHeader('totalUsers'):
                        valueStr = totals.totalUsers.toString();
                        break;
                    case formatColumnHeader('newUsers'):
                        valueStr = totals.newUsers.toString();
                        break;
                    case formatColumnHeader('activeUsers'):
                        valueStr = totals.activeUsers.toString();
                        break;
                    case formatColumnHeader('userEngagementDuration'): // This is 'Average Session Duration Per Active User'
                        valueStr = formatCsvColumnValue(totals.averageEngagementDuration.toString(), 'userEngagementDuration');
                        break;
                    case formatColumnHeader('TOS Benchmark'):
                        valueStr = formatCsvColumnValue(totals.tosBenchmark.toString(), 'TOS Benchmark');
                        break;
                    case formatColumnHeader('Passed Benchmark'):
                        valueStr = formatCsvColumnValue(totals.passedBenchmark.toString(), 'Passed Benchmark');
                        break;
                    default: valueStr = '0'; // Default for any other metric in total row
                }
            }
            totalRowData.push(`"${String(valueStr || '').replace(/"/g, '""')}"`);
        });
        csvContent += totalRowData.join(',') + '\r\n';

        // Add individual data rows if there are any
        if (singleResult.rows.length > 0) {
            singleResult.rows.forEach(row => {
                const rowData = [
                    `"${propertyId}"`,
                    `"${propertyName.replace(/"/g, '""')}"`
                ];
                reportColumns.forEach(column => {
                    const cellVal = getCsvCellValue(row, column, singleResult.metricHeaders, totals.totalUsers, currentPropertyTosBenchmark);
                    rowData.push(`"${String(cellVal || '').replace(/"/g, '""')}"`);
                });
                csvContent += rowData.join(',') + '\r\n';
            });
        } else { // If a property has a total row but no individual data rows (e.g. filtered out)
            // We might want a "No individual data" line or just leave it as is (total row only)
            // For now, if rows array is empty, only total row is added for this property.
        }
    });
    return csvContent;
}; 