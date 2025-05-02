import { Middleware } from '@reduxjs/toolkit';
import { apiClient } from '../api/apiClient';
import { logout } from '../../store/slices/authSlice';

// Type for API actions
interface ApiAction {
  type: string;
  payload?: any;
  meta: {
    api: boolean;
    endpoint: string;
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body?: any;
    onSuccess?: string;
    onError?: string;
    headers?: Record<string, string>;
    skipAuth?: boolean;
  };
}

// Helper to determine if an action is an API action
const isApiAction = (action: any): action is ApiAction => {
  return action.meta && action.meta.api === true;
};

/**
 * Middleware for handling API requests
 * This middleware will:
 * 1. Intercept actions with meta.api = true
 * 2. Make the API request using the apiClient
 * 3. Dispatch success/error actions based on the result
 * 4. Handle token refresh if needed
 */
export const apiMiddleware: Middleware = ({ dispatch, getState }) => (next) => async (action) => {
  // If this isn't an API action, skip this middleware
  if (!isApiAction(action)) {
    return next(action);
  }

  const { meta } = action;
  const { endpoint, method, body, onSuccess, onError, headers, skipAuth } = meta;
  
  // Get auth token from state if available
  const token = skipAuth ? undefined : getState().auth?.token;
  
  // First dispatch the original action
  next(action);
  
  try {
    // Make the API request based on method
    let response;
    switch (method) {
      case 'GET':
        response = await apiClient.get(endpoint, { token, headers });
        break;
      case 'POST':
        response = await apiClient.post(endpoint, body, { token, headers });
        break;
      case 'PUT':
        response = await apiClient.put(endpoint, body, { token, headers });
        break;
      case 'PATCH':
        response = await apiClient.patch(endpoint, body, { token, headers });
        break;
      case 'DELETE':
        response = await apiClient.delete(endpoint, { token, headers });
        break;
      default:
        throw new Error(`Unsupported method: ${method}`);
    }
    
    // If an onSuccess action type was provided, dispatch it with the response
    if (onSuccess) {
      dispatch({
        type: onSuccess,
        payload: response,
        meta: { originalAction: action }
      });
    }
    
    return response;
  } catch (error: any) {
    // Check if the error is due to an expired token (401 Unauthorized)
    if (error.status === 401 && token) {
      // If token refresh fails, log the user out
      dispatch(logout());
    }
    
    // If an onError action type was provided, dispatch it with the error
    if (onError) {
      dispatch({
        type: onError,
        payload: error.message || 'An unknown error occurred',
        error: true,
        meta: { originalAction: action }
      });
    }
    
    throw error;
  }
};