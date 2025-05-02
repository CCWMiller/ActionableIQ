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