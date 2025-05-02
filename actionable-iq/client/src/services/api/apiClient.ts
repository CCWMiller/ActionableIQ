// Base API URL from environment variables
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5190/api';

interface RequestOptions extends RequestInit {
  token?: string;
  params?: Record<string, string>;
}

/**
 * Helper function to build a URL with query parameters
 */
const buildUrl = (endpoint: string, params?: Record<string, string>): string => {
  const url = new URL(`${API_URL}${endpoint}`);
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }
  
  return url.toString();
};

/**
 * Generic API request function
 */
const request = async <T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> => {
  const { token, params, ...customOptions } = options;
  
  // Build request headers
  const headers = new Headers({
    'Content-Type': 'application/json',
    ...customOptions.headers,
  });
  
  // Add authorization token if provided
  if (token) {
    headers.append('Authorization', `Bearer ${token}`);
    
    // If no specific ID token was provided in the headers, use the one from localStorage
    const hasIdTokenHeader = customOptions.headers && 
      Object.keys(customOptions.headers).some(key => 
        key.toLowerCase() === 'x-id-token');
      
    if (!hasIdTokenHeader) {
      const storedIdToken = localStorage.getItem('id_token');
      if (storedIdToken) {
        headers.append('X-Id-Token', storedIdToken);
      }
    }
  }
  
  // Log request details for debugging (excluding sensitive info)
  const debugHeaders: Record<string, string> = {};
  headers.forEach((value, key) => {
    if (key === 'Authorization') {
      debugHeaders[key] = 'Bearer [REDACTED]';
    } else if (key === 'X-Id-Token') {
      debugHeaders[key] = '[PRESENT]';
    } else {
      debugHeaders[key] = value;
    }
  });
  
  console.log(`[API] ${options.method || 'GET'} request to ${endpoint}`, {
    headers: debugHeaders,
    hasParams: !!params
  });
  
  // Build the URL with query parameters
  const url = buildUrl(endpoint, params);
  
  try {
    // Make the request
    const response = await fetch(url, {
      ...customOptions,
      headers,
    });
    
    // Check if the request was successful
    if (!response.ok) {
      let errorData: any = {};
      let errorText = '';
      
      try {
        // Try to parse the error response as JSON
        errorData = await response.json();
        console.error('[API] Error data from server:', errorData);
      } catch (parseError) {
        // If parsing fails, try to get the text response
        try {
          errorText = await response.text();
          console.error('[API] Error text from server:', errorText);
        } catch (textError) {
          console.error('[API] Failed to parse error response as JSON or text');
        }
      }
      
      // Log detailed error information
      console.error(`[API] Request failed: ${response.status} ${response.statusText}`, {
        endpoint,
        status: response.status,
        statusText: response.statusText,
        error: errorData || errorText || 'No error details available'
      });
      
      // Handle specific error types
      if (response.status === 401) {
        throw new Error('Authentication failed. Please log in again.');
      } else if (response.status === 403) {
        throw new Error('You don\'t have permission to access this resource.');
      } else if (response.status === 400) {
        // Format a better error message for 400 Bad Request
        const errorMessage = errorData.detail || errorData.message || errorData.title || 
                            'Invalid request. Please check your input.';
        throw new Error(`Bad Request: ${errorMessage}`);
      } else {
        throw new Error(
          errorData.message || errorData.title || errorData.detail || 
          errorText || `API error: ${response.status} ${response.statusText}`
        );
      }
    }
    
    // For 204 No Content responses, return null
    if (response.status === 204) {
      return null as unknown as T;
    }
    
    // Parse and return the response data
    const data = await response.json();
    console.log(`[API] Successful response from ${endpoint}`, {
      status: response.status,
      dataSize: JSON.stringify(data).length
    });
    return data;
  } catch (error) {
    console.error('[API] Request failed:', error);
    throw error;
  }
};

// API client with CRUD methods
export const apiClient = {
  get: <T>(endpoint: string, options?: RequestOptions) => 
    request<T>(endpoint, { method: 'GET', ...options }),
    
  post: <T>(endpoint: string, data: any, options?: RequestOptions) => 
    request<T>(endpoint, { 
      method: 'POST', 
      body: JSON.stringify(data),
      ...options 
    }),
    
  put: <T>(endpoint: string, data: any, options?: RequestOptions) => 
    request<T>(endpoint, { 
      method: 'PUT', 
      body: JSON.stringify(data),
      ...options 
    }),
    
  patch: <T>(endpoint: string, data: any, options?: RequestOptions) => 
    request<T>(endpoint, { 
      method: 'PATCH', 
      body: JSON.stringify(data),
      ...options 
    }),
    
  delete: <T>(endpoint: string, options?: RequestOptions) => 
    request<T>(endpoint, { method: 'DELETE', ...options }),
}; 