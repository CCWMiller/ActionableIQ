import { apiClient } from './apiClient';
import { 
  AnalyticsProperty, 
  AnalyticsQueryRequest, 
  AnalyticsQueryResponse,
  AnalyticsMultiQueryResponse
} from '../../types/analytics.types';

/**
 * Service for interacting with Google Analytics API endpoints
 */
export const analyticsApi = {
  /**
   * Get available Google Analytics properties
   */
  getProperties: async (token: string, idToken?: string) => {
    try {
      console.log('[Analytics API] Getting properties with ID token:', idToken ? 'Present' : 'Missing');
      return await apiClient.get<AnalyticsProperty[]>('/analytics/properties', { 
        token,
        headers: idToken ? { 'X-Id-Token': idToken } : undefined
      });
    } catch (error) {
      console.error('[Analytics API] Error getting properties:', error);
      throw error;
    }
  },
  
  /**
   * Get details for a specific property
   */
  getPropertyDetails: async (propertyId: string, token: string, idToken?: string) => {
    try {
      console.log('[Analytics API] Getting property details for:', propertyId);
      return await apiClient.get<AnalyticsProperty>(`/analytics/properties/${propertyId}`, {
        token,
        headers: idToken ? { 'X-Id-Token': idToken } : undefined
      });
    } catch (error) {
      console.error('[Analytics API] Error getting property details:', error);
      throw error;
    }
  },
  
  /**
   * Execute a query against Google Analytics
   */
  runQuery: async (query: AnalyticsQueryRequest, token: string, idToken?: string) => {
    try {
      console.log('[Analytics API] Running query with ID token:', idToken ? 'Present' : 'Missing');
      console.log('[Analytics API] Query params:', {
        propertyIds: query.propertyIds,
        propertyCount: query.propertyIds?.length ?? 0,
        dateRange: `${query.startDate} to ${query.endDate}`,
        metrics: query.metrics?.length || 0,
        dimensions: query.dimensions?.length || 0
      });
      
      const response = await apiClient.post<AnalyticsMultiQueryResponse>('/analytics/query', query, { 
        token,
        headers: idToken ? { 'X-Id-Token': idToken } : undefined
      });
      
      // Log detailed response information based on the new structure
      console.log('[Analytics API] Query response received:', {
        successCount: response.results?.length ?? 0,
        errorCount: response.errors?.length ?? 0,
        // Example log for the first successful result's headers
        firstResultHeaders: response.results?.[0] ? {
          dimensionHeaders: response.results[0].dimensionHeaders?.map(h => h.name) || [],
          metricHeaders: response.results[0].metricHeaders?.map(h => h.name) || []
        } : 'No successful results'
      });
      
      // Log any errors
      if (response.errors && response.errors.length > 0) {
        console.warn('[Analytics API] Query encountered errors:', response.errors);
      }

      return response;
    } catch (error) {
      console.error('[Analytics API] Error running query:', error);
      throw error;
    }
  },
  
  /**
   * Execute multiple queries in a batch
   */
  runBatchQuery: async (queries: AnalyticsQueryRequest[], token: string, idToken?: string) => {
    try {
      console.log('[Analytics API] Running batch query with ID token:', idToken ? 'Present' : 'Missing');
      console.log('[Analytics API] Batch size:', queries.length);
      
      const responses = await apiClient.post<AnalyticsQueryResponse[]>('/analytics/batch-query', queries, { 
        token,
        headers: idToken ? { 'X-Id-Token': idToken } : undefined
      });
      
      // Log batch response summary
      console.log('[Analytics API] Batch query responses received:', responses.length);
      
      // Log details of each response
      responses.forEach((response, index) => {
        console.log(`[Analytics API] Batch result ${index}:`, {
          rowCount: response.rowCount,
          hasData: response.rows && response.rows.length > 0
        });
      });
      
      return responses;
    } catch (error) {
      console.error('[Analytics API] Error running batch query:', error);
      throw error;
    }
  },
  
  /**
   * Helper function to format a date for Google Analytics
   * @param date JavaScript Date object
   * @returns Formatted date string (YYYY-MM-DD)
   */
  formatDate: (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },
  
  /**
   * Helper function to get a date range for common periods
   * @param period Period identifier (e.g., '7d', '30d', '90d', 'year')
   * @returns Object with startDate and endDate strings
   */
  getDateRange: (period: string): { startDate: string, endDate: string } => {
    const endDate = new Date();
    let startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case 'year':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      default:
        // Default to last 30 days
        startDate.setDate(endDate.getDate() - 30);
    }
    
    return {
      startDate: analyticsApi.formatDate(startDate),
      endDate: analyticsApi.formatDate(endDate)
    };
  }
}; 