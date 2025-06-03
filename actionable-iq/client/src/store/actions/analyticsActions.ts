import { AppDispatch } from '..';
import { analyticsApi } from '../../services/api/analyticsApi';
import { AnalyticsQueryRequest } from '../../types/analytics.types';
import { 
  fetchPropertiesStart, 
  fetchPropertiesSuccess, 
  fetchPropertiesFailure,
  executeQueryStart,
  executeQuerySuccess,
  executeQueryFailure,
  fetchPropertyDetailsStart,
  fetchPropertyDetailsSuccess,
  fetchPropertyDetailsFailure,
  setActiveQuery
} from '../slices/analyticsQuerySlice';
import {
  createReport,
  updateReport,
  setReportLoading,
  setReportError
} from '../slices/analyticsReportSlice';

// TOS Benchmark value in seconds
const TOS_BENCHMARK_VALUE = 30;
const USER_PERCENT_BENCHMARK_VALUE = 60;
const TOTAL_USER_BENCHMARK_VALUE = 5;

/**
 * Process query results to add benchmark columns and New User %
 */
export const processQueryData = (result: any): any => {
  console.log('[analyticsActions] processQueryData received input result:', JSON.parse(JSON.stringify(result))); // Deep copy for logging
  // The 'result' object (which is an AnalyticsQueryResponse) now contains:
  // result.totalUsers, result.totalNewUsers, result.totalActiveUsers,
  // result.totalAverageSessionDurationPerUser, result.totalPercentageOfNewUsers
  // These are the true, deduplicated property-wide totals.

  // Clone the result to avoid modifying the original
  const processedResult = { ...result }; 

  // REMOVED: Manual calculation of totalActiveUsers by summing rows.
  // We will use result.totalActiveUsers if a property-wide total is needed for a row calculation,
  // or row-specific metrics for row-specific percentages.
  
  // Add new headers for the additional columns
  // Ensure these headers are not duplicated if processQueryData is ever called multiple times on the same object
  const existingMetricNames = new Set(result.metricHeaders.map((h: {name: string}) => h.name));
  const metricsToAdd: { name: string; type: string }[] = [];
  if (!existingMetricNames.has('New User %')) {
    metricsToAdd.push({ name: 'New User %', type: 'METRIC_TYPE_PERCENT' });
  }
  if (!existingMetricNames.has('TOS Benchmark')) {
    metricsToAdd.push({ name: 'TOS Benchmark', type: 'METRIC_TYPE_SECONDS' });
  }
  if (!existingMetricNames.has('Passed Benchmark')) {
    metricsToAdd.push({ name: 'Passed Benchmark', type: 'METRIC_TYPE_BOOLEAN' });
  }
  if (!existingMetricNames.has('User % Benchmark')) {
    metricsToAdd.push({ name: 'User % Benchmark', type: 'METRIC_TYPE_PERCENT' });
  }
  if (!existingMetricNames.has('Passed Geo Benchmark')) {
    metricsToAdd.push({ name: 'Passed Geo Benchmark', type: 'METRIC_TYPE_BOOLEAN' });
  }
  if (!existingMetricNames.has('Total User Benchmark')) {
    metricsToAdd.push({ name: 'Total User Benchmark', type: 'METRIC_TYPE_INTEGER' });
  }
  if (!existingMetricNames.has('Passed Total User Benchmark')) {
    metricsToAdd.push({ name: 'Passed Total User Benchmark', type: 'METRIC_TYPE_BOOLEAN' });
  }

  processedResult.metricHeaders = [...result.metricHeaders, ...metricsToAdd];
  
  // Add calculated values to each row
  processedResult.rows = result.rows.map((row: any) => {
    const metricValues = [...row.metricValues];
    
    const getMetricValue = (metricName: string) => {
      const index = result.metricHeaders.findIndex((h: {name: string}) => h.name === metricName);
      const rawValue = index >= 0 && row.metricValues[index] ? row.metricValues[index].value : '0';
      return parseFloat(rawValue) || 0;
    };

    const rowTotalUsers = getMetricValue('totalUsers');
    // const rowNewUsers = getMetricValue('newUsers'); // No longer directly needed for 'New User %' calculation
    const rowActiveUsers = getMetricValue('activeUsers');
    const rowAvgSessionDurationPerUser = getMetricValue('averageSessionDurationPerUser');
    
    // Calculate 'Total User %' for the current row (e.g., for a specific region)
    // This is (row's totalUsers / Property's totalUsers) * 100
    let totalUserPercentForRow = 0;
    if (result.totalUsers > 0) { // Use property's totalUsers for the calculation denominator
      totalUserPercentForRow = (rowTotalUsers / result.totalUsers) * 100;
    }
    // Add 'New User %' (which is displayed as 'Total User %') if the header was added
    if (metricsToAdd.some(m => m.name === 'New User %')) {
        metricValues.push({ value: totalUserPercentForRow.toFixed(2) });
    }
    
    // Calculate TOS Benchmark and Passed Benchmark for the current row
    const avgSessionDurationForRow = rowAvgSessionDurationPerUser;

    // Add TOS Benchmark if the header was added
    if (metricsToAdd.some(m => m.name === 'TOS Benchmark')) {
        metricValues.push({ value: TOS_BENCHMARK_VALUE.toString() });
    }
    // Add Passed Benchmark if the header was added
    if (metricsToAdd.some(m => m.name === 'Passed Benchmark')) {
        metricValues.push({ value: (avgSessionDurationForRow >= TOS_BENCHMARK_VALUE).toString().toUpperCase() });
    }

    // Add User % Benchmark (Static 60%)
    if (metricsToAdd.some(m => m.name === 'User % Benchmark')) {
        metricValues.push({ value: USER_PERCENT_BENCHMARK_VALUE.toFixed(0) });
    }

    // Add Passed Geo Benchmark (Total User % >= 60%) - This benchmark logic might need review based on the new 'Total User %' meaning
    // For now, it will use the newly calculated totalUserPercentForRow.
    if (metricsToAdd.some(m => m.name === 'Passed Geo Benchmark')) {
        metricValues.push({ value: (totalUserPercentForRow >= USER_PERCENT_BENCHMARK_VALUE).toString().toUpperCase() });
    }

    // Add Total User Benchmark (Static 5)
    if (metricsToAdd.some(m => m.name === 'Total User Benchmark')) {
        metricValues.push({ value: TOTAL_USER_BENCHMARK_VALUE.toString() });
    }

    // Add Passed Total User Benchmark (Total Users >= 5)
    if (metricsToAdd.some(m => m.name === 'Passed Total User Benchmark')) {
        metricValues.push({ value: (rowTotalUsers >= TOTAL_USER_BENCHMARK_VALUE).toString().toUpperCase() });
    }
    
    return {
      ...row,
      metricValues
    };
  });
  
  return processedResult;
};

