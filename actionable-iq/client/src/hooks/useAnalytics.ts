import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { AnalyticsQueryRequest } from '../types/analytics.types';
import { 
  selectActiveQuery, 
  selectProperties, 
  selectPropertiesLoading, 
  selectQueryLoading, 
  selectQueryResponse,
  selectQueryError,
  setActiveQuery,
  clearActiveQuery
} from '../store/slices/analyticsQuerySlice';
import {
  selectActiveReport,
  selectReports,
  selectReportLoading,
  selectReportError
} from '../store/slices/analyticsReportSlice';
import { 
  fetchProperties, 
  executeQuery,
  createReportFromQuery,
  refreshReportData
} from '../store/actions/analyticsActions';

/**
 * Custom hook for accessing and working with analytics data
 */
export const useAnalytics = () => {
  const dispatch = useDispatch<AppDispatch>();
  
  // Select state from Redux store
  const properties = useSelector(selectProperties);
  const propertiesLoading = useSelector(selectPropertiesLoading);
  const activeQuery = useSelector(selectActiveQuery);
  const queryResults = useSelector(selectQueryResponse);
  const queryLoading = useSelector(selectQueryLoading);
  const queryError = useSelector(selectQueryError);
  const reports = useSelector(selectReports);
  const activeReport = useSelector(selectActiveReport);
  const reportLoading = useSelector(selectReportLoading);
  const reportError = useSelector(selectReportError);
  
  // Action dispatchers
  const loadProperties = useCallback(() => {
    return dispatch(fetchProperties());
  }, [dispatch]);
  
  const runQuery = useCallback((query: AnalyticsQueryRequest) => {
    dispatch(setActiveQuery(query));
    return dispatch(executeQuery(query));
  }, [dispatch]);
  
  const saveAsReport = useCallback((name: string, description: string, query: AnalyticsQueryRequest) => {
    return dispatch(createReportFromQuery(name, description, query));
  }, [dispatch]);
  
  const refreshReport = useCallback((reportId: string) => {
    return dispatch(refreshReportData(reportId));
  }, [dispatch]);
  
  const resetQuery = useCallback(() => {
    dispatch(clearActiveQuery());
  }, [dispatch]);
  
  // Return all the state and action dispatchers
  return {
    // Properties data and actions
    properties,
    propertiesLoading,
    loadProperties,
    
    // Query data and actions
    activeQuery,
    queryResults,
    queryLoading,
    queryError,
    runQuery,
    resetQuery,
    
    // Report data and actions
    reports,
    activeReport,
    reportLoading,
    reportError,
    saveAsReport,
    refreshReport
  };
}; 