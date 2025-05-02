import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import analyticsQueryReducer from './slices/analyticsQuerySlice';
import analyticsReportReducer from './slices/analyticsReportSlice';
import { apiMiddleware } from '../services/middleware/apiMiddleware';

// Configure the Redux store
export const store = configureStore({
  reducer: {
    auth: authReducer,
    analyticsQuery: analyticsQueryReducer,
    analyticsReport: analyticsReportReducer
  },
  middleware: (getDefaultMiddleware) => 
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore specific action types that may contain non-serializable values
        ignoredActions: ['analyticsReport/createReport', 'analyticsReport/updateReport']
      }
    }).concat(apiMiddleware)
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 