/**
 * Action creator to fetch Google Analytics properties
 */
export const fetchProperties = () => async (dispatch: AppDispatch, getState: any) => {
  try {
    const token = getState().auth.token;
    const idToken = getState().auth.idToken;
    
    if (!token) {
      throw new Error('Authentication required');
    }

    dispatch(fetchPropertiesStart());
    const properties = await analyticsApi.getProperties(token, idToken);
    dispatch(fetchPropertiesSuccess(properties));
    return properties;
  } catch (error: any) {
    const errorMessage = error.message || 'Failed to fetch properties';
    dispatch(fetchPropertiesFailure(errorMessage));
    throw error;
  }
};

/**
 * Action creator to execute a Google Analytics query
 */
export const executeQuery = (query: AnalyticsQueryRequest) => 
  async (dispatch: AppDispatch, getState: any) => {
    try {
      const token = getState().auth.token;
      const idToken = getState().auth.idToken;
      
      if (!token) {
        throw new Error('Authentication required');
      }

      console.log('[Analytics Action] Executing query with params:', {
        propertyIds: query.propertyIds,
        propertyCount: query.propertyIds?.length ?? 0,
        dateRange: `${query.startDate} to ${query.endDate}`,
        dimensions: query.dimensions,
        metrics: query.metrics
      });

      // Make sure we set the active query in Redux before starting the query
      dispatch(setActiveQuery(query));
      
      dispatch(executeQueryStart());
      const response = await analyticsApi.runQuery(query, token, idToken);
      console.log('[Analytics Action] Query execution successful. Successes: {SuccessCount}, Failures: {FailureCount}', 
        response.results?.length ?? 0, 
        response.errors?.length ?? 0);
      
      // Process results to add benchmark columns and New User %
      if (response.results && response.results.length > 0) {
        response.results = response.results.map(result => processQueryData(result));
      }
      
      dispatch(executeQuerySuccess(response));
      return response;
    } catch (error: any) {
      console.error('[Analytics Action] Query execution failed:', error);
      // Log additional error details if available
      if (error.response) {
        console.error('[Analytics Action] Error response:', {
          status: error.response.status,
          data: error.response.data
        });
      }
      const errorMessage = error.message || 'Failed to execute query';
      console.error('[Analytics Action] Dispatching error:', errorMessage);
      dispatch(executeQueryFailure(errorMessage));
      throw error;
    }
  };

