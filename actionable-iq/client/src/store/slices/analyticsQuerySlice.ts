import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AnalyticsProperty, AnalyticsQueryRequest, AnalyticsQueryResponse, AnalyticsMultiQueryResponse } from '../../types/analytics.types';
import { RootState } from '..';

interface AnalyticsQueryState {
  properties: AnalyticsProperty[];
  selectedProperty: AnalyticsProperty | null;
  propertiesLoading: boolean;
  propertiesError: string | null;
  queryLoading: boolean;
  queryError: string | null;
  queryResponse: AnalyticsMultiQueryResponse | null;
  activeQuery: AnalyticsQueryRequest | null;
}

const initialState: AnalyticsQueryState = {
  properties: [],
  selectedProperty: null,
  propertiesLoading: false,
  propertiesError: null,
  queryLoading: false,
  queryError: null,
  queryResponse: null,
  activeQuery: null
};

/**
 * Redux slice for analytics queries
 */
const analyticsQuerySlice = createSlice({
  name: 'analyticsQuery',
  initialState,
  reducers: {
    // Properties actions
    fetchPropertiesStart: (state) => {
      state.propertiesLoading = true;
      state.propertiesError = null;
    },
    fetchPropertiesSuccess: (state, action: PayloadAction<AnalyticsProperty[]>) => {
      state.properties = action.payload;
      state.propertiesLoading = false;
    },
    fetchPropertiesFailure: (state, action: PayloadAction<string>) => {
      state.propertiesError = action.payload;
      state.propertiesLoading = false;
    },
    fetchPropertyDetailsStart: (state) => {
      state.propertiesLoading = true;
      state.propertiesError = null;
    },
    fetchPropertyDetailsSuccess: (state, action: PayloadAction<AnalyticsProperty>) => {
      state.selectedProperty = action.payload;
      state.propertiesLoading = false;
    },
    fetchPropertyDetailsFailure: (state, action: PayloadAction<string>) => {
      state.propertiesError = action.payload;
      state.propertiesLoading = false;
    },
    
    // Query actions
    setActiveQuery: (state, action: PayloadAction<AnalyticsQueryRequest>) => {
      state.activeQuery = action.payload;
    },
    clearActiveQuery: (state) => {
      state.activeQuery = null;
    },
    
    // Query execution actions
    executeQueryStart: (state) => {
      state.queryLoading = true;
      state.queryError = null;
    },
    executeQuerySuccess: (state, action: PayloadAction<AnalyticsMultiQueryResponse>) => {
      state.queryResponse = action.payload;
      state.queryLoading = false;
    },
    executeQueryFailure: (state, action: PayloadAction<string>) => {
      state.queryError = action.payload;
      state.queryLoading = false;
    },
    
    // Reset all state
    resetQueryState: () => initialState
  }
});

// Export actions
export const {
  fetchPropertiesStart,
  fetchPropertiesSuccess,
  fetchPropertiesFailure,
  fetchPropertyDetailsStart,
  fetchPropertyDetailsSuccess,
  fetchPropertyDetailsFailure,
  executeQueryStart,
  executeQuerySuccess,
  executeQueryFailure,
  setActiveQuery,
  clearActiveQuery
} = analyticsQuerySlice.actions;

// Define selectors
export const selectProperties = (state: RootState) => state.analyticsQuery.properties;
export const selectSelectedProperty = (state: RootState) => state.analyticsQuery.selectedProperty;
export const selectPropertiesLoading = (state: RootState) => state.analyticsQuery.propertiesLoading;
export const selectPropertiesError = (state: RootState) => state.analyticsQuery.propertiesError;
export const selectQueryResponse = (state: RootState) => state.analyticsQuery.queryResponse;
export const selectQueryLoading = (state: RootState) => state.analyticsQuery.queryLoading;
export const selectQueryError = (state: RootState) => state.analyticsQuery.queryError;
export const selectActiveQuery = (state: RootState) => state.analyticsQuery.activeQuery;

// Export the reducer
export default analyticsQuerySlice.reducer; 