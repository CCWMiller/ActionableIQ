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

/**
 * Process query results to add benchmark columns and New User %
 */
const processQueryData = (result: any): any => {
  // Clone the result to avoid modifying the original
  const processedResult = { ...result };
  
  // Calculate the total active users across all regions for this property
  let totalActiveUsers = 0;
  if (result.rows && result.rows.length > 0) {
    const activeUsersIndex = result.metricHeaders.findIndex((h: {name: string}) => h.name === 'activeUsers');
    if (activeUsersIndex >= 0) {
      totalActiveUsers = result.rows.reduce((total: number, row: any) => {
        const activeUsers = parseFloat(row.metricValues[activeUsersIndex].value) || 0;
        return total + activeUsers;
      }, 0);
    }
  }
  
  // Add new headers for the additional columns
  processedResult.dimensionHeaders = [...result.dimensionHeaders];
  processedResult.metricHeaders = [
    ...result.metricHeaders,
    { name: 'New User %', type: 'METRIC_TYPE_PERCENT' },
    { name: 'TOS Benchmark', type: 'METRIC_TYPE_SECONDS' },
    { name: 'Passed Benchmark', type: 'METRIC_TYPE_BOOLEAN' }
  ];
  
  // Add calculated values to each row
  processedResult.rows = result.rows.map((row: any) => {
    // Find the metrics
    const metricValues = [...row.metricValues];
    const userEngagementIndex = result.metricHeaders.findIndex((h: {name: string}) => h.name === 'userEngagementDuration');
    const activeUsersIndex = result.metricHeaders.findIndex((h: {name: string}) => h.name === 'activeUsers');
    const newUsersIndex = result.metricHeaders.findIndex((h: {name: string}) => h.name === 'newUsers');
    
    // Calculate New User %
    let newUserPercent = 0;
    if (activeUsersIndex >= 0 && totalActiveUsers > 0) {
      const activeUsers = parseFloat(row.metricValues[activeUsersIndex].value) || 0;
      newUserPercent = (activeUsers / totalActiveUsers) * 100;
      metricValues.push({ value: newUserPercent.toFixed(2) }); // New User %
    } else {
      metricValues.push({ value: '0.00' }); // Default New User %
    }
    
    // Add benchmark columns
    if (userEngagementIndex >= 0 && activeUsersIndex >= 0) {
      const userEngagementDuration = parseFloat(row.metricValues[userEngagementIndex].value) || 0;
      const activeUsers = parseFloat(row.metricValues[activeUsersIndex].value) || 0;
      
      // Calculate average session duration
      let avgSessionDuration = 0;
      if (activeUsers > 0) {
        avgSessionDuration = userEngagementDuration / activeUsers;
      }
      
      // Add benchmark columns
      metricValues.push({ value: TOS_BENCHMARK_VALUE.toString() }); // TOS Benchmark
      metricValues.push({ value: (avgSessionDuration >= TOS_BENCHMARK_VALUE).toString() }); // Passed Benchmark
    } else {
      // If metrics not found, add placeholders
      metricValues.push({ value: TOS_BENCHMARK_VALUE.toString() }); // TOS Benchmark
      metricValues.push({ value: 'false' }); // Passed Benchmark defaults to false
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