/**
 * Action creator to create a report from query results
 */
export const createReportFromQuery = (
  name: string, 
  description: string,
  query: AnalyticsQueryRequest
) => 
  async (dispatch: AppDispatch, getState: any) => {
    try {
      const token = getState().auth.token;
      const idToken = getState().auth.idToken;
      
      if (!token) {
        throw new Error('Authentication required');
      }

      dispatch(setReportLoading(true));
      
      // Execute the query to get fresh results
      const result = await analyticsApi.runQuery(query, token, idToken);
      
      // Create a new report with the query and results
      dispatch(createReport({
        name,
        description,
        query,
        result
      }));
      
      dispatch(setReportLoading(false));
      return true;
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to create report';
      dispatch(setReportError(errorMessage));
      throw error;
    }
  };

/**
 * Action creator to update a report with fresh data
 */
export const refreshReportData = (reportId: string) => 
  async (dispatch: AppDispatch, getState: any) => {
    try {
      const token = getState().auth.token;
      const idToken = getState().auth.idToken;
      
      if (!token) {
        throw new Error('Authentication required');
      }

      dispatch(setReportLoading(true));
      
      // Get the current report
      const report = getState().analyticsReport.reports.find(
        (r: any) => r.id === reportId
      );
      
      if (!report) {
        throw new Error('Report not found');
      }
      
      // Execute the query to get fresh results
      const result = await analyticsApi.runQuery(report.query, token, idToken);
      
      // Update the report with the new results
      dispatch(updateReport({
        id: reportId,
        updates: {
          result
        }
      }));
      
      dispatch(setReportLoading(false));
      return true;
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to refresh report data';
      dispatch(setReportError(errorMessage));
      throw error;
    }
  };

/**
 * Action creator to fetch property details
 */
export const fetchPropertyDetails = (propertyId: string) => async (dispatch: AppDispatch, getState: any) => {
  try {
    const token = getState().auth.token;
    const idToken = getState().auth.idToken;
    
    if (!token) {
      throw new Error('Authentication required');
    }

    dispatch(fetchPropertyDetailsStart());
    const property = await analyticsApi.getPropertyDetails(propertyId, token, idToken);
    dispatch(fetchPropertyDetailsSuccess(property));
    return property;
  } catch (error: any) {
    const errorMessage = error.message || 'Failed to fetch property details';
    dispatch(fetchPropertyDetailsFailure(errorMessage));
    throw error;
  }
}; 