import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { 
  AnalyticsReport,
  AnalyticsReportState 
} from '../../types/analytics.types';
import { RootState } from '..';
import { v4 as uuidv4 } from 'uuid';

// Define initial state
const initialState: AnalyticsReportState = {
  reports: [],
  activeReport: null,
  loading: false,
  error: null
};

/**
 * Redux slice for analytics reports
 */
export const analyticsReportSlice = createSlice({
  name: 'analyticsReport',
  initialState,
  reducers: {
    // Report actions
    createReport: (state, action: PayloadAction<Omit<AnalyticsReport, 'id' | 'createdAt' | 'updatedAt'>>) => {
      const now = new Date().toISOString();
      const newReport: AnalyticsReport = {
        ...action.payload,
        id: uuidv4(),
        createdAt: now,
        updatedAt: now
      };
      
      state.reports.push(newReport);
      state.activeReport = newReport;
    },
    
    updateReport: (state, action: PayloadAction<{ id: string, updates: Partial<AnalyticsReport> }>) => {
      const { id, updates } = action.payload;
      const reportIndex = state.reports.findIndex(report => report.id === id);
      
      if (reportIndex !== -1) {
        state.reports[reportIndex] = {
          ...state.reports[reportIndex],
          ...updates,
          updatedAt: new Date().toISOString()
        };
        
        if (state.activeReport?.id === id) {
          state.activeReport = state.reports[reportIndex];
        }
      }
    },
    
    deleteReport: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      state.reports = state.reports.filter(report => report.id !== id);
      
      if (state.activeReport?.id === id) {
        state.activeReport = null;
      }
    },
    
    setActiveReport: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      state.activeReport = state.reports.find(report => report.id === id) || null;
    },
    
    clearActiveReport: (state) => {
      state.activeReport = null;
    },
    
    // Loading state actions
    setReportLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    
    setReportError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    
    // Reset all state
    resetReportState: () => initialState
  }
});

// Export actions
export const {
  createReport,
  updateReport,
  deleteReport,
  setActiveReport,
  clearActiveReport,
  setReportLoading,
  setReportError,
  resetReportState
} = analyticsReportSlice.actions;

// Define selectors
export const selectReports = (state: RootState) => state.analyticsReport.reports;
export const selectActiveReport = (state: RootState) => state.analyticsReport.activeReport;
export const selectReportLoading = (state: RootState) => state.analyticsReport.loading;
export const selectReportError = (state: RootState) => state.analyticsReport.error;

// Export the reducer
export default analyticsReportSlice.reducer; 